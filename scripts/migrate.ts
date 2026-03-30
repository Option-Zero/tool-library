/**
 * Migration runner for D1.
 *
 * Usage:
 *   npx wrangler d1 execute TOOL_DB --file=migrations/0001_initial.sql
 *   npx wrangler d1 execute TOOL_DB --file=migrations/0002_fts_search.sql
 *
 * Or run all pending migrations:
 *   npx tsx scripts/migrate.ts          # local
 *   npx tsx scripts/migrate.ts --remote # production
 *
 * Migrations are idempotent (IF NOT EXISTS) and tracked in _migrations table.
 */

import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const remote = process.argv.includes("--remote");
const migrationsDir = join(import.meta.dirname, "..", "migrations");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(
  `Running ${files.length} migration(s) against ${remote ? "REMOTE" : "LOCAL"} D1...`,
);

for (const file of files) {
  const name = file.replace(".sql", "");
  const filePath = join(migrationsDir, file);

  // Check if already applied
  try {
    const check = execSync(
      `npx wrangler d1 execute TOOL_DB ${remote ? "--remote" : "--local"} --command "SELECT 1 FROM _migrations WHERE name = '${name}'" --json`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    );
    const result = JSON.parse(check);
    if (result[0]?.results?.length > 0) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }
  } catch {
    // _migrations table may not exist yet on first run, that's fine
  }

  // Apply migration
  console.log(`  → ${file}...`);
  try {
    execSync(
      `npx wrangler d1 execute TOOL_DB ${remote ? "--remote" : "--local"} --file="${filePath}"`,
      { encoding: "utf-8", stdio: "inherit" },
    );

    // Record migration
    execSync(
      `npx wrangler d1 execute TOOL_DB ${remote ? "--remote" : "--local"} --command "INSERT OR IGNORE INTO _migrations (name) VALUES ('${name}')"`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    );
    console.log(`  ✓ ${file}`);
  } catch (err) {
    console.error(`  ✗ ${file} failed:`, (err as Error).message);
    process.exit(1);
  }
}

console.log("Done.");

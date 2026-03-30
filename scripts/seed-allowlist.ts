/**
 * Seed allowlist from Highlands2 resident directory.
 *
 * Reads ~/code/highlands2_directory.json (PII — NEVER commit)
 * and inserts unique email addresses into the allowlist table.
 *
 * Usage:
 *   npx tsx scripts/seed-allowlist.ts          # local D1
 *   npx tsx scripts/seed-allowlist.ts --remote # production D1
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const remote = process.argv.includes("--remote");
const directoryPath = join(
  process.env.HOME || "~",
  "code",
  "highlands2_directory.json",
);

interface Member {
  name: string;
  email: string;
  cell_phone: string;
}

interface Account {
  consolidated_name: string;
  members: Member[];
}

interface Directory {
  response: {
    data: {
      accounts: Account[];
    };
  };
}

const directory: Directory = JSON.parse(
  readFileSync(directoryPath, "utf-8"),
);
const accounts = directory.response.data.accounts;

// Extract unique emails
const emails = new Set<string>();
for (const account of accounts) {
  for (const member of account.members) {
    if (member.email) {
      emails.add(member.email.toLowerCase().trim());
    }
  }
}

console.log(
  `Found ${emails.size} unique emails from ${accounts.length} households.`,
);
console.log(`Seeding ${remote ? "REMOTE" : "LOCAL"} D1 allowlist...`);

// Batch insert in chunks of 20 (D1 has statement size limits)
const emailList = Array.from(emails);
const chunkSize = 20;

for (let i = 0; i < emailList.length; i += chunkSize) {
  const chunk = emailList.slice(i, i + chunkSize);
  const values = chunk
    .map((e) => `('${e.replace(/'/g, "''")}', 'seed')`)
    .join(", ");

  const sql = `INSERT OR IGNORE INTO allowlist (email, added_by) VALUES ${values}`;

  try {
    execSync(
      `npx wrangler d1 execute TOOL_DB ${remote ? "--remote" : "--local"} --command "${sql}"`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    );
  } catch (err) {
    console.error(`Failed to insert batch starting at index ${i}:`, (err as Error).message);
    process.exit(1);
  }
}

console.log(`✓ Seeded ${emails.size} emails into allowlist.`);

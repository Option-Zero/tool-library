import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import type {
  ToolWithLoan,
  ToolListResult,
  ToolDetailResult,
  CategoryCount,
} from "~/types/tool";

/**
 * Fetch tools with optional search query and category filter.
 * Uses FTS5 for full-text search when a query is provided.
 */
export const getTools = createServerFn()
  .inputValidator(
    (input: { q?: string; category?: string; limit?: number; offset?: number }) => input,
  )
  .handler(async ({ data }): Promise<ToolListResult> => {
    const db = env.db;
    const { q, category, limit = 50, offset = 0 } = data;

    // Build the main query
    let sql: string;
    const params: unknown[] = [];

    if (q && q.trim()) {
      // FTS5 search: match against tools_fts, join back to tools
      sql = `
        SELECT t.*, u.name AS owner_name,
               l.borrower_id, l.borrower_name, l.expected_return, l.borrowed_at
        FROM tools t
        INNER JOIN tools_fts ON tools_fts.rowid = t.rowid
        INNER JOIN users u ON u.id = t.owner_id
        LEFT JOIN (
          SELECT lo.tool_id,
                 lo.borrower_id,
                 ub.name AS borrower_name,
                 lo.expected_return,
                 lo.borrowed_at
          FROM loans lo
          INNER JOIN users ub ON ub.id = lo.borrower_id
          WHERE lo.returned_at IS NULL
        ) l ON l.tool_id = t.id
        WHERE tools_fts MATCH ?
          AND t.status != 'disabled'
      `;
      // Append * for prefix matching so "ham" matches "hammer"
      params.push(q.trim() + "*");
    } else {
      sql = `
        SELECT t.*, u.name AS owner_name,
               l.borrower_id, l.borrower_name, l.expected_return, l.borrowed_at
        FROM tools t
        INNER JOIN users u ON u.id = t.owner_id
        LEFT JOIN (
          SELECT lo.tool_id,
                 lo.borrower_id,
                 ub.name AS borrower_name,
                 lo.expected_return,
                 lo.borrowed_at
          FROM loans lo
          INNER JOIN users ub ON ub.id = lo.borrower_id
          WHERE lo.returned_at IS NULL
        ) l ON l.tool_id = t.id
        WHERE t.status != 'disabled'
      `;
    }

    if (category) {
      sql += ` AND t.category = ?`;
      params.push(category);
    }

    // Count total before pagination
    const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
    const countResult = await db
      .prepare(countSql)
      .bind(...params)
      .first<{ total: number }>();
    const total = countResult?.total ?? 0;

    // Add ordering and pagination
    sql += ` ORDER BY t.name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await db
      .prepare(sql)
      .bind(...params)
      .all<ToolWithLoan>();

    // Get category counts (unfiltered by category, but respect search)
    const categories = await getCategoryCounts(db, q);

    return {
      tools: results ?? [],
      total,
      categories,
    };
  });

/**
 * Fetch a single tool by ID with owner and active loan info.
 */
export const getToolById = createServerFn()
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<ToolDetailResult | null> => {
    const db = env.db;

    const tool = await db
      .prepare(
        `
        SELECT t.*, u.name AS owner_name,
               l.borrower_id, l.borrower_name, l.expected_return, l.borrowed_at
        FROM tools t
        INNER JOIN users u ON u.id = t.owner_id
        LEFT JOIN (
          SELECT lo.tool_id,
                 lo.borrower_id,
                 ub.name AS borrower_name,
                 lo.expected_return,
                 lo.borrowed_at
          FROM loans lo
          INNER JOIN users ub ON ub.id = lo.borrower_id
          WHERE lo.returned_at IS NULL
        ) l ON l.tool_id = t.id
        WHERE t.id = ?
        `,
      )
      .bind(data.id)
      .first<ToolWithLoan>();

    if (!tool) return null;
    return { tool };
  });

/** Get category counts, respecting an optional search query. */
async function getCategoryCounts(
  db: D1Database,
  q?: string,
): Promise<CategoryCount[]> {
  let sql: string;
  const params: unknown[] = [];

  if (q && q.trim()) {
    sql = `
      SELECT t.category, COUNT(*) as count
      FROM tools t
      INNER JOIN tools_fts ON tools_fts.rowid = t.rowid
      WHERE tools_fts MATCH ?
        AND t.status != 'disabled'
        AND t.category IS NOT NULL
      GROUP BY t.category
      ORDER BY count DESC
    `;
    params.push(q.trim() + "*");
  } else {
    sql = `
      SELECT category, COUNT(*) as count
      FROM tools
      WHERE status != 'disabled'
        AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `;
  }

  const { results } = await db
    .prepare(sql)
    .bind(...params)
    .all<CategoryCount>();

  return results ?? [];
}

/**
 * Overdue loan reminder job — server-only.
 * Checks for loans > 7 days and creates reminder notifications.
 * Called from other server code, not directly by client routes.
 */

import { getDb } from "./db";
import { generateId } from "./crypto";

interface LoanRow {
  loan_id: string;
  borrower_id: string;
  borrower_name: string;
  owner_id: string;
  owner_name: string;
  tool_name: string;
  tool_id: string;
  borrowed_at: string;
}

/**
 * Check for overdue loans and create reminder notifications.
 * Sends reminders to both borrower and owner for loans > 7 days.
 * Skips loans that already had a reminder in the last 3 days.
 */
export async function checkOverdueLoans(): Promise<{ reminders: number }> {
  const db = getDb();

  // Find loans out for more than 7 days with no reminder sent in the last 3 days
  const { results: overdue } = await db
    .prepare(
      `SELECT
         l.id as loan_id,
         l.borrower_id,
         bu.name as borrower_name,
         t.owner_id,
         ou.name as owner_name,
         t.name as tool_name,
         t.id as tool_id,
         l.borrowed_at
       FROM loans l
       JOIN tools t ON l.tool_id = t.id
       JOIN users bu ON l.borrower_id = bu.id
       JOIN users ou ON t.owner_id = ou.id
       WHERE l.returned_at IS NULL
         AND datetime(l.borrowed_at, '+7 days') < datetime('now')
         AND l.id NOT IN (
           SELECT DISTINCT json_extract(n.body, '$.loan_id')
           FROM notifications n
           WHERE n.type = 'overdue_reminder'
             AND datetime(n.created_at, '+3 days') > datetime('now')
         )`,
    )
    .all<LoanRow>();

  if (!overdue || overdue.length === 0) return { reminders: 0 };

  const stmts = [];

  for (const loan of overdue) {
    const days = Math.floor(
      (Date.now() - new Date(loan.borrowed_at + "Z").getTime()) / 86400000,
    );

    // Notify borrower: gentle return reminder
    stmts.push(
      db
        .prepare(
          `INSERT INTO notifications (id, user_id, type, title, body, action_url)
           VALUES (?, ?, 'overdue_reminder', ?, ?, ?)`,
        )
        .bind(
          generateId(),
          loan.borrower_id,
          `Return reminder: ${loan.tool_name}`,
          `You've had ${loan.owner_name}'s ${loan.tool_name} for ${days} days. Please return it when you're done!`,
          `/tools/${loan.tool_id}`,
        ),
    );

    // Notify owner: their tool has been out a while
    stmts.push(
      db
        .prepare(
          `INSERT INTO notifications (id, user_id, type, title, body, action_url)
           VALUES (?, ?, 'overdue_owner', ?, ?, ?)`,
        )
        .bind(
          generateId(),
          loan.owner_id,
          `${loan.tool_name} still out`,
          `${loan.borrower_name} has had your ${loan.tool_name} for ${days} days.`,
          `/my-tools`,
        ),
    );
  }

  if (stmts.length > 0) {
    await db.batch(stmts);
  }

  return { reminders: stmts.length };
}

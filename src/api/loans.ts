import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/server/db";
import { generateId } from "~/server/crypto";
import { getCurrentUser } from "~/server/auth";

/**
 * Borrow a tool. Creates a loan record, marks tool checked_out, notifies owner.
 */
export const borrowTool = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { toolId: string; expectedReturn: string }) => {
      if (!input.toolId) throw new Error("Tool ID required");
      if (!input.expectedReturn) throw new Error("Expected return date required");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const db = getDb();

    // Check tool exists and is available
    const tool = await db
      .prepare("SELECT id, owner_id, name, status FROM tools WHERE id = ?")
      .bind(data.toolId)
      .first<{ id: string; owner_id: string; name: string; status: string }>();

    if (!tool) throw new Error("Tool not found");
    if (tool.status !== "available") throw new Error("Tool is not available");
    if (tool.owner_id === user.id) throw new Error("Cannot borrow your own tool");

    const loanId = generateId();
    const now = new Date().toISOString();

    // Create loan + update tool status in a batch
    await db.batch([
      db
        .prepare(
          "INSERT INTO loans (id, tool_id, borrower_id, borrowed_at, expected_return) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(loanId, data.toolId, user.id, now, data.expectedReturn),
      db
        .prepare(
          "UPDATE tools SET status = 'checked_out', updated_at = ? WHERE id = ?",
        )
        .bind(now, data.toolId),
      db
        .prepare(
          "INSERT INTO notifications (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          generateId(),
          tool.owner_id,
          "tool_borrowed",
          `${tool.name} borrowed`,
          `${user.name} borrowed your ${tool.name}. Expected return: ${new Date(data.expectedReturn + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}.`,
          now,
        ),
    ]);

    return { ok: true };
  });

/**
 * Return a tool. Marks loan returned, sets tool available, notifies owner.
 */
export const returnTool = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { toolId: string; locationVerified: boolean }) => {
      if (!input.toolId) throw new Error("Tool ID required");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const db = getDb();

    // Find active loan for this tool by this user
    const loan = await db
      .prepare(
        `SELECT l.id, t.owner_id, t.name
         FROM loans l
         JOIN tools t ON t.id = l.tool_id
         WHERE l.tool_id = ? AND l.borrower_id = ? AND l.returned_at IS NULL`,
      )
      .bind(data.toolId, user.id)
      .first<{ id: string; owner_id: string; name: string }>();

    if (!loan) throw new Error("No active loan found for this tool");

    const now = new Date().toISOString();

    await db.batch([
      db
        .prepare(
          "UPDATE loans SET returned_at = ?, location_verified = ? WHERE id = ?",
        )
        .bind(now, data.locationVerified ? 1 : 0, loan.id),
      db
        .prepare(
          "UPDATE tools SET status = 'available', updated_at = ? WHERE id = ?",
        )
        .bind(now, data.toolId),
      db
        .prepare(
          "INSERT INTO notifications (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          generateId(),
          loan.owner_id,
          "tool_returned",
          `${loan.name} returned`,
          `${user.name} returned your ${loan.name}.${data.locationVerified ? " Location verified." : ""}`,
          now,
        ),
    ]);

    return { ok: true };
  });

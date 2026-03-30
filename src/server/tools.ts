/** Owner tool management server functions. */

import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { generateId } from "./crypto";
import { getDb } from "./db";
import { getCurrentUser } from "./auth";
import type { Tool } from "~/types/tool";

// ---------------------------------------------------------------------------
// Get owner's tools with lending stats
// ---------------------------------------------------------------------------

export interface OwnerTool extends Tool {
  borrower_name: string | null;
  borrower_phone: string | null;
  expected_return: string | null;
  borrowed_at: string | null;
}

export interface OwnerDashboardResult {
  tools: OwnerTool[];
  stats: {
    total: number;
    lent_out: number;
    total_loans: number;
  };
}

export const getOwnerTools = createServerFn({ method: "GET" }).handler(
  async (): Promise<OwnerDashboardResult> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const db = getDb();

    const { results: tools } = await db
      .prepare(
        `SELECT t.*,
                ub.name AS borrower_name,
                ub.phone AS borrower_phone,
                lo.expected_return,
                lo.borrowed_at
         FROM tools t
         LEFT JOIN (
           SELECT l.tool_id, l.borrower_id, l.expected_return, l.borrowed_at
           FROM loans l
           WHERE l.returned_at IS NULL
         ) lo ON lo.tool_id = t.id
         LEFT JOIN users ub ON ub.id = lo.borrower_id
         WHERE t.owner_id = ?
         ORDER BY t.created_at DESC`,
      )
      .bind(user.id)
      .all<OwnerTool>();

    const total = tools?.length ?? 0;
    const lent_out = tools?.filter((t) => t.status === "checked_out").length ?? 0;

    const loanCount = await db
      .prepare(
        `SELECT COUNT(*) as c FROM loans l
         JOIN tools t ON t.id = l.tool_id
         WHERE t.owner_id = ?`,
      )
      .bind(user.id)
      .first<{ c: number }>();

    return {
      tools: tools ?? [],
      stats: {
        total,
        lent_out,
        total_loans: loanCount?.c ?? 0,
      },
    };
  },
);

// ---------------------------------------------------------------------------
// Create a tool
// ---------------------------------------------------------------------------

export const createTool = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      description?: string;
      category?: string;
      photo_url?: string;
      ai_metadata?: string;
    }) => {
      if (!data.name.trim()) throw new Error("Tool name required");
      return data;
    },
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const db = getDb();
    const id = generateId();

    await db
      .prepare(
        `INSERT INTO tools (id, owner_id, name, description, category, photo_url, ai_metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        user.id,
        data.name.trim(),
        data.description?.trim() || null,
        data.category?.trim() || null,
        data.photo_url || null,
        data.ai_metadata || null,
      )
      .run();

    return { id };
  });

// ---------------------------------------------------------------------------
// Update a tool (owner only)
// ---------------------------------------------------------------------------

export const updateTool = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      name?: string;
      description?: string;
      category?: string;
      photo_url?: string;
      status?: "available" | "disabled";
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const db = getDb();

    // Verify ownership
    const tool = await db
      .prepare("SELECT owner_id FROM tools WHERE id = ?")
      .bind(data.id)
      .first<{ owner_id: string }>();

    if (!tool || tool.owner_id !== user.id) {
      throw new Error("Tool not found or not yours");
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name.trim());
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      params.push(data.description.trim() || null);
    }
    if (data.category !== undefined) {
      updates.push("category = ?");
      params.push(data.category.trim() || null);
    }
    if (data.photo_url !== undefined) {
      updates.push("photo_url = ?");
      params.push(data.photo_url || null);
    }
    if (data.status !== undefined) {
      updates.push("status = ?");
      params.push(data.status);
    }

    if (updates.length === 0) return { ok: true };

    updates.push("updated_at = datetime('now')");
    params.push(data.id);

    await db
      .prepare(`UPDATE tools SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...params)
      .run();

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Delete a tool (owner only)
// ---------------------------------------------------------------------------

export const deleteTool = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const db = getDb();

    const tool = await db
      .prepare("SELECT owner_id FROM tools WHERE id = ?")
      .bind(data.id)
      .first<{ owner_id: string }>();

    if (!tool || tool.owner_id !== user.id) {
      throw new Error("Tool not found or not yours");
    }

    await db.prepare("DELETE FROM tools WHERE id = ?").bind(data.id).run();

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Upload image to R2
// ---------------------------------------------------------------------------

export const uploadImage = createServerFn({ method: "POST" })
  .inputValidator((data: { base64: string; filename: string }) => data)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const bucket = env.TOOL_IMAGES;
    const key = `tools/${user.id}/${Date.now()}-${data.filename}`;

    // Decode base64
    const binary = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));

    await bucket.put(key, binary, {
      httpMetadata: { contentType: "image/jpeg" },
    });

    // Return the public URL (assumes R2 bucket has public access or custom domain)
    const publicUrl = `https://images.toolibrary.app/${key}`;

    return { url: publicUrl, key };
  });

// ---------------------------------------------------------------------------
// Batch create tools (from AI intake)
// ---------------------------------------------------------------------------

export const batchCreateTools = createServerFn({ method: "POST" })
  .inputValidator(
    (
      data: Array<{
        name: string;
        description?: string;
        category?: string;
        photo_url?: string;
        ai_metadata?: string;
      }>,
    ) => {
      if (!Array.isArray(data) || data.length === 0)
        throw new Error("At least one tool required");
      return data;
    },
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const db = getDb();
    const ids: string[] = [];

    // D1 doesn't support multi-row inserts in a single prepare,
    // so we batch them in a transaction-like sequence
    const stmts = data.map((tool) => {
      const id = generateId();
      ids.push(id);
      return db
        .prepare(
          `INSERT INTO tools (id, owner_id, name, description, category, photo_url, ai_metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          user.id,
          tool.name.trim(),
          tool.description?.trim() || null,
          tool.category?.trim() || null,
          tool.photo_url || null,
          tool.ai_metadata || null,
        );
    });

    await db.batch(stmts);

    return { ids };
  });

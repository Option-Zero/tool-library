/** Client-facing notification server functions (createServerFn). */

import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { getDb } from "./db";
import { generateId } from "./crypto";
import { getCurrentUser } from "./auth";

// ---------------------------------------------------------------------------
// Subscribe to push notifications
// ---------------------------------------------------------------------------

export const subscribePush = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { endpoint: string; p256dh: string; auth: string }) => data,
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const db = getDb();
    const id = generateId();

    // Upsert: replace existing subscription for same endpoint
    await db
      .prepare(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET
           user_id = excluded.user_id,
           p256dh = excluded.p256dh,
           auth = excluded.auth`,
      )
      .bind(id, user.id, data.endpoint, data.p256dh, data.auth)
      .run();

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Unsubscribe from push notifications
// ---------------------------------------------------------------------------

export const unsubscribePush = createServerFn({ method: "POST" })
  .inputValidator((data: { endpoint: string }) => data)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const db = getDb();
    await db
      .prepare(
        "DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?",
      )
      .bind(data.endpoint, user.id)
      .run();

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Get VAPID public key (for client subscription)
// ---------------------------------------------------------------------------

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(
  async () => {
    const key = (env as Record<string, string>).VAPID_PUBLIC_KEY;
    if (!key) throw new Error("VAPID_PUBLIC_KEY not configured");
    return { key };
  },
);

// ---------------------------------------------------------------------------
// Get user's notifications (in-app notification center)
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: number;
  action_url: string | null;
  created_at: string;
}

export const getNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ notifications: AppNotification[]; unread: number }> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const db = getDb();

    const { results } = await db
      .prepare(
        `SELECT id, type, title, body, read, action_url, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 50`,
      )
      .bind(user.id)
      .all<AppNotification>();

    const unreadRow = await db
      .prepare(
        "SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0",
      )
      .bind(user.id)
      .first<{ c: number }>();

    return {
      notifications: results ?? [],
      unread: unreadRow?.c ?? 0,
    };
  },
);

// ---------------------------------------------------------------------------
// Mark notification(s) as read
// ---------------------------------------------------------------------------

export const markNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator((data: { ids?: string[]; all?: boolean }) => data)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const db = getDb();

    if (data.all) {
      await db
        .prepare(
          "UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0",
        )
        .bind(user.id)
        .run();
    } else if (data.ids && data.ids.length > 0) {
      // Mark specific notifications
      const placeholders = data.ids.map(() => "?").join(",");
      await db
        .prepare(
          `UPDATE notifications SET read = 1
           WHERE user_id = ? AND id IN (${placeholders})`,
        )
        .bind(user.id, ...data.ids)
        .run();
    }

    return { ok: true };
  });

/**
 * Internal notification dispatch — server-only.
 * Called from other server code (e.g., loan handlers, scheduled jobs).
 * NOT imported by client routes.
 */

import { env } from "cloudflare:workers";
import { getDb } from "./db";
import { generateId } from "./crypto";

export async function sendNotification(opts: {
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
}) {
  const db = getDb();
  const id = generateId();

  // Store in DB
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, action_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, opts.userId, opts.type, opts.title, opts.body, opts.actionUrl || null)
    .run();

  // Send push to all user's subscriptions
  await sendPushToUser(opts.userId, {
    title: opts.title,
    body: opts.body,
    url: opts.actionUrl || "/",
    tag: opts.type,
  });
}

/** Send Web Push to all subscriptions for a user. */
async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url: string; tag: string },
) {
  const db = getDb();
  const vapidPrivateKey = (env as Record<string, string>).VAPID_PRIVATE_KEY;
  const vapidPublicKey = (env as Record<string, string>).VAPID_PUBLIC_KEY;

  if (!vapidPrivateKey || !vapidPublicKey) return;

  const { results: subs } = await db
    .prepare(
      "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?",
    )
    .bind(userId)
    .all<{ id: string; endpoint: string; p256dh: string; auth: string }>();

  if (!subs || subs.length === 0) {
    // Fallback: send email
    await sendEmailFallback(userId, payload.title, payload.body);
    return;
  }

  const payloadStr = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      const response = await sendWebPush(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payloadStr,
        vapidPublicKey,
        vapidPrivateKey,
      );

      // Remove expired subscriptions
      if (response.status === 410 || response.status === 404) {
        await db
          .prepare("DELETE FROM push_subscriptions WHERE id = ?")
          .bind(sub.id)
          .run();
      }
    } catch (err) {
      console.error(`Push failed for sub ${sub.id}:`, err);
    }
  }
}

/** Minimal Web Push send using CF Workers fetch. */
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  _vapidPublicKey: string,
  _vapidPrivateKey: string,
): Promise<Response> {
  // For MVP, use a lightweight fetch-based approach.
  // Full VAPID + encryption requires web-push-libs/web-push or similar.
  // In production, integrate web-push library or use CF's Push API integration.
  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      TTL: "86400",
    },
    body: payload,
  });

  return res;
}

/** Email fallback for users without push subscriptions. */
async function sendEmailFallback(
  userId: string,
  title: string,
  body: string,
) {
  const db = getDb();
  const resendKey = (env as Record<string, string>).RESEND_API_KEY;
  if (!resendKey) return;

  const user = await db
    .prepare("SELECT email FROM users WHERE id = ?")
    .bind(userId)
    .first<{ email: string }>();

  if (!user) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Tool Library <noreply@toolibrary.app>",
      to: [user.email],
      subject: title,
      html: `<p>${body}</p><p><a href="https://toolibrary.app">Open Tool Library</a></p>`,
    }),
  });
}

/** Auth server functions: magic link login, session management. */

import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { getDb } from "./db";
import { generateId, generateToken } from "./crypto";

const SESSION_COOKIE = "tl_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const MAGIC_TOKEN_TTL = 15 * 60 * 1000; // 15 minutes in ms

// ---------------------------------------------------------------------------
// Get current user from session cookie
// ---------------------------------------------------------------------------

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
};

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthUser | null> => {
    const sessionToken = getCookie(SESSION_COOKIE);
    if (!sessionToken) return null;

    const db = getDb();
    const row = await db
      .prepare(
        `SELECT u.id, u.name, u.email, u.phone, u.address
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > datetime('now')`,
      )
      .bind(sessionToken)
      .first<AuthUser>();

    return row ?? null;
  },
);

// ---------------------------------------------------------------------------
// Request magic link: check allowlist, generate token, send email
// ---------------------------------------------------------------------------

export const requestMagicLink = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => {
    const email = data.email.toLowerCase().trim();
    if (!email || !email.includes("@")) {
      throw new Error("Valid email required");
    }
    return { email };
  })
  .handler(async ({ data }) => {
    const db = getDb();

    // Check allowlist
    const allowed = await db
      .prepare("SELECT email FROM allowlist WHERE email = ?")
      .bind(data.email)
      .first();

    if (!allowed) {
      return {
        ok: false as const,
        error: "not_on_allowlist" as const,
      };
    }

    // Generate magic token
    const id = generateId();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + MAGIC_TOKEN_TTL).toISOString();

    await db
      .prepare(
        "INSERT INTO magic_tokens (id, email, token, expires_at) VALUES (?, ?, ?, ?)",
      )
      .bind(id, data.email, token, expiresAt)
      .run();

    // Send email via Resend
    const resendKey = (env as Record<string, string>).RESEND_API_KEY;
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const appUrl = (env as Record<string, string>).APP_URL || "https://toolibrary.app";
    const magicUrl = `${appUrl}/auth/verify?token=${token}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Tool Library <noreply@toolibrary.app>",
        to: [data.email],
        subject: "Your login link — Tool Library",
        html: `
          <p>Hi! Click the link below to sign in to Tool Library:</p>
          <p><a href="${magicUrl}" style="display:inline-block;padding:12px 24px;background:#9A6530;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Sign in</a></p>
          <p style="color:#736E69;font-size:14px;">This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to send email: ${res.status} ${body}`);
    }

    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Verify magic token: validate, create/find user, create session
// ---------------------------------------------------------------------------

export const verifyMagicToken = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();

    // Find and validate token
    const tokenRow = await db
      .prepare(
        `SELECT id, email FROM magic_tokens
         WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
      )
      .bind(data.token)
      .first<{ id: string; email: string }>();

    if (!tokenRow) {
      return { ok: false as const, error: "invalid_or_expired" as const };
    }

    // Mark token as used
    await db
      .prepare("UPDATE magic_tokens SET used = 1 WHERE id = ?")
      .bind(tokenRow.id)
      .run();

    // Find or create user
    let user = await db
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(tokenRow.email)
      .first<{ id: string }>();

    if (!user) {
      const userId = generateId();
      // Default name from email prefix
      const name = tokenRow.email.split("@")[0];
      await db
        .prepare(
          "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
        )
        .bind(userId, name, tokenRow.email)
        .run();
      user = { id: userId };
    }

    // Create session
    const sessionId = generateId();
    const sessionToken = generateToken();
    const expiresAt = new Date(
      Date.now() + SESSION_MAX_AGE * 1000,
    ).toISOString();

    await db
      .prepare(
        "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
      )
      .bind(sessionId, user.id, sessionToken, expiresAt)
      .run();

    // Set session cookie
    setCookie(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    // Redirect to app
    throw redirect({ to: "/" });
  });

// ---------------------------------------------------------------------------
// Logout: clear session
// ---------------------------------------------------------------------------

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const sessionToken = getCookie(SESSION_COOKIE);

  if (sessionToken) {
    const db = getDb();
    await db
      .prepare("DELETE FROM sessions WHERE token = ?")
      .bind(sessionToken)
      .run();
  }

  // Clear cookie
  setCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  throw redirect({ to: "/login" });
});

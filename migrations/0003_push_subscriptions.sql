-- 0003_push_subscriptions.sql
-- Web Push subscription storage

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- Add action_url to notifications for click-to-navigate (idempotent)
-- SQLite ALTER TABLE ADD COLUMN doesn't support IF NOT EXISTS,
-- so we check the pragma first via the migration runner.
-- If this fails with "duplicate column", the column already exists — safe to skip.
ALTER TABLE notifications ADD COLUMN action_url TEXT;

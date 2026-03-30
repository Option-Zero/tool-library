-- 0001_initial.sql
-- Tool Library MVP schema

-- Admin-managed allowlist (email-based membership)
CREATE TABLE IF NOT EXISTS allowlist (
  email TEXT PRIMARY KEY,
  added_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Registered users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Auth: email magic link tokens
CREATE TABLE IF NOT EXISTS magic_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Auth: sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tools catalog
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'checked_out', 'disabled')),
  ai_metadata TEXT, -- JSON blob from Gemini tool recognition
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Loan records (borrow/return tracking)
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL REFERENCES tools(id),
  borrower_id TEXT NOT NULL REFERENCES users(id),
  borrowed_at TEXT NOT NULL DEFAULT (datetime('now')),
  expected_return TEXT,
  returned_at TEXT,
  location_verified INTEGER NOT NULL DEFAULT 0,
  borrow_photo_url TEXT,
  return_photo_url TEXT
);

-- Push/SMS/email notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tools_owner ON tools(owner_id);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_loans_tool ON loans(tool_id);
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_active ON loans(tool_id, returned_at) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_token ON magic_tokens(token);

-- Migration tracking
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

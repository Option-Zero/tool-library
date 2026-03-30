-- 0002_fts_search.sql
-- Full-text search for tool discovery

CREATE VIRTUAL TABLE IF NOT EXISTS tools_fts USING fts5(
  name,
  description,
  category,
  content='tools',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync with tools table
CREATE TRIGGER IF NOT EXISTS tools_ai AFTER INSERT ON tools BEGIN
  INSERT INTO tools_fts(rowid, name, description, category)
  VALUES (new.rowid, new.name, new.description, new.category);
END;

CREATE TRIGGER IF NOT EXISTS tools_ad AFTER DELETE ON tools BEGIN
  INSERT INTO tools_fts(tools_fts, rowid, name, description, category)
  VALUES ('delete', old.rowid, old.name, old.description, old.category);
END;

CREATE TRIGGER IF NOT EXISTS tools_au AFTER UPDATE ON tools BEGIN
  INSERT INTO tools_fts(tools_fts, rowid, name, description, category)
  VALUES ('delete', old.rowid, old.name, old.description, old.category);
  INSERT INTO tools_fts(rowid, name, description, category)
  VALUES (new.rowid, new.name, new.description, new.category);
END;

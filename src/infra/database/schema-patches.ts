import type Database from 'better-sqlite3';

interface TableColumn {
  name: string;
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as TableColumn[];
  return rows.some((row) => row.name === column);
}

export function applySchemaPatches(db: Database.Database): void {
  if (!hasColumn(db, 'guild_settings', 'quarantine_fuzzy_images')) {
    db.exec(
      'ALTER TABLE guild_settings ADD COLUMN quarantine_fuzzy_images INTEGER NOT NULL DEFAULT 1',
    );
  }

  if (!hasColumn(db, 'guild_settings', 'quarantine_duration_seconds')) {
    db.exec(
      'ALTER TABLE guild_settings ADD COLUMN quarantine_duration_seconds INTEGER NOT NULL DEFAULT 900',
    );
  }

  if (!hasColumn(db, 'detection_logs', 'trust_score')) {
    db.exec('ALTER TABLE detection_logs ADD COLUMN trust_score INTEGER');
  }

  if (!hasColumn(db, 'detection_logs', 'restored_at')) {
    db.exec('ALTER TABLE detection_logs ADD COLUMN restored_at TEXT');
  }

  if (!hasColumn(db, 'detection_logs', 'restored_by')) {
    db.exec('ALTER TABLE detection_logs ADD COLUMN restored_by TEXT');
  }
}

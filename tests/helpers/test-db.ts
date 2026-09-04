import Database from 'better-sqlite3';
import { MIGRATION_SQL } from '../../src/infra/database/schema.sql.js';
import { applySchemaPatches } from '../../src/infra/database/schema-patches.js';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(MIGRATION_SQL);
  applySchemaPatches(db);
  return db;
}

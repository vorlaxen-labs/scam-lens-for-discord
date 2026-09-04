import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { databaseConfig } from '../../config/index.js';
import { MIGRATION_SQL } from './schema.sql.js';
import { applySchemaPatches } from './schema-patches.js';
import { logger } from '../logger/index.js';

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  readonly db: Database.Database;

  private constructor(dbPath: string) {
    const directory = path.dirname(dbPath);
    fs.mkdirSync(directory, { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(databaseConfig.path);
    }
    return DatabaseService.instance;
  }

  initialize(): void {
    this.db.exec(MIGRATION_SQL);
    applySchemaPatches(this.db);
    logger.info({ path: databaseConfig.path }, 'SQLite database initialized');
  }

  close(): void {
    this.db.close();
    DatabaseService.instance = null;
    logger.info('SQLite database closed');
  }
}

export function getDb(): Database.Database {
  return DatabaseService.getInstance().db;
}

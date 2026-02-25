import * as SQLite from 'expo-sqlite';
import { migration001 } from './migrations/001-initial';

interface Migration {
  version: number;
  up(db: SQLite.SQLiteDatabase): void;
}

const migrations: Migration[] = [migration001];

const DB_NAME = 'dungeonmind.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (dbInstance) {
    return dbInstance;
  }

  const db = SQLite.openDatabaseSync(DB_NAME);

  db.execSync('PRAGMA journal_mode = WAL');
  db.execSync('PRAGMA foreign_keys = ON');

  runMigrations(db);

  dbInstance = db;
  return db;
}

function runMigrations(db: SQLite.SQLiteDatabase): void {
  db.execSync(
    'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)'
  );

  const row = db.getFirstSync<{ version: number }>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
  );
  const currentVersion = row?.version ?? 0;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      db.withTransactionSync(() => {
        migration.up(db);
        if (currentVersion === 0 && migration.version === 1) {
          db.runSync('INSERT INTO schema_version (version) VALUES (?)', [
            migration.version,
          ]);
        } else {
          db.runSync('UPDATE schema_version SET version = ?', [
            migration.version,
          ]);
        }
      });
    }
  }
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.closeSync();
    dbInstance = null;
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

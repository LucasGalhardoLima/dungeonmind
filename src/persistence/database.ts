import { randomUUID } from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { migration001 } from './migrations/001-initial';
import { migration002 } from './migrations/002-dnd-mechanics';
import { migration003 } from './migrations/003-onboarding';
import { migration004 } from './migrations/004-ashenmoor';
import { migration005 } from './migrations/005-feedback';
import { migration006 } from './migrations/006-analytics';

interface Migration {
  version: number;
  up(db: SQLite.SQLiteDatabase): void;
}

const migrations: Migration[] = [migration001, migration002, migration003, migration004, migration005, migration006];

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
  return randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Shared test database setup. The repositories' singleton client
 * resolves DATABASE_PATH at first import — we point it at a tmp file
 * that lives for the lifetime of the test process, then truncate the
 * tables before each test.
 */
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const tmp = path.join(os.tmpdir(), `pl-test-${process.pid}-${Date.now()}.db`)
process.env.DATABASE_PATH = tmp

// Run migrations on the temp DB so the schema exists before the
// repository modules open their singleton connection.
const sqlite = new Database(tmp)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite)
const migrationsFolder = path.resolve(__dirname, '..', 'drizzle')
migrate(db, { migrationsFolder })
sqlite.close()

export const TEST_DB_PATH = tmp

/**
 * Truncate both tables. Call from beforeEach in repository specs.
 * We use a fresh sqlite handle (the repositories also have their own
 * singleton — both point at the same file).
 */
export function truncateTables(): void {
  const conn = new Database(tmp)
  conn.pragma('foreign_keys = ON')
  conn.exec('DELETE FROM tasks; DELETE FROM lists;')
  conn.close()
}

// Best-effort cleanup when the process exits.
process.on('exit', () => {
  try {
    fs.rmSync(tmp, { force: true })
    fs.rmSync(`${tmp}-wal`, { force: true })
    fs.rmSync(`${tmp}-shm`, { force: true })
  } catch {
    // ignore
  }
})

/**
 * Apply pending Drizzle migrations to the SQLite database.
 *
 * Run via `pnpm db:migrate`. Idempotent — Drizzle tracks which migrations
 * have already been applied in __drizzle_migrations.
 */
import path from 'node:path'
import fs from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

function main() {
  const dbPath =
    process.env.DATABASE_PATH ?? path.resolve(process.cwd(), 'data', 'app.db')
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const sqlite = new Database(dbPath)
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite)
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle')
  console.log(`→ migrating ${dbPath}`)
  console.log(`  from ${migrationsFolder}`)
  migrate(db, { migrationsFolder })
  sqlite.close()
  console.log('✓ migrations complete')
}

main()

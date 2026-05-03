import 'server-only'
import { randomUUID } from 'node:crypto'
import { eq, asc, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { lists, type List } from '@/lib/db/schema'

const nowSql = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`

export async function listAll(): Promise<List[]> {
  return db.select().from(lists).orderBy(asc(lists.position), asc(lists.createdAt)).all()
}

export async function getById(id: string): Promise<List | null> {
  const row = db.select().from(lists).where(eq(lists.id, id)).get()
  return row ?? null
}

export async function create(name: string): Promise<List> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('VALIDATION: list name is required')
  const id = randomUUID()
  // Append at the end
  const maxRow = db
    .select({ max: sql<number>`coalesce(max(${lists.position}), -1)` })
    .from(lists)
    .get()
  const nextPosition = (maxRow?.max ?? -1) + 1
  db.insert(lists)
    .values({ id, name: trimmed, position: nextPosition })
    .run()
  return getById(id) as Promise<List>
}

export async function update(
  id: string,
  patch: { name?: string; position?: number },
): Promise<List | null> {
  const existing = await getById(id)
  if (!existing) return null

  const set: Record<string, unknown> = { updatedAt: nowSql }
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim()
    if (!trimmed) throw new Error('VALIDATION: list name is required')
    set.name = trimmed
  }
  if (patch.position !== undefined) {
    if (!Number.isInteger(patch.position) || patch.position < 0)
      throw new Error('VALIDATION: position must be a non-negative integer')
    set.position = patch.position
  }
  db.update(lists).set(set).where(eq(lists.id, id)).run()
  return getById(id)
}

export async function remove(id: string): Promise<boolean> {
  const existing = await getById(id)
  if (!existing) return false
  // Tasks cascade automatically via FK
  db.delete(lists).where(eq(lists.id, id)).run()
  return true
}

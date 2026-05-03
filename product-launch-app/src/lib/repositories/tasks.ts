import 'server-only'
import { randomUUID } from 'node:crypto'
import { eq, and, asc, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { tasks, lists, type Task, TASK_STATUSES, type TaskStatus } from '@/lib/db/schema'

const nowSql = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`

function isStatus(s: unknown): s is TaskStatus {
  return typeof s === 'string' && (TASK_STATUSES as readonly string[]).includes(s)
}

export async function listFiltered(filters: {
  listId?: string
  status?: TaskStatus
}): Promise<Task[]> {
  const conds = []
  if (filters.listId) conds.push(eq(tasks.listId, filters.listId))
  if (filters.status) conds.push(eq(tasks.status, filters.status))
  const where = conds.length === 0 ? undefined : conds.length === 1 ? conds[0] : and(...conds)
  const query = db.select().from(tasks)
  return (where ? query.where(where) : query)
    .orderBy(asc(tasks.position), asc(tasks.createdAt))
    .all()
}

export async function getById(id: string): Promise<Task | null> {
  const row = db.select().from(tasks).where(eq(tasks.id, id)).get()
  return row ?? null
}

export async function create(input: {
  listId: string
  title: string
  description?: string | null
  status?: TaskStatus
}): Promise<Task> {
  const title = input.title.trim()
  if (!title) throw new Error('VALIDATION: title is required')
  const status = input.status ?? 'backlog'
  if (!isStatus(status)) throw new Error('VALIDATION: invalid status')

  // Confirm list exists
  const listRow = db.select().from(lists).where(eq(lists.id, input.listId)).get()
  if (!listRow) throw new Error('NOT_FOUND: list not found')

  // Append at the end of the column
  const maxRow = db
    .select({ max: sql<number>`coalesce(max(${tasks.position}), -1)` })
    .from(tasks)
    .where(and(eq(tasks.listId, input.listId), eq(tasks.status, status)))
    .get()
  const position = (maxRow?.max ?? -1) + 1

  const id = randomUUID()
  db.insert(tasks)
    .values({
      id,
      listId: input.listId,
      title,
      description: input.description ?? null,
      status,
      position,
      tokensSpent: 0,
      completedAt: status === 'done' ? sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))` : null,
    })
    .run()
  return getById(id) as Promise<Task>
}

export async function update(
  id: string,
  patch: {
    title?: string
    description?: string | null
    tokensSpent?: number
    status?: TaskStatus
  },
): Promise<Task | null> {
  const existing = await getById(id)
  if (!existing) return null

  const set: Record<string, unknown> = { updatedAt: nowSql }

  if (patch.title !== undefined) {
    const trimmed = patch.title.trim()
    if (!trimmed) throw new Error('VALIDATION: title is required')
    set.title = trimmed
  }
  if (patch.description !== undefined) set.description = patch.description
  if (patch.tokensSpent !== undefined) {
    if (!Number.isInteger(patch.tokensSpent) || patch.tokensSpent < 0)
      throw new Error('VALIDATION: tokensSpent must be a non-negative integer')
    set.tokensSpent = patch.tokensSpent
  }
  if (patch.status !== undefined) {
    if (!isStatus(patch.status)) throw new Error('VALIDATION: invalid status')
    set.status = patch.status
    if (patch.status === 'done' && existing.status !== 'done') {
      set.completedAt = nowSql
    } else if (patch.status !== 'done' && existing.status === 'done') {
      set.completedAt = null
    }
    // If status changed, also rebalance: append at the end of the new column
    if (patch.status !== existing.status) {
      const maxRow = db
        .select({ max: sql<number>`coalesce(max(${tasks.position}), -1)` })
        .from(tasks)
        .where(and(eq(tasks.listId, existing.listId), eq(tasks.status, patch.status)))
        .get()
      set.position = (maxRow?.max ?? -1) + 1
    }
  }
  db.update(tasks).set(set).where(eq(tasks.id, id)).run()
  return getById(id)
}

export async function remove(id: string): Promise<boolean> {
  const existing = await getById(id)
  if (!existing) return false
  db.delete(tasks).where(eq(tasks.id, id)).run()
  return true
}

/**
 * Atomic move: change status and/or position for a task. Rebalances the
 * affected columns:
 *
 *  - Source column: rows with position > old position shift down by 1.
 *  - Target column: rows with position >= new position shift up by 1
 *    (creating a slot for the moved card).
 *
 * If `position` is greater than the current count of the target column,
 * it is clamped.
 */
export async function move(
  id: string,
  target: { status: TaskStatus; position: number },
): Promise<Task | null> {
  if (!isStatus(target.status)) throw new Error('VALIDATION: invalid status')
  if (!Number.isInteger(target.position) || target.position < 0)
    throw new Error('VALIDATION: position must be a non-negative integer')

  const existing = await getById(id)
  if (!existing) return null

  // Compute target column size to clamp
  const countRow = db
    .select({ n: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.listId, existing.listId), eq(tasks.status, target.status)))
    .get()
  const targetColCount = countRow?.n ?? 0

  // If moving within the same column, the moved row is already counted.
  // Clamp accordingly.
  const sameCol = existing.status === target.status
  const maxAllowed = sameCol ? Math.max(0, targetColCount - 1) : targetColCount
  const newPos = Math.min(target.position, maxAllowed)

  // Pull the row "out" first by setting its position to a sentinel so the
  // shifts below don't touch it.
  db.update(tasks).set({ position: -1 }).where(eq(tasks.id, id)).run()

  if (sameCol) {
    // Close the gap left by removing the row from its old position
    db.update(tasks)
      .set({ position: sql`${tasks.position} - 1` })
      .where(
        and(
          eq(tasks.listId, existing.listId),
          eq(tasks.status, existing.status),
          gte(tasks.position, existing.position + 1),
        ),
      )
      .run()
  } else {
    // Close gap in old column
    db.update(tasks)
      .set({ position: sql`${tasks.position} - 1` })
      .where(
        and(
          eq(tasks.listId, existing.listId),
          eq(tasks.status, existing.status),
          gte(tasks.position, existing.position + 1),
        ),
      )
      .run()
  }

  // Open slot in new column at newPos
  db.update(tasks)
    .set({ position: sql`${tasks.position} + 1` })
    .where(
      and(
        eq(tasks.listId, existing.listId),
        eq(tasks.status, target.status),
        gte(tasks.position, newPos),
      ),
    )
    .run()

  // Place the moved row at the new spot
  const set: Record<string, unknown> = {
    status: target.status,
    position: newPos,
    updatedAt: nowSql,
  }
  if (target.status === 'done' && existing.status !== 'done') set.completedAt = nowSql
  if (target.status !== 'done' && existing.status === 'done') set.completedAt = null
  db.update(tasks).set(set).where(eq(tasks.id, id)).run()

  return getById(id)
}

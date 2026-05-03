import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

/**
 * Lists — top-level groupings (e.g. "App", "Content", "Teachers Zone").
 *
 * `position` is an integer used for sidebar ordering; tasks are deleted
 * when their list is deleted (cascade).
 */
export const lists = sqliteTable('lists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
})

/**
 * Tasks — kanban cards. Each belongs to exactly one list and has one of
 * five statuses. `position` orders cards within (list_id, status).
 *
 * `tokens_spent` is manually maintained — Claude Code (or the user) sets
 * it via PATCH/MCP at any time. `completed_at` is auto-managed by the
 * repository when status enters/leaves "done".
 */
export const TASK_STATUSES = ['backlog', 'started', 'checked', 'review', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    listId: text('list_id')
      .notNull()
      .references(() => lists.id, { onDelete: 'cascade' }),
    status: text('status', { enum: TASK_STATUSES }).notNull().default('backlog'),
    title: text('title').notNull(),
    description: text('description'),
    position: integer('position').notNull().default(0),
    tokensSpent: integer('tokens_spent').notNull().default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    completedAt: text('completed_at'),
  },
  (t) => [
    index('tasks_list_status_position_idx').on(t.listId, t.status, t.position),
    index('tasks_list_position_idx').on(t.listId, t.position),
  ],
)

export type List = typeof lists.$inferSelect
export type NewList = typeof lists.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert

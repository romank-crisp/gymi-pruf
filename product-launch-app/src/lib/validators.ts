/**
 * Zod schemas shared across REST handlers, the MCP server, and the
 * client. Each request schema validates incoming JSON; entity schemas
 * are reference shapes for documentation/typing.
 */
import { z } from 'zod'
import { TASK_STATUSES } from '@/lib/db/schema'

export const taskStatusSchema = z.enum(TASK_STATUSES)

// ── Lists ────────────────────────────────────────────────────────────────
export const createListSchema = z.object({
  name: z.string().min(1).max(100),
})

export const updateListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().min(0).optional(),
})

// ── Tasks ────────────────────────────────────────────────────────────────
export const taskFilterSchema = z.object({
  listId: z.string().min(1).optional(),
  status: taskStatusSchema.optional(),
})

export const createTaskSchema = z.object({
  listId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  status: taskStatusSchema.optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  tokensSpent: z.number().int().min(0).optional(),
  status: taskStatusSchema.optional(),
})

export const moveTaskSchema = z.object({
  status: taskStatusSchema,
  position: z.number().int().min(0),
})

export type CreateListInput = z.infer<typeof createListSchema>
export type UpdateListInput = z.infer<typeof updateListSchema>
export type TaskFilter = z.infer<typeof taskFilterSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type MoveTaskInput = z.infer<typeof moveTaskSchema>

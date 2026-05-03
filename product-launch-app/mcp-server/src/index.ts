#!/usr/bin/env node
/**
 * Product Launch MCP server.
 *
 * Stdio transport. Exposes 10 tools mirroring the REST API:
 *   - lists:  list_lists, create_list, update_list, delete_list
 *   - tasks:  list_tasks, get_task, create_task, update_task,
 *             delete_task, move_task
 *
 * The tools are thin wrappers around fetch() calls to the Next.js app.
 * Set PRODUCT_LAUNCH_API_URL to override the default
 * http://localhost:3001.
 *
 * The Next.js dev/prod server must be running for this MCP server to
 * be useful. Failures bubble up as tool errors.
 *
 * Register once with Claude Code:
 *
 *   claude mcp add product-launch \
 *     node /absolute/path/to/product-launch-app/mcp-server/dist/index.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

const API_URL = (process.env.PRODUCT_LAUNCH_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')

const TASK_STATUSES = ['backlog', 'started', 'checked', 'review', 'done'] as const
const taskStatusSchema = z.enum(TASK_STATUSES)

// ── tool schemas ────────────────────────────────────────────────────────

const schemas = {
  list_lists: z.object({}),
  create_list: z.object({
    name: z.string().min(1).max(100).describe('Display name of the list'),
  }),
  update_list: z.object({
    id: z.string().describe('List ID (uuid)'),
    name: z.string().min(1).max(100).optional(),
    position: z.number().int().min(0).optional(),
  }),
  delete_list: z.object({
    id: z.string().describe('List ID — cascades to all tasks in this list'),
  }),

  list_tasks: z.object({
    listId: z.string().optional().describe('Restrict to one list'),
    status: taskStatusSchema.optional().describe('Restrict to one status column'),
  }),
  get_task: z.object({ id: z.string() }),
  create_task: z.object({
    listId: z.string().describe('Parent list ID'),
    title: z.string().min(1).max(200),
    description: z.string().nullable().optional().describe('Markdown description'),
    status: taskStatusSchema.optional().describe('Defaults to backlog'),
  }),
  update_task: z.object({
    id: z.string(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().nullable().optional(),
    tokensSpent: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Whole tokens spent on this task'),
    status: taskStatusSchema.optional(),
  }),
  delete_task: z.object({ id: z.string() }),
  move_task: z.object({
    id: z.string(),
    status: taskStatusSchema,
    position: z.number().int().min(0),
  }),
} as const

const TOOL_DESCRIPTIONS: Record<keyof typeof schemas, string> = {
  list_lists: 'Return all lists ordered by position.',
  create_list: 'Create a new list. Position is auto-assigned to the end.',
  update_list: 'Rename a list and/or change its sidebar position.',
  delete_list: 'Delete a list and all its tasks (cascade).',
  list_tasks: 'Return tasks, optionally filtered by listId and/or status.',
  get_task: 'Fetch one task by ID.',
  create_task:
    'Create a task at the end of its column (or in backlog if no status given).',
  update_task:
    'Patch a task. completedAt is auto-managed when status enters/leaves "done".',
  delete_task: 'Delete a task permanently.',
  move_task:
    'Move a task to a (status, position) atomically. Rebalances both source and target columns.',
}

// ── helpers ─────────────────────────────────────────────────────────────

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const msg =
      errBody?.error?.message ??
      `${res.status} ${res.statusText}: ${path}`
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function toolResult(value: unknown) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(value, null, 2) },
    ],
  }
}

function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Minimal hand-rolled zod → JSON Schema for the shapes used here.
  // The MCP SDK accepts any JSON Schema for `inputSchema`.
  // For empty-shape schemas, return a permissive object.
  const out = z.toJSONSchema(schema, { reused: 'inline' })
  // The MCP spec requires a top-level `type: object`; ensure it.
  if (typeof out === 'object' && out !== null && !('type' in out)) {
    return { type: 'object', ...(out as Record<string, unknown>) }
  }
  return out as Record<string, unknown>
}

// ── server wiring ───────────────────────────────────────────────────────

const server = new Server(
  { name: 'product-launch', version: '0.1.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: (Object.keys(schemas) as Array<keyof typeof schemas>).map((name) => ({
    name,
    description: TOOL_DESCRIPTIONS[name],
    inputSchema: zodToJsonSchema(schemas[name]),
  })),
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name as keyof typeof schemas
  const rawArgs = req.params.arguments ?? {}
  const schema = schemas[name]
  if (!schema) throw new Error(`unknown tool: ${name}`)
  const args = schema.parse(rawArgs)

  try {
    switch (name) {
      case 'list_lists':
        return toolResult(await request('GET', '/api/lists'))
      case 'create_list':
        return toolResult(
          await request('POST', '/api/lists', { name: (args as { name: string }).name }),
        )
      case 'update_list': {
        const a = args as { id: string; name?: string; position?: number }
        const { id, ...patch } = a
        return toolResult(await request('PATCH', `/api/lists/${id}`, patch))
      }
      case 'delete_list': {
        const a = args as { id: string }
        await request('DELETE', `/api/lists/${a.id}`)
        return toolResult({ ok: true, id: a.id })
      }
      case 'list_tasks': {
        const a = args as { listId?: string; status?: string }
        const params = new URLSearchParams()
        if (a.listId) params.set('listId', a.listId)
        if (a.status) params.set('status', a.status)
        const qs = params.toString()
        return toolResult(
          await request('GET', `/api/tasks${qs ? `?${qs}` : ''}`),
        )
      }
      case 'get_task': {
        const a = args as { id: string }
        return toolResult(await request('GET', `/api/tasks/${a.id}`))
      }
      case 'create_task': {
        return toolResult(await request('POST', '/api/tasks', args))
      }
      case 'update_task': {
        const a = args as Record<string, unknown> & { id: string }
        const { id, ...patch } = a
        return toolResult(await request('PATCH', `/api/tasks/${id}`, patch))
      }
      case 'delete_task': {
        const a = args as { id: string }
        await request('DELETE', `/api/tasks/${a.id}`)
        return toolResult({ ok: true, id: a.id })
      }
      case 'move_task': {
        const a = args as { id: string; status: string; position: number }
        return toolResult(
          await request('POST', `/api/tasks/${a.id}/move`, {
            status: a.status,
            position: a.position,
          }),
        )
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text' as const, text: `Error: ${message}` }],
      isError: true,
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)

// Stay alive until stdin closes (transport handles that for us).
console.error(`product-launch MCP server connected (API: ${API_URL})`)

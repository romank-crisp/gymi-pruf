/**
 * Thin client wrapper over the REST API. Used by client components.
 * Always relative URLs so it works under any hostname.
 */
import type { List, Task, TaskStatus } from '@/lib/db/schema'

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      body?.error?.message ?? `Request failed: ${res.status} ${res.statusText}`,
    )
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  lists: {
    list: () => jsonFetch<List[]>('/api/lists'),
    create: (name: string) =>
      jsonFetch<List>('/api/lists', { method: 'POST', body: JSON.stringify({ name }) }),
    update: (id: string, patch: { name?: string; position?: number }) =>
      jsonFetch<List>(`/api/lists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    remove: (id: string) =>
      jsonFetch<void>(`/api/lists/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (filters: { listId?: string; status?: TaskStatus } = {}) => {
      const params = new URLSearchParams()
      if (filters.listId) params.set('listId', filters.listId)
      if (filters.status) params.set('status', filters.status)
      const qs = params.toString()
      return jsonFetch<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`)
    },
    get: (id: string) => jsonFetch<Task>(`/api/tasks/${id}`),
    create: (input: {
      listId: string
      title: string
      description?: string | null
      status?: TaskStatus
    }) =>
      jsonFetch<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) }),
    update: (
      id: string,
      patch: {
        title?: string
        description?: string | null
        tokensSpent?: number
        status?: TaskStatus
      },
    ) =>
      jsonFetch<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    move: (id: string, target: { status: TaskStatus; position: number }) =>
      jsonFetch<Task>(`/api/tasks/${id}/move`, {
        method: 'POST',
        body: JSON.stringify(target),
      }),
    remove: (id: string) =>
      jsonFetch<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  },
}

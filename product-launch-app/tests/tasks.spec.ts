import { describe, it, expect, beforeEach } from 'vitest'
import { truncateTables } from './db-test-helper'
import * as listsRepo from '@/lib/repositories/lists'
import * as tasksRepo from '@/lib/repositories/tasks'

async function setupListWithTasks(taskTitles: string[]) {
  const list = await listsRepo.create('App')
  const created = []
  for (const title of taskTitles) {
    created.push(await tasksRepo.create({ listId: list.id, title }))
  }
  return { list, tasks: created }
}

describe('tasks repository', () => {
  beforeEach(() => truncateTables())

  // ── create ─────────────────────────────────────────────────────────────
  it('creates a task with default status backlog and incremented position', async () => {
    const { list, tasks } = await setupListWithTasks(['A', 'B', 'C'])
    expect(tasks[0].status).toBe('backlog')
    expect(tasks.map((t) => t.position)).toEqual([0, 1, 2])
    expect(tasks.every((t) => t.listId === list.id)).toBe(true)
  })

  it('rejects creating a task on a missing list', async () => {
    await expect(
      tasksRepo.create({ listId: 'no-such-list', title: 'X' }),
    ).rejects.toThrow(/NOT_FOUND/)
  })

  it('rejects empty titles', async () => {
    const list = await listsRepo.create('App')
    await expect(tasksRepo.create({ listId: list.id, title: '   ' })).rejects.toThrow(
      /VALIDATION/,
    )
  })

  it('sets completedAt when created in done status', async () => {
    const list = await listsRepo.create('App')
    const t = await tasksRepo.create({ listId: list.id, title: 'X', status: 'done' })
    expect(t.completedAt).toBeTruthy()
  })

  // ── update ─────────────────────────────────────────────────────────────
  it('updates title and tokensSpent', async () => {
    const { tasks } = await setupListWithTasks(['A'])
    const updated = await tasksRepo.update(tasks[0].id, {
      title: 'A renamed',
      tokensSpent: 12345,
    })
    expect(updated?.title).toBe('A renamed')
    expect(updated?.tokensSpent).toBe(12345)
  })

  it('rejects negative tokensSpent', async () => {
    const { tasks } = await setupListWithTasks(['A'])
    await expect(
      tasksRepo.update(tasks[0].id, { tokensSpent: -1 }),
    ).rejects.toThrow(/VALIDATION/)
  })

  it('sets completedAt on transition to done; clears on transition away', async () => {
    const { tasks } = await setupListWithTasks(['A'])
    const done = await tasksRepo.update(tasks[0].id, { status: 'done' })
    expect(done?.completedAt).toBeTruthy()

    const back = await tasksRepo.update(tasks[0].id, { status: 'review' })
    expect(back?.completedAt).toBeNull()
  })

  // ── move ───────────────────────────────────────────────────────────────
  it('move within same column reorders correctly', async () => {
    const { list, tasks } = await setupListWithTasks(['A', 'B', 'C', 'D'])
    // Move A from position 0 to position 2 → expect [B, C, A, D]
    await tasksRepo.move(tasks[0].id, { status: 'backlog', position: 2 })
    const after = await tasksRepo.listFiltered({ listId: list.id, status: 'backlog' })
    expect(after.map((t) => t.title)).toEqual(['B', 'C', 'A', 'D'])
  })

  it('move within same column toward 0 reorders correctly', async () => {
    const { list, tasks } = await setupListWithTasks(['A', 'B', 'C', 'D'])
    // Move D from position 3 to position 0 → expect [D, A, B, C]
    await tasksRepo.move(tasks[3].id, { status: 'backlog', position: 0 })
    const after = await tasksRepo.listFiltered({ listId: list.id, status: 'backlog' })
    expect(after.map((t) => t.title)).toEqual(['D', 'A', 'B', 'C'])
  })

  it('move across columns rebalances both', async () => {
    const { list, tasks } = await setupListWithTasks(['A', 'B', 'C'])
    // Move B (pos 1 in backlog) to "started", position 0
    await tasksRepo.move(tasks[1].id, { status: 'started', position: 0 })

    const backlog = await tasksRepo.listFiltered({
      listId: list.id,
      status: 'backlog',
    })
    expect(backlog.map((t) => t.title)).toEqual(['A', 'C'])
    expect(backlog.map((t) => t.position)).toEqual([0, 1])

    const started = await tasksRepo.listFiltered({
      listId: list.id,
      status: 'started',
    })
    expect(started.map((t) => t.title)).toEqual(['B'])
    expect(started[0].position).toBe(0)
  })

  it('move clamps position above target column size', async () => {
    const { list, tasks } = await setupListWithTasks(['A', 'B'])
    // Try to move A to position 99 in started — should land at 0
    await tasksRepo.move(tasks[0].id, { status: 'started', position: 99 })
    const started = await tasksRepo.listFiltered({
      listId: list.id,
      status: 'started',
    })
    expect(started[0].position).toBe(0)
  })

  it('move sets completedAt when entering done', async () => {
    const { tasks } = await setupListWithTasks(['A'])
    const moved = await tasksRepo.move(tasks[0].id, { status: 'done', position: 0 })
    expect(moved?.completedAt).toBeTruthy()
  })

  // ── filter ─────────────────────────────────────────────────────────────
  it('listFiltered filters by listId and status', async () => {
    const list1 = await listsRepo.create('A')
    const list2 = await listsRepo.create('B')
    await tasksRepo.create({ listId: list1.id, title: 'L1-T1' })
    await tasksRepo.create({ listId: list1.id, title: 'L1-T2', status: 'done' })
    await tasksRepo.create({ listId: list2.id, title: 'L2-T1' })

    const list1Tasks = await tasksRepo.listFiltered({ listId: list1.id })
    expect(list1Tasks).toHaveLength(2)

    const doneTasks = await tasksRepo.listFiltered({ status: 'done' })
    expect(doneTasks).toHaveLength(1)

    const list1Done = await tasksRepo.listFiltered({ listId: list1.id, status: 'done' })
    expect(list1Done).toHaveLength(1)
    expect(list1Done[0].title).toBe('L1-T2')
  })

  // ── cascade delete ─────────────────────────────────────────────────────
  it('deleting a list cascades to its tasks', async () => {
    const { list, tasks } = await setupListWithTasks(['A', 'B'])
    await listsRepo.remove(list.id)
    for (const t of tasks) {
      expect(await tasksRepo.getById(t.id)).toBeNull()
    }
  })

  // ── delete ─────────────────────────────────────────────────────────────
  it('deletes a task', async () => {
    const { tasks } = await setupListWithTasks(['A'])
    expect(await tasksRepo.remove(tasks[0].id)).toBe(true)
    expect(await tasksRepo.getById(tasks[0].id)).toBeNull()
  })
})

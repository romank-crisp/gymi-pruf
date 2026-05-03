'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { ListSidebar } from '@/components/sidebar/list-sidebar'
import { Column } from '@/components/kanban/column'
import { TaskCard } from '@/components/kanban/task-card'
import { TaskSheet } from '@/components/kanban/task-sheet'
import { api } from '@/lib/api-client'
import { TASK_STATUSES, type List, type Task, type TaskStatus } from '@/lib/db/schema'

const COLUMN_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  started: 'Started',
  checked: 'Checked',
  review: 'Review',
  done: 'Done',
}

type Props = {
  initialLists: List[]
  initialTasks: Task[]
  initialSelectedListId: string | null
}

export function KanbanApp({
  initialLists,
  initialTasks,
  initialSelectedListId,
}: Props) {
  const [lists, setLists] = useState<List[]>(initialLists)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedListId, setSelectedListId] = useState<string | null>(
    initialSelectedListId,
  )
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // ── derived ──────────────────────────────────────────────────────────────

  const tasksByStatus = useMemo(() => {
    const out: Record<TaskStatus, Task[]> = {
      backlog: [],
      started: [],
      checked: [],
      review: [],
      done: [],
    }
    for (const t of tasks) out[t.status].push(t)
    for (const s of TASK_STATUSES) out[s].sort((a, b) => a.position - b.position)
    return out
  }, [tasks])

  // For sidebar badges: count tasks per list across all loaded tasks.
  // (Currently only the selected list's tasks are loaded, so other badges
  // show 0 until that list is opened. Cheap to fix later by counting
  // server-side; not blocking for v1.)
  const taskCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const t of tasks) counts[t.listId] = (counts[t.listId] ?? 0) + 1
    return counts
  }, [tasks])

  // ── data loading on list switch ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedListId) {
      setTasks([])
      return
    }
    let cancelled = false
    api.tasks
      .list({ listId: selectedListId })
      .then((rows) => {
        if (!cancelled) setTasks(rows)
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [selectedListId])

  // ── list ops ─────────────────────────────────────────────────────────────
  async function createList(name: string) {
    const created = await api.lists.create(name)
    setLists((s) => [...s, created])
    setSelectedListId(created.id)
  }
  async function renameList(id: string, name: string) {
    const updated = await api.lists.update(id, { name })
    setLists((s) => s.map((l) => (l.id === id ? updated : l)))
  }
  async function deleteList(id: string) {
    await api.lists.remove(id)
    setLists((s) => {
      const next = s.filter((l) => l.id !== id)
      if (selectedListId === id) {
        setSelectedListId(next[0]?.id ?? null)
      }
      return next
    })
  }

  // ── task ops ─────────────────────────────────────────────────────────────
  async function addTask(status: TaskStatus, title: string) {
    if (!selectedListId) return
    const created = await api.tasks.create({
      listId: selectedListId,
      title,
      status,
    })
    setTasks((s) => [...s, created])
  }

  async function saveTask(id: string, patch: Partial<Task>) {
    const updated = await api.tasks.update(id, {
      title: patch.title,
      description: patch.description ?? undefined,
      status: patch.status,
      tokensSpent: patch.tokensSpent,
    })
    setTasks((s) => s.map((t) => (t.id === id ? updated : t)))
    setOpenTask(updated)
  }

  async function deleteTask(id: string) {
    await api.tasks.remove(id)
    setTasks((s) => s.filter((t) => t.id !== id))
  }

  async function moveTask(id: string, status: TaskStatus, position: number) {
    // Optimistic: update local state immediately
    const original = tasks.find((t) => t.id === id)
    if (!original) return
    setTasks((prev) => {
      const others = prev.filter((t) => t.id !== id)
      // Remove gap from old column
      const oldColShifted = others.map((t) =>
        t.status === original.status && t.position > original.position
          ? { ...t, position: t.position - 1 }
          : t,
      )
      // Open slot in new column
      const newColShifted = oldColShifted.map((t) =>
        t.status === status && t.position >= position
          ? { ...t, position: t.position + 1 }
          : t,
      )
      return [...newColShifted, { ...original, status, position }]
    })
    try {
      const updated = await api.tasks.move(id, { status, position })
      // Refetch to ensure consistency
      if (selectedListId) {
        const fresh = await api.tasks.list({ listId: selectedListId })
        setTasks(fresh)
      }
      if (openTask?.id === id) setOpenTask(updated)
    } catch (err) {
      console.error(err)
      // Roll back on error
      if (selectedListId) {
        const fresh = await api.tasks.list({ listId: selectedListId })
        setTasks(fresh)
      }
    }
  }

  // ── DnD wiring ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  function handleDragStart(e: DragStartEvent) {
    const t = tasks.find((t) => t.id === e.active.id)
    setActiveTask(t ?? null)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = e
    if (!over) return
    const draggedId = active.id as string
    const dragged = tasks.find((t) => t.id === draggedId)
    if (!dragged) return

    const overData = over.data.current as
      | { type?: 'task'; task?: Task }
      | { status?: TaskStatus }
      | undefined

    let targetStatus: TaskStatus
    let targetPosition: number

    if (overData && 'task' in overData && overData.task) {
      // Dropped on a task → take its position in its column
      targetStatus = overData.task.status
      targetPosition = overData.task.position
    } else if (overData && 'status' in overData && overData.status) {
      // Dropped on empty area of a column
      targetStatus = overData.status
      targetPosition = tasksByStatus[targetStatus].length
    } else {
      return
    }

    // No-op if dropping at original spot
    if (
      dragged.status === targetStatus &&
      dragged.position === targetPosition
    ) {
      return
    }
    moveTask(draggedId, targetStatus, targetPosition)
  }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <ListSidebar
        lists={lists}
        selectedId={selectedListId}
        onSelect={setSelectedListId}
        onCreate={createList}
        onRename={renameList}
        onDelete={deleteList}
        taskCounts={taskCounts}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <h2 className="text-base font-semibold">
            {lists.find((l) => l.id === selectedListId)?.name ?? '—'}
          </h2>
          <div className="text-xs text-muted-foreground">
            {tasks.length} task{tasks.length === 1 ? '' : 's'}
          </div>
        </header>

        {selectedListId ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-1 gap-3 overflow-x-auto p-3">
              {TASK_STATUSES.map((s) => (
                <Column
                  key={s}
                  status={s}
                  label={COLUMN_LABELS[s]}
                  tasks={tasksByStatus[s]}
                  onTaskClick={(t) => {
                    setOpenTask(t)
                    setSheetOpen(true)
                  }}
                  onAddTask={(title) => addTask(s, title)}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} onClick={() => {}} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Create a list to start.
          </div>
        )}
      </main>

      <TaskSheet
        task={openTask}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) setOpenTask(null)
        }}
        onSave={saveTask}
        onDelete={deleteTask}
      />
    </div>
  )
}

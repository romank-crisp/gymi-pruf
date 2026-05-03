'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TaskCard } from './task-card'
import type { Task, TaskStatus } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

type Props = {
  status: TaskStatus
  label: string
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: (title: string) => Promise<void>
}

export function Column({ status, label, tasks, onTaskClick, onAddTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}`, data: { status } })
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    const title = draft.trim()
    if (!title) {
      setAdding(false)
      setDraft('')
      return
    }
    setSubmitting(true)
    try {
      await onAddTask(title)
      setDraft('')
      setAdding(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cn(
        'flex h-full min-w-[260px] flex-1 flex-col rounded-md border border-border bg-muted/40',
        isOver && 'border-foreground/70 bg-muted/70',
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono text-muted-foreground">{tasks.length}</span>
      </header>

      <div ref={setNodeRef} className="flex-1 space-y-2 overflow-y-auto p-2 min-h-[60px]">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">
            No tasks yet.
          </p>
        )}
      </div>

      <footer className="border-t border-border p-2">
        {adding ? (
          <div className="flex flex-col gap-1.5">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                else if (e.key === 'Escape') {
                  setAdding(false)
                  setDraft('')
                }
              }}
              placeholder="Task title…"
              className="h-8 text-sm"
              disabled={submitting}
            />
            <div className="flex justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAdding(false)
                  setDraft('')
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={submitting}>
                Add
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3.5" /> Add task
          </Button>
        )}
      </footer>
    </div>
  )
}

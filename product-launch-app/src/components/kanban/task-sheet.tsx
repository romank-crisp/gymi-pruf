'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MarkdownEditor } from '@/components/markdown-editor'
import { TASK_STATUSES, type Task, type TaskStatus } from '@/lib/db/schema'
import { formatDateTime, formatTokens } from '@/lib/format'

type Props = {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, patch: Partial<Task>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  started: 'Started',
  checked: 'Checked',
  review: 'Review',
  done: 'Done',
}

export function TaskSheet({ task, open, onOpenChange, onSave, onDelete }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('backlog')
  const [tokens, setTokens] = useState('0')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? '')
    setStatus(task.status)
    setTokens(String(task.tokensSpent))
    setDirty(false)
  }, [task])

  if (!task) return null

  async function save() {
    if (!task) return
    setSaving(true)
    try {
      const tokensInt = Number.parseInt(tokens, 10)
      await onSave(task.id, {
        title,
        description: description || null,
        status,
        tokensSpent: Number.isFinite(tokensInt) && tokensInt >= 0 ? tokensInt : 0,
      })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!task) return
    if (!confirm('Delete this task?')) return
    setDeleting(true)
    try {
      await onDelete(task.id)
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle>Task</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {task.id}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setDirty(true)
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-status">Status</Label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as TaskStatus)
                  setDirty(true)
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-tokens">Tokens spent</Label>
              <Input
                id="task-tokens"
                type="number"
                min="0"
                value={tokens}
                onChange={(e) => {
                  setTokens(e.target.value)
                  setDirty(true)
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <MarkdownEditor
              value={description}
              onChange={(v) => {
                setDescription(v)
                setDirty(true)
              }}
            />
          </div>

          <div className="space-y-1 rounded-md border border-border bg-muted/40 px-4 py-3 text-xs">
            <div className="grid grid-cols-2 gap-y-1.5">
              <div className="text-muted-foreground">Created</div>
              <div className="text-right font-mono">{formatDateTime(task.createdAt)}</div>
              <div className="text-muted-foreground">Updated</div>
              <div className="text-right font-mono">{formatDateTime(task.updatedAt)}</div>
              <div className="text-muted-foreground">Completed</div>
              <div className="text-right font-mono">
                {task.completedAt ? formatDateTime(task.completedAt) : '—'}
              </div>
              <div className="text-muted-foreground">Tokens (saved)</div>
              <div className="text-right font-mono">
                <Badge variant="outline" className="font-mono">
                  {formatTokens(task.tokensSpent)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex flex-row items-center justify-between gap-2 border-t border-border bg-muted/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={deleting}
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

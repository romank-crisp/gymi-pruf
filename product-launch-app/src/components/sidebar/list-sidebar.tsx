'use client'

import { useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { List } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

type Props = {
  lists: List[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  taskCounts?: Record<string, number>
}

export function ListSidebar({
  lists,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  taskCounts,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deletingList, setDeletingList] = useState<List | null>(null)
  const [busy, setBusy] = useState(false)

  async function submitNew() {
    const name = draft.trim()
    if (!name) {
      setAdding(false)
      setDraft('')
      return
    }
    setBusy(true)
    try {
      await onCreate(name)
      setDraft('')
      setAdding(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-muted/30">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-sm font-semibold">Product Launch</h1>
        <p className="text-[11px] text-muted-foreground">
          Roadmap for Gymi-Vorbereitung
        </p>
      </header>

      <div className="border-b border-border px-3 py-2">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Lists
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-1.5">
        {lists.map((list) => {
          const isActive = list.id === selectedId
          const isRenaming = renamingId === list.id
          const count = taskCounts?.[list.id] ?? 0
          return (
            <div
              key={list.id}
              className={cn(
                'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition',
                isActive
                  ? 'bg-foreground text-background'
                  : 'hover:bg-muted',
              )}
              onClick={() => !isRenaming && onSelect(list.id)}
            >
              {isRenaming ? (
                <RenameInline
                  initial={list.name}
                  onCancel={() => setRenamingId(null)}
                  onConfirm={async (n) => {
                    await onRename(list.id, n)
                    setRenamingId(null)
                  }}
                />
              ) : (
                <>
                  <span className="flex-1 truncate">{list.name}</span>
                  <span
                    className={cn(
                      'font-mono text-[10px]',
                      isActive ? 'text-background/70' : 'text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'rounded p-0.5 opacity-0 transition group-hover:opacity-100',
                          isActive
                            ? 'text-background hover:bg-background/20'
                            : 'text-muted-foreground hover:bg-foreground/10',
                        )}
                      >
                        <MoreHorizontal className="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          setRenamingId(list.id)
                        }}
                      >
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          setDeletingList(list)
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          )
        })}
      </nav>

      <footer className="border-t border-border p-2">
        {adding ? (
          <div className="space-y-1.5">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNew()
                else if (e.key === 'Escape') {
                  setAdding(false)
                  setDraft('')
                }
              }}
              placeholder="List name…"
              className="h-8 text-sm"
              disabled={busy}
            />
            <div className="flex justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAdding(false)
                  setDraft('')
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={submitNew} disabled={busy}>
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
            <Plus className="size-3.5" /> New list
          </Button>
        )}
      </footer>

      <Dialog
        open={!!deletingList}
        onOpenChange={(o) => !o && setDeletingList(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete list?</DialogTitle>
            <DialogDescription>
              {deletingList && (
                <>
                  &quot;{deletingList.name}&quot; and{' '}
                  {taskCounts?.[deletingList.id] ?? 0} task(s) will be permanently
                  deleted.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingList(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!deletingList) return
                await onDelete(deletingList.id)
                setDeletingList(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}

function RenameInline({
  initial,
  onConfirm,
  onCancel,
}: {
  initial: string
  onConfirm: (n: string) => Promise<void> | void
  onCancel: () => void
}) {
  const [v, setV] = useState(initial)
  const [busy, setBusy] = useState(false)
  return (
    <Input
      autoFocus
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={async (e) => {
        if (e.key === 'Enter') {
          if (!v.trim()) return onCancel()
          setBusy(true)
          try {
            await onConfirm(v.trim())
          } finally {
            setBusy(false)
          }
        } else if (e.key === 'Escape') onCancel()
      }}
      onBlur={onCancel}
      disabled={busy}
      className="h-7 text-sm"
    />
  )
}

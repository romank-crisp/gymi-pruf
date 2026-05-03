'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import type { Task } from '@/lib/db/schema'
import { formatTokens } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  task: Task
  onClick: () => void
  isOverlay?: boolean
}

export function TaskCard({ task, onClick, isOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: 'task', task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        // Skip click if drag started
        if (isDragging) return
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'group rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm transition cursor-pointer',
        'hover:border-foreground/40',
        (isDragging || isOverlay) && 'opacity-50 ring-2 ring-foreground',
        isOverlay && 'opacity-100 shadow-lg',
      )}
      {...attributes}
      {...listeners}
    >
      <div className="line-clamp-3 break-words font-medium leading-snug">
        {task.title}
      </div>
      {task.tokensSpent > 0 && (
        <Badge
          variant="outline"
          className="mt-2 font-mono text-[10px] tracking-tight"
        >
          {formatTokens(task.tokensSpent)} tok
        </Badge>
      )}
    </div>
  )
}

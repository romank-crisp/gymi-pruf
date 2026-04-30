'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import './StatusTransitionButtons.scss'

type Target = {
  value: string
  label: string
  destructive: boolean
}

type Props = {
  collectionSlug: string
  docId: string
  legalTargets: Target[]
}

/**
 * Interactive buttons that transition the current document's `status` via
 * Payload's REST API. Destructive transitions (flagged / retired) prompt for
 * a confirmation with a free-text reason; the reason is currently console-
 * logged pending a proper audit-log collection (Phase 2b).
 *
 * On success, refreshes the server components so the tab rerenders with the
 * new status + freshly computed legal transitions.
 */
export default function StatusTransitionButtons({
  collectionSlug,
  docId,
  legalTargets,
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const transition = async (target: Target) => {
    setError(null)

    // For destructive transitions, require a reason via native prompt.
    // Phase 2b will replace this with a styled modal and an audit-log write.
    let reason: string | null = null
    if (target.destructive) {
      reason = window.prompt(
        `Reason for transitioning to "${target.label}":`,
        '',
      )
      if (reason === null) return // cancelled
      if (reason.trim().length < 3) {
        setError('Reason must be at least 3 characters.')
        return
      }
    } else if (
      !window.confirm(`Transition this document to "${target.label}"?`)
    ) {
      return
    }

    setPending(target.value)
    try {
      const res = await fetch(`/api/${collectionSlug}/${docId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: target.value }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as Record<string, unknown>)
        type ErrLike = { message?: string }
        const payloadErr =
          (body as { errors?: ErrLike[] }).errors?.[0]?.message ??
          (body as ErrLike).message ??
          `HTTP ${res.status}`
        throw new Error(payloadErr)
      }
      if (reason) {
        console.info(
          `[status-transition] ${collectionSlug}/${docId} → ${target.value} — reason: ${reason}`,
        )
      }
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="status-buttons">
      <div className="status-buttons__list">
        {legalTargets.map((target) => (
          <button
            key={target.value}
            type="button"
            disabled={pending !== null}
            onClick={() => transition(target)}
            className={
              'status-buttons__btn' +
              (target.destructive ? ' status-buttons__btn--destructive' : '')
            }
          >
            {pending === target.value ? 'Transitioning…' : `→ ${target.label}`}
          </button>
        ))}
      </div>
      {error && (
        <div className="status-buttons__error" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}

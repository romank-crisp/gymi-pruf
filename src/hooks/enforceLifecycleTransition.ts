import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Enforces the legal exercise state machine:
 *
 *   generated ──▶ published
 *   generated ──▶ rejected
 *   published ──▶ retired
 *   rejected  ──▶ generated   (reviewer asked for a regenerate and admin requeued)
 *
 * Any other transition throws before write. New exercises always start at
 * `generated` — the default in the collection field — but creation is allowed
 * at any terminal state for the seed script / data migrations (originalDoc is
 * undefined on create, so we skip the check).
 */
const LEGAL_TRANSITIONS: Record<string, readonly string[]> = {
  generated: ['published', 'rejected'],
  published: ['retired'],
  rejected: ['generated'],
  retired: [],
}

export const enforceLifecycleTransition: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
}) => {
  // Create: no "from" state — trust the incoming value.
  if (operation === 'create' || !originalDoc) return data

  const from = originalDoc.lifecycleState as string | undefined
  const to = data.lifecycleState as string | undefined

  if (!from || !to || from === to) return data

  const allowed = LEGAL_TRANSITIONS[from] ?? []
  if (!allowed.includes(to)) {
    throw new Error(
      `Illegal lifecycle transition: ${from} → ${to}. Allowed from ${from}: ${allowed.join(', ') || '(none)'}.`,
    )
  }

  if (to === 'rejected' && !data.rejectionReason) {
    throw new Error('Cannot move to rejected without a rejectionReason.')
  }

  return data
}

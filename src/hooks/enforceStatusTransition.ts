import type { CollectionBeforeChangeHook } from 'payload'
import { LEGAL_STATUS_TRANSITIONS, type ContentStatus } from '../content/enums'

/**
 * Enforces the content-status lifecycle for theory blocks, exercise templates,
 * concept cards, and l1 variants.
 *
 * Legal forward path: draft → in_review → approved → active → flagged | retired.
 * Reverse / skip transitions throw unless `req.context.forcePromote === true`,
 * an explicit dev-only escape hatch.
 *
 * Creating a row at a non-draft state is allowed (for seed scripts and
 * data migrations). The check only runs on UPDATE.
 */
export const enforceStatusTransition: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (operation === 'create' || !originalDoc) return data

  const from = originalDoc.status as ContentStatus | undefined
  const to = data.status as ContentStatus | undefined

  if (!from || !to || from === to) return data

  const forcePromote = req.context?.forcePromote === true
  if (forcePromote) return data

  const allowed = LEGAL_STATUS_TRANSITIONS[from] ?? []
  if (!allowed.includes(to)) {
    throw new Error(
      `Illegal status transition: ${from} → ${to}. ` +
        `Allowed from ${from}: ${allowed.join(', ') || '(none — terminal state)'}. ` +
        `Pass req.context.forcePromote = true to override (dev only).`,
    )
  }

  return data
}

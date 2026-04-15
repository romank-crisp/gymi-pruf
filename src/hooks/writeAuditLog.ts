import type { CollectionAfterChangeHook } from 'payload'

/**
 * Appends an entry to the AuditLog after every Exercise write.
 *
 * Distinguishes three kinds of events:
 *   - create          → action=created
 *   - state changed   → action=transitioned
 *   - update w/o state → action=edited
 *
 * Swallows audit-write failures (logs to stderr) so a broken log never blocks
 * a content write. The log is for forensics, not correctness.
 */
export const writeAuditLog: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  try {
    const fromState = previousDoc?.lifecycleState
    const toState = doc?.lifecycleState
    const stateChanged = operation === 'update' && fromState !== toState

    const action =
      operation === 'create' ? 'created' : stateChanged ? 'transitioned' : 'edited'

    const actorLabel = req.user?.email ?? 'system'
    const summary =
      action === 'transitioned'
        ? `${actorLabel} moved exercise "${doc.title}" from ${fromState} to ${toState}`
        : action === 'created'
          ? `${actorLabel} created exercise "${doc.title}"`
          : `${actorLabel} edited exercise "${doc.title}"`

    await req.payload.create({
      collection: 'audit-log',
      req, // reuse the parent transaction so the FK to exercises resolves
      data: {
        summary,
        action,
        fromState: fromState ?? null,
        toState: toState ?? null,
        exercise: doc.id,
        actor: req.user?.id ?? null,
        reason: doc.rejectionReason ?? null,
      },
    })
  } catch (err) {
    console.error('[audit-log] write failed:', err)
  }

  return doc
}

import type { CollectionBeforeChangeHook } from 'payload'

type PolymorphicRef = { relationTo: string; value: string | number }

/**
 * Validates exercise-template curriculum anchors:
 *   - primaryAnchor must be present (Payload enforces required, we cross-check)
 *   - total anchors (primary + secondary) must not exceed 3
 *   - no duplicate (collection + id) across primary and secondary
 *
 * Payload stores polymorphic relationships as { relationTo, value } where
 * `value` may be an id (on write) or the populated doc (on read after depth
 * expansion). The hook handles both shapes.
 */
export const validateAnchors: CollectionBeforeChangeHook = ({ data }) => {
  const primary = toRef(data.primaryAnchor)
  const secondaryList = Array.isArray(data.secondaryAnchors) ? data.secondaryAnchors : []

  if (!primary) {
    throw new Error('primaryAnchor is required.')
  }

  const secondaryRefs: PolymorphicRef[] = []
  for (const row of secondaryList) {
    const ref = toRef((row as { anchor?: unknown })?.anchor)
    if (!ref) {
      throw new Error('secondaryAnchors entry is missing its anchor value.')
    }
    secondaryRefs.push(ref)
  }

  if (1 + secondaryRefs.length > 3) {
    throw new Error(
      `Too many anchors: ${1 + secondaryRefs.length}. Max is 3 (1 primary + up to 2 secondary).`,
    )
  }

  const seen = new Set<string>()
  const key = (r: PolymorphicRef) => `${r.relationTo}:${String(r.value)}`
  seen.add(key(primary))
  for (const r of secondaryRefs) {
    const k = key(r)
    if (seen.has(k)) {
      throw new Error(
        `Duplicate anchor: ${r.relationTo} #${String(r.value)} is referenced more than once.`,
      )
    }
    seen.add(k)
  }

  return data
}

function toRef(raw: unknown): PolymorphicRef | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const relationTo = typeof r.relationTo === 'string' ? r.relationTo : null
  const rawValue = r.value
  if (!relationTo || rawValue === null || rawValue === undefined) return null
  const id =
    typeof rawValue === 'object' && rawValue !== null
      ? (rawValue as { id?: string | number }).id
      : (rawValue as string | number)
  if (id === undefined || id === null) return null
  return { relationTo, value: id }
}

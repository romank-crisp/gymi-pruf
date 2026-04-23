import type { Payload } from 'payload'

/**
 * Resolves a polymorphic curriculum anchor to its full breadcrumb path by
 * walking upward through the curriculum tree.
 *
 * The tree is:
 *   domains → modules → units → concepts
 *
 * An anchor can point at any level. The returned `path` always starts at
 * domain (if reachable) and ends at the anchor's own entity.
 */

export type AnchorValue =
  | { relationTo: string; value: number | string | { id: number | string } }
  | null
  | undefined

export type BreadcrumbStep = {
  level: 'domain' | 'module' | 'unit' | 'concept'
  id: number | string
  name: string
  slug?: string
}

const LEVEL_BY_COLLECTION: Record<string, BreadcrumbStep['level']> = {
  domains: 'domain',
  modules: 'module',
  units: 'unit',
  concepts: 'concept',
}

export async function resolveBreadcrumb(
  payload: Payload,
  anchor: AnchorValue,
): Promise<BreadcrumbStep[]> {
  if (!anchor || !anchor.relationTo) return []
  const level = LEVEL_BY_COLLECTION[anchor.relationTo]
  if (!level) return []

  const rawId =
    typeof anchor.value === 'object' && anchor.value !== null
      ? (anchor.value as { id: number | string }).id
      : (anchor.value as number | string | undefined)
  if (rawId === undefined || rawId === null) return []

  const trail: BreadcrumbStep[] = []
  let cursor: { collection: string; id: number | string } | null = {
    collection: anchor.relationTo,
    id: rawId,
  }

  while (cursor) {
    const doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: cursor.collection as any,
      id: cursor.id,
      depth: 0,
    })) as Record<string, unknown> | null

    if (!doc) break

    const stepLevel = LEVEL_BY_COLLECTION[cursor.collection]
    trail.unshift({
      level: stepLevel,
      id: doc.id as number | string,
      name: (doc.name as string) ?? (doc.slug as string) ?? String(doc.id),
      slug: doc.slug as string | undefined,
    })

    // Walk upward
    if (cursor.collection === 'concepts' && doc.unit != null) {
      cursor = { collection: 'units', id: toId(doc.unit) }
    } else if (cursor.collection === 'units' && doc.module != null) {
      cursor = { collection: 'modules', id: toId(doc.module) }
    } else if (cursor.collection === 'modules' && doc.domain != null) {
      cursor = { collection: 'domains', id: toId(doc.domain) }
    } else {
      cursor = null
    }
  }

  return trail
}

function toId(val: unknown): number | string {
  if (typeof val === 'object' && val !== null) return (val as { id: number | string }).id
  return val as number | string
}

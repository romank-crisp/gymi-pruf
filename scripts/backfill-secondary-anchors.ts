/**
 * backfill-secondary-anchors.ts — one-off data maintenance.
 *
 * Scans all exercise-templates and, where the content meaningfully implies
 * additional curriculum areas, writes up to 2 secondary anchors. The rules
 * are content-driven and conservative — we add a secondary only when it is
 * materially informative, not cosmetically broader.
 *
 * Rules:
 *   1. concept:numerus (plural exercises)
 *        → +unit:nomen  (plural is a Nomen property)
 *   2. concept:genus-bestimmen
 *        → +unit:nomen, +unit:artikel
 *   3. domain/module/section-scoped Wortart-ID exercises
 *        → +unit:<specific-wortart>   based on answerSpec.correct_answer
 *   4. unit-level Wortart-ID exercises → no secondary (already specific).
 *
 * Usage:
 *   pnpm tsx scripts/backfill-secondary-anchors.ts             # apply
 *   pnpm tsx scripts/backfill-secondary-anchors.ts --dry-run   # preview only
 */

import 'dotenv/config'
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'

type PolymorphicAnchor = { relationTo: string; value: number }

type TemplateRow = {
  id: number
  primary: PolymorphicAnchor | null
  primaryKey: string
  correctAnswer: string | null
  existingSecondariesCount: number
}

// ---------------------------------------------------------------------------
// Wortart → unit-slug mapping
// ---------------------------------------------------------------------------

const WORTART_TO_UNIT_SLUG: Record<string, string> = {
  Nomen: 'nomen',
  Verb: 'verb',
  Adjektiv: 'adjektiv',
  Adverb: 'adverb',
  Pronomen: 'pronomen',
  Artikel: 'artikel',
  Präposition: 'praeposition',
  Konjunktion: 'konjunktion',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function anchorKey(a: PolymorphicAnchor): string {
  return `${a.relationTo}:${a.value}`
}

async function resolveUnitId(payload: Payload, slug: string): Promise<number | null> {
  const r = await payload.find({
    collection: 'units',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  if (r.totalDocs === 0) return null
  return (r.docs[0] as { id: number }).id
}

async function loadAllTemplates(payload: Payload): Promise<TemplateRow[]> {
  const out: TemplateRow[] = []
  let page = 1
  while (true) {
    const r = await payload.find({
      collection: 'exercise-templates',
      depth: 0,
      limit: 200,
      page,
    })
    for (const doc of r.docs) {
      const d = doc as unknown as {
        id: number
        primaryAnchor?: { relationTo?: string; value?: number | { id: number } }
        secondaryAnchors?: unknown[] | null
        answerSpec?: { correct_answer?: string | null } | null
      }
      const rawVal = d.primaryAnchor?.value
      const id =
        typeof rawVal === 'object' && rawVal !== null
          ? (rawVal as { id: number }).id
          : (rawVal as number | undefined)
      const primary: PolymorphicAnchor | null =
        d.primaryAnchor?.relationTo && id !== undefined
          ? { relationTo: d.primaryAnchor.relationTo, value: id }
          : null
      out.push({
        id: d.id,
        primary,
        primaryKey: primary ? anchorKey(primary) : '',
        correctAnswer: d.answerSpec?.correct_answer ?? null,
        existingSecondariesCount: Array.isArray(d.secondaryAnchors)
          ? d.secondaryAnchors.length
          : 0,
      })
    }
    if (!r.hasNextPage) break
    page++
  }
  return out
}

// ---------------------------------------------------------------------------
// Suggestion engine
// ---------------------------------------------------------------------------

async function suggestSecondaries(
  payload: Payload,
  tpl: TemplateRow,
  unitIdBySlug: Record<string, number>,
): Promise<PolymorphicAnchor[]> {
  if (!tpl.primary) return []

  // Rule 1: concept:numerus → +unit:nomen
  if (tpl.primaryKey === 'concepts:3' /* numerus */) {
    const nomenId = unitIdBySlug['nomen']
    if (nomenId) return [{ relationTo: 'units', value: nomenId }]
  }

  // Rule 2: concept:genus-bestimmen → +unit:nomen, +unit:artikel
  if (tpl.primaryKey === 'concepts:2' /* genus-bestimmen */) {
    const nomenId = unitIdBySlug['nomen']
    const artikelId = unitIdBySlug['artikel']
    const out: PolymorphicAnchor[] = []
    if (nomenId) out.push({ relationTo: 'units', value: nomenId })
    if (artikelId) out.push({ relationTo: 'units', value: artikelId })
    return out
  }

  // Rule 3: domain/module/section Wortart-ID exercises → +unit:<wortart>
  const isBroadScope =
    tpl.primary.relationTo === 'domains' ||
    tpl.primary.relationTo === 'modules' ||
    tpl.primary.relationTo === 'sections'
  if (isBroadScope && tpl.correctAnswer) {
    const unitSlug = WORTART_TO_UNIT_SLUG[tpl.correctAnswer.trim()]
    if (unitSlug) {
      const unitId = unitIdBySlug[unitSlug]
      if (unitId) return [{ relationTo: 'units', value: unitId }]
    }
  }

  // Rule 4 (unit-scoped Wortart exercises): no secondary
  return []
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  backfill-secondary-anchors                          ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  dry-run : ${dryRun}`)

  console.log('\n→ connecting to Payload…')
  const payload = await getPayload({ config })

  // Pre-resolve unit slugs we care about
  const neededSlugs = [
    'nomen',
    'verb',
    'adjektiv',
    'adverb',
    'pronomen',
    'artikel',
    'praeposition',
    'konjunktion',
  ]
  const unitIdBySlug: Record<string, number> = {}
  for (const slug of neededSlugs) {
    const id = await resolveUnitId(payload, slug)
    if (id !== null) unitIdBySlug[slug] = id
  }

  const templates = await loadAllTemplates(payload)
  console.log(`\n→ loaded ${templates.length} exercise-templates`)

  const stats = { examined: templates.length, proposed: 0, skipped: 0, updated: 0, failed: 0 }

  for (const tpl of templates) {
    const proposed = await suggestSecondaries(payload, tpl, unitIdBySlug)
    if (proposed.length === 0) {
      stats.skipped++
      console.log(`  · #${tpl.id}  ${tpl.primaryKey}  → (no secondary applies)`)
      continue
    }

    // Skip if the template already has secondaries (respect human edits)
    if (tpl.existingSecondariesCount > 0) {
      stats.skipped++
      console.log(
        `  · #${tpl.id}  ${tpl.primaryKey}  → already has ${tpl.existingSecondariesCount} secondary, leaving as-is`,
      )
      continue
    }

    stats.proposed++
    const secondaryRows = proposed.map((a) => ({ anchor: a }))
    const summary = proposed
      .map((a) => {
        const slug = Object.entries(unitIdBySlug).find(([, v]) => v === a.value)?.[0]
        return `${a.relationTo}:${slug ?? a.value}`
      })
      .join(', ')
    console.log(`  + #${tpl.id}  ${tpl.primaryKey}  → ${summary}`)

    if (dryRun) continue

    try {
      await payload.update({
        collection: 'exercise-templates',
        id: tpl.id,
        data: { secondaryAnchors: secondaryRows as never },
      })
      stats.updated++
    } catch (err) {
      stats.failed++
      console.error(`    ✗ failed to update #${tpl.id}: ${(err as Error).message}`)
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║  Summary                                             ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  examined : ${stats.examined}`)
  console.log(`  proposed : ${stats.proposed}`)
  console.log(`  skipped  : ${stats.skipped}`)
  console.log(`  updated  : ${stats.updated}${dryRun ? ' (dry-run)' : ''}`)
  console.log(`  failed   : ${stats.failed}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('\n✗ backfill failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})

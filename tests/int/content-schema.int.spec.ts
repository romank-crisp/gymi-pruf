import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

/**
 * Sanity test for the Phase 1 content schema.
 *
 * Verifies:
 *  - All 13 collections exist and are queryable
 *  - Slug auto-generation works on curriculum rows
 *  - Status transition hook rejects illegal jumps
 *  - `req.context.forcePromote` escape hatch works
 *  - Self-prerequisite is blocked
 *  - Seed data is present (run `pnpm seed` first)
 */
let payload: Payload

beforeAll(async () => {
  const payloadConfig = await config
  payload = await getPayload({ config: payloadConfig })
})

describe('Phase 1 content schema', () => {
  it('has all 13 collections registered', async () => {
    const slugs = [
      'users',
      'media',
      'domains',
      'modules',
      'sections',
      'units',
      'concepts',
      'concept-prerequisites',
      'exercise-groups',
      'exercise-templates',
      'theory-blocks',
      'slot-pools',
      'slot-items',
      'l1-variants',
      'concept-cards',
    ] as const
    for (const slug of slugs) {
      const res = await payload.find({ collection: slug, limit: 1 })
      expect(res).toBeDefined()
      expect(res.docs).toBeInstanceOf(Array)
    }
  })

  it('seed data is queryable through the hierarchy', async () => {
    const domains = await payload.find({ collection: 'domains', limit: 10 })
    expect(domains.totalDocs).toBeGreaterThanOrEqual(5)

    const wortarten = await payload.find({
      collection: 'modules',
      where: { slug: { equals: 'wortarten' } },
      limit: 1,
    })
    expect(wortarten.totalDocs).toBe(1)

    const genus = await payload.find({
      collection: 'concepts',
      where: { slug: { equals: 'genus-bestimmen' } },
      limit: 1,
    })
    expect(genus.totalDocs).toBe(1)
    expect(genus.docs[0].dazPainPoint).toBe('gender')
  })

  it('auto-generates slugs from name', async () => {
    // Need a unit to attach a concept to — grab any one
    const anyUnit = await payload.find({ collection: 'units', limit: 1 })
    expect(anyUnit.totalDocs).toBeGreaterThan(0)

    const concept = await payload.create({
      collection: 'concepts',
      data: {
        name: 'Größen & Maße — Test',
        unit: anyUnit.docs[0].id,
        baseDifficulty: 2,
        targetAttempts: 40,
        displayOrder: 999,
      },
    })
    expect(concept.slug).toBe('groessen-masse-test')
    await payload.delete({ collection: 'concepts', id: concept.id })
  })

  it('blocks self-prerequisite', async () => {
    const concept = await payload.find({
      collection: 'concepts',
      where: { slug: { equals: 'genus-bestimmen' } },
      limit: 1,
    })
    expect(concept.totalDocs).toBe(1)
    await expect(
      payload.create({
        collection: 'concept-prerequisites',
        data: {
          concept: concept.docs[0].id,
          prerequisite: concept.docs[0].id,
          strength: 'hard',
        },
      }),
    ).rejects.toThrow(/own prerequisite/)
  })

  it('enforces status transitions on exercise templates', async () => {
    // Get the seeded active template
    const templates = await payload.find({
      collection: 'exercise-templates',
      where: { status: { equals: 'active' } },
      limit: 1,
    })
    expect(templates.totalDocs).toBeGreaterThan(0)
    const tpl = templates.docs[0]

    // Illegal: active → draft (would be reverse transition)
    await expect(
      payload.update({
        collection: 'exercise-templates',
        id: tpl.id,
        data: { status: 'draft' },
      }),
    ).rejects.toThrow(/Illegal status transition/)

    // Legal: active → flagged
    const flagged = await payload.update({
      collection: 'exercise-templates',
      id: tpl.id,
      data: { status: 'flagged' },
    })
    expect(flagged.status).toBe('flagged')

    // Reset back using forcePromote escape hatch
    const restored = await payload.update({
      collection: 'exercise-templates',
      id: tpl.id,
      data: { status: 'active' },
      context: { forcePromote: true },
    })
    expect(restored.status).toBe('active')
  })
})

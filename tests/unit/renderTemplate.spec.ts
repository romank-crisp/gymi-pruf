import { describe, it, expect } from 'vitest'
import {
  renderTemplate,
  substitute,
  pickSlotItems,
  type ExerciseTemplateLike,
  type SlotItemLike,
} from '@/lib/renderTemplate'

/**
 * Pure-function tests for the template rendering logic that powers the
 * admin preview tab. No Payload / DB dependency — keeps this fast and
 * isolated from the integration suite.
 */

const mkItem = (
  id: string | number,
  value: string,
  metadata: Record<string, unknown> = {},
  tier = 1,
  active = true,
): SlotItemLike => ({ id, value, metadata, difficultyTier: tier, active })

const seeded = (seed: number) => {
  // Deterministic pseudo-random: mulberry32
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('substitute', () => {
  const nouns = {
    NOUN: mkItem(1, 'Tisch', { artikel: 'der', genus: 'm' }),
  }

  it('substitutes bare slot value', () => {
    expect(substitute('Welcher Artikel passt? ___ {NOUN}', nouns).text).toBe(
      'Welcher Artikel passt? ___ Tisch',
    )
  })

  it('substitutes dotted metadata paths', () => {
    expect(substitute('Es heißt {NOUN.metadata.artikel} {NOUN}.', nouns).text).toBe(
      'Es heißt der Tisch.',
    )
  })

  it('flags unresolved tokens without throwing', () => {
    const res = substitute('{NOUN} vs {VERB}', nouns)
    expect(res.text).toBe('Tisch vs {VERB}')
    expect(res.unresolved).toEqual(['VERB'])
  })

  it('flags unresolved dot paths', () => {
    const res = substitute('{NOUN.metadata.plural}', nouns)
    expect(res.text).toBe('{NOUN.metadata.plural}')
    expect(res.unresolved).toEqual(['NOUN.metadata.plural'])
  })

  it('leaves non-slot text untouched', () => {
    expect(substitute('Kein Platzhalter — nur Text.', nouns).text).toBe(
      'Kein Platzhalter — nur Text.',
    )
  })
})

describe('pickSlotItems', () => {
  const pool = [
    mkItem(1, 'Tisch', { genus: 'm' }, 1),
    mkItem(2, 'Lampe', { genus: 'f' }, 1),
    mkItem(3, 'Buch', { genus: 'n' }, 1),
    mkItem(4, 'Ergebnis', { genus: 'n' }, 3),
    mkItem(5, 'Verständnis', { genus: 'n' }, 4),
    mkItem(6, 'Retired', { genus: 'm' }, 1, false),
  ]

  it('picks one item per slot definition', () => {
    const { picked, warnings } = pickSlotItems(
      [{ slot_name: 'NOUN', pool_slug: 'nouns' }],
      { itemsByPoolSlug: { nouns: pool }, rand: seeded(42) },
    )
    expect(Object.keys(picked)).toEqual(['NOUN'])
    expect(warnings).toEqual([])
  })

  it('respects tier_min / tier_max', () => {
    // Tier 3-5 only → Ergebnis and Verständnis eligible
    const results = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const { picked } = pickSlotItems(
        [{ slot_name: 'N', pool_slug: 'nouns', tier_min: 3, tier_max: 5 }],
        { itemsByPoolSlug: { nouns: pool }, rand: seeded(i) },
      )
      if (picked.N) results.add(picked.N.value)
    }
    expect(results).toEqual(new Set(['Ergebnis', 'Verständnis']))
  })

  it('excludes retired (active=false) items', () => {
    const results = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const { picked } = pickSlotItems(
        [{ slot_name: 'N', pool_slug: 'nouns' }],
        { itemsByPoolSlug: { nouns: pool }, rand: seeded(i) },
      )
      if (picked.N) results.add(picked.N.value)
    }
    expect(results).not.toContain('Retired')
  })

  it('warns when no eligible items match the tier window', () => {
    const { picked, warnings } = pickSlotItems(
      [{ slot_name: 'N', pool_slug: 'nouns', tier_min: 5, tier_max: 5 }],
      { itemsByPoolSlug: { nouns: pool }, rand: seeded(1) },
    )
    expect(picked.N).toBeUndefined()
    expect(warnings[0]).toMatch(/No eligible items/)
  })
})

describe('renderTemplate — full pipeline', () => {
  const template: ExerciseTemplateLike = {
    id: 1,
    format: 'single_choice',
    promptPattern: 'Welcher Artikel passt? ___ {NOUN}',
    answerSpec: { correct_slot: 'NOUN.metadata.artikel', options: ['der', 'die', 'das'] },
    slotDefinitions: [
      { slot_name: 'NOUN', pool_slug: 'nouns', tier_min: 1, tier_max: 1 },
    ],
    hintLadder: [{ text: 'Sprich {NOUN} laut aus.' }, { text: 'Tipp: Viele Wörter auf -e sind weiblich.' }],
    feedbackCorrect: 'Genau, {NOUN.metadata.artikel} {NOUN}.',
    feedbackWrong: 'Nicht ganz. Es heißt {NOUN.metadata.artikel} {NOUN}.',
  }

  const pool: SlotItemLike[] = [
    mkItem(1, 'Tisch', { artikel: 'der', genus: 'm' }, 1),
    mkItem(2, 'Lampe', { artikel: 'die', genus: 'f' }, 1),
  ]

  it('renders prompt, correct answer, options, hints, and feedback end-to-end', () => {
    const result = renderTemplate(template, {
      itemsByPoolSlug: { nouns: pool },
      rand: seeded(1),
    })

    expect(result.format).toBe('single_choice')
    expect(result.prompt).toMatch(/Welcher Artikel passt\? ___ (Tisch|Lampe)/)
    expect(result.correctAnswer).toMatch(/^(der|die)$/)
    expect(result.options).toEqual(['der', 'die', 'das'])
    expect(result.hints).toHaveLength(2)
    expect(result.hints[0]).toMatch(/Sprich (Tisch|Lampe) laut aus/)
    expect(result.feedback.correct).toMatch(/Genau, (der|die) (Tisch|Lampe)/)
    expect(result.warnings).toEqual([])
    expect(Object.keys(result.pickedItems)).toEqual(['NOUN'])
  })

  it('surfaces warnings when a referenced pool is missing', () => {
    const result = renderTemplate(template, {
      itemsByPoolSlug: {},
      rand: seeded(1),
    })
    expect(result.prompt).toBe('Welcher Artikel passt? ___ {NOUN}')
    expect(result.correctAnswer).toBeNull()
    expect(result.warnings.some((w) => w.includes('No eligible items'))).toBe(true)
  })

  it('aligns correct answer with the actually-picked item', () => {
    // Run many iterations; the resolved answer must always match the picked
    // item's metadata, never drift.
    for (let seed = 0; seed < 20; seed++) {
      const result = renderTemplate(template, {
        itemsByPoolSlug: { nouns: pool },
        rand: seeded(seed),
      })
      const picked = result.pickedItems.NOUN
      expect(result.correctAnswer).toBe((picked.metadata as Record<string, unknown>).artikel)
    }
  })
})

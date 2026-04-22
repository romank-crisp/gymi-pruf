import { describe, it, expect } from 'vitest'
import {
  validateNounSlotItem,
  validateExerciseTemplate,
  isDuplicate,
  type RawNounItem,
  type RawExerciseTemplate,
} from '@/lib/autoValidate'

/**
 * Unit tests for the AI-generation auto-validator.
 * No network calls, no DB — pure function tests only.
 */

// ---------------------------------------------------------------------------
// validateNounSlotItem
// ---------------------------------------------------------------------------

describe('validateNounSlotItem', () => {
  const good: RawNounItem = {
    value: 'Tisch',
    genus: 'm',
    artikel: 'der',
    plural: 'Tische',
    difficultyTier: 1,
  }

  it('accepts a fully valid noun', () => {
    const result = validateNounSlotItem(good)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects missing value', () => {
    const result = validateNounSlotItem({ ...good, value: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /value/i.test(e))).toBe(true)
  })

  it('rejects lowercase noun (German capitalisation required)', () => {
    const result = validateNounSlotItem({ ...good, value: 'tisch' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /capital/i.test(e))).toBe(true)
  })

  it('rejects noun with digits', () => {
    const result = validateNounSlotItem({ ...good, value: 'Tisch1' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /digit/i.test(e))).toBe(true)
  })

  it('rejects invalid genus', () => {
    const result = validateNounSlotItem({ ...good, genus: 'x' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /genus/i.test(e))).toBe(true)
  })

  it('rejects invalid artikel', () => {
    const result = validateNounSlotItem({ ...good, artikel: 'ein' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /artikel/i.test(e))).toBe(true)
  })

  it('rejects genus/artikel mismatch (m + die)', () => {
    const result = validateNounSlotItem({ ...good, genus: 'm', artikel: 'die' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /mismatch/i.test(e))).toBe(true)
  })

  it('rejects genus/artikel mismatch (f + das)', () => {
    const result = validateNounSlotItem({ ...good, genus: 'f', artikel: 'das' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /mismatch/i.test(e))).toBe(true)
  })

  it('rejects genus/artikel mismatch (n + der)', () => {
    const result = validateNounSlotItem({ ...good, genus: 'n', artikel: 'der' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /mismatch/i.test(e))).toBe(true)
  })

  it('accepts each valid genus/artikel combination', () => {
    const combos = [
      { genus: 'm', artikel: 'der' },
      { genus: 'f', artikel: 'die' },
      { genus: 'n', artikel: 'das' },
    ] as const
    for (const { genus, artikel } of combos) {
      expect(validateNounSlotItem({ ...good, genus, artikel }).valid).toBe(true)
    }
  })

  it('rejects difficultyTier out of range', () => {
    expect(validateNounSlotItem({ ...good, difficultyTier: 0 }).valid).toBe(false)
    expect(validateNounSlotItem({ ...good, difficultyTier: 6 }).valid).toBe(false)
    expect(validateNounSlotItem({ ...good, difficultyTier: 1.5 }).valid).toBe(false)
  })

  it('accepts all valid tiers 1–5', () => {
    for (let t = 1; t <= 5; t++) {
      expect(validateNounSlotItem({ ...good, difficultyTier: t }).valid).toBe(true)
    }
  })

  it('warns but does not fail on missing plural', () => {
    const result = validateNounSlotItem({ ...good, plural: '' })
    expect(result.valid).toBe(true)
    expect(result.warnings.some((w) => /plural/i.test(w))).toBe(true)
  })

  it('rejects noun with disallowed characters', () => {
    const result = validateNounSlotItem({ ...good, value: 'Tisch{' })
    expect(result.valid).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validateExerciseTemplate
// ---------------------------------------------------------------------------

describe('validateExerciseTemplate', () => {
  const good: RawExerciseTemplate = {
    format: 'multiple_choice',
    difficulty: 2,
    cognitiveType: 'recognition',
    promptPattern: 'Welcher Artikel passt? ___ Tisch',
    answerSpec: {
      correct_answer: 'der',
      options: ['der', 'die', 'das'],
    },
    hintLadder: [
      { text: 'Sprich das Wort laut.' },
      { text: 'Tisch ist maskulin.' },
    ],
    feedbackCorrect: 'Genau, der Tisch!',
    feedbackWrong: 'Nicht ganz. Es heißt der Tisch.',
    tags: ['genus', 'nomen'],
  }

  it('accepts a fully valid exercise', () => {
    const result = validateExerciseTemplate(good)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects too-short promptPattern', () => {
    const result = validateExerciseTemplate({ ...good, promptPattern: 'Hi' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /promptPattern/i.test(e))).toBe(true)
  })

  it('rejects unknown format', () => {
    const result = validateExerciseTemplate({ ...good, format: 'unknown_format' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /format/i.test(e))).toBe(true)
  })

  it('accepts all known formats', () => {
    const formats = [
      'multiple_choice',
      'multi_select',
      'fill_blank',
      'tap_text',
      'drag_order',
      'drag_sort',
      'matching_pairs',
    ]
    for (const format of formats) {
      const result = validateExerciseTemplate({ ...good, format })
      expect(result.valid, `format ${format} should be valid`).toBe(true)
    }
  })

  it('rejects difficulty out of 1–5 range', () => {
    expect(validateExerciseTemplate({ ...good, difficulty: 0 }).valid).toBe(false)
    expect(validateExerciseTemplate({ ...good, difficulty: 6 }).valid).toBe(false)
  })

  it('rejects missing answerSpec', () => {
    const result = validateExerciseTemplate({ ...good, answerSpec: null })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /answerSpec/i.test(e))).toBe(true)
  })

  it('rejects multiple_choice without options', () => {
    const result = validateExerciseTemplate({
      ...good,
      format: 'multiple_choice',
      answerSpec: { correct_answer: 'der' }, // no options array
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /options/i.test(e))).toBe(true)
  })

  it('rejects Swiss German dialect in promptPattern', () => {
    const result = validateExerciseTemplate({
      ...good,
      promptPattern: 'Welcher Artikel isch richtig für ___ Tisch?',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /swiss german/i.test(e))).toBe(true)
  })

  it('rejects HTML in promptPattern', () => {
    const result = validateExerciseTemplate({
      ...good,
      promptPattern: 'Klicke auf <b>das Nomen</b> im Satz.',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => /html/i.test(e))).toBe(true)
  })

  it('warns on missing feedback', () => {
    const result = validateExerciseTemplate({
      ...good,
      feedbackCorrect: undefined,
      feedbackWrong: undefined,
    })
    // Warnings, not errors
    expect(result.valid).toBe(true)
    expect(result.warnings.some((w) => /feedbackCorrect/i.test(w))).toBe(true)
    expect(result.warnings.some((w) => /feedbackWrong/i.test(w))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// isDuplicate
// ---------------------------------------------------------------------------

describe('isDuplicate', () => {
  const existing = new Set(['tisch', 'lampe', 'buch'])

  it('returns true for exact match', () => {
    expect(isDuplicate('Tisch', existing)).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isDuplicate('LAMPE', existing)).toBe(true)
    expect(isDuplicate('buch', existing)).toBe(true)
  })

  it('returns false for non-existing values', () => {
    expect(isDuplicate('Stuhl', existing)).toBe(false)
    expect(isDuplicate('Fenster', existing)).toBe(false)
  })
})

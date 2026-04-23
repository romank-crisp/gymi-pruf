/**
 * Auto-validation for AI-generated content.
 *
 * These checks run before inserting generated items into Payload.
 * They catch structural issues, data inconsistencies, and red flags that
 * would cause problems for learners or reviewers downstream.
 *
 * Design principle: validation should be STRICT on correctness (genus/artikel
 * consistency, required fields) and LENIENT on style (we trust the reviewer
 * to catch awkward phrasing). Fail loudly and log clearly so the caller can
 * report a useful summary to the operator.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const ok = (): ValidationResult => ({ valid: true, errors: [], warnings: [] })

const fail = (errors: string[], warnings: string[] = []): ValidationResult => ({
  valid: false,
  errors,
  warnings,
})

// ---------------------------------------------------------------------------
// Noun slot item
// ---------------------------------------------------------------------------

export type RawNounItem = {
  value?: unknown
  genus?: unknown
  artikel?: unknown
  plural?: unknown
  difficultyTier?: unknown
  [key: string]: unknown
}

/** Maps German genus codes to their definite article. */
const GENUS_ARTIKEL: Record<string, string> = {
  m: 'der',
  f: 'die',
  n: 'das',
}

const VALID_GENUS = new Set(['m', 'f', 'n'])
const VALID_ARTIKEL = new Set(['der', 'die', 'das'])

/**
 * Validates a raw noun object returned by the AI before inserting it as a
 * `slot-items` row. Returns a `ValidationResult` — call `.valid` to gate
 * insertion.
 */
export function validateNounSlotItem(raw: RawNounItem): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // ── value ──────────────────────────────────────────────────────────────
  if (typeof raw.value !== 'string' || raw.value.trim() === '') {
    errors.push('Missing or empty "value" (noun)')
  } else {
    const v = raw.value.trim()
    if (!/^[A-ZÄÖÜ]/.test(v)) errors.push(`"${v}" must start with a capital letter (German noun)`)
    if (/\d/.test(v)) errors.push(`"${v}" contains digits — not a valid noun`)
    if (v.length < 2 || v.length > 35)
      errors.push(`"${v}" length ${v.length} is outside range 2–35`)
    // Very basic red-flag check: obvious non-German or rude content
    if (/[<>{}[\]\\;@#$%^*]/.test(v))
      errors.push(`"${v}" contains disallowed characters`)
  }

  // ── genus ──────────────────────────────────────────────────────────────
  if (typeof raw.genus !== 'string' || !VALID_GENUS.has(raw.genus)) {
    errors.push(`Invalid genus "${raw.genus}"; must be "m", "f", or "n"`)
  }

  // ── artikel ────────────────────────────────────────────────────────────
  if (typeof raw.artikel !== 'string' || !VALID_ARTIKEL.has(raw.artikel)) {
    errors.push(`Invalid artikel "${raw.artikel}"; must be "der", "die", or "das"`)
  }

  // ── genus ↔ artikel consistency (key correctness gate) ────────────────
  if (
    typeof raw.genus === 'string' &&
    VALID_GENUS.has(raw.genus) &&
    typeof raw.artikel === 'string' &&
    VALID_ARTIKEL.has(raw.artikel)
  ) {
    const expected = GENUS_ARTIKEL[raw.genus]
    if (raw.artikel !== expected) {
      errors.push(
        `Genus/artikel mismatch: genus="${raw.genus}" requires artikel="${expected}", got "${raw.artikel}"`,
      )
    }
  }

  // ── plural ─────────────────────────────────────────────────────────────
  if (raw.plural === undefined || raw.plural === null || raw.plural === '') {
    warnings.push('"plural" is missing; will default to "—"')
  } else if (typeof raw.plural !== 'string') {
    errors.push('"plural" must be a string')
  }

  // ── difficultyTier ─────────────────────────────────────────────────────
  const tier = Number(raw.difficultyTier)
  if (!Number.isInteger(tier) || tier < 1 || tier > 5) {
    errors.push(`Invalid difficultyTier "${raw.difficultyTier}"; must be an integer 1–5`)
  }

  return errors.length > 0 ? fail(errors, warnings) : { valid: true, errors: [], warnings }
}

// ---------------------------------------------------------------------------
// Exercise template (ai_native)
// ---------------------------------------------------------------------------

export type RawExerciseTemplate = {
  promptPattern?: unknown
  answerSpec?: unknown
  format?: unknown
  difficulty?: unknown
  hintLadder?: unknown
  feedbackCorrect?: unknown
  feedbackWrong?: unknown
  tags?: unknown
  [key: string]: unknown
}

const VALID_COGNITIVE_TYPES = new Set([
  'recognition',
  'classification',
  'generation',
  'transformation',
  'application',
])

/**
 * Maps common model-generated cognitiveType values that fall outside the
 * schema's enum to the nearest valid value. Returns the input unchanged if it
 * is already valid or if no mapping is known.
 */
export function coerceCognitiveType(raw: unknown): string {
  if (typeof raw !== 'string') return 'recognition'
  if (VALID_COGNITIVE_TYPES.has(raw)) return raw
  // Common model drift mappings
  const map: Record<string, string> = {
    analysis: 'classification',
    identification: 'recognition',
    comprehension: 'recognition',
    recall: 'recognition',
    production: 'generation',
    synthesis: 'generation',
    evaluation: 'application',
    practice: 'application',
    ordering: 'transformation',
    reordering: 'transformation',
    sorting: 'classification',
  }
  return map[raw.toLowerCase()] ?? 'recognition'
}

const VALID_FORMATS = new Set([
  'multiple_choice',
  'multi_select',
  'fill_blank',
  'tap_text',
  'drag_order',
  'drag_sort',
  'matching_pairs',
])

/**
 * Validates a raw exercise template object returned by the AI before
 * inserting it as an `exercise-templates` row in `draft` status.
 */
export function validateExerciseTemplate(raw: RawExerciseTemplate): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // ── promptPattern ──────────────────────────────────────────────────────
  if (typeof raw.promptPattern !== 'string' || raw.promptPattern.trim().length < 5) {
    errors.push('Missing or too short "promptPattern" (min 5 chars)')
  } else {
    const p = raw.promptPattern.trim()
    // Reasonable length for a 6th-grade prompt
    if (p.length > 300) warnings.push(`promptPattern is ${p.length} chars — consider shortening`)
    // Must not be Swiss German (rough check)
    if (/\b(isch|hät|gönd|chunnsch|gseh|lueg)\b/i.test(p))
      errors.push('promptPattern appears to contain Swiss German dialect')
    // Must not contain HTML
    if (/<[a-z]/i.test(p)) errors.push('promptPattern contains HTML tags')
  }

  // ── format ─────────────────────────────────────────────────────────────
  if (typeof raw.format !== 'string' || !VALID_FORMATS.has(raw.format)) {
    errors.push(
      `Invalid format "${raw.format}"; must be one of: ${[...VALID_FORMATS].join(', ')}`,
    )
  }

  // ── difficulty ─────────────────────────────────────────────────────────
  const diff = Number(raw.difficulty)
  if (!Number.isInteger(diff) || diff < 1 || diff > 5) {
    errors.push(`Invalid difficulty "${raw.difficulty}"; must be 1–5`)
  }

  // ── answerSpec ─────────────────────────────────────────────────────────
  if (raw.answerSpec == null || typeof raw.answerSpec !== 'object') {
    errors.push('Missing or invalid "answerSpec" (must be an object)')
  } else {
    const spec = raw.answerSpec as Record<string, unknown>
    // For multiple_choice / fill_blank we expect a correct answer
    if (raw.format === 'multiple_choice' || raw.format === 'fill_blank') {
      if (!spec.correct && !spec.correct_slot && !spec.correct_answer) {
        errors.push('answerSpec must have a "correct", "correct_slot", or "correct_answer" field')
      }
      if (raw.format === 'multiple_choice' && !Array.isArray(spec.options)) {
        errors.push('answerSpec.options must be an array for multiple_choice format')
      }
    }
  }

  // ── hints ──────────────────────────────────────────────────────────────
  if (raw.hintLadder !== undefined) {
    if (!Array.isArray(raw.hintLadder)) {
      errors.push('"hintLadder" must be an array')
    } else if (raw.hintLadder.length === 0) {
      warnings.push('"hintLadder" is empty — consider adding at least one hint')
    } else if (raw.hintLadder.length > 5) {
      warnings.push(`"hintLadder" has ${raw.hintLadder.length} hints — usually 2–3 is enough`)
    }
  }

  // ── feedback ───────────────────────────────────────────────────────────
  if (!raw.feedbackCorrect) warnings.push('"feedbackCorrect" is missing')
  if (!raw.feedbackWrong) warnings.push('"feedbackWrong" is missing')

  return errors.length > 0 ? fail(errors, warnings) : { valid: true, errors: [], warnings }
}

// ---------------------------------------------------------------------------
// Duplicate check helper
// ---------------------------------------------------------------------------

/**
 * Returns true if `value` (case-insensitive) already exists in `existingValues`.
 * Used to skip slot items already in the DB.
 */
export function isDuplicate(value: string, existingValues: Set<string>): boolean {
  return existingValues.has(value.toLowerCase())
}

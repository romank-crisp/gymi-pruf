/**
 * Renders an ExerciseTemplate as the learner sees it by:
 *   1. Drawing a random SlotItem from each referenced pool (respecting the
 *      template's tier_min/tier_max constraints)
 *   2. Substituting {SLOT_NAME} and {SLOT_NAME.metadata.key} into the
 *      promptPattern, feedback strings, and hint ladder
 *   3. Resolving answerSpec.correct_slot to the concrete correct answer
 *
 * Pure function — accepts already-fetched pools and items to keep it
 * server/client agnostic. The caller is responsible for loading data.
 *
 * Phase 2a preview scope: multiple_choice templates render fully; other
 * formats render the substituted prompt and a format badge (full
 * format-specific rendering is a later phase when the learner app lands).
 */

export type SlotItemLike = {
  id: string | number
  value: string
  metadata?: unknown
  difficultyTier?: number | null
  active?: boolean | null
  pool?: unknown
}

export type SlotDefinition = {
  slot_name: string
  pool_slug: string
  tier_min?: number
  tier_max?: number
}

export type AnswerSpec = {
  correct_slot?: string
  options?: unknown[]
  [key: string]: unknown
}

export type HintLadderEntry = { text?: string | null } | null | undefined

export type ExerciseTemplateLike = {
  id: string | number
  format?: string | null
  promptPattern?: string | null
  answerSpec?: AnswerSpec | null
  slotDefinitions?: SlotDefinition[] | null
  hintLadder?: HintLadderEntry[] | null
  feedbackCorrect?: string | null
  feedbackPartial?: string | null
  feedbackWrong?: string | null
  feedbackWalkthrough?: string | null
}

export type RenderedPreview = {
  format: string
  prompt: string
  correctAnswer: string | null
  options: unknown[]
  hints: string[]
  feedback: {
    correct: string
    partial: string
    wrong: string
    walkthrough: string
  }
  pickedItems: Record<string, SlotItemLike>
  warnings: string[]
}

// ---------------------------------------------------------------------------
// Substitution
// ---------------------------------------------------------------------------

const getByPath = (obj: unknown, path: string[]): unknown => {
  let cursor: unknown = obj
  for (const key of path) {
    if (cursor == null || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[key]
  }
  return cursor
}

const TOKEN_RE = /\{([A-Z_][A-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}/g

/**
 * Replaces `{SLOT}` and `{SLOT.metadata.key}` tokens against a map of items.
 * Unknown slots pass through as-is so the preview shows the author where
 * their slot definitions are incomplete.
 */
export const substitute = (
  template: string,
  items: Record<string, SlotItemLike>,
): { text: string; unresolved: string[] } => {
  const unresolved = new Set<string>()
  const text = template.replace(TOKEN_RE, (_match, token: string) => {
    const [slotName, ...rest] = token.split('.')
    const item = items[slotName]
    if (!item) {
      unresolved.add(token)
      return `{${token}}`
    }
    if (rest.length === 0) return String(item.value ?? '')
    // e.g. NOUN.metadata.artikel
    const resolved = getByPath(item as unknown, rest)
    if (resolved == null) {
      unresolved.add(token)
      return `{${token}}`
    }
    return String(resolved)
  })
  return { text, unresolved: Array.from(unresolved) }
}

// ---------------------------------------------------------------------------
// Slot picking
// ---------------------------------------------------------------------------

/**
 * Deterministic when `seed` is given (used in tests). In the admin preview
 * UI we pass `Math.random()` each click to shuffle the picks.
 */
const pick = <T>(arr: T[], rand: () => number): T | undefined => {
  if (arr.length === 0) return undefined
  const idx = Math.floor(rand() * arr.length)
  return arr[idx]
}

export type SlotPickContext = {
  /** All active slot items keyed by pool slug. */
  itemsByPoolSlug: Record<string, SlotItemLike[]>
  /** Pool slug for each pool id, so `SlotItem.pool` IDs can be resolved. */
  poolSlugById?: Record<string, string>
  rand?: () => number
}

export const pickSlotItems = (
  slotDefinitions: SlotDefinition[] | null | undefined,
  ctx: SlotPickContext,
): { picked: Record<string, SlotItemLike>; warnings: string[] } => {
  const picked: Record<string, SlotItemLike> = {}
  const warnings: string[] = []
  const rand = ctx.rand ?? Math.random

  for (const def of slotDefinitions ?? []) {
    const pool = ctx.itemsByPoolSlug[def.pool_slug] ?? []
    const filtered = pool.filter((it) => {
      if (it.active === false) return false
      const tier = it.difficultyTier ?? 3
      if (def.tier_min != null && tier < def.tier_min) return false
      if (def.tier_max != null && tier > def.tier_max) return false
      return true
    })
    const chosen = pick(filtered, rand)
    if (!chosen) {
      warnings.push(
        `No eligible items in pool "${def.pool_slug}" for slot "${def.slot_name}" ` +
          `(tier ${def.tier_min ?? '-'}..${def.tier_max ?? '-'})`,
      )
      continue
    }
    picked[def.slot_name] = chosen
  }

  return { picked, warnings }
}

// ---------------------------------------------------------------------------
// Full render
// ---------------------------------------------------------------------------

const resolveCorrectAnswer = (
  answerSpec: AnswerSpec | null | undefined,
  picked: Record<string, SlotItemLike>,
): string | null => {
  if (!answerSpec?.correct_slot) return null
  // correct_slot is a dot-path like "NOUN.metadata.artikel"
  const [slotName, ...rest] = String(answerSpec.correct_slot).split('.')
  const item = picked[slotName]
  if (!item) return null
  if (rest.length === 0) return String(item.value ?? '')
  const resolved = getByPath(item as unknown, rest)
  return resolved == null ? null : String(resolved)
}

export const renderTemplate = (
  template: ExerciseTemplateLike,
  ctx: SlotPickContext,
): RenderedPreview => {
  const { picked, warnings } = pickSlotItems(template.slotDefinitions, ctx)

  const substituteSafe = (t: string | null | undefined): { text: string; unresolved: string[] } =>
    t ? substitute(t, picked) : { text: '', unresolved: [] }

  const prompt = substituteSafe(template.promptPattern)
  const fbCorrect = substituteSafe(template.feedbackCorrect)
  const fbPartial = substituteSafe(template.feedbackPartial)
  const fbWrong = substituteSafe(template.feedbackWrong)
  const fbWalk = substituteSafe(template.feedbackWalkthrough)

  const hints = (template.hintLadder ?? [])
    .map((h) => h?.text ?? '')
    .filter((t) => t.length > 0)
    .map((t) => substitute(t, picked).text)

  const allUnresolved = new Set<string>([
    ...prompt.unresolved,
    ...fbCorrect.unresolved,
    ...fbPartial.unresolved,
    ...fbWrong.unresolved,
    ...fbWalk.unresolved,
  ])
  for (const u of allUnresolved) {
    warnings.push(`Unresolved token: {${u}}`)
  }

  return {
    format: template.format ?? 'unknown',
    prompt: prompt.text,
    correctAnswer: resolveCorrectAnswer(template.answerSpec, picked),
    options: Array.isArray(template.answerSpec?.options) ? template.answerSpec!.options! : [],
    hints,
    feedback: {
      correct: fbCorrect.text,
      partial: fbPartial.text,
      wrong: fbWrong.text,
      walkthrough: fbWalk.text,
    },
    pickedItems: picked,
    warnings,
  }
}

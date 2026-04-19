/**
 * Shared enum definitions for the content engine.
 *
 * These mirror the Postgres enums in 001_content_schema.sql. We keep them
 * centralised so collections, validators, and seed data all reference the
 * same authoritative lists.
 */

// ── Status lifecycle ─────────────────────────────────────────────────────
// draft → in_review → approved → active → flagged | retired
export const CONTENT_STATUSES = [
  'draft',
  'in_review',
  'approved',
  'active',
  'flagged',
  'retired',
] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]

export const contentStatusOptions = CONTENT_STATUSES.map((value) => ({
  label: value.replace('_', ' '),
  value,
}))

/**
 * Allowed forward transitions. Reverse transitions are permitted only by
 * admins with `req.context.forcePromote = true` (dev escape hatch).
 *
 * flagged and retired are terminal; a flagged item returns to the workflow
 * by being re-queued via a new row (supersedes_id chain).
 */
export const LEGAL_STATUS_TRANSITIONS: Record<ContentStatus, readonly ContentStatus[]> = {
  draft: ['in_review', 'retired'],
  in_review: ['approved', 'draft', 'retired'],
  approved: ['active', 'flagged', 'retired'],
  active: ['flagged', 'retired'],
  flagged: ['active', 'retired'],
  retired: [],
}

// ── L1 codes ─────────────────────────────────────────────────────────────
export const L1_CODES = ['de', 'en', 'uk', 'ru', 'it', 'pt'] as const
export type L1Code = (typeof L1_CODES)[number]

export const l1Options = [
  { label: 'Deutsch (primary)', value: 'de' },
  { label: 'English', value: 'en' },
  { label: 'Українська', value: 'uk' },
  { label: 'Русский', value: 'ru' },
  { label: 'Italiano', value: 'it' },
  { label: 'Português', value: 'pt' },
]

// ── Theory formats ───────────────────────────────────────────────────────
export const THEORY_FORMATS = [
  'conversational',
  'interactive_diagram',
  'mini_game',
  'video',
  'passage',
  'worked_example',
] as const
export type TheoryFormat = (typeof THEORY_FORMATS)[number]

export const theoryFormatOptions = THEORY_FORMATS.map((value) => ({
  label: value.replace(/_/g, ' '),
  value,
}))

// ── Exercise formats ─────────────────────────────────────────────────────
export const EXERCISE_FORMATS = [
  'multiple_choice',
  'multi_select',
  'fill_blank',
  'tap_text',
  'drag_order',
  'drag_sort',
  'matching_pairs',
  'voice_answer',
  'free_text_short',
  'dictation',
  'passage_comprehension',
  'essay_writing',
  'game_wordhunt',
  'game_speedcat',
  'conversational_exchange',
] as const
export type ExerciseFormat = (typeof EXERCISE_FORMATS)[number]

export const exerciseFormatOptions = EXERCISE_FORMATS.map((value) => ({
  label: value.replace(/_/g, ' '),
  value,
}))

// ── Cognitive types ──────────────────────────────────────────────────────
export const COGNITIVE_TYPES = [
  'recognition',
  'classification',
  'generation',
  'transformation',
  'application',
] as const
export type CognitiveType = (typeof COGNITIVE_TYPES)[number]

export const cognitiveTypeOptions = COGNITIVE_TYPES.map((value) => ({
  label: value,
  value,
}))

// ── Generation modes ─────────────────────────────────────────────────────
export const GENERATION_MODES = ['static', 'hybrid', 'ai_native'] as const
export type GenerationMode = (typeof GENERATION_MODES)[number]

export const generationModeOptions = [
  { label: 'Static (all slot-filled)', value: 'static' },
  { label: 'Hybrid (slot + AI)', value: 'hybrid' },
  { label: 'AI-native', value: 'ai_native' },
]

// ── DaZ pain points ──────────────────────────────────────────────────────
export const DAZ_PAIN_POINTS = [
  'gender',
  'cases',
  'tenses',
  'word_order',
  'separable_verbs',
] as const
export type DazPainPoint = (typeof DAZ_PAIN_POINTS)[number]

export const dazPainPointOptions = [
  { label: 'Gender (der/die/das)', value: 'gender' },
  { label: 'Cases (Nom/Akk/Dat/Gen)', value: 'cases' },
  { label: 'Tenses (Perfekt vs Präteritum)', value: 'tenses' },
  { label: 'Word order (verb-second / verb-final)', value: 'word_order' },
  { label: 'Separable verbs', value: 'separable_verbs' },
]

// ── Exam strands ─────────────────────────────────────────────────────────
export const EXAM_STRANDS = ['assessed', 'supporting'] as const
export type ExamStrand = (typeof EXAM_STRANDS)[number]

export const examStrandOptions = [
  { label: 'Assessed (graded on exam)', value: 'assessed' },
  { label: 'Supporting (enables assessed strands)', value: 'supporting' },
]

// ── Exercise group phases ────────────────────────────────────────────────
export const EXERCISE_PHASES = ['intro', 'practice', 'review', 'checkpoint'] as const
export type ExercisePhase = (typeof EXERCISE_PHASES)[number]

export const exercisePhaseOptions = [
  { label: 'Intro (guided, easy)', value: 'intro' },
  { label: 'Practice (adaptive)', value: 'practice' },
  { label: 'Review (spaced)', value: 'review' },
  { label: 'Checkpoint (mastery test)', value: 'checkpoint' },
]

// ── Prerequisite strength ────────────────────────────────────────────────
export const PREREQUISITE_STRENGTHS = ['hard', 'soft'] as const
export type PrerequisiteStrength = (typeof PREREQUISITE_STRENGTHS)[number]

export const prerequisiteStrengthOptions = [
  { label: 'Hard (blocks progression)', value: 'hard' },
  { label: 'Soft (recommended)', value: 'soft' },
]

// ── L1 variant parent types ──────────────────────────────────────────────
export const L1_VARIANT_PARENTS = [
  'theory_block',
  'exercise_template',
  'concept_card',
] as const
export type L1VariantParent = (typeof L1_VARIANT_PARENTS)[number]

export const l1VariantParentOptions = L1_VARIANT_PARENTS.map((value) => ({
  label: value.replace(/_/g, ' '),
  value,
}))

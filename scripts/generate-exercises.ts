/**
 * generate-exercises.ts — AI-native Wortarten exercise generation.
 *
 * Calls the Anthropic API to generate fully-formed exercise templates for
 * Wortarten practice. Each generated exercise is inserted into the
 * `exercise-templates` collection as `draft`, ready for teacher review.
 *
 * Usage:
 *   pnpm generate:exercises -- --anchor=concept:genus-bestimmen --topic=genus --count=20
 *   pnpm generate:exercises -- --anchor=unit:praeposition --topic=wortart --count=10
 *   pnpm generate:exercises -- --anchor=concept:genus-bestimmen --secondary=unit:nomen --count=5
 *   pnpm generate:exercises -- --anchor=concept:genus-bestimmen --dry-run --verbose
 *
 * Flags:
 *   --anchor=LEVEL:SLUG Required. Primary curriculum anchor.
 *                       LEVEL is one of: domain, module, section, unit, concept.
 *                       SLUG is the collection slug of the target entity.
 *   --secondary=LEVEL:SLUG[,LEVEL:SLUG]  Optional, max 2 entries.
 *   --topic=TOPIC       genus | plural | wortart | kasus  (default: genus)
 *   --count=N           Number of exercises to request  (default: 20)
 *   --diff-min=N        Minimum difficulty 1–5          (default: 1)
 *   --diff-max=N        Maximum difficulty 1–5          (default: 3)
 *   --group=SLUG        exercise-group slug to link to  (optional attribute only)
 *   --dry-run           Validate only; do not write
 *   --verbose           Print each exercise as processed
 */

import Anthropic from '@anthropic-ai/sdk'
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'
import {
  validateExerciseTemplate,
  coerceCognitiveType,
  type RawExerciseTemplate,
} from '../src/lib/autoValidate'
import {
  buildExerciseSystemPrompt,
  buildExerciseUserPrompt,
  type ExerciseGenerationOptions,
} from './prompts/wortarten-exercises'

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

type Topic = 'genus' | 'plural' | 'wortart' | 'kasus'
const VALID_TOPICS = new Set<Topic>(['genus', 'plural', 'wortart', 'kasus'])

type AnchorLevel = 'domain' | 'module' | 'section' | 'unit' | 'concept'
const LEVEL_TO_COLLECTION: Record<AnchorLevel, string> = {
  domain: 'domains',
  module: 'modules',
  section: 'sections',
  unit: 'units',
  concept: 'concepts',
}
const VALID_LEVELS = new Set<AnchorLevel>(['domain', 'module', 'section', 'unit', 'concept'])

type AnchorSpec = { level: AnchorLevel; slug: string }

function parseAnchorArg(raw: string, flagName: string): AnchorSpec {
  const [level, slug] = raw.split(':')
  if (!level || !slug || !VALID_LEVELS.has(level as AnchorLevel)) {
    console.error(
      `Invalid --${flagName}="${raw}". Expected LEVEL:SLUG with LEVEL in ${[...VALID_LEVELS].join('|')}.`,
    )
    process.exit(1)
  }
  return { level: level as AnchorLevel, slug }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string, fallback: string) =>
    args.find((a) => a.startsWith(`--${flag}=`))?.split('=')[1] ?? fallback

  const topicRaw = get('topic', 'genus')
  if (!VALID_TOPICS.has(topicRaw as Topic)) {
    console.error(`Invalid --topic="${topicRaw}". Must be one of: ${[...VALID_TOPICS].join(', ')}`)
    process.exit(1)
  }

  const anchorRaw = get('anchor', '')
  if (!anchorRaw) {
    console.error(
      'Missing required --anchor=LEVEL:SLUG flag (e.g. --anchor=concept:genus-bestimmen).',
    )
    process.exit(1)
  }
  const primary = parseAnchorArg(anchorRaw, 'anchor')

  const secondaryRaw = get('secondary', '')
  const secondaries: AnchorSpec[] = secondaryRaw
    ? secondaryRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => parseAnchorArg(s, 'secondary'))
    : []
  if (secondaries.length > 2) {
    console.error(`Too many --secondary anchors (${secondaries.length}). Max is 2.`)
    process.exit(1)
  }

  return {
    topic: topicRaw as Topic,
    count: parseInt(get('count', '20'), 10),
    diffMin: parseInt(get('diff-min', '1'), 10),
    diffMax: parseInt(get('diff-max', '3'), 10),
    groupSlug: get('group', ''),
    primary,
    secondaries,
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
  }
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function resolveGroupId(
  payload: Payload,
  groupSlug: string,
): Promise<number | string | null> {
  if (!groupSlug) return null
  const result = await payload.find({
    collection: 'exercise-groups',
    where: { slug: { equals: groupSlug } },
    limit: 1,
  })
  if (result.totalDocs === 0) {
    console.warn(`  ⚠  exercise-group "${groupSlug}" not found — exercises will have no group`)
    return null
  }
  return (result.docs[0] as { id: number | string }).id
}

type PolymorphicAnchor = { relationTo: string; value: number | string }

type ResolvedAnchor = {
  spec: AnchorSpec
  collection: string
  id: number | string
  name: string
}

async function resolveAnchor(payload: Payload, spec: AnchorSpec): Promise<ResolvedAnchor> {
  const collection = LEVEL_TO_COLLECTION[spec.level]
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: collection as any,
    where: { slug: { equals: spec.slug } },
    limit: 1,
  })
  if (result.totalDocs === 0) {
    throw new Error(`Anchor not found: ${spec.level} with slug "${spec.slug}" in ${collection}.`)
  }
  const doc = result.docs[0] as { id: number | string; name?: string; slug?: string }
  return {
    spec,
    collection,
    id: doc.id,
    name: doc.name ?? doc.slug ?? String(doc.id),
  }
}

function toPolymorphicAnchor(r: ResolvedAnchor): PolymorphicAnchor {
  return { relationTo: r.collection, value: r.id }
}

// ---------------------------------------------------------------------------
// Anthropic call
// ---------------------------------------------------------------------------

async function generateExercises(
  client: Anthropic,
  opts: ExerciseGenerationOptions,
): Promise<RawExerciseTemplate[]> {
  const systemPrompt = buildExerciseSystemPrompt()
  const userPrompt = buildExerciseUserPrompt(opts)

  console.log(`\n→ calling Claude (requesting ${opts.count} ${opts.topic} exercises)…`)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const rawText =
    message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

  if (!rawText) throw new Error('API returned empty response')

  const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch (err) {
    throw new Error(
      `Failed to parse API response as JSON: ${(err as Error).message}\n\n${jsonText.slice(0, 500)}`,
    )
  }

  // Accept {exercises:[...]} or [...]
  if (Array.isArray(parsed)) return parsed as RawExerciseTemplate[]
  const p = parsed as Record<string, unknown>
  if (p && Array.isArray(p.exercises)) return p.exercises as RawExerciseTemplate[]

  throw new Error(
    `Unexpected response shape. Expected {exercises:[...]} or [...]. Got: ${jsonText.slice(0, 300)}`,
  )
}

// ---------------------------------------------------------------------------
// Payload insert
// ---------------------------------------------------------------------------

async function insertExercise(
  payload: Payload,
  raw: RawExerciseTemplate,
  primaryAnchor: PolymorphicAnchor,
  secondaryAnchors: PolymorphicAnchor[],
  groupId: number | string | null,
): Promise<void> {
  const spec = raw.answerSpec as Record<string, unknown>
  const hints = Array.isArray(raw.hintLadder)
    ? (raw.hintLadder as Array<{ text: string }>).map((h) => ({ text: h.text ?? '' }))
    : []
  const tags = Array.isArray(raw.tags)
    ? (raw.tags as string[]).map((v) => ({ value: v }))
    : []

  const data: Record<string, unknown> = {
    primaryAnchor,
    secondaryAnchors: secondaryAnchors.map((a) => ({ anchor: a })),
    format: raw.format,
    cognitiveType: coerceCognitiveType(raw.cognitiveType),
    difficulty: Number(raw.difficulty),
    promptPattern: String(raw.promptPattern),
    answerSpec: spec,
    generationMode: 'ai_native',
    hintLadder: hints,
    feedbackCorrect: raw.feedbackCorrect ?? null,
    feedbackWrong: raw.feedbackWrong ?? null,
    tags,
    status: 'draft',
    version: 1,
  }

  if (groupId) data.exerciseGroup = groupId

  await payload.create({ collection: 'exercise-templates', data: data as never })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs()

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  generate-exercises — AI-native template generation  ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  topic      : ${opts.topic}`)
  console.log(`  anchor     : ${opts.primary.level}:${opts.primary.slug}`)
  if (opts.secondaries.length > 0) {
    console.log(
      `  secondary  : ${opts.secondaries.map((s) => `${s.level}:${s.slug}`).join(', ')}`,
    )
  }
  console.log(`  count      : ${opts.count}`)
  console.log(`  difficulty : ${opts.diffMin}–${opts.diffMax}`)
  console.log(`  group      : ${opts.groupSlug || '(none)'}`)
  console.log(`  dry-run    : ${opts.dryRun}`)

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in .env')
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  console.log('\n→ connecting to Payload…')
  const payload = await getPayload({ config })

  const groupId = await resolveGroupId(payload, opts.groupSlug)

  // ── Resolve anchors ───────────────────────────────────────────────────
  const primaryResolved = await resolveAnchor(payload, opts.primary)
  console.log(
    `  primary anchor → ${primaryResolved.collection} #${primaryResolved.id} (${primaryResolved.name})`,
  )
  const secondaryResolved: ResolvedAnchor[] = []
  for (const s of opts.secondaries) {
    const r = await resolveAnchor(payload, s)
    console.log(`  secondary anchor → ${r.collection} #${r.id} (${r.name})`)
    secondaryResolved.push(r)
  }
  const primaryAnchor = toPolymorphicAnchor(primaryResolved)
  const secondaryAnchors = secondaryResolved.map(toPolymorphicAnchor)

  // ── Generate ──────────────────────────────────────────────────────────
  const rawItems = await generateExercises(client, {
    count: opts.count,
    topic: opts.topic,
    difficultyMin: opts.diffMin,
    difficultyMax: opts.diffMax,
    anchorContext: {
      primary: { level: primaryResolved.spec.level, name: primaryResolved.name },
      secondaries: secondaryResolved.map((r) => ({
        level: r.spec.level,
        name: r.name,
      })),
    },
  })

  console.log(`\n→ received ${rawItems.length} exercises from API`)

  // ── Validate & insert ─────────────────────────────────────────────────
  const stats = { received: rawItems.length, passed: 0, failed: 0, inserted: 0 }
  const failedItems: Array<{ item: unknown; errors: string[] }> = []

  for (const raw of rawItems) {
    const result = validateExerciseTemplate(raw)

    if (!result.valid) {
      stats.failed++
      failedItems.push({ item: raw, errors: result.errors })
      if (opts.verbose) {
        console.log(`  ✗ FAIL  "${String(raw.promptPattern ?? '').slice(0, 60)}" — ${result.errors.join('; ')}`)
      }
      continue
    }

    stats.passed++

    if (result.warnings.length > 0 && opts.verbose) {
      console.log(`  ⚠ WARN  "${String(raw.promptPattern ?? '').slice(0, 60)}" — ${result.warnings.join('; ')}`)
    }

    if (opts.dryRun) {
      if (opts.verbose) {
        console.log(`  ○ DRY   "${String(raw.promptPattern ?? '').slice(0, 60)}"`)
      }
      continue
    }

    await insertExercise(payload, raw, primaryAnchor, secondaryAnchors, groupId)
    stats.inserted++
    if (opts.verbose) {
      console.log(`  ✓ INS   "${String(raw.promptPattern ?? '').slice(0, 60)}" (diff ${raw.difficulty})`)
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║  Summary                                             ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  received : ${stats.received}`)
  console.log(`  passed   : ${stats.passed}`)
  console.log(`  failed   : ${stats.failed}`)
  console.log(`  inserted : ${stats.inserted}${opts.dryRun ? ' (dry-run)' : ''}`)

  if (failedItems.length > 0) {
    console.log('\n  Failed items:')
    for (const { item, errors } of failedItems) {
      const r = item as RawExerciseTemplate
      console.log(`    "${String(r.promptPattern ?? '?').slice(0, 60)}": ${errors.join(' | ')}`)
    }
  }

  const passRate = stats.received > 0 ? Math.round((stats.passed / stats.received) * 100) : 0
  console.log(`\n  Pass rate: ${passRate}%`)

  if (passRate < 80) {
    console.log('\n  ⚠  Pass rate below 80 % — review the prompt.')
  } else {
    console.log('\n  ✓  Generation complete.')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('\n✗ generation failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})

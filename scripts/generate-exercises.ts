/**
 * generate-exercises.ts — AI-native Wortarten exercise generation.
 *
 * Calls the Anthropic API to generate fully-formed exercise templates for
 * Wortarten practice. Each generated exercise is inserted into the
 * `exercise-templates` collection as `draft`, ready for teacher review.
 *
 * Usage:
 *   pnpm generate:exercises
 *   pnpm generate:exercises -- --topic=genus --count=20
 *   pnpm generate:exercises -- --topic=wortart --count=10 --diff-min=2 --diff-max=4
 *   pnpm generate:exercises -- --topic=genus --dry-run --verbose
 *
 * Flags:
 *   --topic=TOPIC       genus | plural | wortart | kasus  (default: genus)
 *   --count=N           Number of exercises to request  (default: 20)
 *   --diff-min=N        Minimum difficulty 1–5          (default: 1)
 *   --diff-max=N        Maximum difficulty 1–5          (default: 3)
 *   --group=SLUG        exercise-group slug to link to  (optional)
 *   --dry-run           Validate only; do not write
 *   --verbose           Print each exercise as processed
 */

import Anthropic from '@anthropic-ai/sdk'
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'
import { validateExerciseTemplate, type RawExerciseTemplate } from '../src/lib/autoValidate'
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

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string, fallback: string) =>
    args.find((a) => a.startsWith(`--${flag}=`))?.split('=')[1] ?? fallback

  const topicRaw = get('topic', 'genus')
  if (!VALID_TOPICS.has(topicRaw as Topic)) {
    console.error(`Invalid --topic="${topicRaw}". Must be one of: ${[...VALID_TOPICS].join(', ')}`)
    process.exit(1)
  }

  return {
    topic: topicRaw as Topic,
    count: parseInt(get('count', '20'), 10),
    diffMin: parseInt(get('diff-min', '1'), 10),
    diffMax: parseInt(get('diff-max', '3'), 10),
    groupSlug: get('group', ''),
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
    format: raw.format,
    cognitiveType: raw.cognitiveType ?? 'recognition',
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

  // ── Generate ──────────────────────────────────────────────────────────
  const rawItems = await generateExercises(client, {
    count: opts.count,
    topic: opts.topic,
    difficultyMin: opts.diffMin,
    difficultyMax: opts.diffMax,
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

    await insertExercise(payload, raw, groupId)
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

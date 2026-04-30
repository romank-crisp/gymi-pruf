/**
 * generate-teaching-material.ts — AI-native teaching material generation.
 *
 * Generates ConceptCards + TheoryBlocks (conversational + worked_example)
 * for a set of concepts. Every item inserted as `draft`, never auto-published.
 *
 * Pipeline per concept:
 *   1. Generate concept-card → self-critique → structural validate → insert
 *   2. Generate conversational theory-block → self-critique → validate → insert
 *   3. Generate worked_example theory-block → self-critique → validate → insert
 *
 * Usage:
 *   pnpm generate:teaching -- --random-per-module --dry-run
 *   pnpm generate:teaching -- --random-per-module
 *   pnpm generate:teaching -- --concepts=genus-bestimmen,antonyme
 *
 * Flags:
 *   --random-per-module   Pick 1 random concept from each module.
 *   --concepts=a,b,c      Explicit concept slugs (overrides --random-per-module).
 *   --skip-critique       Skip the self-critique pass (faster, lower quality).
 *   --dry-run             Generate + validate but do not insert.
 *   --verbose             Print each generated item.
 */

import Anthropic from '@anthropic-ai/sdk'
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'
import {
  buildSystemPrompt,
  buildConceptCardPrompt,
  buildConversationalTheoryPrompt,
  buildWorkedExampleTheoryPrompt,
  buildCritiquePrompt,
  type ConceptContext,
} from './prompts/teaching-material'

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string, fallback = '') =>
    args.find((a) => a.startsWith(`--${flag}=`))?.split('=')[1] ?? fallback
  return {
    randomPerModule: args.includes('--random-per-module'),
    explicitConcepts: get('concepts', '').split(',').filter(Boolean),
    skipCritique: args.includes('--skip-critique'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
  }
}

// ---------------------------------------------------------------------------
// Concept picking
// ---------------------------------------------------------------------------

type PickedConcept = ConceptContext & { id: number | string }

async function pickRandomPerModule(payload: Payload): Promise<PickedConcept[]> {
  const modules = await payload.find({ collection: 'modules', limit: 100, depth: 0 })
  const picks: PickedConcept[] = []
  for (const m of modules.docs) {
    const units = await payload.find({
      collection: 'units',
      where: { module: { equals: m.id } },
      limit: 100,
      depth: 0,
    })
    const unitIds = units.docs.map((u) => u.id)
    if (unitIds.length === 0) continue
    const concepts = await payload.find({
      collection: 'concepts',
      where: { unit: { in: unitIds } },
      limit: 200,
      depth: 0,
    })
    if (concepts.totalDocs === 0) continue
    const chosen = concepts.docs[Math.floor(Math.random() * concepts.docs.length)] as {
      id: number | string
      slug: string
      name: string
      unit: number | string
      dazPainPoint?: string | null
      baseDifficulty?: number | null
    }
    const unit = units.docs.find((u) => u.id === chosen.unit) as
      | { name: string; slug: string }
      | undefined
    picks.push({
      id: chosen.id,
      conceptSlug: chosen.slug,
      conceptName: chosen.name,
      unitName: unit?.name ?? '(unknown)',
      moduleName: (m as { name: string }).name,
      dazPainPoint: (chosen.dazPainPoint as ConceptContext['dazPainPoint']) ?? null,
      baseDifficulty: chosen.baseDifficulty ?? undefined,
    })
  }
  return picks
}

async function pickBySlug(payload: Payload, slugs: string[]): Promise<PickedConcept[]> {
  const picks: PickedConcept[] = []
  for (const slug of slugs) {
    const r = await payload.find({
      collection: 'concepts',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 2,
    })
    if (r.totalDocs === 0) {
      console.warn(`  ⚠  concept "${slug}" not found — skipping`)
      continue
    }
    const c = r.docs[0] as {
      id: number | string
      slug: string
      name: string
      unit: { name: string; module: { name: string } | number | string } | number | string
      dazPainPoint?: string | null
      baseDifficulty?: number | null
    }
    const unit = typeof c.unit === 'object' ? c.unit : null
    const mod =
      unit && typeof unit.module === 'object' ? (unit.module as { name: string }) : null
    picks.push({
      id: c.id,
      conceptSlug: c.slug,
      conceptName: c.name,
      unitName: unit?.name ?? '(unknown)',
      moduleName: mod?.name ?? '(unknown)',
      dazPainPoint: (c.dazPainPoint as ConceptContext['dazPainPoint']) ?? null,
      baseDifficulty: c.baseDifficulty ?? undefined,
    })
  }
  return picks
}

// ---------------------------------------------------------------------------
// Anthropic call helpers
// ---------------------------------------------------------------------------

const MODEL = 'claude-opus-4-7'

async function callClaudeJson(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
): Promise<unknown> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 8192,
    thinking: { type: 'adaptive' },
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const message = await stream.finalMessage()

  const textBlock = message.content.find((b) => b.type === 'text')
  const rawText = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : ''
  if (!rawText) throw new Error('API returned empty response')

  const jsonText = rawText
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim()

  try {
    return JSON.parse(jsonText)
  } catch (err) {
    throw new Error(
      `Failed to parse response as JSON: ${(err as Error).message}\n\n${jsonText.slice(0, 500)}`,
    )
  }
}

async function critique(
  client: Anthropic,
  kind: 'concept-card' | 'theory-conversational' | 'theory-worked-example',
  ctx: ConceptContext,
  generated: unknown,
): Promise<unknown> {
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildCritiquePrompt(kind, ctx, JSON.stringify(generated, null, 2))
  return callClaudeJson(client, systemPrompt, userPrompt)
}

// ---------------------------------------------------------------------------
// Structural validators
// ---------------------------------------------------------------------------

type ValidationResult = { valid: boolean; errors: string[] }

function validateConceptCard(v: unknown): ValidationResult {
  const errors: string[] = []
  const o = v as Record<string, unknown>
  if (!o || typeof o !== 'object') return { valid: false, errors: ['not an object'] }
  if (typeof o.definition !== 'string' || o.definition.length < 20)
    errors.push('definition missing or too short')
  if (!Array.isArray(o.examples) || o.examples.length < 3)
    errors.push('examples must be an array of ≥3')
  else {
    for (const [i, ex] of (o.examples as Array<Record<string, unknown>>).entries()) {
      if (typeof ex?.text !== 'string' || ex.text.length < 5)
        errors.push(`examples[${i}].text invalid`)
    }
  }
  if (typeof o.commonConfusions !== 'string' || o.commonConfusions.length < 10)
    errors.push('commonConfusions missing or too short')
  if (!Array.isArray(o.relatedConceptSlugs))
    errors.push('relatedConceptSlugs must be an array (empty ok)')
  if (/\b(isch|hät|gönd|chunnsch|gseh|lueg)\b/i.test(JSON.stringify(o)))
    errors.push('contains Swiss German dialect')
  return { valid: errors.length === 0, errors }
}

function validateConversationalBlock(v: unknown): ValidationResult {
  const errors: string[] = []
  const o = v as Record<string, unknown>
  if (!o || typeof o !== 'object') return { valid: false, errors: ['not an object'] }
  if (typeof o.title !== 'string' || o.title.length < 3) errors.push('title missing')
  const content = o.content as Record<string, unknown>
  if (!content || typeof content !== 'object') {
    errors.push('content missing')
    return { valid: false, errors }
  }
  const bubbles = content.bubbles as Array<Record<string, unknown>>
  if (!Array.isArray(bubbles) || bubbles.length < 6)
    errors.push('content.bubbles must be an array of ≥6')
  else {
    for (const [i, b] of bubbles.entries()) {
      if (b.role !== 'leo' && b.role !== 'kid') errors.push(`bubbles[${i}].role invalid`)
      if (typeof b.text !== 'string' || b.text.length < 3)
        errors.push(`bubbles[${i}].text invalid`)
      if (typeof b.expects_reply !== 'boolean')
        errors.push(`bubbles[${i}].expects_reply must be boolean`)
    }
  }
  if (/\b(isch|hät|gönd|chunnsch|gseh|lueg)\b/i.test(JSON.stringify(o)))
    errors.push('contains Swiss German dialect')
  return { valid: errors.length === 0, errors }
}

function validateWorkedExampleBlock(v: unknown): ValidationResult {
  const errors: string[] = []
  const o = v as Record<string, unknown>
  if (!o || typeof o !== 'object') return { valid: false, errors: ['not an object'] }
  if (typeof o.title !== 'string' || o.title.length < 3) errors.push('title missing')
  const content = o.content as Record<string, unknown>
  if (!content || typeof content !== 'object') {
    errors.push('content missing')
    return { valid: false, errors }
  }
  if (typeof content.problem !== 'string' || content.problem.length < 10)
    errors.push('content.problem too short')
  const steps = content.solution_steps as Array<Record<string, unknown>>
  if (!Array.isArray(steps) || steps.length < 3)
    errors.push('solution_steps must be an array of ≥3')
  else {
    for (const [i, s] of steps.entries()) {
      if (typeof s.step !== 'number') errors.push(`solution_steps[${i}].step must be number`)
      if (typeof s.thought !== 'string' || s.thought.length < 5)
        errors.push(`solution_steps[${i}].thought invalid`)
      if (typeof s.action !== 'string' || s.action.length < 5)
        errors.push(`solution_steps[${i}].action invalid`)
    }
  }
  if (typeof content.answer !== 'string' || content.answer.length < 3)
    errors.push('content.answer too short')
  if (typeof content.why_it_works !== 'string' || content.why_it_works.length < 10)
    errors.push('content.why_it_works too short')
  if (/\b(isch|hät|gönd|chunnsch|gseh|lueg)\b/i.test(JSON.stringify(o)))
    errors.push('contains Swiss German dialect')
  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Payload insert
// ---------------------------------------------------------------------------

async function insertConceptCard(
  payload: Payload,
  conceptId: number | string,
  data: Record<string, unknown>,
): Promise<void> {
  // Look up related concepts by slug → id (silently drop unknown slugs)
  const relatedSlugs = (data.relatedConceptSlugs as string[] | undefined) ?? []
  const relatedIds: Array<number | string> = []
  for (const slug of relatedSlugs) {
    const r = await payload.find({
      collection: 'concepts',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })
    if (r.totalDocs > 0) relatedIds.push(r.docs[0].id)
  }
  await payload.create({
    collection: 'concept-cards',
    data: {
      concept: conceptId,
      l1: 'de',
      definition: data.definition,
      examples: data.examples,
      commonConfusions: data.commonConfusions,
      crossReferences: relatedIds.length > 0 ? relatedIds : undefined,
      status: 'draft',
    } as never,
  })
}

async function insertTheoryBlock(
  payload: Payload,
  conceptId: number | string,
  format: 'conversational' | 'worked_example',
  data: Record<string, unknown>,
): Promise<void> {
  await payload.create({
    collection: 'theory-blocks',
    data: {
      title: data.title,
      concept: conceptId,
      format,
      l1: 'de',
      content: data.content,
      status: 'draft',
      version: 1,
    } as never,
  })
}

// ---------------------------------------------------------------------------
// Main pipeline per concept
// ---------------------------------------------------------------------------

type Stats = {
  generated: number
  validated: number
  inserted: number
  failed: number
}

async function generateForConcept(
  payload: Payload,
  client: Anthropic,
  concept: PickedConcept,
  opts: { skipCritique: boolean; dryRun: boolean; verbose: boolean },
  stats: Stats,
): Promise<void> {
  const system = buildSystemPrompt()

  const tasks: Array<{
    kind: 'concept-card' | 'theory-conversational' | 'theory-worked-example'
    label: string
    userPrompt: string
    validator: (v: unknown) => ValidationResult
    insert: (v: Record<string, unknown>) => Promise<void>
  }> = [
    {
      kind: 'concept-card',
      label: 'ConceptCard',
      userPrompt: buildConceptCardPrompt(concept),
      validator: validateConceptCard,
      insert: (v) => insertConceptCard(payload, concept.id, v),
    },
    {
      kind: 'theory-conversational',
      label: 'TheoryBlock (conversational)',
      userPrompt: buildConversationalTheoryPrompt(concept),
      validator: validateConversationalBlock,
      insert: (v) => insertTheoryBlock(payload, concept.id, 'conversational', v),
    },
    {
      kind: 'theory-worked-example',
      label: 'TheoryBlock (worked_example)',
      userPrompt: buildWorkedExampleTheoryPrompt(concept),
      validator: validateWorkedExampleBlock,
      insert: (v) => insertTheoryBlock(payload, concept.id, 'worked_example', v),
    },
  ]

  console.log(`\n● ${concept.moduleName} → ${concept.unitName} → ${concept.conceptName}`)

  for (const t of tasks) {
    try {
      process.stdout.write(`   ${t.label}: generating… `)
      let out = await callClaudeJson(client, system, t.userPrompt)
      stats.generated++

      if (!opts.skipCritique) {
        process.stdout.write('critiquing… ')
        out = await critique(client, t.kind, concept, out)
      }

      const result = t.validator(out)
      if (!result.valid) {
        console.log(`✗ INVALID (${result.errors.join('; ')})`)
        stats.failed++
        if (opts.verbose) console.log(JSON.stringify(out, null, 2))
        continue
      }
      stats.validated++

      if (opts.dryRun) {
        console.log('✓ valid (dry-run)')
      } else {
        await t.insert(out as Record<string, unknown>)
        stats.inserted++
        console.log('✓ inserted')
      }
      if (opts.verbose) console.log(JSON.stringify(out, null, 2))
    } catch (err) {
      stats.failed++
      console.log(`✗ ERROR: ${(err as Error).message}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs()
  if (!opts.randomPerModule && opts.explicitConcepts.length === 0) {
    console.error('Specify --random-per-module or --concepts=slug1,slug2')
    process.exit(1)
  }

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  generate-teaching-material — concepts + theory      ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  model       : ${MODEL}`)
  console.log(`  critique    : ${opts.skipCritique ? 'skipped' : 'enabled'}`)
  console.log(`  dry-run     : ${opts.dryRun}`)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set')
    process.exit(1)
  }
  const client = new Anthropic({ apiKey })

  console.log('\n→ connecting to Payload…')
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  console.log('→ picking concepts…')
  const picks = opts.explicitConcepts.length > 0
    ? await pickBySlug(payload, opts.explicitConcepts)
    : await pickRandomPerModule(payload)

  if (picks.length === 0) {
    console.error('No concepts picked — exiting.')
    process.exit(1)
  }

  console.log(`  ${picks.length} concept${picks.length > 1 ? 's' : ''} selected:`)
  for (const p of picks) console.log(`    · ${p.moduleName} → ${p.conceptName}`)

  const stats: Stats = { generated: 0, validated: 0, inserted: 0, failed: 0 }

  for (const pick of picks) {
    await generateForConcept(payload, client, pick, opts, stats)
  }

  console.log('\n──────────────────────────────────────────────────────')
  console.log(`  generated : ${stats.generated}`)
  console.log(`  validated : ${stats.validated}`)
  console.log(`  inserted  : ${stats.inserted}${opts.dryRun ? ' (dry-run — no writes)' : ''}`)
  console.log(`  failed    : ${stats.failed}`)
  console.log('──────────────────────────────────────────────────────')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

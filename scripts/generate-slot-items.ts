/**
 * generate-slot-items.ts — AI-powered slot-pool expansion.
 *
 * Calls the Anthropic API to generate German nouns with genus metadata,
 * validates each item, and inserts passing items into the Payload
 * `slot-items` collection (under the `nouns-common-gendered` pool).
 *
 * Usage:
 *   pnpm generate:nouns
 *   pnpm generate:nouns -- --count=50 --tier-min=1 --tier-max=2
 *   pnpm generate:nouns -- --pool=nouns-common-gendered --dry-run
 *
 * Flags:
 *   --count=N       Number of nouns to request (default: 50)
 *   --pool=SLUG     Pool slug to insert into (default: nouns-common-gendered)
 *   --tier-min=N    Minimum difficulty tier filter (default: 1)
 *   --tier-max=N    Maximum difficulty tier filter (default: 5)
 *   --dry-run       Validate only; do not write to DB
 *   --verbose       Print each item as it is processed
 */

import Anthropic from '@anthropic-ai/sdk'
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'
import { validateNounSlotItem, isDuplicate, type RawNounItem } from '../src/lib/autoValidate'
import {
  buildSystemPrompt,
  buildUserPrompt,
  type NounGenerationOptions,
} from './prompts/nouns-genus'

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): {
  count: number
  poolSlug: string
  tierMin: number
  tierMax: number
  dryRun: boolean
  verbose: boolean
} {
  const args = process.argv.slice(2)
  const get = (flag: string, fallback: string) =>
    args.find((a) => a.startsWith(`--${flag}=`))?.split('=')[1] ?? fallback

  return {
    count: parseInt(get('count', '50'), 10),
    poolSlug: get('pool', 'nouns-common-gendered'),
    tierMin: parseInt(get('tier-min', '1'), 10),
    tierMax: parseInt(get('tier-max', '5'), 10),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
  }
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function getPoolId(payload: Payload, slug: string): Promise<number | string> {
  const result = await payload.find({
    collection: 'slot-pools',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  if (result.totalDocs === 0) {
    throw new Error(`Slot pool "${slug}" not found. Run pnpm seed first.`)
  }
  return (result.docs[0] as { id: number | string }).id
}

async function getExistingValues(payload: Payload, poolId: number | string): Promise<Set<string>> {
  const allItems: string[] = []
  let page = 1
  while (true) {
    const result = await payload.find({
      collection: 'slot-items',
      where: { pool: { equals: poolId } },
      select: { value: true },
      limit: 500,
      page,
    })
    for (const doc of result.docs) {
      const d = doc as { value?: string }
      if (d.value) allItems.push(d.value.toLowerCase())
    }
    if (!result.hasNextPage) break
    page++
  }
  return new Set(allItems)
}

// ---------------------------------------------------------------------------
// Anthropic call
// ---------------------------------------------------------------------------

async function generateNouns(
  client: Anthropic,
  opts: NounGenerationOptions,
): Promise<RawNounItem[]> {
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(opts)

  console.log(`\n→ calling Claude (requesting ${opts.count} nouns)…`)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const rawText =
    message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

  if (!rawText) throw new Error('API returned empty response')

  // Strip markdown fences if the model added them despite instructions
  const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch (err) {
    throw new Error(`Failed to parse API response as JSON: ${(err as Error).message}\n\n${jsonText.slice(0, 500)}`)
  }

  // Accept both {nouns: [...]} and [...] for robustness
  if (Array.isArray(parsed)) return parsed as RawNounItem[]
  if (
    parsed &&
    typeof parsed === 'object' &&
    'nouns' in (parsed as object) &&
    Array.isArray((parsed as Record<string, unknown>).nouns)
  ) {
    return (parsed as Record<string, unknown>).nouns as RawNounItem[]
  }

  throw new Error(`Unexpected response shape. Expected {nouns:[...]} or [...]. Got: ${jsonText.slice(0, 300)}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs()

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  generate-slot-items — noun pool expansion           ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  pool       : ${opts.poolSlug}`)
  console.log(`  count      : ${opts.count}`)
  console.log(`  tier range : ${opts.tierMin}–${opts.tierMax}`)
  console.log(`  dry-run    : ${opts.dryRun}`)

  // ── Check env ────────────────────────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in .env')
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // ── Connect to Payload / DB ──────────────────────────────────────────
  console.log('\n→ connecting to Payload…')
  const payload = await getPayload({ config })

  const poolId = await getPoolId(payload, opts.poolSlug)
  console.log(`  pool ID    : ${poolId}`)

  const existingValues = await getExistingValues(payload, poolId)
  console.log(`  existing   : ${existingValues.size} items in pool`)

  // ── Generate ─────────────────────────────────────────────────────────
  const rawItems = await generateNouns(client, {
    count: opts.count,
    tierMin: opts.tierMin,
    tierMax: opts.tierMax,
    existingValues: Array.from(existingValues),
  })

  console.log(`\n→ received ${rawItems.length} items from API`)

  // ── Validate & insert ─────────────────────────────────────────────────
  const stats = {
    received: rawItems.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    inserted: 0,
  }

  const failedItems: Array<{ item: unknown; errors: string[] }> = []

  for (const raw of rawItems) {
    const result = validateNounSlotItem(raw as RawNounItem)

    if (!result.valid) {
      stats.failed++
      failedItems.push({ item: raw, errors: result.errors })
      if (opts.verbose) {
        console.log(`  ✗ FAIL  "${(raw as RawNounItem).value ?? '?'}" — ${result.errors.join('; ')}`)
      }
      continue
    }

    // Duplicate check
    const value = String((raw as RawNounItem).value).trim()
    if (isDuplicate(value, existingValues)) {
      stats.skipped++
      if (opts.verbose) {
        console.log(`  ≡ SKIP  "${value}" — already in pool`)
      }
      continue
    }

    stats.passed++

    if (result.warnings.length > 0 && opts.verbose) {
      console.log(`  ⚠ WARN  "${value}" — ${result.warnings.join('; ')}`)
    }

    if (opts.dryRun) {
      if (opts.verbose) console.log(`  ○ DRY   "${value}" (would insert)`)
      continue
    }

    // Insert into Payload
    await payload.create({
      collection: 'slot-items',
      data: {
        pool: poolId,
        value,
        metadata: {
          genus: raw.genus,
          artikel: raw.artikel,
          plural: raw.plural ?? '—',
        },
        difficultyTier: Number(raw.difficultyTier),
        active: true,
      },
    })
    existingValues.add(value.toLowerCase()) // prevent duplicates within this batch
    stats.inserted++
    if (opts.verbose) console.log(`  ✓ INS   "${value}" (${raw.artikel}, tier ${raw.difficultyTier})`)
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║  Summary                                             ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  received : ${stats.received}`)
  console.log(`  passed   : ${stats.passed}`)
  console.log(`  failed   : ${stats.failed}`)
  console.log(`  skipped  : ${stats.skipped} (duplicates)`)
  console.log(`  inserted : ${stats.inserted}${opts.dryRun ? ' (dry-run, not written)' : ''}`)

  if (failedItems.length > 0) {
    console.log('\n  Failed items:')
    for (const { item, errors } of failedItems) {
      const raw = item as RawNounItem
      console.log(`    "${raw.value ?? '?'}" (${raw.genus ?? '?'} / ${raw.artikel ?? '?'}): ${errors.join(' | ')}`)
    }
  }

  const passRate = stats.received > 0 ? Math.round((stats.passed / stats.received) * 100) : 0
  console.log(`\n  Pass rate: ${passRate}%`)

  if (passRate < 80) {
    console.log(
      '\n  ⚠  Pass rate below 80 % — review the prompt or consider adjusting tier range.',
    )
  } else {
    console.log('\n  ✓  Generation complete.')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('\n✗ generation failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})

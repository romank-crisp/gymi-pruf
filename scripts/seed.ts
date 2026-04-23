/**
 * Seed script — bootstraps admin + full Wortarten module curriculum.
 *
 * Mirrors the SEED block at the bottom of 001_content_schema.sql, rewritten
 * against the Payload local API so it goes through hooks and validation.
 *
 * Idempotent: re-running is safe; every insert is guarded by a slug lookup.
 *
 * Usage: `pnpm seed`
 */
import 'dotenv/config'
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CollectionName = Parameters<Payload['find']>[0]['collection']

async function ensureOne<T extends Record<string, unknown>>(
  payload: Payload,
  collection: CollectionName,
  uniqueField: string,
  uniqueValue: string,
  data: T,
): Promise<{ id: number | string; created: boolean }> {
  const existing = await payload.find({
    collection,
    where: { [uniqueField]: { equals: uniqueValue } },
    limit: 1,
  })
  if (existing.totalDocs > 0) {
    return { id: existing.docs[0].id as number | string, created: false }
  }
  const created = await payload.create({ collection, data: data as never })
  return { id: (created as { id: number | string }).id, created: true }
}

function log(created: boolean, label: string, detail: string) {
  const tag = created ? '+' : '='
  console.log(`  ${tag} ${label}: ${detail}`)
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  const payload = await getPayload({ config })

  // ── 1. Admin user ─────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env')
  }

  console.log('→ seeding admin user')
  {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: adminEmail } },
      limit: 1,
    })
    if (existing.totalDocs === 0) {
      await payload.create({
        collection: 'users',
        data: {
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
          displayName: 'Seed Admin',
        },
      })
      log(true, 'admin', adminEmail)
    } else {
      log(false, 'admin', adminEmail)
    }
  }

  // ── 2. Domains (5) ────────────────────────────────────────────────────
  console.log('\n→ seeding domains')
  const domainSeeds = [
    { slug: 'sprachbetrachtung', name: 'Sprachbetrachtung', examStrand: 'assessed', displayOrder: 1 },
    { slug: 'rechtschreibung', name: 'Rechtschreibung', examStrand: 'supporting', displayOrder: 2 },
    { slug: 'wortschatz', name: 'Wortschatz', examStrand: 'supporting', displayOrder: 3 },
    { slug: 'textverstaendnis', name: 'Textverständnis', examStrand: 'assessed', displayOrder: 4 },
    { slug: 'aufsatz', name: 'Aufsatz', examStrand: 'assessed', displayOrder: 5 },
  ] as const
  const domainIds: Record<string, number | string> = {}
  for (const d of domainSeeds) {
    const { id, created } = await ensureOne(payload, 'domains', 'slug', d.slug, d)
    domainIds[d.slug] = id
    log(created, 'domain', `${d.slug} (${d.name})`)
  }

  // ── 3. Modules (Wortarten under Sprachbetrachtung) ────────────────────
  console.log('\n→ seeding modules')
  const wortartenModule = await ensureOne(payload, 'modules', 'slug', 'wortarten', {
    slug: 'wortarten',
    name: 'Wortarten',
    description: 'Die zehn Wortarten erkennen, bestimmen und anwenden',
    domain: domainIds['sprachbetrachtung'],
    displayOrder: 1,
  })
  log(wortartenModule.created, 'module', 'wortarten')

  // ── 4. Units within Wortarten module ─────────────────────────────────
  console.log('\n→ seeding units')
  const unitSeeds: { slug: string; name: string; displayOrder: number }[] = [
    { slug: 'nomen', name: 'Nomen', displayOrder: 1 },
    { slug: 'verb', name: 'Verb', displayOrder: 2 },
    { slug: 'adjektiv', name: 'Adjektiv', displayOrder: 3 },
    { slug: 'artikel', name: 'Artikel', displayOrder: 4 },
    { slug: 'pronomen', name: 'Pronomen', displayOrder: 5 },
    { slug: 'praeposition', name: 'Präposition', displayOrder: 6 },
    { slug: 'konjunktion', name: 'Konjunktion', displayOrder: 7 },
    { slug: 'adverb', name: 'Adverb', displayOrder: 8 },
    { slug: 'zahlwort-interjektion', name: 'Zahlwort & Interjektion', displayOrder: 9 },
  ]
  const unitIds: Record<string, number | string> = {}
  for (const u of unitSeeds) {
    const { id, created } = await ensureOne(payload, 'units', 'slug', u.slug, {
      slug: u.slug,
      name: u.name,
      module: wortartenModule.id,
      displayOrder: u.displayOrder,
    })
    unitIds[u.slug] = id
    log(created, 'unit', `${u.slug}`)
  }

  // ── 6. Concepts under Nomen (5) ───────────────────────────────────────
  console.log('\n→ seeding concepts (Nomen unit)')
  const conceptSeeds = [
    {
      slug: 'nomen-erkennen',
      name: 'Nomen erkennen',
      description: 'Nomen in einem Satz finden und von anderen Wortarten unterscheiden',
      dazPainPoint: null,
      baseDifficulty: 1,
      targetAttempts: 45,
      displayOrder: 1,
    },
    {
      slug: 'genus-bestimmen',
      name: 'Genus bestimmen',
      description: 'Den richtigen Artikel (der/die/das) zuordnen',
      dazPainPoint: 'gender',
      baseDifficulty: 3,
      targetAttempts: 55,
      displayOrder: 2,
    },
    {
      slug: 'numerus',
      name: 'Numerus (Singular/Plural)',
      description: 'Singular- und Pluralformen bilden und erkennen',
      dazPainPoint: null,
      baseDifficulty: 2,
      targetAttempts: 45,
      displayOrder: 3,
    },
    {
      slug: 'nomen-deklination',
      name: 'Deklination Grundzüge',
      description: 'Nomen in verschiedenen Fällen erkennen',
      dazPainPoint: 'cases',
      baseDifficulty: 4,
      targetAttempts: 55,
      displayOrder: 4,
    },
    {
      slug: 'nomen-komposita',
      name: 'Zusammengesetzte Nomen',
      description: 'Komposita bilden und zerlegen, Genus bestimmen',
      dazPainPoint: null,
      baseDifficulty: 2,
      targetAttempts: 40,
      displayOrder: 5,
    },
  ] as const
  const conceptIds: Record<string, number | string> = {}
  for (const c of conceptSeeds) {
    const { dazPainPoint, ...rest } = c
    const payloadData: Record<string, unknown> = { ...rest, unit: unitIds['nomen'] }
    if (dazPainPoint) payloadData.dazPainPoint = dazPainPoint
    const { id, created } = await ensureOne(payload, 'concepts', 'slug', c.slug, payloadData)
    conceptIds[c.slug] = id
    log(created, 'concept', c.slug)
  }

  // ── 7. Exercise groups for "Genus bestimmen" (4 phases) ───────────────
  console.log('\n→ seeding exercise groups (genus-bestimmen)')
  const groupSeeds = [
    { slug: 'genus-intro', name: 'Einführung', phase: 'intro', targetItems: 8, displayOrder: 1 },
    { slug: 'genus-practice', name: 'Übung', phase: 'practice', targetItems: 25, displayOrder: 2 },
    { slug: 'genus-review', name: 'Wiederholung', phase: 'review', targetItems: 12, displayOrder: 3 },
    { slug: 'genus-checkpoint', name: 'Prüfung', phase: 'checkpoint', targetItems: 10, displayOrder: 4 },
  ] as const
  const groupIds: Record<string, number | string> = {}
  for (const g of groupSeeds) {
    const { id, created } = await ensureOne(payload, 'exercise-groups', 'slug', g.slug, {
      ...g,
      concept: conceptIds['genus-bestimmen'],
    })
    groupIds[g.slug] = id
    log(created, 'exercise-group', g.slug)
  }

  // ── 8. Slot pool: common German nouns with genus ──────────────────────
  console.log('\n→ seeding slot pool')
  const nounsPool = await ensureOne(payload, 'slot-pools', 'slug', 'nouns-common-gendered', {
    slug: 'nouns-common-gendered',
    name: 'Häufige Nomen mit Genus',
    description: '500 häufige deutsche Nomen mit korrektem Genus und Plural',
    contentType: 'noun',
  })
  log(nounsPool.created, 'slot-pool', 'nouns-common-gendered')

  // ── 9. Slot items (5 starter nouns) ───────────────────────────────────
  console.log('\n→ seeding slot items')
  const slotItemSeeds = [
    { value: 'Tisch', metadata: { genus: 'm', plural: 'Tische', artikel: 'der' }, difficultyTier: 1 },
    { value: 'Lampe', metadata: { genus: 'f', plural: 'Lampen', artikel: 'die' }, difficultyTier: 1 },
    { value: 'Buch', metadata: { genus: 'n', plural: 'Bücher', artikel: 'das' }, difficultyTier: 1 },
    { value: 'Ergebnis', metadata: { genus: 'n', plural: 'Ergebnisse', artikel: 'das' }, difficultyTier: 3 },
    { value: 'Verständnis', metadata: { genus: 'n', plural: '—', artikel: 'das' }, difficultyTier: 4 },
  ]
  for (const it of slotItemSeeds) {
    const existing = await payload.find({
      collection: 'slot-items',
      where: {
        and: [{ pool: { equals: nounsPool.id } }, { value: { equals: it.value } }],
      },
      limit: 1,
    })
    if (existing.totalDocs === 0) {
      await payload.create({
        collection: 'slot-items',
        data: { ...it, pool: nounsPool.id, active: true },
      })
      log(true, 'slot-item', it.value)
    } else {
      log(false, 'slot-item', it.value)
    }
  }

  // ── 10. Exercise template: multiple-choice Genus ──────────────────────
  console.log('\n→ seeding exercise template')
  const existingTemplate = await payload.find({
    collection: 'exercise-templates',
    where: {
      and: [
        { exerciseGroup: { equals: groupIds['genus-intro'] } },
        { promptPattern: { equals: 'Welcher Artikel passt? ___ {NOUN}' } },
      ],
    },
    limit: 1,
  })
  if (existingTemplate.totalDocs === 0) {
    await payload.create({
      collection: 'exercise-templates',
      data: {
        exerciseGroup: groupIds['genus-intro'],
        format: 'single_choice',
        cognitiveType: 'recognition',
        difficulty: 1,
        promptPattern: 'Welcher Artikel passt? ___ {NOUN}',
        answerSpec: { correct_slot: 'NOUN.metadata.artikel', options: ['der', 'die', 'das'] },
        slotDefinitions: [
          { slot_name: 'NOUN', pool_slug: 'nouns-common-gendered', tier_min: 1, tier_max: 2 },
        ],
        generationMode: 'static',
        hintLadder: [
          { text: 'Sprich das Wort laut — klingt es wie der, die oder das?' },
          { text: 'Tipp: Viele Wörter auf -e sind weiblich (die).' },
        ],
        feedbackCorrect: 'Genau, {NOUN.metadata.artikel} {NOUN} — richtig erkannt.',
        feedbackWrong: 'Nicht ganz. Es heißt {NOUN.metadata.artikel} {NOUN}.',
        tags: [{ value: 'genus' }, { value: 'nomen' }],
        status: 'active',
        version: 1,
      },
    })
    log(true, 'exercise-template', 'Welcher Artikel passt? ___ {NOUN}')
  } else {
    log(false, 'exercise-template', 'Welcher Artikel passt? ___ {NOUN}')
  }

  console.log('\n✓ seed complete')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n✗ seed failed:', err)
  process.exit(1)
})

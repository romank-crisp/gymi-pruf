/**
 * Seed script — creates an admin user + one manually-authored reference exercise.
 *
 * Idempotent: re-running is safe; it will skip existing rows by email / title.
 * Intended only for local dev and fresh staging envs. Never run in production.
 *
 * Usage: `pnpm seed`
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function main() {
  const payload = await getPayload({ config })

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env')
  }

  // 1. Admin user --------------------------------------------------------
  const existingAdmin = await payload.find({
    collection: 'users',
    where: { email: { equals: adminEmail } },
    limit: 1,
  })

  if (existingAdmin.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: {
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        displayName: 'Seed Admin',
      },
    })
    payload.logger.info(`[seed] created admin: ${adminEmail}`)
  } else {
    payload.logger.info(`[seed] admin already exists: ${adminEmail}`)
  }

  // 2. One reference exercise (Wortarten tap-to-tag) ---------------------
  // Exercises the full metadata schema end-to-end.
  const referenceTitle = 'Nomen erkennen — Tiere im Garten'
  const existingExercise = await payload.find({
    collection: 'exercises',
    where: { title: { equals: referenceTitle } },
    limit: 1,
  })

  if (existingExercise.totalDocs === 0) {
    await payload.create({
      collection: 'exercises',
      data: {
        title: referenceTitle,
        intro: {
          what: 'Tippe in jedem Satz alle Nomen an.',
          why: 'Nomen erkennen ist die Basis für alle anderen Wortarten.',
        },
        format: 'tap_to_tag',
        items: [
          {
            sentence: 'Die Katze schläft auf dem Sofa.',
            tokens: ['Die', 'Katze', 'schläft', 'auf', 'dem', 'Sofa'],
            correctIndices: [1, 5],
          },
          {
            sentence: 'Der Hund jagt einen Ball im Garten.',
            tokens: ['Der', 'Hund', 'jagt', 'einen', 'Ball', 'im', 'Garten'],
            correctIndices: [1, 4, 6],
          },
          {
            sentence: 'Ein Vogel singt auf dem Baum.',
            tokens: ['Ein', 'Vogel', 'singt', 'auf', 'dem', 'Baum'],
            correctIndices: [1, 5],
          },
          {
            sentence: 'Die Kinder spielen im Park.',
            tokens: ['Die', 'Kinder', 'spielen', 'im', 'Park'],
            correctIndices: [1, 4],
          },
          {
            sentence: 'Mein Bruder liest ein Buch.',
            tokens: ['Mein', 'Bruder', 'liest', 'ein', 'Buch'],
            correctIndices: [1, 4],
          },
        ],
        section: 'sprachbetrachtung',
        topic: 'Wortarten',
        subtopic: 'Nomen erkennen',
        difficulty: 1,
        examRelevance: 3,
        cantonApplicability: ['ZH'],
        estimatedTimeSec: 120,
        lifecycleState: 'published',
        provenance: {
          generationBatchId: 'seed-manual',
        },
      },
    })
    payload.logger.info(`[seed] created reference exercise: ${referenceTitle}`)
  } else {
    payload.logger.info(`[seed] reference exercise already exists`)
  }

  payload.logger.info('[seed] done')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

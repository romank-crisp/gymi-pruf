import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'

// Curriculum hierarchy (Domain → Module → Unit → Concept)
import { Domains } from './collections/curriculum/Domains'
import { Modules } from './collections/curriculum/Modules'
import { Units } from './collections/curriculum/Units'
import { Concepts } from './collections/curriculum/Concepts'
import { ConceptPrerequisites } from './collections/curriculum/ConceptPrerequisites'

// Exercises (Group → Template)
import { ExerciseGroups } from './collections/exercises/ExerciseGroups'
import { ExerciseTemplates } from './collections/exercises/ExerciseTemplates'

// Theory, slot pools, L1 variants, concept cards
import { TheoryBlocks } from './collections/content/TheoryBlocks'
import { SlotPools } from './collections/content/SlotPools'
import { SlotItems } from './collections/content/SlotItems'
import { L1Variants } from './collections/content/L1Variants'
import { ConceptCards } from './collections/content/ConceptCards'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— Gymi-Vorbereitung',
    },
    components: {
      // Custom nav link above the default collection groups
      beforeNavLinks: ['/components/admin/CurriculumNavLink'],
      // Custom view at /admin/curriculum rendering the hierarchy tree
      views: {
        curriculum: {
          Component: '/components/admin/CurriculumTreeView',
          path: '/curriculum',
        },
      },
    },
  },
  collections: [
    // Admin & media
    Users,
    Media,

    // Curriculum
    Domains,
    Modules,
    Units,
    Concepts,
    ConceptPrerequisites,

    // Exercises
    ExerciseGroups,
    ExerciseTemplates,

    // Theory & content
    TheoryBlocks,
    SlotPools,
    SlotItems,
    L1Variants,
    ConceptCards,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})

import type { CollectionConfig } from 'payload'
import { autoSlug } from '../../hooks/autoSlug'
import { dazPainPointOptions } from '../../content/enums'

/**
 * Concept — the atomic unit of mastery.
 *
 * e.g. "Nomen erkennen", "Genus bestimmen", "Akkusativ vs Dativ".
 * ~220 concepts in the full ZAP Deutsch program. Everything in the
 * learner model, dashboard, and AI proposal logic hinges on concepts.
 *
 * `dazPainPoint` flags concepts that are known to trip up bilingual
 * learners — the mascot uses this to route to L1-backed explanations.
 */
export const Concepts: CollectionConfig = {
  slug: 'concepts',
  labels: { singular: 'Concept', plural: 'Concepts' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: [
      'name',
      'slug',
      'unit',
      'dazPainPoint',
      'baseDifficulty',
      'displayOrder',
    ],
    group: '01 · Curriculum',
    defaultSort: 'displayOrder',
    listSearchableFields: ['name', 'slug', 'description'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      hooks: { beforeValidate: [autoSlug] },
    },
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      required: true,
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'One-sentence learner-facing description.' },
    },
    {
      name: 'dazPainPoint',
      type: 'select',
      options: dazPainPointOptions,
      admin: {
        description:
          'Flag if this concept targets a known DaZ confusion. Leave blank for neutral concepts.',
      },
    },
    {
      name: 'baseDifficulty',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      defaultValue: 3,
      admin: { description: '1 = trivial, 5 = very hard. Calibrated later from telemetry.' },
    },
    {
      name: 'targetAttempts',
      type: 'number',
      required: true,
      min: 10,
      max: 200,
      defaultValue: 50,
      admin: {
        description:
          'Expected total attempts across intro + practice + review + checkpoint phases.',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
  ],
  timestamps: true,
}

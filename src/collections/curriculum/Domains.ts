import type { CollectionConfig } from 'payload'
import { autoSlug } from '../../hooks/autoSlug'
import { examStrandOptions } from '../../content/enums'

/**
 * Domain — the top of the curriculum tree.
 *
 * One row per ZAP strand: Sprachbetrachtung, Rechtschreibung, Wortschatz,
 * Textverständnis, Aufsatz. Assessed vs supporting distinguishes strands
 * that are directly graded on the exam from those that underpin the
 * assessed ones.
 */
export const Domains: CollectionConfig = {
  slug: 'domains',
  labels: { singular: 'Domain', plural: 'Domains' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'examStrand', 'displayOrder'],
    group: '01 · Curriculum',
    defaultSort: 'displayOrder',
    listSearchableFields: ['name', 'slug'],
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
      admin: { description: 'Auto-generated from name if left blank.' },
    },
    {
      name: 'examStrand',
      type: 'select',
      required: true,
      defaultValue: 'assessed',
      options: examStrandOptions,
    },
    {
      name: 'displayOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { description: 'Lower numbers appear first in the tree.' },
    },
  ],
  timestamps: true,
}

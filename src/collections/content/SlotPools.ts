import type { CollectionConfig } from 'payload'
import { autoSlug } from '../../hooks/autoSlug'

/**
 * SlotPool — a curated bucket of variable content a template can draw from.
 *
 * Example: `nouns-common-gendered` contains 500 common German nouns with
 * gender metadata. Any template whose prompt references a noun pulls
 * from this pool.
 *
 * `contentType` is free-form text rather than an enum so new types
 * (e.g. 'passage', 'dialogue') can be added without migrations.
 */
export const SlotPools: CollectionConfig = {
  slug: 'slot-pools',
  labels: { singular: 'Slot pool', plural: 'Slot pools' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'contentType'],
    group: '04 · Slot Pools',
    listSearchableFields: ['name', 'slug', 'contentType'],
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
    { name: 'description', type: 'textarea' },
    {
      name: 'contentType',
      type: 'text',
      required: true,
      admin: {
        description:
          'e.g. "noun", "verb", "adjective", "sentence", "passage". Free-form.',
      },
    },
  ],
  timestamps: true,
}

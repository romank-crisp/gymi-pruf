import type { CollectionConfig } from 'payload'

/**
 * SlotItem — one concrete value inside a slot pool.
 *
 * e.g. `value: 'Tisch'` with metadata
 *      `{ genus: 'm', plural: 'Tische', artikel: 'der' }`
 * in the `nouns-common-gendered` pool.
 *
 * `difficultyTier` drives which items a template pulls at which learner
 * level. `active = false` retires an item without deleting its history.
 */
export const SlotItems: CollectionConfig = {
  slug: 'slot-items',
  labels: { singular: 'Slot item', plural: 'Slot items' },
  admin: {
    useAsTitle: 'value',
    defaultColumns: ['value', 'pool', 'difficultyTier', 'active'],
    group: '04 · Slot Pools',
    listSearchableFields: ['value'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'pool',
      type: 'relationship',
      relationTo: 'slot-pools',
      required: true,
      index: true,
    },
    {
      name: 'value',
      type: 'text',
      required: true,
      admin: { description: 'The concrete value substituted into templates.' },
    },
    {
      name: 'metadata',
      type: 'json',
      defaultValue: {},
      admin: {
        description:
          'Arbitrary structured data, e.g. {genus, plural, frequency}. Accessed in templates via dot-paths: {NOUN.metadata.artikel}.',
      },
    },
    {
      name: 'difficultyTier',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      defaultValue: 1,
    },
    {
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      admin: { description: 'Uncheck to retire without deleting.' },
    },
  ],
  timestamps: true,
}

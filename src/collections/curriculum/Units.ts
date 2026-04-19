import type { CollectionConfig } from 'payload'
import { autoSlug } from '../../hooks/autoSlug'

/**
 * Unit — one part-of-speech or narrow skill area within a section.
 *
 * e.g. within Kernwortarten: Nomen, Verb, Adjektiv.
 * ~60 units total across the full curriculum.
 */
export const Units: CollectionConfig = {
  slug: 'units',
  labels: { singular: 'Unit', plural: 'Units' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'section', 'displayOrder'],
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
    },
    {
      name: 'section',
      type: 'relationship',
      relationTo: 'sections',
      required: true,
      index: true,
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'displayOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
  ],
  timestamps: true,
}

import type { CollectionConfig } from 'payload'
import { autoSlug } from '../../hooks/autoSlug'

/**
 * Module — a coherent topic within a domain.
 *
 * e.g. within Sprachbetrachtung: Wortarten, Satzglieder, Fälle,
 * Tempora & Modus, Satzarten & Satzbau.
 */
export const Modules: CollectionConfig = {
  slug: 'modules',
  labels: { singular: 'Module', plural: 'Modules' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'domain', 'displayOrder'],
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
      name: 'domain',
      type: 'relationship',
      relationTo: 'domains',
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

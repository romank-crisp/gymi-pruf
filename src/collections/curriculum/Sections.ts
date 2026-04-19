import type { CollectionConfig } from 'payload'
import { autoSlug } from '../../hooks/autoSlug'

/**
 * Section — thematic grouping within a module.
 *
 * Example: within Wortarten the sections are Kernwortarten
 * (Nomen/Verb/Adjektiv), Begleiter & Stellvertreter (Artikel/Pronomen),
 * Verbindungen & Rest (Präposition/Konjunktion/Adverb/Zahlwort).
 *
 * Sections are an admin/navigation concept — the learner sees them as
 * chapter groupings on the skill map, not as formal labels.
 */
export const Sections: CollectionConfig = {
  slug: 'sections',
  labels: { singular: 'Section', plural: 'Sections' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'module', 'displayOrder'],
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
      name: 'module',
      type: 'relationship',
      relationTo: 'modules',
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

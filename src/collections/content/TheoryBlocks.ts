import type { CollectionConfig } from 'payload'
import {
  contentStatusOptions,
  l1Options,
  theoryFormatOptions,
} from '../../content/enums'
import { enforceStatusTransition } from '../../hooks/enforceStatusTransition'

/**
 * TheoryBlock — one explanation of a concept, in one L1, in one format.
 *
 * Formats carry different `content` JSON shapes:
 *
 *   conversational       → { bubbles: [{ role, text, expects_reply, action }] }
 *   mini_game            → { game_type, buckets, items, time_limit_sec }
 *   interactive_diagram  → { svg_ref, regions, interaction }
 *   video / passage / worked_example → freeform
 *
 * The shape is intentionally loose at the storage layer — per-format
 * validation is a Phase 2 custom component.
 */
export const TheoryBlocks: CollectionConfig = {
  slug: 'theory-blocks',
  labels: { singular: 'Theory block', plural: 'Theory blocks' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'concept', 'format', 'l1', 'status', 'version'],
    group: '03 · Theory & Content',
    listSearchableFields: ['title'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'reviewer',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: [enforceStatusTransition],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'concept',
      type: 'relationship',
      relationTo: 'concepts',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'format',
          type: 'select',
          required: true,
          defaultValue: 'conversational',
          options: theoryFormatOptions,
        },
        {
          name: 'l1',
          type: 'select',
          required: true,
          defaultValue: 'de',
          options: l1Options,
        },
      ],
    },
    {
      name: 'content',
      type: 'json',
      required: true,
      admin: {
        description:
          'Format-specific payload. See docs/collections/theory-blocks.md for shapes.',
      },
    },
    {
      type: 'collapsible',
      label: 'Lifecycle & versioning',
      fields: [
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'draft',
          index: true,
          options: contentStatusOptions,
        },
        { name: 'version', type: 'number', required: true, defaultValue: 1, min: 1 },
        {
          name: 'supersedes',
          type: 'relationship',
          relationTo: 'theory-blocks',
          admin: { description: 'The older block this version replaces.' },
        },
        {
          name: 'createdBy',
          type: 'relationship',
          relationTo: 'users',
          admin: { readOnly: true },
        },
        {
          name: 'approvedBy',
          type: 'relationship',
          relationTo: 'users',
          admin: { readOnly: true },
        },
        {
          name: 'approvedAt',
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
  ],
  indexes: [
    // Mirrors UNIQUE (concept_id, format, l1, version) in 001_content_schema.sql
    { fields: ['concept', 'format', 'l1', 'version'], unique: true },
  ],
  timestamps: true,
}

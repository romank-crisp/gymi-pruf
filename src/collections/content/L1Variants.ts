import type { CollectionConfig } from 'payload'
import {
  contentStatusOptions,
  l1Options,
  l1VariantParentOptions,
} from '../../content/enums'
import { enforceStatusTransition } from '../../hooks/enforceStatusTransition'

/**
 * L1Variant — a per-language translation or adaptation of a theory block,
 * exercise template, or concept card.
 *
 * Polymorphic parent: `parentType` identifies which collection, `parentId`
 * identifies the row. We use a text+text pair rather than a Payload
 * polymorphic relationship because three distinct collections share this
 * pattern and flexibility > admin-UI convenience here (a future custom
 * field component can upgrade the UX).
 */
export const L1Variants: CollectionConfig = {
  slug: 'l1-variants',
  labels: { singular: 'L1 variant', plural: 'L1 variants' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['parentType', 'parentId', 'l1', 'status'],
    group: '03 · Theory & Content',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'reviewer',
    update: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'reviewer',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: [enforceStatusTransition],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'parentType',
          type: 'select',
          required: true,
          options: l1VariantParentOptions,
          index: true,
        },
        {
          name: 'parentId',
          type: 'text',
          required: true,
          index: true,
          admin: {
            description:
              'ID of the parent row in the collection named by parentType. UUID or numeric.',
          },
        },
        {
          name: 'l1',
          type: 'select',
          required: true,
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
          'Content shape mirrors the parent type (bubbles for theory_block, prompt/answer for exercise_template, etc.).',
      },
    },
    {
      type: 'collapsible',
      label: 'Lifecycle',
      fields: [
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'draft',
          index: true,
          options: contentStatusOptions,
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
    { fields: ['parentType', 'parentId', 'l1'], unique: true },
  ],
  timestamps: true,
}

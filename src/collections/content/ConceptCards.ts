import type { CollectionConfig } from 'payload'
import { contentStatusOptions, l1Options } from '../../content/enums'
import { enforceStatusTransition } from '../../hooks/enforceStatusTransition'

/**
 * ConceptCard — the grounding material that Frag Leo (RAG) retrieves when
 * a learner asks a question about this concept.
 *
 * One card per (concept, L1). The mascot answers with the card's
 * definition + examples, avoiding the hallucination risk of pure LLM
 * lookup. Cross-references let the mascot suggest adjacent concepts.
 */
export const ConceptCards: CollectionConfig = {
  slug: 'concept-cards',
  labels: { singular: 'Concept card (Frag Leo)', plural: 'Concept cards' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['concept', 'l1', 'status'],
    group: '03 · Teaching Material',
    listSearchableFields: ['definition'],
    components: {
      views: {
        edit: {
          workflow: {
            Component: '/components/admin/StatusTransitionsTab',
            path: '/workflow',
            tab: {
              label: 'Workflow',
              href: '/workflow',
            },
          },
        },
      },
    },
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
          name: 'concept',
          type: 'relationship',
          relationTo: 'concepts',
          required: true,
          index: true,
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
      name: 'definition',
      type: 'textarea',
      required: true,
      admin: { description: 'One-paragraph definition in the target L1.' },
    },
    {
      name: 'examples',
      type: 'array',
      labels: { singular: 'Example', plural: 'Examples' },
      fields: [{ name: 'text', type: 'textarea', required: true }],
      admin: { description: 'Concrete sentences that illustrate the concept.' },
    },
    {
      name: 'commonConfusions',
      type: 'textarea',
      admin: {
        description:
          'Known misconceptions bilingual learners bring to this concept.',
      },
    },
    {
      name: 'crossReferences',
      type: 'relationship',
      relationTo: 'concepts',
      hasMany: true,
      admin: { description: 'Related concepts the mascot may link to.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: contentStatusOptions,
    },
  ],
  indexes: [{ fields: ['concept', 'l1'], unique: true }],
  timestamps: true,
}

import type { CollectionConfig } from 'payload'
import {
  cognitiveTypeOptions,
  contentStatusOptions,
  exerciseFormatOptions,
  generationModeOptions,
} from '../../content/enums'
import { enforceStatusTransition } from '../../hooks/enforceStatusTransition'
import { validateAnchors } from '../../hooks/validateAnchors'

const ANCHOR_RELATION_TO = ['domains', 'modules', 'sections', 'units', 'concepts'] as const

/**
 * ExerciseTemplate — a single reusable exercise pattern.
 *
 * A template defines the prompt shape (`promptPattern` with `{SLOT}`
 * placeholders), the correct-answer spec, and the slot pools to draw
 * variable content from. The runtime exercise-server fills slots to
 * produce individual items; a single template can yield hundreds of
 * unique exercises.
 *
 * Status lifecycle is enforced by `enforceStatusTransition`:
 *   draft → in_review → approved → active → flagged | retired
 * Set `req.context.forcePromote = true` to bypass (dev-only).
 */
export const ExerciseTemplates: CollectionConfig = {
  slug: 'exercise-templates',
  labels: { singular: 'Exercise template', plural: 'Exercise templates' },
  admin: {
    useAsTitle: 'promptPattern',
    defaultColumns: [
      'promptPattern',
      'primaryAnchor',
      'format',
      'cognitiveType',
      'difficulty',
      'status',
    ],
    group: '02 · Exercises',
    listSearchableFields: ['promptPattern', 'tags'],
    components: {
      views: {
        edit: {
          preview: {
            Component: '/components/admin/ExerciseTemplatePreview',
            path: '/preview',
            tab: {
              label: 'Preview',
              href: '/preview',
            },
          },
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
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'reviewer',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: [enforceStatusTransition, validateAnchors],
  },
  fields: [
    {
      name: 'primaryAnchor',
      type: 'relationship',
      relationTo: [...ANCHOR_RELATION_TO],
      required: true,
      index: true,
      admin: {
        description:
          'Primary curriculum anchor. Anchor at the narrowest level that fits (concept for single-concept exercises; unit/section/module/domain for cross-concept exercises).',
      },
    },
    {
      name: 'secondaryAnchors',
      type: 'array',
      labels: { singular: 'Secondary anchor', plural: 'Secondary anchors' },
      maxRows: 2,
      admin: {
        description:
          'Optional cross-references (max 2). Use when an exercise genuinely spans multiple concepts, units, or domains.',
      },
      fields: [
        {
          name: 'anchor',
          type: 'relationship',
          relationTo: [...ANCHOR_RELATION_TO],
          required: true,
        },
      ],
    },
    {
      name: 'exerciseGroup',
      type: 'relationship',
      relationTo: 'exercise-groups',
      index: true,
      admin: {
        description:
          'Optional phase-bundle attribute (intro / practice / review / checkpoint). Not structural — curriculum position comes from primaryAnchor.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'format',
          type: 'select',
          required: true,
          options: exerciseFormatOptions,
        },
        {
          name: 'cognitiveType',
          type: 'select',
          required: true,
          options: cognitiveTypeOptions,
        },
        {
          name: 'difficulty',
          type: 'number',
          required: true,
          min: 1,
          max: 5,
          defaultValue: 3,
        },
      ],
    },
    {
      name: 'promptPattern',
      type: 'text',
      required: true,
      admin: {
        description:
          'The learner-facing prompt. Use `{SLOT_NAME}` to reference slot items, e.g. "Welches Genus hat {NOUN}?".',
      },
    },
    {
      name: 'answerSpec',
      type: 'json',
      required: true,
      admin: {
        description:
          'How to derive and evaluate the correct answer. Shape depends on format — see docs/collections/exercise-templates.md (to be written).',
      },
    },
    {
      name: 'slotDefinitions',
      type: 'json',
      admin: {
        description:
          'Array of {slot_name, pool_slug, tier_min, tier_max}. Leave empty for AI-native templates.',
      },
    },
    {
      name: 'generationMode',
      type: 'select',
      required: true,
      defaultValue: 'static',
      options: generationModeOptions,
    },
    {
      name: 'aiPrompt',
      type: 'textarea',
      admin: {
        description:
          'Prompt sent to the model for hybrid / ai_native modes. Ignored when generationMode = static.',
        condition: (data) => data?.generationMode && data.generationMode !== 'static',
      },
    },
    {
      name: 'hintLadder',
      type: 'array',
      labels: { singular: 'Hint', plural: 'Hints' },
      admin: {
        description:
          'Progressive hints shown on repeated wrong answers. First is gentlest, last gives the answer.',
      },
      fields: [{ name: 'text', type: 'textarea', required: true }],
    },
    {
      type: 'collapsible',
      label: 'Feedback messages',
      fields: [
        {
          name: 'feedbackCorrect',
          type: 'textarea',
          admin: { description: 'Shown on correct answer. Slot placeholders allowed.' },
        },
        {
          name: 'feedbackPartial',
          type: 'textarea',
          admin: { description: 'Multi-select / partial credit.' },
        },
        {
          name: 'feedbackWrong',
          type: 'textarea',
          admin: { description: 'Shown on wrong answer before walkthrough.' },
        },
        {
          name: 'feedbackWalkthrough',
          type: 'textarea',
          admin: { description: 'Long-form explanation after exhausting hints.' },
        },
      ],
    },
    {
      name: 'tags',
      type: 'array',
      labels: { singular: 'Tag', plural: 'Tags' },
      fields: [{ name: 'value', type: 'text', required: true }],
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
          relationTo: 'exercise-templates',
          admin: { description: 'The older template this version replaces, if any.' },
        },
        {
          name: 'createdBy',
          type: 'relationship',
          relationTo: 'users',
          admin: { readOnly: true, description: 'Set by hook on create.' },
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
  timestamps: true,
}

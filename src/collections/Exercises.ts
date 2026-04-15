import type { CollectionConfig } from 'payload'
import { enforceLifecycleTransition } from '../hooks/enforceLifecycleTransition'
import { writeAuditLog } from '../hooks/writeAuditLog'

/**
 * The single Exercises collection.
 *
 * Every exercise in the app — across all 11 formats, all 4 sections — is a row here.
 * The structure mirrors the "unified exercise template" in CLAUDE.md §The unified
 * exercise template. Format-specific item structure lives in the `items` JSON field;
 * schema-level validation per format is done in validators keyed off `format`
 * (see `src/validators/items/`) rather than polymorphic Payload fields — this keeps
 * the admin UI usable and the DB schema simple at the cost of looser typing on items.
 *
 * Lifecycle: generated → published → rejected / retired.
 * The state machine is enforced in `enforceLifecycleTransition` — illegal transitions
 * throw before write. The audit log records every transition.
 */
export const Exercises: CollectionConfig = {
  slug: 'exercises',
  admin: {
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'format',
      'topic',
      'subtopic',
      'difficulty',
      'lifecycleState',
      'updatedAt',
    ],
    group: 'Content',
    listSearchableFields: ['title', 'topic', 'subtopic'],
  },
  access: {
    // Families (the app) only see published items.
    // Reviewers see generated items (their queue) and published items (reference).
    // Admins see everything.
    read: ({ req: { user } }) => {
      if (!user) return { lifecycleState: { equals: 'published' } }
      if (user.role === 'admin') return true
      if (user.role === 'reviewer') {
        return { lifecycleState: { in: ['generated', 'published'] } }
      }
      return { lifecycleState: { equals: 'published' } }
    },
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'reviewer',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: [enforceLifecycleTransition],
    afterChange: [writeAuditLog],
  },
  fields: [
    // --- 1. Title + intro --------------------------------------------------
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'intro',
      type: 'group',
      admin: {
        description:
          'Shown once per session before the task. Dismissible after first view.',
      },
      fields: [
        { name: 'what', type: 'textarea', required: true, admin: { description: 'What you will do.' } },
        { name: 'why', type: 'textarea', required: true, admin: { description: 'Why it matters.' } },
        { name: 'workedExample', type: 'richText' },
      ],
    },

    // --- 2. Task -----------------------------------------------------------
    {
      name: 'format',
      type: 'select',
      required: true,
      options: [
        { label: 'Tap-to-tag', value: 'tap_to_tag' },
        { label: 'Multiple choice', value: 'multiple_choice' },
        { label: 'Multi-select', value: 'multi_select' },
        { label: 'Fill in the blank', value: 'fill_blank' },
        { label: 'Drag and drop', value: 'drag_drop' },
        { label: 'Sentence building', value: 'sentence_building' },
        { label: 'Audio-based', value: 'audio' },
        { label: 'Image-based', value: 'image' },
        { label: 'Error spotting', value: 'error_spotting' },
        { label: 'Transformation', value: 'transformation' },
        { label: 'Writing (worksheet)', value: 'writing' },
      ],
    },
    {
      name: 'items',
      type: 'json',
      required: true,
      admin: {
        description:
          '5–12 items keyed to the chosen format. Structure is format-specific — see src/validators/items/.',
      },
    },

    // --- 3. Metadata -------------------------------------------------------
    {
      name: 'section',
      type: 'select',
      required: true,
      options: [
        { label: 'Sprachbetrachtung', value: 'sprachbetrachtung' },
        { label: 'Aufsatz', value: 'aufsatz' },
        { label: 'Textverständnis', value: 'textverstaendnis' },
        { label: 'Rechtschreibung', value: 'rechtschreibung' },
        { label: 'Assessment', value: 'assessment' },
      ],
    },
    {
      name: 'topic',
      type: 'text',
      required: true,
      admin: { description: 'e.g. Wortarten, Satzglieder, Kasus.' },
    },
    {
      name: 'subtopic',
      type: 'text',
      admin: { description: 'e.g. Nomen erkennen, Akkusativ vs Dativ.' },
    },
    {
      name: 'difficulty',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      defaultValue: 3,
    },
    {
      name: 'examRelevance',
      type: 'number',
      required: true,
      min: 1,
      max: 3,
      defaultValue: 2,
      admin: {
        description:
          '1 = tangential, 2 = common, 3 = high-frequency exam topic. Drives recommendation weighting.',
      },
    },
    {
      name: 'cantonApplicability',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['ZH'],
      options: [
        { label: 'Zurich', value: 'ZH' },
        { label: 'Bern', value: 'BE' },
        { label: 'Luzern', value: 'LU' },
        { label: 'All cantons', value: 'ALL' },
      ],
    },
    {
      name: 'estimatedTimeSec',
      type: 'number',
      required: true,
      min: 30,
      max: 1800,
      defaultValue: 180,
    },

    // --- 4. Lifecycle ------------------------------------------------------
    {
      name: 'lifecycleState',
      type: 'select',
      required: true,
      defaultValue: 'generated',
      index: true,
      options: [
        { label: 'Generated (awaiting review)', value: 'generated' },
        { label: 'Published (live)', value: 'published' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Retired', value: 'retired' },
      ],
    },
    {
      name: 'rejectionReason',
      type: 'textarea',
      admin: {
        condition: (data) => data?.lifecycleState === 'rejected',
        description: 'Required when state = rejected.',
      },
    },

    // --- 5. Provenance -----------------------------------------------------
    {
      name: 'provenance',
      type: 'group',
      admin: { description: 'Where this exercise came from and who touched it.' },
      fields: [
        {
          name: 'promptTemplate',
          type: 'relationship',
          relationTo: 'prompt-templates',
          admin: { description: 'The template used to generate this item (null if authored manually).' },
        },
        {
          name: 'generationBatchId',
          type: 'text',
          admin: { description: 'Shared across all items from a single AI run, for traceability.' },
        },
        {
          name: 'reviewer',
          type: 'relationship',
          relationTo: 'users',
          admin: { description: 'The reviewer who most recently approved/edited/rejected.' },
        },
        { name: 'reviewedAt', type: 'date' },
      ],
    },

    // --- 6. Performance (populated from app telemetry, not hand-edited) ---
    {
      name: 'performance',
      type: 'group',
      admin: {
        description:
          'Real-world usage stats. Populated by the app; divergence from `difficulty` triggers re-review.',
        readOnly: true,
      },
      fields: [
        { name: 'attempts', type: 'number', defaultValue: 0 },
        { name: 'correctRate', type: 'number', admin: { description: '0.0–1.0' } },
        { name: 'avgTimeSec', type: 'number' },
        { name: 'lastComputedAt', type: 'date' },
      ],
    },
  ],
}

import type { CollectionConfig } from 'payload'

/**
 * PromptTemplates — the inputs to the AI generation pipeline.
 *
 * A prompt template is owned by the admin (not the reviewer) per CLAUDE.md §How
 * content works. Each template is format-specific + topic-specific, and specifies
 * the JSON output schema the generator must emit.
 *
 * Versioning: template edits create new rows with incremented `version`, they do
 * not mutate the existing row. Every generated exercise references the exact
 * template version that produced it via `provenance.promptTemplate`.
 */
export const PromptTemplates: CollectionConfig = {
  slug: 'prompt-templates',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'format', 'topic', 'version', 'isActive'],
    group: 'Content Engine',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'format',
      type: 'select',
      required: true,
      options: [
        'tap_to_tag',
        'multiple_choice',
        'multi_select',
        'fill_blank',
        'drag_drop',
        'sentence_building',
        'audio',
        'image',
        'error_spotting',
        'transformation',
        'writing',
      ].map((v) => ({ label: v, value: v })),
    },
    { name: 'topic', type: 'text', required: true },
    { name: 'subtopic', type: 'text' },
    { name: 'version', type: 'number', required: true, defaultValue: 1 },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Only one version per (format, topic, subtopic) should be active at a time. Enforced softly — the generation script picks isActive=true.',
      },
    },
    {
      name: 'systemPrompt',
      type: 'textarea',
      required: true,
      admin: { description: 'Role and style guardrails. Should reference the five learning principles.' },
    },
    {
      name: 'userPromptTemplate',
      type: 'textarea',
      required: true,
      admin: {
        description:
          'Instructions for the model. Use {{placeholders}} for per-batch variables (e.g. {{difficulty}}, {{count}}).',
      },
    },
    {
      name: 'outputJsonSchema',
      type: 'json',
      required: true,
      admin: { description: 'JSON schema the generator output must conform to. Used by auto-validation.' },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Admin-only notes on what this template is for, known failure modes, etc.' },
    },
  ],
}

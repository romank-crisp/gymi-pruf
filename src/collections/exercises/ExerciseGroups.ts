import type { CollectionConfig } from 'payload'
import { autoSlug } from '../../hooks/autoSlug'
import { exercisePhaseOptions } from '../../content/enums'

/**
 * ExerciseGroup — a phase-bundle attribute for exercise templates.
 *
 * Groups are metadata, not structure. They bundle templates into a
 * learning phase (intro / practice / review / checkpoint) with a
 * target mastery threshold. Curriculum position lives on the template
 * itself (`primaryAnchor` + `secondaryAnchors`), not here.
 *
 * Typical phases:
 *   - intro      (guided, easy, ~8 items)
 *   - practice   (adaptive, ~25 items)
 *   - review     (spaced, ~12 items)
 *   - checkpoint (mastery test, ~10 items)
 */
export const ExerciseGroups: CollectionConfig = {
  slug: 'exercise-groups',
  labels: { singular: 'Exercise group', plural: 'Exercise groups' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'concept', 'phase', 'targetItems', 'displayOrder'],
    group: '02 · Exercises',
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
      admin: { description: 'Globally unique.' },
    },
    {
      name: 'concept',
      type: 'relationship',
      relationTo: 'concepts',
      index: true,
      admin: {
        description:
          'Optional. Groups are phase-bundle attributes, not structural. Templates carry their own curriculum anchor.',
      },
    },
    {
      name: 'phase',
      type: 'select',
      required: true,
      options: exercisePhaseOptions,
      defaultValue: 'practice',
    },
    {
      name: 'targetItems',
      type: 'number',
      required: true,
      min: 1,
      max: 100,
      defaultValue: 10,
      admin: {
        description:
          'Number of correct items needed to complete this phase for a learner.',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
  ],
  timestamps: true,
}

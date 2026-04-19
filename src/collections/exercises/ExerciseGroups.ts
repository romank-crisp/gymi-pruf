import type { CollectionConfig } from 'payload'
import { autoSlug } from '../../hooks/autoSlug'
import { exercisePhaseOptions } from '../../content/enums'

/**
 * ExerciseGroup — a bundle of exercises within a concept, organised by
 * learning phase.
 *
 * A single concept typically has four groups:
 *   - intro      (guided, easy, ~8 items)
 *   - practice   (adaptive, ~25 items)
 *   - review     (spaced, ~12 items)
 *   - checkpoint (mastery test, ~10 items)
 *
 * `targetItems` is the number of items the learner must reach to complete
 * the phase — not the pool size. The pool (slot-filled templates) can
 * produce far more unique exercises than targetItems.
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
      index: true,
      hooks: { beforeValidate: [autoSlug] },
      admin: { description: 'Unique per concept (not globally).' },
    },
    {
      name: 'concept',
      type: 'relationship',
      relationTo: 'concepts',
      required: true,
      index: true,
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
  indexes: [{ fields: ['concept', 'slug'], unique: true }],
  timestamps: true,
}

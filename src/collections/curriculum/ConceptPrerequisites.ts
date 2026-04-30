import type { CollectionConfig, CollectionBeforeValidateHook } from 'payload'
import { prerequisiteStrengthOptions } from '../../content/enums'

/**
 * ConceptPrerequisite — a directed edge in the concept dependency graph.
 *
 * `concept` depends on `prerequisite`. `strength` distinguishes hard
 * blockers (must be mastered first) from soft suggestions (recommended
 * order but learner can jump ahead).
 *
 * Represented as its own collection rather than a join table so the
 * admin UI can attach metadata (strength, future: notes, exception
 * reasons) to each edge.
 */
const preventSelfLink: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data
  const concept =
    typeof data.concept === 'object' && data.concept
      ? (data.concept as { id: unknown }).id
      : data.concept
  const prerequisite =
    typeof data.prerequisite === 'object' && data.prerequisite
      ? (data.prerequisite as { id: unknown }).id
      : data.prerequisite
  if (concept && prerequisite && String(concept) === String(prerequisite)) {
    throw new Error('A concept cannot be its own prerequisite.')
  }
  return data
}

export const ConceptPrerequisites: CollectionConfig = {
  slug: 'concept-prerequisites',
  labels: { singular: 'Prerequisite edge', plural: 'Prerequisite graph' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['concept', 'prerequisite', 'strength'],
    group: '01 · Curriculum',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeValidate: [preventSelfLink],
  },
  fields: [
    {
      name: 'concept',
      type: 'relationship',
      relationTo: 'concepts',
      required: true,
      index: true,
      admin: { description: 'The concept that has the prerequisite.' },
    },
    {
      name: 'prerequisite',
      type: 'relationship',
      relationTo: 'concepts',
      required: true,
      index: true,
      admin: { description: 'The concept that must be known first.' },
    },
    {
      name: 'strength',
      type: 'select',
      required: true,
      defaultValue: 'hard',
      options: prerequisiteStrengthOptions,
    },
  ],
  timestamps: true,
}

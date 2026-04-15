import type { CollectionConfig } from 'payload'

/**
 * AuditLog — append-only record of lifecycle transitions on Exercises.
 *
 * Written by the `writeAuditLog` afterChange hook. Never edited by hand.
 * Kept for compliance (who rejected what, when, why) and for analytics on
 * reviewer throughput.
 */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['createdAt', 'action', 'exercise', 'actor'],
    group: 'System',
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'admin',
    create: () => false, // hook-only writes
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'summary',
      type: 'text',
      admin: { description: 'One-line recap, e.g. "reviewer alice rejected exercise #412".' },
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Created', value: 'created' },
        { label: 'Transitioned state', value: 'transitioned' },
        { label: 'Edited (no state change)', value: 'edited' },
      ],
    },
    { name: 'fromState', type: 'text' },
    { name: 'toState', type: 'text' },
    {
      name: 'exercise',
      type: 'relationship',
      relationTo: 'exercises',
      // Intentionally not `required` — if an exercise is hard-deleted, the audit
      // rows survive with a null FK rather than cascading-delete the history.
    },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'reason', type: 'textarea' },
  ],
  timestamps: true,
}

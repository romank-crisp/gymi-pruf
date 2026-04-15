import type { CollectionConfig } from 'payload'

/**
 * Users collection.
 *
 * v1 roles: admin | reviewer | family.
 * Role is modeled as a flat field for simplicity — CLAUDE.md notes this is intentional
 * and should be refactored into relational permissions when tutor/school roles arrive.
 * Keep callers using the helpers in `src/access/` so that future refactor is localized.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'displayName'],
  },
  auth: true,
  access: {
    // Only admins can create, delete, or list users in the admin UI.
    // Reviewers and families authenticate but don't manage accounts.
    admin: ({ req: { user } }) => user?.role === 'admin',
    create: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      // Non-admins can only read their own record.
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'family',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Reviewer', value: 'reviewer' },
        { label: 'Family', value: 'family' },
      ],
      access: {
        // Only admins can change roles — a reviewer cannot promote themselves.
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
    {
      name: 'displayName',
      type: 'text',
      admin: {
        description: 'Shown in the reviewer queue and audit log.',
      },
    },
  ],
}

import type { FieldHook } from 'payload'
import { slugify } from '../utils/slugify'

/**
 * `beforeValidate` field hook for `slug` fields.
 *
 * If the user didn't provide a slug, derives one from `siblingData.name`.
 * If they did, normalises it through `slugify()` so manual edits stay
 * kebab-cased and umlaut-free.
 */
export const autoSlug: FieldHook = ({ value, siblingData }) => {
  const name = (siblingData as Record<string, unknown>)?.name
  if (typeof value === 'string' && value.trim()) return slugify(value)
  if (typeof name === 'string' && name.trim()) return slugify(name)
  return value
}

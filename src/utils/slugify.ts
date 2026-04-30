/**
 * Kebab-case slug generator for auto-filling `slug` fields from `name`.
 *
 * Preserves German umlauts by transliterating them (ä → ae, ö → oe, ü → ue,
 * ß → ss). Lowercases, strips punctuation, collapses whitespace and hyphens.
 *
 * Examples:
 *   slugify('Wortarten')                  → 'wortarten'
 *   slugify('Größe & Genus')              → 'groesse-genus'
 *   slugify('Nomen — Singular/Plural')    → 'nomen-singular-plural'
 */
export function slugify(input: string): string {
  if (!input) return ''
  // IMPORTANT: German umlaut transliteration must happen BEFORE NFD-normalize,
  // otherwise 'ö' decomposes to 'o' + combining-diaeresis and the combining mark
  // gets stripped, leaving 'o' instead of 'oe'.
  return input
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip any remaining combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alnum → hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}

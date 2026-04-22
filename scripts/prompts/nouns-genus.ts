/**
 * Prompt builder for generating German noun slot items with genus metadata.
 *
 * The AI is asked to produce a JSON array of nouns covering a range of
 * difficulty tiers. The caller specifies how many items and which tier
 * range to focus on.
 *
 * Output contract — each item in the returned array must match:
 *   {
 *     value:          string  // capitalised German noun, no article
 *     genus:          "m"|"f"|"n"
 *     artikel:        "der"|"die"|"das"
 *     plural:         string  // plural form, "—" if no plural exists
 *     difficultyTier: 1|2|3|4|5
 *   }
 *
 * Difficulty tiers map to Zurich Gymi-exam 6th-grade vocabulary:
 *   1 — everyday, always known (Tisch, Hund, Schule)
 *   2 — school vocabulary (Ergebnis, Abschnitt, Methode)
 *   3 — academic / exam vocabulary (Struktur, Kriterium, Entwicklung)
 *   4 — advanced (Phänomen, Perspektive, Konsequenz)
 *   5 — near-exam difficulty, DaZ edge cases (Ärgernis, Zeugnis, Hindernis)
 */

export type NounGenerationOptions = {
  /** Total number of nouns to request (the AI may return slightly fewer). */
  count: number
  /** Restrict to a specific tier range. Null = all tiers. */
  tierMin?: number
  tierMax?: number
  /** Optional list of nouns already in the pool, so the AI avoids them. */
  existingValues?: string[]
}

/**
 * Builds the system prompt that configures the AI for this task.
 * Kept separate so it can be swapped or A/B tested without changing the
 * generation logic.
 */
export function buildSystemPrompt(): string {
  return `You are a German-language educational content specialist preparing vocabulary lists for a Gymnasium entrance-exam prep app targeted at bilingual 10–12-year-olds in Switzerland (German-speaking).

Your task is to produce accurate, age-appropriate German nouns with their grammatical metadata.

Rules you must follow without exception:
1. Every noun must be a real German word a child at 6th-grade level might encounter.
2. The "artikel" must always match the "genus": m→der, f→die, n→das. Never deviate.
3. The "plural" must be the standard Duden plural. If a noun is uncountable or has no plural, use "—".
4. Nouns must be capitalised (standard German orthography).
5. No compound words at tier 1. Compound words are allowed from tier 3 upward.
6. No proper nouns (no city names, personal names, brand names).
7. No Swiss German dialect words — only standard Hochdeutsch.
8. No offensive, violent, or inappropriate content.
9. Aim for roughly 1/3 masculine, 1/3 feminine, 1/3 neuter distribution across the batch.
10. Output ONLY valid JSON. No prose before or after the JSON.`
}

/**
 * Builds the user-turn prompt for a noun-generation request.
 */
export function buildUserPrompt(opts: NounGenerationOptions): string {
  const { count, tierMin, tierMax, existingValues = [] } = opts

  const tierDescription =
    tierMin != null && tierMax != null
      ? `Focus on difficulty tiers ${tierMin}–${tierMax} (see the tier scale below).`
      : tierMin != null
        ? `All nouns should be difficulty tier ${tierMin} or higher.`
        : tierMax != null
          ? `All nouns should be difficulty tier ${tierMax} or lower.`
          : 'Distribute nouns across difficulty tiers 1–5 proportionally (more tier 1–2, fewer 4–5).'

  const avoidBlock =
    existingValues.length > 0
      ? `\nDo NOT include any of these nouns (already in pool):\n${existingValues.slice(0, 100).join(', ')}\n`
      : ''

  return `Generate exactly ${count} German nouns for a Gymnasium exam-prep vocabulary pool.

Tier scale:
  1 = everyday words every child knows (Tisch, Hund, Schule, Ball)
  2 = school vocabulary (Ergebnis, Abschnitt, Methode, Lösung)
  3 = academic / exam vocabulary (Struktur, Kriterium, Entwicklung, Analyse)
  4 = advanced, might require explaining (Phänomen, Perspektive, Konsequenz, Potenzial)
  5 = near-exam difficulty, includes DaZ edge cases like -nis words (Ärgernis, Zeugnis, Hindernis, Erlebnis)

${tierDescription}
${avoidBlock}
Return a JSON object with a single key "nouns" whose value is an array of objects, each with this exact shape:
{
  "value": "Tisch",
  "genus": "m",
  "artikel": "der",
  "plural": "Tische",
  "difficultyTier": 1
}

Produce exactly ${count} items. Output the JSON object only — no markdown fences, no explanation.`
}

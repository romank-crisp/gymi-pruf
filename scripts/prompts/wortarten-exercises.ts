/**
 * Prompt builder for generating AI-native Wortarten exercise templates.
 *
 * Targets the most common DaZ-relevant exercise types for Wortarten:
 *   - multiple_choice : identify the correct artikel/Wortart from options
 *   - fill_blank      : complete a sentence with the right form
 *   - tap_text        : (future) tap words matching a Wortart
 *
 * Phase 1 generates only multiple_choice and fill_blank because they can
 * be fully auto-validated (clear correct answer, enumerable wrong options).
 *
 * Output contract per exercise:
 * {
 *   format:         "multiple_choice" | "fill_blank"
 *   difficulty:     1|2|3|4|5
 *   cognitiveType:  "recognition" | "classification" | "generation" | "transformation" | "application"
 *   promptPattern:  string  — the learner-facing question; blanks as ___
 *   answerSpec: {
 *     correct_answer: string   — the single correct answer
 *     options:        string[] — 3–4 choices (for multiple_choice)
 *   }
 *   hintLadder: [
 *     { text: string },  // gentle hint
 *     { text: string },  // near-answer hint
 *   ]
 *   feedbackCorrect: string
 *   feedbackWrong:   string
 *   tags:            string[]
 *   topic:           "genus" | "plural" | "wortart" | "kasus"
 * }
 */

export type ExerciseGenerationOptions = {
  /** Number of exercises to generate. */
  count: number
  /** Topic focus. */
  topic: 'genus' | 'plural' | 'wortart' | 'kasus'
  /** Difficulty range to generate. */
  difficultyMin?: number
  difficultyMax?: number
}

export function buildExerciseSystemPrompt(): string {
  return `You are a curriculum designer creating German grammar exercises for a Gymnasium entrance-exam prep app.

Your audience: bilingual 10–12-year-olds in Switzerland who speak German natively but lack the academic Hochdeutsch register the exam demands. Their most common errors are genus (der/die/das), kasus (Akkusativ vs Dativ), and Wortart identification.

Writing style rules (enforced — never deviate):
1. Use "du" address: "Welchen Artikel wählst du?" not "Welchen Artikel wählen Sie?"
2. Sentences are 8–15 words maximum.
3. No Swiss German: never write "isch", "hät", "chunnsch", "lueg" etc.
4. No Anglicisms in exercise content (the children are learning Hochdeutsch).
5. Consistent terminology: always "Nomen" (never "Substantiv"), always "Verb" (never "Tätigkeitswort"), always "Adjektiv" (never "Eigenschaftswort").
6. Feedback must be encouraging but concise: 1 sentence for correct, 1–2 for wrong.
7. Hints go from vague → specific → near-answer. Never give away the answer in hint 1.
8. Every exercise must be self-contained — no cross-references to other exercises.

Output ONLY valid JSON. No markdown fences. No commentary before or after.`
}

export function buildExerciseUserPrompt(opts: ExerciseGenerationOptions): string {
  const { count, topic, difficultyMin = 1, difficultyMax = 3 } = opts

  const topicGuide: Record<string, string> = {
    genus: `Focus: identifying the correct definite artikel (der/die/das) for a given Nomen.
Exercise pattern: "Welcher Artikel passt? ___ [Noun]" with options [der, die, das].
Include a variety of nouns from common to tricky (e.g. -e endings, compound nouns, -nis/-heit/-keit suffixes).`,

    plural: `Focus: forming or identifying the correct Plural of a Nomen.
Exercise pattern: mix of "Wie heißt der Plural von [Noun]?" (multiple_choice) and
"Ergänze: Ich sehe zwei ___." (fill_blank).
Include irregular plurals (Haus→Häuser, Kind→Kinder) as well as regular ones.`,

    wortart: `Focus: identifying the Wortart (Nomen, Verb, Adjektiv, Adverb, Präposition, Pronomen) of an underlined word in a sentence.
Exercise pattern: give a short sentence with the target word in **bold**, ask "Welche Wortart ist das fett gedruckte Wort?"
Options should be 4 Wortarten (the correct one + 3 distractors).`,

    kasus: `Focus: choosing the correct Kasus form (Nominativ / Akkusativ / Dativ).
Exercise pattern: "Ergänze den richtigen Artikel: Ich gebe ___ Kind das Buch." (fill_blank)
or "Welche Form ist richtig?" with 2–3 options differing only in artikel/ending.
Focus on the classic DaZ confusion: Akkusativ vs Dativ after two-way Präpositionen.`,
  }

  return `Generate exactly ${count} German grammar exercises on the topic "${topic}".

${topicGuide[topic]}

Difficulty scale for this topic:
  1 = very common words/patterns, always correct in first try
  2 = grade-level vocabulary, 1 distractor
  3 = slightly tricky, 2 near-correct distractors
  4 = challenging, all distractors plausible
  5 = near-exam, sophisticated traps

Generate exercises with difficulties between ${difficultyMin} and ${difficultyMax}.
Distribute difficulties: roughly half at the lower end, tapering upward.

Return a JSON object:
{
  "exercises": [
    {
      "format": "multiple_choice",
      "difficulty": 1,
      "cognitiveType": "recognition",   ← MUST be one of: recognition | classification | generation | transformation | application
      "promptPattern": "Welcher Artikel passt? ___ Tisch",
      "answerSpec": {
        "correct_answer": "der",
        "options": ["der", "die", "das"]
      },
      "hintLadder": [
        { "text": "Sprich das Wort laut aus — wie klingt es?" },
        { "text": "Viele Möbelstücke sind maskulin (der)." }
      ],
      "feedbackCorrect": "Genau! Es heißt der Tisch — maskulin.",
      "feedbackWrong": "Nicht ganz. Es heißt der Tisch — Tisch ist maskulin.",
      "tags": ["genus", "nomen", "artikel"],
      "topic": "${topic}"
    }
  ]
}

Produce exactly ${count} exercises. Output JSON only — no markdown, no explanation.`
}

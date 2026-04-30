/**
 * Prompt builders for AI-native teaching-material generation.
 *
 * Two output types:
 *   - ConceptCard (the RAG-grounding definition Frag Leo retrieves)
 *   - TheoryBlock (format = conversational | worked_example)
 *
 * Both prompts share a single system prompt that encodes the project's
 * non-negotiables: Lehrplan 21 terminology, simplified Hochdeutsch,
 * warm *du* address, 8–15 word sentences, no Swiss German, no Anglicisms.
 */

export type ConceptContext = {
  conceptSlug: string
  conceptName: string
  unitName: string
  moduleName: string
  dazPainPoint?: 'gender' | 'cases' | 'tenses' | 'word_order' | 'separable_verbs' | null
  baseDifficulty?: number
}

// ───────────────────────────────────────────────────────────────────────────
// Shared system prompt
// ───────────────────────────────────────────────────────────────────────────

export function buildSystemPrompt(): string {
  return `Du bist ein erfahrener Deutschlehrer und Lehrbuchautor aus der Schweiz.
Du schreibst Lernmaterial für bilinguale Kinder (10–12 Jahre) zur Vorbereitung
auf die ZAP Deutsch (Aufnahmeprüfung Langgymnasium, Kanton Zürich).

NICHT VERHANDELBARE REGELN:

1. Sprache: ausschliesslich einfaches Hochdeutsch. Kein Schweizerdeutsch,
   kein Dialekt, keine Anglizismen. Sätze 8–15 Wörter, Wortschatz auf
   6. Klasse kalibriert.

2. Anrede: warmes, kindgerechtes "du". Keine Anrede mit "Sie", kein "man".

3. Terminologie: Lehrplan 21 + "Die Sprachstarken" + ZKM Verlag.
   - "Nomen" (nicht Substantiv)
   - "der Fall" (nicht Kasus, ausser in der Überschrift)
   - Kasus heissen: Nominativ, Akkusativ, Dativ, Genitiv (nicht "der 1. Fall")
   - "Wortart" (nicht Wortklasse)
   - "Satzglied" (nicht Satzteil)

4. DaZ-Schwerpunkte (falls relevant):
   - Genus (der/die/das) — kein Rate-Trick, sondern Merkhilfen nach Endung
   - Kasus nach Wechselpräpositionen: Richtung → Akkusativ, Ort → Dativ
   - Perfekt vs. Präteritum: Perfekt in der gesprochenen Sprache, Präteritum
     im Schrifttext und bei Hilfsverben
   - Wortstellung: Verb-zweit im Hauptsatz, Verb-letzt im Nebensatz
   - Trennbare Verben: Präfix springt im Präsens/Perfekt an den Satzende

5. Struktur: was du ausgibst ist JSON, exakt nach dem geforderten Schema.
   Kein Markdown-Fence um das JSON, keine Kommentare im JSON, kein
   erklärender Text davor oder danach. Nur das JSON-Objekt.

6. Ton: ermutigend, konkret, nie herablassend. Wenn etwas schwierig ist,
   sag es offen ("Das ist knifflig — lass uns Schritt für Schritt gehen.").

7. Beispiele: immer konkrete, kindgerechte Sätze. Thema: Schule, Familie,
   Tiere, Sport, Alltag in der Schweiz. Keine politischen, religiösen,
   oder sensiblen Themen.

Du weisst: du bist das einzige Qualitätskontroll-Gate zwischen KI und
Schülerin. Niemand korrigiert deinen Output. Sei präzise.`
}

// ───────────────────────────────────────────────────────────────────────────
// Concept Card — the RAG grounding material
// ───────────────────────────────────────────────────────────────────────────

export function buildConceptCardPrompt(ctx: ConceptContext): string {
  return `Erstelle eine Konzeptkarte (ConceptCard) für den folgenden Konzept-Knoten.
Diese Karte wird von der Mascot-KI "Frag Leo" als Grundlage verwendet, wenn
das Kind eine Frage zu diesem Konzept stellt — die Karte ersetzt das
Halluzinationsrisiko des reinen LLM-Lookups durch verankerten Inhalt.

KONZEPT-KONTEXT:
  Modul:  ${ctx.moduleName}
  Unit:   ${ctx.unitName}
  Konzept: ${ctx.conceptName}${ctx.dazPainPoint ? `\n  DaZ-Schwerpunkt: ${ctx.dazPainPoint}` : ''}

GIB EIN JSON-OBJEKT DIESER STRUKTUR ZURÜCK:
{
  "definition": string,
     // 2–4 Sätze. Präzise Definition in einfachem Hochdeutsch.
     // Beginne nicht mit "Das Konzept..." — direkt zur Sache.
  "examples": [
     { "text": string },
     { "text": string },
     { "text": string }
     // 3–5 konkrete Beispielsätze, die das Konzept zeigen.
     // Das relevante Wort/Phrase muss in *Sternchen* markiert sein.
  ],
  "commonConfusions": string,
     // 1–3 Sätze. Was verwechseln bilinguale Kinder bei diesem Konzept?
     // Sei spezifisch. Wenn kein bekannter Fallstrick existiert,
     // schreibe einen typischen Flüchtigkeitsfehler auf.
  "relatedConceptSlugs": [string]
     // 0–3 Slugs verwandter Konzepte, auf die der Mascot verweisen darf.
     // Leere Liste [] wenn keine bekannt.
}

GIB NUR DAS JSON-OBJEKT ZURÜCK, NICHTS SONST.`
}

// ───────────────────────────────────────────────────────────────────────────
// Theory Block — conversational (mascot dialogue)
// ───────────────────────────────────────────────────────────────────────────

export function buildConversationalTheoryPrompt(ctx: ConceptContext): string {
  return `Erstelle einen THEORY BLOCK im Format "conversational" für das
folgende Konzept. Die Mascot-Figur "Leo" führt das Kind dialogisch durch
die Erklärung. Das Kind kann an bestimmten Stellen antworten.

KONZEPT-KONTEXT:
  Modul:  ${ctx.moduleName}
  Unit:   ${ctx.unitName}
  Konzept: ${ctx.conceptName}${ctx.dazPainPoint ? `\n  DaZ-Schwerpunkt: ${ctx.dazPainPoint}` : ''}

GIB EIN JSON-OBJEKT DIESER STRUKTUR ZURÜCK:
{
  "title": string,
     // kurzer, griffiger Titel (max 60 Zeichen) in Hochdeutsch.
  "content": {
    "bubbles": [
      {
        "role": "leo" | "kid",
        "text": string,
        "expects_reply": boolean,
        "action": null | "reveal" | "wait"
      }
    ]
  }
}

REGELN FÜR BUBBLES:
  - 8–14 Bubbles insgesamt.
  - Die meisten sind "role": "leo". 2–3 sind "role": "kid" und haben
    eine plausible Kinder-Antwort (z.B. "Ich glaube das ist ein Nomen.").
  - "expects_reply": true nur bei Leo-Bubbles, nach denen das Kind tippen
    oder antworten soll. Höchstens 2 davon im ganzen Block.
  - "action": "reveal" wenn Leo eine Lösung aufdeckt; "wait" wenn Leo
    auf eine Geste wartet; sonst null.
  - Textlänge pro Bubble: 1–2 Sätze, maximal 25 Wörter.
  - Dialog muss natürlich fliessen. Beginne nicht mit "Hallo, ich bin Leo" —
    setze bei der Sache an, das Kind kennt Leo schon.
  - Baue genau ein konkretes Beispiel sukzessive auf: erst zeigen,
    dann erklären, dann gemeinsam verallgemeinern.

GIB NUR DAS JSON-OBJEKT ZURÜCK, NICHTS SONST.`
}

// ───────────────────────────────────────────────────────────────────────────
// Theory Block — worked_example (plain walk-through)
// ───────────────────────────────────────────────────────────────────────────

export function buildWorkedExampleTheoryPrompt(ctx: ConceptContext): string {
  return `Erstelle einen THEORY BLOCK im Format "worked_example" für das
folgende Konzept. Ein gelöstes Beispiel in Schritten — das Kind liest,
sieht wie die Aufgabe gedacht wird, versteht die Methode.

KONZEPT-KONTEXT:
  Modul:  ${ctx.moduleName}
  Unit:   ${ctx.unitName}
  Konzept: ${ctx.conceptName}${ctx.dazPainPoint ? `\n  DaZ-Schwerpunkt: ${ctx.dazPainPoint}` : ''}

GIB EIN JSON-OBJEKT DIESER STRUKTUR ZURÜCK:
{
  "title": string,
     // kurzer, griffiger Titel (max 60 Zeichen).
  "content": {
    "problem": string,
       // Die Aufgabenstellung in 1–2 Sätzen.
    "solution_steps": [
      { "step": 1, "thought": string, "action": string },
      { "step": 2, "thought": string, "action": string },
      { "step": 3, "thought": string, "action": string }
      // 3–5 Schritte.
      // "thought": was überlegt man sich (innerer Monolog, 1 Satz)
      // "action": was schreibt/entscheidet man (1 Satz)
    ],
    "answer": string,
       // Die endgültige Antwort in 1 Satz.
    "why_it_works": string
       // 1–2 Sätze: die Regel dahinter, so dass das Kind es auf
       // andere Aufgaben übertragen kann.
  }
}

REGELN:
  - Verwende ein konkretes Beispiel, nicht abstrakt ("das Nomen X", nicht
    "ein Nomen N").
  - Die Gedanken müssen zeigen wie ein Mensch wirklich denkt, nicht wie ein
    Lehrbuch Regeln auflistet.
  - Am Ende muss das Kind die Methode auf ähnliche Aufgaben anwenden können.

GIB NUR DAS JSON-OBJEKT ZURÜCK, NICHTS SONST.`
}

// ───────────────────────────────────────────────────────────────────────────
// Self-critique pass — runs on generated output, returns revised JSON
// ───────────────────────────────────────────────────────────────────────────

export function buildCritiquePrompt(
  kind: 'concept-card' | 'theory-conversational' | 'theory-worked-example',
  ctx: ConceptContext,
  generatedJson: string,
): string {
  const kindLabel = {
    'concept-card': 'ConceptCard',
    'theory-conversational': 'conversational TheoryBlock',
    'theory-worked-example': 'worked_example TheoryBlock',
  }[kind]

  return `Du bist der strenge Fachlektor. Der folgende ${kindLabel} wurde
für das Konzept "${ctx.conceptName}" generiert. Prüfe ihn gegen diese
Checkliste und gib dann eine überarbeitete Fassung zurück.

CHECKLISTE (alles muss erfüllt sein):
  ☐ Sprache ist einfaches Hochdeutsch, keine Schweizer Dialektform
    ("isch", "hät", "gönd", "lueg" etc.)
  ☐ Kein Anglizismus (statt "cool" → "klasse" / "super")
  ☐ Sätze 8–15 Wörter, Wortschatz 6. Klasse
  ☐ Warmes "du", kein "Sie", kein "man"
  ☐ Terminologie folgt Lehrplan 21 (Nomen, Wortart, Kasus-Namen)
  ☐ Die Erklärung ist FACHLICH KORREKT (prüfe kritisch!)
  ☐ Beispiele sind konkret und für 10–12-Jährige nachvollziehbar
  ☐ Keine Anglizismen, Emojis nur sparsam (max 1)
  ☐ JSON-Struktur ist exakt wie im Input gegeben

GENERIERTER ${kindLabel.toUpperCase()}:
${generatedJson}

GIB DIE ÜBERARBEITETE JSON-FASSUNG ZURÜCK. Wenn die Eingabe bereits
einwandfrei ist, gib sie unverändert zurück. Wenn du Mängel findest,
korrigiere sie und behalte die Struktur bei.

GIB NUR DAS JSON-OBJEKT ZURÜCK, NICHTS SONST.`
}

/**
 * seed-curriculum.ts — idempotent seed of the full curriculum per
 * docs/product/learning-program.md §4.
 *
 * Adds: 6 modules (Satzglieder, Fälle, Tempora & Modus, Satzarten &
 * Satzbau, Rechtschreibung, Wortschatz), their units, and all concepts
 * explicitly named in the doc. Safe to re-run; entities are upserted
 * by slug.
 *
 * Usage:
 *   pnpm tsx scripts/seed-curriculum.ts
 *   pnpm tsx scripts/seed-curriculum.ts --dry-run
 */

import 'dotenv/config'
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'

type ModuleDef = { slug: string; name: string; description?: string; domain: string }
type UnitDef = { slug: string; name: string; module: string; description?: string }
type ConceptDef = {
  slug: string
  name: string
  unit: string
  description?: string
  baseDifficulty?: number
  targetAttempts?: number
  dazPainPoint?: 'gender' | 'cases' | 'tenses' | 'word_order' | 'separable_verbs'
}

// ---------------------------------------------------------------------------
// Data — per learning-program.md
// ---------------------------------------------------------------------------

const MODULES: ModuleDef[] = [
  // Sprachbetrachtung — Wortarten already seeded by scripts/seed.ts
  {
    slug: 'satzglieder',
    name: 'Satzglieder',
    description: 'Satzbausteine erkennen: Subjekt, Prädikat, Objekte, Attribute',
    domain: 'sprachbetrachtung',
  },
  {
    slug: 'faelle',
    name: 'Fälle',
    description: 'Nominativ, Akkusativ, Dativ, Genitiv — die vier Fälle',
    domain: 'sprachbetrachtung',
  },
  {
    slug: 'tempora-modus',
    name: 'Tempora & Modus',
    description: 'Zeitformen und Modi: Präsens, Präteritum, Perfekt, Konjunktiv …',
    domain: 'sprachbetrachtung',
  },
  {
    slug: 'satzarten-satzbau',
    name: 'Satzarten & Satzbau',
    description: 'Satzarten, Haupt- und Nebensatz, Satzverbindungen',
    domain: 'sprachbetrachtung',
  },
  // Rechtschreibung — single module under its own domain
  {
    slug: 'rechtschreibung',
    name: 'Rechtschreibung',
    description: 'Schreibregeln und Zeichensetzung',
    domain: 'rechtschreibung',
  },
  // Wortschatz — single module under its own domain
  {
    slug: 'wortschatz',
    name: 'Wortschatz',
    description: 'Wortbildung, Wortfelder, Stilebenen, Redewendungen',
    domain: 'wortschatz',
  },
]

const UNITS: UnitDef[] = [
  // Satzglieder
  { slug: 'subjekt', name: 'Subjekt', module: 'satzglieder' },
  { slug: 'praedikat', name: 'Prädikat', module: 'satzglieder' },
  { slug: 'objekt', name: 'Objekt', module: 'satzglieder' },
  { slug: 'adverbiale-bestimmung', name: 'Adverbiale Bestimmung', module: 'satzglieder' },
  { slug: 'attribut', name: 'Attribut', module: 'satzglieder' },
  {
    slug: 'umstellproben-ersatzproben',
    name: 'Umstellproben & Ersatzproben',
    module: 'satzglieder',
  },
  // Fälle
  { slug: 'nominativ', name: 'Nominativ', module: 'faelle' },
  { slug: 'akkusativ', name: 'Akkusativ', module: 'faelle' },
  { slug: 'dativ', name: 'Dativ', module: 'faelle' },
  { slug: 'genitiv', name: 'Genitiv', module: 'faelle' },
  { slug: 'deklination-komplett', name: 'Deklination komplett', module: 'faelle' },
  // Tempora & Modus
  { slug: 'praesens', name: 'Präsens', module: 'tempora-modus' },
  { slug: 'praeteritum', name: 'Präteritum', module: 'tempora-modus' },
  { slug: 'perfekt', name: 'Perfekt', module: 'tempora-modus' },
  { slug: 'plusquamperfekt', name: 'Plusquamperfekt', module: 'tempora-modus' },
  { slug: 'futur', name: 'Futur', module: 'tempora-modus' },
  { slug: 'modus', name: 'Modus', module: 'tempora-modus' },
  { slug: 'aktiv-passiv', name: 'Aktiv / Passiv', module: 'tempora-modus' },
  // Satzarten & Satzbau
  { slug: 'satzarten', name: 'Satzarten', module: 'satzarten-satzbau' },
  { slug: 'hauptsatz-nebensatz', name: 'Hauptsatz / Nebensatz', module: 'satzarten-satzbau' },
  { slug: 'satzverbindung', name: 'Satzverbindung', module: 'satzarten-satzbau' },
  {
    slug: 'direkte-indirekte-rede',
    name: 'Direkte / indirekte Rede',
    module: 'satzarten-satzbau',
  },
  // Rechtschreibung
  { slug: 'gross-kleinschreibung', name: 'Groß-/Kleinschreibung', module: 'rechtschreibung' },
  {
    slug: 'doppelkonsonanten-schaerfung',
    name: 'Doppelkonsonanten & Schärfung',
    module: 'rechtschreibung',
  },
  { slug: 'dehnung', name: 'Dehnung', module: 'rechtschreibung' },
  { slug: 's-laute', name: 's-Laute', module: 'rechtschreibung' },
  { slug: 'das-dass', name: 'das / dass', module: 'rechtschreibung' },
  { slug: 'homophone', name: 'Homophone', module: 'rechtschreibung' },
  { slug: 'zeichensetzung', name: 'Zeichensetzung', module: 'rechtschreibung' },
  { slug: 'fremdwoerter', name: 'Fremdwörter', module: 'rechtschreibung' },
  { slug: 'silbentrennung', name: 'Silbentrennung', module: 'rechtschreibung' },
  // Wortschatz
  { slug: 'wortbildung', name: 'Wortbildung', module: 'wortschatz' },
  { slug: 'wortfelder', name: 'Wortfelder', module: 'wortschatz' },
  {
    slug: 'redewendungen-metaphern',
    name: 'Redewendungen & Metaphern',
    module: 'wortschatz',
  },
  { slug: 'stilebenen', name: 'Stilebenen', module: 'wortschatz' },
  { slug: 'homonyme-polysemie', name: 'Homonyme & Polysemie', module: 'wortschatz' },
  { slug: 'fremdwoerter-im-kontext', name: 'Fremdwörter im Kontext', module: 'wortschatz' },
]

const CONCEPTS: ConceptDef[] = [
  // ── Wortarten: Verb (6) ────────────────────────────────────────────────
  { slug: 'verb-erkennen', name: 'Verb erkennen', unit: 'verb', baseDifficulty: 2 },
  {
    slug: 'infinitiv-finite-form',
    name: 'Infinitiv / finite Form',
    unit: 'verb',
    baseDifficulty: 3,
  },
  { slug: 'person-numerus-verb', name: 'Person & Numerus', unit: 'verb', baseDifficulty: 3 },
  {
    slug: 'trennbare-verben',
    name: 'Trennbare Verben',
    unit: 'verb',
    baseDifficulty: 4,
    dazPainPoint: 'separable_verbs',
  },
  { slug: 'modalverben', name: 'Modalverben', unit: 'verb', baseDifficulty: 3 },
  { slug: 'praefixverben', name: 'Präfixverben (un-/trennbar)', unit: 'verb', baseDifficulty: 4 },

  // ── Wortarten: Adjektiv (5) ────────────────────────────────────────────
  {
    slug: 'adjektiv-erkennen',
    name: 'Adjektiv erkennen',
    unit: 'adjektiv',
    baseDifficulty: 2,
  },
  {
    slug: 'adjektiv-vs-adverb',
    name: 'Adjektiv vs. Adverb',
    unit: 'adjektiv',
    baseDifficulty: 4,
  },
  { slug: 'steigerung', name: 'Steigerung', unit: 'adjektiv', baseDifficulty: 3 },
  {
    slug: 'adjektiv-deklination-grundzuege',
    name: 'Deklination Grundzüge',
    unit: 'adjektiv',
    baseDifficulty: 4,
  },
  {
    slug: 'adjektiv-praedikativ-attributiv',
    name: 'Prädikativ vs. attributiv',
    unit: 'adjektiv',
    baseDifficulty: 3,
  },

  // ── Wortarten: Artikel (3) ─────────────────────────────────────────────
  {
    slug: 'bestimmter-unbestimmter-artikel',
    name: 'Bestimmter & unbestimmter Artikel',
    unit: 'artikel',
    baseDifficulty: 2,
  },
  {
    slug: 'artikel-und-genus',
    name: 'Artikel und Genus',
    unit: 'artikel',
    baseDifficulty: 3,
    dazPainPoint: 'gender',
  },
  { slug: 'nullartikel', name: 'Nullartikel', unit: 'artikel', baseDifficulty: 4 },

  // ── Wortarten: Pronomen (7) ────────────────────────────────────────────
  { slug: 'personalpronomen', name: 'Personalpronomen', unit: 'pronomen', baseDifficulty: 2 },
  { slug: 'possessivpronomen', name: 'Possessivpronomen', unit: 'pronomen', baseDifficulty: 3 },
  { slug: 'reflexivpronomen', name: 'Reflexivpronomen', unit: 'pronomen', baseDifficulty: 3 },
  {
    slug: 'demonstrativpronomen',
    name: 'Demonstrativpronomen',
    unit: 'pronomen',
    baseDifficulty: 3,
  },
  { slug: 'relativpronomen', name: 'Relativpronomen', unit: 'pronomen', baseDifficulty: 4 },
  {
    slug: 'interrogativpronomen',
    name: 'Interrogativpronomen',
    unit: 'pronomen',
    baseDifficulty: 3,
  },
  { slug: 'indefinitpronomen', name: 'Indefinitpronomen', unit: 'pronomen', baseDifficulty: 3 },

  // ── Wortarten: Präposition (3) ─────────────────────────────────────────
  {
    slug: 'praeposition-erkennen',
    name: 'Präposition erkennen',
    unit: 'praeposition',
    baseDifficulty: 2,
  },
  {
    slug: 'praeposition-plus-fall',
    name: 'Präposition + Fall (feste Rektion)',
    unit: 'praeposition',
    baseDifficulty: 4,
    dazPainPoint: 'cases',
  },
  {
    slug: 'wechselpraepositionen',
    name: 'Wechselpräpositionen',
    unit: 'praeposition',
    baseDifficulty: 5,
    dazPainPoint: 'cases',
  },

  // ── Wortarten: Konjunktion (3) ─────────────────────────────────────────
  {
    slug: 'konjunktion-nebenordnend-unterordnend',
    name: 'Nebenordnend vs. unterordnend',
    unit: 'konjunktion',
    baseDifficulty: 3,
  },
  {
    slug: 'subjunktionen-haeufig',
    name: 'Häufige Subjunktionen',
    unit: 'konjunktion',
    baseDifficulty: 3,
  },
  {
    slug: 'konjunktion-erkennen',
    name: 'Konjunktion erkennen',
    unit: 'konjunktion',
    baseDifficulty: 2,
  },

  // ── Wortarten: Adverb (3) ──────────────────────────────────────────────
  { slug: 'adverb-erkennen', name: 'Adverb erkennen', unit: 'adverb', baseDifficulty: 2 },
  {
    slug: 'adverb-vs-adjektiv',
    name: 'Adverb vs. Adjektiv',
    unit: 'adverb',
    baseDifficulty: 4,
  },
  {
    slug: 'adverb-ort-zeit-art-grund',
    name: 'Ort / Zeit / Art / Grund',
    unit: 'adverb',
    baseDifficulty: 3,
  },

  // ── Wortarten: Zahlwort & Interjektion (2) ─────────────────────────────
  {
    slug: 'zahlwort-erkennen',
    name: 'Zahlwort erkennen',
    unit: 'zahlwort-interjektion',
    baseDifficulty: 2,
  },
  {
    slug: 'interjektion-erkennen',
    name: 'Interjektion erkennen',
    unit: 'zahlwort-interjektion',
    baseDifficulty: 1,
  },

  // ── Satzglieder: Subjekt (2) ───────────────────────────────────────────
  {
    slug: 'subjekt-finden',
    name: 'Subjekt finden (wer/was-Frage)',
    unit: 'subjekt',
    baseDifficulty: 2,
  },
  {
    slug: 'subjekt-in-nebensaetzen',
    name: 'Subjekt in Nebensätzen',
    unit: 'subjekt',
    baseDifficulty: 4,
  },

  // ── Satzglieder: Prädikat (4) ──────────────────────────────────────────
  {
    slug: 'einteiliges-praedikat',
    name: 'Einteiliges Prädikat',
    unit: 'praedikat',
    baseDifficulty: 2,
  },
  {
    slug: 'mehrteiliges-praedikat-hilfsverb',
    name: 'Mehrteiliges Prädikat (Hilfsverb + Partizip)',
    unit: 'praedikat',
    baseDifficulty: 3,
  },
  {
    slug: 'mehrteiliges-praedikat-modalverb',
    name: 'Mehrteiliges Prädikat (Modalverb + Infinitiv)',
    unit: 'praedikat',
    baseDifficulty: 3,
  },
  {
    slug: 'trennbare-verben-im-satz',
    name: 'Trennbare Verben im Satz',
    unit: 'praedikat',
    baseDifficulty: 4,
    dazPainPoint: 'separable_verbs',
  },

  // ── Satzglieder: Objekt (4) ────────────────────────────────────────────
  {
    slug: 'akkusativobjekt',
    name: 'Akkusativobjekt',
    unit: 'objekt',
    baseDifficulty: 3,
    dazPainPoint: 'cases',
  },
  {
    slug: 'dativobjekt',
    name: 'Dativobjekt',
    unit: 'objekt',
    baseDifficulty: 3,
    dazPainPoint: 'cases',
  },
  {
    slug: 'genitivobjekt',
    name: 'Genitivobjekt',
    unit: 'objekt',
    baseDifficulty: 4,
    dazPainPoint: 'cases',
  },
  {
    slug: 'praepositionalobjekt',
    name: 'Präpositionalobjekt',
    unit: 'objekt',
    baseDifficulty: 4,
    dazPainPoint: 'cases',
  },

  // ── Satzglieder: Adverbiale Bestimmung (4) ─────────────────────────────
  {
    slug: 'adv-ort',
    name: 'Adverbiale Bestimmung des Ortes',
    unit: 'adverbiale-bestimmung',
    baseDifficulty: 2,
  },
  {
    slug: 'adv-zeit',
    name: 'Adverbiale Bestimmung der Zeit',
    unit: 'adverbiale-bestimmung',
    baseDifficulty: 2,
  },
  {
    slug: 'adv-art',
    name: 'Adverbiale Bestimmung der Art & Weise',
    unit: 'adverbiale-bestimmung',
    baseDifficulty: 3,
  },
  {
    slug: 'adv-grund',
    name: 'Adverbiale Bestimmung des Grundes',
    unit: 'adverbiale-bestimmung',
    baseDifficulty: 4,
  },

  // ── Satzglieder: Attribut (4) ──────────────────────────────────────────
  { slug: 'adjektivattribut', name: 'Adjektivattribut', unit: 'attribut', baseDifficulty: 2 },
  {
    slug: 'genitivattribut',
    name: 'Genitivattribut',
    unit: 'attribut',
    baseDifficulty: 4,
    dazPainPoint: 'cases',
  },
  {
    slug: 'praepositionalattribut',
    name: 'Präpositionalattribut',
    unit: 'attribut',
    baseDifficulty: 4,
  },
  {
    slug: 'relativsatz-als-attribut',
    name: 'Relativsatz als Attribut',
    unit: 'attribut',
    baseDifficulty: 4,
  },

  // ── Satzglieder: Umstellproben & Ersatzproben (2) ──────────────────────
  {
    slug: 'umstellprobe',
    name: 'Umstellprobe anwenden',
    unit: 'umstellproben-ersatzproben',
    baseDifficulty: 3,
  },
  {
    slug: 'ersatzprobe',
    name: 'Ersatzprobe anwenden',
    unit: 'umstellproben-ersatzproben',
    baseDifficulty: 3,
  },

  // ── Fälle: Nominativ (2) ───────────────────────────────────────────────
  { slug: 'nominativ-erkennen', name: 'Nominativ erkennen', unit: 'nominativ', baseDifficulty: 2 },
  {
    slug: 'nominativ-als-subjekt',
    name: 'Nominativ als Subjekt',
    unit: 'nominativ',
    baseDifficulty: 2,
  },

  // ── Fälle: Akkusativ (4) ───────────────────────────────────────────────
  {
    slug: 'akkusativ-erkennen',
    name: 'Akkusativ erkennen (wen/was)',
    unit: 'akkusativ',
    baseDifficulty: 3,
    dazPainPoint: 'cases',
  },
  {
    slug: 'akkusativ-als-objekt',
    name: 'Akkusativobjekt bestimmen',
    unit: 'akkusativ',
    baseDifficulty: 3,
    dazPainPoint: 'cases',
  },
  {
    slug: 'akkusativ-feste-praepositionen',
    name: 'Akkusativ nach festen Präpositionen',
    unit: 'akkusativ',
    baseDifficulty: 4,
    dazPainPoint: 'cases',
  },
  {
    slug: 'wechselpraep-richtung',
    name: 'Wechselpräpositionen (Richtung → Akkusativ)',
    unit: 'akkusativ',
    baseDifficulty: 5,
    dazPainPoint: 'cases',
  },

  // ── Fälle: Dativ (5) ───────────────────────────────────────────────────
  {
    slug: 'dativ-erkennen',
    name: 'Dativ erkennen (wem)',
    unit: 'dativ',
    baseDifficulty: 3,
    dazPainPoint: 'cases',
  },
  {
    slug: 'dativ-als-objekt',
    name: 'Dativobjekt bestimmen',
    unit: 'dativ',
    baseDifficulty: 3,
    dazPainPoint: 'cases',
  },
  {
    slug: 'dativ-feste-praepositionen',
    name: 'Dativ nach festen Präpositionen',
    unit: 'dativ',
    baseDifficulty: 4,
    dazPainPoint: 'cases',
  },
  {
    slug: 'wechselpraep-ort',
    name: 'Wechselpräpositionen (Ort → Dativ)',
    unit: 'dativ',
    baseDifficulty: 5,
    dazPainPoint: 'cases',
  },
  {
    slug: 'dativ-verben',
    name: 'Dativ-Verben (helfen, danken …)',
    unit: 'dativ',
    baseDifficulty: 4,
    dazPainPoint: 'cases',
  },

  // ── Fälle: Genitiv (3) ─────────────────────────────────────────────────
  {
    slug: 'genitiv-erkennen',
    name: 'Genitiv erkennen (wessen)',
    unit: 'genitiv',
    baseDifficulty: 4,
    dazPainPoint: 'cases',
  },
  {
    slug: 'genitivattribut-verwenden',
    name: 'Genitivattribut verwenden',
    unit: 'genitiv',
    baseDifficulty: 4,
    dazPainPoint: 'cases',
  },
  {
    slug: 'genitiv-nach-praepositionen',
    name: 'Genitiv nach Präpositionen',
    unit: 'genitiv',
    baseDifficulty: 5,
    dazPainPoint: 'cases',
  },

  // ── Fälle: Deklination komplett (2) ────────────────────────────────────
  {
    slug: 'deklination-artikel-adjektiv-nomen',
    name: 'Artikel + Adjektiv + Nomen flektieren',
    unit: 'deklination-komplett',
    baseDifficulty: 5,
    dazPainPoint: 'cases',
  },
  {
    slug: 'deklination-anwendungen',
    name: 'Deklination in zusammenhängendem Text',
    unit: 'deklination-komplett',
    baseDifficulty: 5,
    dazPainPoint: 'cases',
  },

  // ── Tempora: Präsens (3) ───────────────────────────────────────────────
  { slug: 'praesens-bilden', name: 'Präsens bilden', unit: 'praesens', baseDifficulty: 2 },
  {
    slug: 'praesens-starke-schwache',
    name: 'Starke & schwache Verben',
    unit: 'praesens',
    baseDifficulty: 3,
  },
  {
    slug: 'praesens-unregelmaessig',
    name: 'Unregelmäßige Präsensformen',
    unit: 'praesens',
    baseDifficulty: 4,
  },

  // ── Tempora: Präteritum (3) ────────────────────────────────────────────
  {
    slug: 'praeteritum-bilden',
    name: 'Präteritum bilden',
    unit: 'praeteritum',
    baseDifficulty: 3,
    dazPainPoint: 'tenses',
  },
  {
    slug: 'praeteritum-starke-schwache',
    name: 'Starke vs. schwache Verben',
    unit: 'praeteritum',
    baseDifficulty: 4,
    dazPainPoint: 'tenses',
  },
  {
    slug: 'praeteritum-unregelmaessig',
    name: 'Häufige unregelmäßige Formen',
    unit: 'praeteritum',
    baseDifficulty: 4,
    dazPainPoint: 'tenses',
  },

  // ── Tempora: Perfekt (3) ───────────────────────────────────────────────
  {
    slug: 'perfekt-bilden',
    name: 'Perfekt bilden',
    unit: 'perfekt',
    baseDifficulty: 3,
    dazPainPoint: 'tenses',
  },
  {
    slug: 'perfekt-hilfsverb',
    name: 'Hilfsverb wählen (haben/sein)',
    unit: 'perfekt',
    baseDifficulty: 4,
    dazPainPoint: 'tenses',
  },
  {
    slug: 'partizip-ii',
    name: 'Partizip II bilden',
    unit: 'perfekt',
    baseDifficulty: 4,
    dazPainPoint: 'tenses',
  },

  // ── Tempora: Plusquamperfekt (1) ───────────────────────────────────────
  {
    slug: 'plusquamperfekt-bildung',
    name: 'Plusquamperfekt — Bildung und Verwendung',
    unit: 'plusquamperfekt',
    baseDifficulty: 4,
    dazPainPoint: 'tenses',
  },

  // ── Tempora: Futur (2) ─────────────────────────────────────────────────
  { slug: 'futur-i', name: 'Futur I bilden', unit: 'futur', baseDifficulty: 3 },
  { slug: 'futur-ii', name: 'Futur II (Grundzüge)', unit: 'futur', baseDifficulty: 4 },

  // ── Tempora: Modus (4) ─────────────────────────────────────────────────
  { slug: 'indikativ-vs-imperativ', name: 'Indikativ vs. Imperativ', unit: 'modus', baseDifficulty: 2 },
  { slug: 'konjunktiv-i', name: 'Konjunktiv I (indirekte Rede)', unit: 'modus', baseDifficulty: 4 },
  { slug: 'konjunktiv-ii', name: 'Konjunktiv II (Irrealis)', unit: 'modus', baseDifficulty: 5 },
  { slug: 'modus-kontexte', name: 'Modus im Kontext wählen', unit: 'modus', baseDifficulty: 4 },

  // ── Tempora: Aktiv / Passiv (2) ────────────────────────────────────────
  { slug: 'passiv-erkennen', name: 'Passiv erkennen', unit: 'aktiv-passiv', baseDifficulty: 3 },
  {
    slug: 'passiv-bilden',
    name: 'Passiv bilden (Vorgangspassiv)',
    unit: 'aktiv-passiv',
    baseDifficulty: 4,
  },

  // ── Satzarten & Satzbau: Satzarten (2) ─────────────────────────────────
  {
    slug: 'satzarten-grundtypen',
    name: 'Aussage-, Frage-, Aufforderungssatz',
    unit: 'satzarten',
    baseDifficulty: 2,
  },
  { slug: 'ausrufesatz', name: 'Ausrufesatz', unit: 'satzarten', baseDifficulty: 2 },

  // ── Satzarten & Satzbau: Hauptsatz / Nebensatz (3) ─────────────────────
  {
    slug: 'hauptsatz-erkennen',
    name: 'Hauptsatz erkennen',
    unit: 'hauptsatz-nebensatz',
    baseDifficulty: 3,
    dazPainPoint: 'word_order',
  },
  {
    slug: 'nebensatz-erkennen',
    name: 'Nebensatz erkennen',
    unit: 'hauptsatz-nebensatz',
    baseDifficulty: 3,
    dazPainPoint: 'word_order',
  },
  {
    slug: 'verbstellung-v2-vletzt',
    name: 'Verbstellung (V2 / V-letzt)',
    unit: 'hauptsatz-nebensatz',
    baseDifficulty: 4,
    dazPainPoint: 'word_order',
  },

  // ── Satzarten & Satzbau: Satzverbindung (5) ────────────────────────────
  {
    slug: 'satzreihe-parataxe',
    name: 'Satzreihe (Parataxe)',
    unit: 'satzverbindung',
    baseDifficulty: 3,
  },
  {
    slug: 'satzgefuege-hypotaxe',
    name: 'Satzgefüge (Hypotaxe)',
    unit: 'satzverbindung',
    baseDifficulty: 4,
  },
  {
    slug: 'konjunktionalsaetze',
    name: 'Konjunktionalsätze',
    unit: 'satzverbindung',
    baseDifficulty: 4,
  },
  {
    slug: 'relativsaetze',
    name: 'Relativsätze',
    unit: 'satzverbindung',
    baseDifficulty: 4,
  },
  {
    slug: 'indirekte-fragesaetze',
    name: 'Indirekte Fragesätze',
    unit: 'satzverbindung',
    baseDifficulty: 4,
  },

  // ── Satzarten & Satzbau: Direkte / indirekte Rede (2) ──────────────────
  {
    slug: 'zeichensetzung-direkte-rede',
    name: 'Zeichensetzung direkter Rede',
    unit: 'direkte-indirekte-rede',
    baseDifficulty: 3,
  },
  {
    slug: 'umwandlung-direkt-indirekt',
    name: 'Direkte → indirekte Rede umwandeln',
    unit: 'direkte-indirekte-rede',
    baseDifficulty: 5,
  },

  // ── Rechtschreibung: Groß-/Kleinschreibung (4) ─────────────────────────
  {
    slug: 'gk-nomen-nominalisierungen',
    name: 'Nomen & Nominalisierungen',
    unit: 'gross-kleinschreibung',
    baseDifficulty: 3,
  },
  {
    slug: 'gk-satzanfaenge',
    name: 'Satzanfänge',
    unit: 'gross-kleinschreibung',
    baseDifficulty: 1,
  },
  {
    slug: 'gk-eigennamen',
    name: 'Eigennamen',
    unit: 'gross-kleinschreibung',
    baseDifficulty: 2,
  },
  {
    slug: 'gk-anredepronomen',
    name: 'Anredepronomen',
    unit: 'gross-kleinschreibung',
    baseDifficulty: 3,
  },

  // ── Rechtschreibung: Doppelkonsonanten & Schärfung (3) ─────────────────
  {
    slug: 'doppel-kurze-vokale',
    name: 'Kurze Vokale erkennen',
    unit: 'doppelkonsonanten-schaerfung',
    baseDifficulty: 2,
  },
  {
    slug: 'doppelkonsonanten-regel',
    name: 'Doppelkonsonanten-Regel',
    unit: 'doppelkonsonanten-schaerfung',
    baseDifficulty: 3,
  },
  {
    slug: 'doppel-ausnahmen',
    name: 'Ausnahmen',
    unit: 'doppelkonsonanten-schaerfung',
    baseDifficulty: 4,
  },

  // ── Rechtschreibung: Dehnung (3) ───────────────────────────────────────
  { slug: 'dehnungs-h', name: 'Dehnungs-h', unit: 'dehnung', baseDifficulty: 3 },
  { slug: 'doppelvokal', name: 'Doppelvokal (aa/ee/oo)', unit: 'dehnung', baseDifficulty: 2 },
  { slug: 'ie-regel', name: 'ie-Regel', unit: 'dehnung', baseDifficulty: 2 },

  // ── Rechtschreibung: s-Laute (2) ───────────────────────────────────────
  { slug: 's-ss-scharf', name: 's / ss / ß', unit: 's-laute', baseDifficulty: 3 },
  {
    slug: 's-ch-hinweis',
    name: 'CH-Besonderheit: kein ß',
    unit: 's-laute',
    baseDifficulty: 1,
  },

  // ── Rechtschreibung: das / dass (2) ────────────────────────────────────
  {
    slug: 'das-artikel-pronomen',
    name: 'das als Artikel/Pronomen',
    unit: 'das-dass',
    baseDifficulty: 3,
  },
  {
    slug: 'dass-konjunktion',
    name: 'dass als Konjunktion',
    unit: 'das-dass',
    baseDifficulty: 3,
  },

  // ── Rechtschreibung: Homophone (5) ─────────────────────────────────────
  { slug: 'hom-seid-seit', name: 'seid / seit', unit: 'homophone', baseDifficulty: 3 },
  { slug: 'hom-wider-wieder', name: 'wider / wieder', unit: 'homophone', baseDifficulty: 4 },
  { slug: 'hom-tod-tot', name: 'Tod / tot', unit: 'homophone', baseDifficulty: 3 },
  { slug: 'hom-mahl-mal', name: 'Mahl / mal', unit: 'homophone', baseDifficulty: 3 },
  { slug: 'hom-weiter-paare', name: 'Weitere Homophonpaare', unit: 'homophone', baseDifficulty: 4 },

  // ── Rechtschreibung: Zeichensetzung (5) ────────────────────────────────
  {
    slug: 'komma-aufzaehlung',
    name: 'Komma bei Aufzählung',
    unit: 'zeichensetzung',
    baseDifficulty: 2,
  },
  {
    slug: 'komma-nebensaetze',
    name: 'Komma bei Nebensätzen',
    unit: 'zeichensetzung',
    baseDifficulty: 4,
  },
  {
    slug: 'komma-woertliche-rede',
    name: 'Komma bei wörtlicher Rede',
    unit: 'zeichensetzung',
    baseDifficulty: 3,
  },
  {
    slug: 'komma-infinitiv-mit-zu',
    name: 'Komma bei Infinitiv mit zu',
    unit: 'zeichensetzung',
    baseDifficulty: 4,
  },
  {
    slug: 'gedankenstrich-doppelpunkt',
    name: 'Gedankenstrich & Doppelpunkt',
    unit: 'zeichensetzung',
    baseDifficulty: 3,
  },

  // ── Rechtschreibung: Fremdwörter (2) ───────────────────────────────────
  {
    slug: 'fw-grundmuster',
    name: 'Grundmuster (ph, rh, th)',
    unit: 'fremdwoerter',
    baseDifficulty: 3,
  },
  {
    slug: 'fw-haeufige',
    name: 'Häufige Fremdwörter',
    unit: 'fremdwoerter',
    baseDifficulty: 3,
  },

  // ── Rechtschreibung: Silbentrennung (1) ────────────────────────────────
  {
    slug: 'silbentrennung-grundregeln',
    name: 'Silbentrennung — Grundregeln',
    unit: 'silbentrennung',
    baseDifficulty: 2,
  },

  // ── Wortschatz: Wortbildung (4) ────────────────────────────────────────
  { slug: 'komposita', name: 'Komposita', unit: 'wortbildung', baseDifficulty: 2 },
  { slug: 'praefixe', name: 'Präfixe', unit: 'wortbildung', baseDifficulty: 3 },
  { slug: 'suffixe', name: 'Suffixe', unit: 'wortbildung', baseDifficulty: 3 },
  { slug: 'ableitungen', name: 'Ableitungen', unit: 'wortbildung', baseDifficulty: 3 },

  // ── Wortschatz: Wortfelder (4) ─────────────────────────────────────────
  { slug: 'synonyme', name: 'Synonyme', unit: 'wortfelder', baseDifficulty: 2 },
  { slug: 'antonyme', name: 'Antonyme', unit: 'wortfelder', baseDifficulty: 2 },
  { slug: 'oberbegriffe', name: 'Oberbegriffe', unit: 'wortfelder', baseDifficulty: 3 },
  { slug: 'unterbegriffe', name: 'Unterbegriffe', unit: 'wortfelder', baseDifficulty: 3 },

  // ── Wortschatz: Redewendungen & Metaphern (3) ──────────────────────────
  {
    slug: 'redewendungen-haeufig',
    name: 'Häufige Redewendungen',
    unit: 'redewendungen-metaphern',
    baseDifficulty: 3,
  },
  {
    slug: 'sprichwoerter',
    name: 'Sprichwörter',
    unit: 'redewendungen-metaphern',
    baseDifficulty: 3,
  },
  {
    slug: 'bildliche-sprache',
    name: 'Bildliche Sprache',
    unit: 'redewendungen-metaphern',
    baseDifficulty: 4,
  },

  // ── Wortschatz: Stilebenen (2) ─────────────────────────────────────────
  {
    slug: 'umgangs-vs-standard',
    name: 'Umgangssprache vs. Standardsprache',
    unit: 'stilebenen',
    baseDifficulty: 3,
  },
  {
    slug: 'register-erkennen',
    name: 'Register erkennen',
    unit: 'stilebenen',
    baseDifficulty: 4,
  },

  // ── Wortschatz: Homonyme & Polysemie (2) ───────────────────────────────
  {
    slug: 'homonyme-mehrdeutig',
    name: 'Wörter mit mehreren Bedeutungen',
    unit: 'homonyme-polysemie',
    baseDifficulty: 3,
  },
  {
    slug: 'kontext-bedeutung',
    name: 'Bedeutung aus Kontext',
    unit: 'homonyme-polysemie',
    baseDifficulty: 3,
  },

  // ── Wortschatz: Fremdwörter im Kontext (1) ─────────────────────────────
  {
    slug: 'fw-bedeutung-aus-kontext',
    name: 'Bedeutung aus Kontext erschließen',
    unit: 'fremdwoerter-im-kontext',
    baseDifficulty: 4,
  },
]

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------

async function findBySlug(
  payload: Payload,
  collection: 'domains' | 'modules' | 'units' | 'concepts',
  slug: string,
) {
  const r = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  return r.docs[0] ?? null
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  seed-curriculum — modules · units · concepts        ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  dry-run : ${dryRun}`)

  console.log('\n→ connecting to Payload…')
  const payload = await getPayload({ config })

  const stats = {
    modules: { created: 0, existed: 0 },
    units: { created: 0, existed: 0 },
    concepts: { created: 0, existed: 0, skipped: 0 },
  }

  // ── Modules ───────────────────────────────────────────────────────────
  const moduleIdBySlug: Record<string, number | string> = {}
  // Pre-populate with existing modules so unit lookups don't fail.
  const existingModules = await payload.find({
    collection: 'modules',
    pagination: false,
    depth: 0,
  })
  for (const m of existingModules.docs) {
    moduleIdBySlug[m.slug as string] = m.id
  }

  for (const def of MODULES) {
    const existing = await findBySlug(payload, 'modules', def.slug)
    if (existing) {
      moduleIdBySlug[def.slug] = existing.id
      stats.modules.existed++
      continue
    }
    const domain = await findBySlug(payload, 'domains', def.domain)
    if (!domain) {
      console.warn(`  ⚠ module "${def.slug}" — domain "${def.domain}" not found, skipping`)
      continue
    }
    if (dryRun) {
      stats.modules.created++
      console.log(`  + module ${def.slug} (dry-run)`)
      continue
    }
    const created = await payload.create({
      collection: 'modules',
      data: {
        slug: def.slug,
        name: def.name,
        description: def.description ?? undefined,
        domain: domain.id as number,
        displayOrder: stats.modules.created + stats.modules.existed + 1,
      },
    })
    moduleIdBySlug[def.slug] = created.id
    stats.modules.created++
    console.log(`  + module ${def.slug}`)
  }

  // ── Units ─────────────────────────────────────────────────────────────
  const unitIdBySlug: Record<string, number | string> = {}
  const existingUnits = await payload.find({
    collection: 'units',
    pagination: false,
    depth: 0,
  })
  for (const u of existingUnits.docs) {
    unitIdBySlug[u.slug as string] = u.id
  }

  for (const def of UNITS) {
    if (unitIdBySlug[def.slug]) {
      stats.units.existed++
      continue
    }
    const moduleId = moduleIdBySlug[def.module]
    if (!moduleId) {
      console.warn(`  ⚠ unit "${def.slug}" — module "${def.module}" not found, skipping`)
      continue
    }
    if (dryRun) {
      stats.units.created++
      console.log(`  + unit ${def.slug} → ${def.module} (dry-run)`)
      continue
    }
    const created = await payload.create({
      collection: 'units',
      data: {
        slug: def.slug,
        name: def.name,
        description: def.description ?? undefined,
        module: moduleId as number,
        displayOrder: stats.units.created + stats.units.existed + 1,
      },
    })
    unitIdBySlug[def.slug] = created.id
    stats.units.created++
    console.log(`  + unit ${def.slug} → ${def.module}`)
  }

  // ── Concepts ──────────────────────────────────────────────────────────
  const existingConcepts = await payload.find({
    collection: 'concepts',
    pagination: false,
    depth: 0,
  })
  const existingConceptSlugs = new Set<string>()
  for (const c of existingConcepts.docs) existingConceptSlugs.add(c.slug as string)

  for (const def of CONCEPTS) {
    if (existingConceptSlugs.has(def.slug)) {
      stats.concepts.existed++
      continue
    }
    const unitId = unitIdBySlug[def.unit]
    if (!unitId) {
      stats.concepts.skipped++
      console.warn(`  ⚠ concept "${def.slug}" — unit "${def.unit}" not found, skipping`)
      continue
    }
    if (dryRun) {
      stats.concepts.created++
      console.log(`  + concept ${def.slug} → ${def.unit} (dry-run)`)
      continue
    }
    await payload.create({
      collection: 'concepts',
      data: {
        slug: def.slug,
        name: def.name,
        description: def.description ?? undefined,
        unit: unitId as number,
        baseDifficulty: def.baseDifficulty ?? 3,
        targetAttempts: def.targetAttempts ?? 45,
        dazPainPoint: def.dazPainPoint ?? undefined,
        displayOrder: stats.concepts.created + stats.concepts.existed + 1,
      },
    })
    stats.concepts.created++
  }

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║  Summary                                             ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(
    `  modules  : +${stats.modules.created} created, ${stats.modules.existed} existed`,
  )
  console.log(`  units    : +${stats.units.created} created, ${stats.units.existed} existed`)
  console.log(
    `  concepts : +${stats.concepts.created} created, ${stats.concepts.existed} existed, ${stats.concepts.skipped} skipped`,
  )
  if (dryRun) console.log('\n  (dry-run — no writes)')

  process.exit(0)
}

main().catch((err) => {
  console.error('\n✗ seed failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})

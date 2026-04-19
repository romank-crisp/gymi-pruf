-- Content Engine schema
-- PostgreSQL 15+
-- Run: psql -d gymi -f 001_content_schema.sql

-- ============================================================
-- CURRICULUM HIERARCHY
-- Domain → Module → Section → Unit → Concept
-- ============================================================

-- Domain: top exam strand (5 total)
-- Sprachbetrachtung, Rechtschreibung, Wortschatz, Textverständnis, Aufsatz
create table domains (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  exam_strand text not null check (exam_strand in ('assessed', 'supporting')),
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Module: coherent topic within a domain (~15 total)
-- e.g. Wortarten, Satzglieder, Fälle, Tempora & Modus
create table modules (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references domains(id),
  slug text unique not null,
  name text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Section: thematic grouping within a module
-- e.g. within Wortarten: "Kernwortarten" (Nomen, Verb, Adjektiv),
--   "Begleiter & Stellvertreter" (Artikel, Pronomen),
--   "Verbindungen & Rest" (Präposition, Konjunktion, Adverb, Zahlwort)
-- Sections are an admin/navigation concept — the learner sees them
-- as chapter groupings on the skill map, not as formal labels.
create table sections (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id),
  slug text unique not null,
  name text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unit: one part-of-speech or narrow skill area (~60 total)
-- e.g. Nomen, Verb, Adjektiv
create table units (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id),
  slug text unique not null,
  name text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Concept: atomic skill — the mastery unit (~160 total)
-- e.g. "Genus bestimmen", "Nomen erkennen"
create table concepts (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id),
  slug text unique not null,
  name text not null,
  description text,
  daz_pain_point text check (daz_pain_point in ('gender', 'cases', 'tenses', 'word_order', 'separable_verbs')),
  base_difficulty int not null default 3 check (base_difficulty between 1 and 5),
  target_attempts int not null default 50,     -- total attempts to mastery (intro+practice+review+checkpoint)
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prerequisite graph between concepts
create table concept_prerequisites (
  concept_id uuid not null references concepts(id),
  prerequisite_id uuid not null references concepts(id),
  strength text not null default 'hard' check (strength in ('hard', 'soft')),
  primary key (concept_id, prerequisite_id),
  check (concept_id != prerequisite_id)
);


-- ============================================================
-- THEORY CONTENT
-- One or more theory blocks per concept, per L1, per format
-- ============================================================

create type content_status as enum ('draft', 'in_review', 'approved', 'active', 'flagged', 'retired');
create type l1_code as enum ('de', 'en', 'uk', 'ru', 'it', 'pt');
create type theory_format as enum ('conversational', 'interactive_diagram', 'mini_game', 'video', 'passage', 'worked_example');

create table theory_blocks (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id),
  format theory_format not null default 'conversational',
  l1 l1_code not null default 'de',
  title text not null,
  content jsonb not null,          -- format-specific payload (see below)
  status content_status not null default 'draft',
  version int not null default 1,
  supersedes_id uuid references theory_blocks(id),
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (concept_id, format, l1, version)
);

-- content jsonb for format='conversational':
-- {
--   "bubbles": [
--     {"role": "leo", "text": "Schau: Der Hund bellt.", "expects_reply": false},
--     {"role": "leo", "text": "Wer bellt?", "expects_reply": true},
--     {"role": "leo", "text": "Genau — das ist der Nominativ.", "action": "offer_practice"}
--   ]
-- }
--
-- for format='mini_game':
-- {
--   "game_type": "sort_to_bucket",
--   "buckets": ["Nomen", "Verb", "Adjektiv"],
--   "items": [{"text": "laufen", "correct": "Verb"}],
--   "time_limit_sec": 60
-- }
--
-- for format='interactive_diagram':
-- {
--   "svg_ref": "diagrams/satzglieder-tree.svg",
--   "regions": [{"id": "subj", "label": "Subjekt", "leo_text": "Wer tut etwas?"}],
--   "interaction": "tap_to_reveal"
-- }


-- ============================================================
-- EXERCISE STRUCTURE
-- Concept → Exercise Group → Exercise Template
-- ============================================================

-- Exercise group: a bundle of exercises within a concept,
-- organized by learning phase and purpose.
-- e.g. "Genus bestimmen — Einführung" (intro, easy, guided)
--      "Genus bestimmen — Übung" (practice, adaptive)
--      "Genus bestimmen — Wiederholung" (spaced review)
--      "Genus bestimmen — Prüfung" (checkpoint)
create table exercise_groups (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id),
  slug text not null,
  name text not null,
  phase text not null check (phase in ('intro', 'practice', 'review', 'checkpoint')),
  target_items int not null default 10,           -- how many items in this group to reach phase goal
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (concept_id, slug)
);

create type exercise_format as enum (
  'multiple_choice', 'multi_select', 'fill_blank', 'tap_text',
  'drag_order', 'drag_sort', 'matching_pairs',
  'voice_answer', 'free_text_short', 'dictation',
  'passage_comprehension', 'essay_writing',
  'game_wordhunt', 'game_speedcat', 'conversational_exchange'
);

create type cognitive_type as enum (
  'recognition', 'classification', 'generation', 'transformation', 'application'
);

create type generation_mode as enum ('static', 'hybrid', 'ai_native');

create table exercise_templates (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references exercise_groups(id),
  format exercise_format not null,
  cognitive_type cognitive_type not null,
  difficulty int not null default 3 check (difficulty between 1 and 5),
  prompt_pattern text not null,                   -- "Welches Genus hat '{NOUN}'?"
  answer_spec jsonb not null,                     -- correct answer definition
  slot_definitions jsonb,                         -- [{slot_name, pool_slug, tier_min, tier_max}]
  generation_mode generation_mode not null default 'static',
  ai_prompt text,                                 -- used when generation_mode != 'static'
  hint_ladder jsonb,                              -- ["highlight relevant word", "Achte auf den Artikel", "Die Antwort ist..."]
  feedback_correct text,
  feedback_partial text,
  feedback_wrong text,
  feedback_walkthrough text,
  tags text[] default '{}',
  status content_status not null default 'draft',
  version int not null default 1,
  supersedes_id uuid references exercise_templates(id),
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- SLOT POOLS — curated variable content for templates
-- ============================================================

create table slot_pools (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  content_type text not null,                     -- 'noun', 'verb', 'adjective', 'sentence', 'passage'
  created_at timestamptz not null default now()
);

create table slot_items (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references slot_pools(id),
  value text not null,
  metadata jsonb not null default '{}',           -- e.g. {"genus":"m","plural":"Tische","frequency":2}
  difficulty_tier int not null default 1 check (difficulty_tier between 1 and 5),
  active boolean not null default true,
  created_at timestamptz not null default now()
);


-- ============================================================
-- L1 VARIANTS — per-language explanations for theory + feedback
-- ============================================================

create table l1_variants (
  id uuid primary key default gen_random_uuid(),
  parent_type text not null check (parent_type in ('theory_block', 'exercise_template', 'concept_card')),
  parent_id uuid not null,
  l1 l1_code not null,
  content jsonb not null,                         -- structure mirrors parent type
  status content_status not null default 'draft',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_type, parent_id, l1)
);


-- ============================================================
-- CONCEPT CARDS — grounding material for Frag Leo (RAG)
-- ============================================================

create table concept_cards (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id),
  l1 l1_code not null default 'de',
  definition text not null,
  examples jsonb not null default '[]',           -- ["Der Hund bellt — Hund ist Nominativ"]
  common_confusions text,
  cross_references uuid[] default '{}',           -- concept IDs of related concepts
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (concept_id, l1)
);


-- ============================================================
-- INDEXES for the queries that matter
-- ============================================================

create index idx_modules_domain on modules(domain_id);
create index idx_sections_module on sections(module_id);
create index idx_units_section on units(section_id);
create index idx_concepts_unit on concepts(unit_id);
create index idx_theory_concept on theory_blocks(concept_id, l1, status);
create index idx_groups_concept on exercise_groups(concept_id, phase);
create index idx_templates_group on exercise_templates(group_id, status);
create index idx_slot_items_pool on slot_items(pool_id, active, difficulty_tier);
create index idx_l1_parent on l1_variants(parent_type, parent_id, l1);
create index idx_concept_cards on concept_cards(concept_id, l1);


-- ============================================================
-- SEED: Wortarten module (first module to build)
-- Just the hierarchy — no exercises yet, those come per-concept
-- ============================================================

insert into domains (slug, name, exam_strand, display_order) values
  ('sprachbetrachtung', 'Sprachbetrachtung', 'assessed', 1),
  ('rechtschreibung', 'Rechtschreibung', 'supporting', 2),
  ('wortschatz', 'Wortschatz', 'supporting', 3),
  ('textverstaendnis', 'Textverständnis', 'assessed', 4),
  ('aufsatz', 'Aufsatz', 'assessed', 5);

-- Wortarten module under Sprachbetrachtung
insert into modules (domain_id, slug, name, description, display_order)
  select id, 'wortarten', 'Wortarten', 'Die zehn Wortarten erkennen, bestimmen und anwenden', 1
  from domains where slug = 'sprachbetrachtung';

-- Three sections within Wortarten
insert into sections (module_id, slug, name, description, display_order) values
  ((select id from modules where slug='wortarten'), 'kernwortarten', 'Kernwortarten', 'Nomen, Verb, Adjektiv — die drei tragenden Wortarten', 1),
  ((select id from modules where slug='wortarten'), 'begleiter-stellvertreter', 'Begleiter & Stellvertreter', 'Artikel und Pronomen', 2),
  ((select id from modules where slug='wortarten'), 'verbindungen-rest', 'Verbindungen & Rest', 'Präposition, Konjunktion, Adverb, Zahlwort, Interjektion', 3);

-- Units within section "Kernwortarten"
insert into units (section_id, slug, name, display_order) values
  ((select id from sections where slug='kernwortarten'), 'nomen', 'Nomen', 1),
  ((select id from sections where slug='kernwortarten'), 'verb', 'Verb', 2),
  ((select id from sections where slug='kernwortarten'), 'adjektiv', 'Adjektiv', 3);

-- Units within section "Begleiter & Stellvertreter"
insert into units (section_id, slug, name, display_order) values
  ((select id from sections where slug='begleiter-stellvertreter'), 'artikel', 'Artikel', 1),
  ((select id from sections where slug='begleiter-stellvertreter'), 'pronomen', 'Pronomen', 2);

-- Units within section "Verbindungen & Rest"
insert into units (section_id, slug, name, display_order) values
  ((select id from sections where slug='verbindungen-rest'), 'praeposition', 'Präposition', 1),
  ((select id from sections where slug='verbindungen-rest'), 'konjunktion', 'Konjunktion', 2),
  ((select id from sections where slug='verbindungen-rest'), 'adverb', 'Adverb', 3),
  ((select id from sections where slug='verbindungen-rest'), 'zahlwort-interjektion', 'Zahlwort & Interjektion', 4);

-- Concepts under Nomen (5 concepts from learning-program.md)
insert into concepts (unit_id, slug, name, description, daz_pain_point, base_difficulty, target_attempts, display_order) values
  ((select id from units where slug='nomen'), 'nomen-erkennen', 'Nomen erkennen', 'Nomen in einem Satz finden und von anderen Wortarten unterscheiden', null, 1, 45, 1),
  ((select id from units where slug='nomen'), 'genus-bestimmen', 'Genus bestimmen', 'Den richtigen Artikel (der/die/das) zuordnen', 'gender', 3, 55, 2),
  ((select id from units where slug='nomen'), 'numerus', 'Numerus (Singular/Plural)', 'Singular- und Pluralformen bilden und erkennen', null, 2, 45, 3),
  ((select id from units where slug='nomen'), 'nomen-deklination', 'Deklination Grundzüge', 'Nomen in verschiedenen Fällen erkennen', 'cases', 4, 55, 4),
  ((select id from units where slug='nomen'), 'nomen-komposita', 'Zusammengesetzte Nomen', 'Komposita bilden und zerlegen, Genus bestimmen', null, 2, 40, 5);

-- Exercise groups for "Genus bestimmen" (one concept, four phases)
insert into exercise_groups (concept_id, slug, name, phase, target_items, display_order) values
  ((select id from concepts where slug='genus-bestimmen'), 'genus-intro', 'Einführung', 'intro', 8, 1),
  ((select id from concepts where slug='genus-bestimmen'), 'genus-practice', 'Übung', 'practice', 25, 2),
  ((select id from concepts where slug='genus-bestimmen'), 'genus-review', 'Wiederholung', 'review', 12, 3),
  ((select id from concepts where slug='genus-bestimmen'), 'genus-checkpoint', 'Prüfung', 'checkpoint', 10, 4);

-- Example slot pool: common German nouns with genus
insert into slot_pools (slug, name, description, content_type) values
  ('nouns-common-gendered', 'Häufige Nomen mit Genus', '500 häufige deutsche Nomen mit korrektem Genus und Plural', 'noun');

-- A few slot items to demonstrate
insert into slot_items (pool_id, value, metadata, difficulty_tier) values
  ((select id from slot_pools where slug='nouns-common-gendered'), 'Tisch', '{"genus":"m","plural":"Tische","artikel":"der"}', 1),
  ((select id from slot_pools where slug='nouns-common-gendered'), 'Lampe', '{"genus":"f","plural":"Lampen","artikel":"die"}', 1),
  ((select id from slot_pools where slug='nouns-common-gendered'), 'Buch', '{"genus":"n","plural":"Bücher","artikel":"das"}', 1),
  ((select id from slot_pools where slug='nouns-common-gendered'), 'Ergebnis', '{"genus":"n","plural":"Ergebnisse","artikel":"das"}', 3),
  ((select id from slot_pools where slug='nouns-common-gendered'), 'Verständnis', '{"genus":"n","plural":"—","artikel":"das"}', 4);

-- Example exercise template: multiple choice genus
insert into exercise_templates (group_id, format, cognitive_type, difficulty, prompt_pattern, answer_spec, slot_definitions, generation_mode, hint_ladder, feedback_correct, feedback_wrong, status) values
  (
    (select id from exercise_groups where slug='genus-intro'),
    'multiple_choice',
    'recognition',
    1,
    'Welcher Artikel passt? ___ {NOUN}',
    '{"correct_slot": "NOUN.metadata.artikel", "options": ["der", "die", "das"]}',
    '[{"slot_name": "NOUN", "pool_slug": "nouns-common-gendered", "tier_min": 1, "tier_max": 2}]',
    'static',
    '["Sprich das Wort laut — klingt es wie der, die oder das?", "Tipp: Viele Wörter auf -e sind weiblich (die)."]',
    'Genau, {NOUN.metadata.artikel} {NOUN} — richtig erkannt.',
    'Nicht ganz. Es heißt {NOUN.metadata.artikel} {NOUN}.',
    'active'
  );

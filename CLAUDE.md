# Gymi-Vorbereitung — Project Context for Claude Code

This file is read automatically at the start of every Claude Code session. It gives you the context you need to work on this project effectively. The full project documentation lives in `docs/project-documentation.md` — read it when you need detail beyond this summary.

## What this project is

A mobile self-learning app that prepares children (ages 10–12) in German-speaking Switzerland for the **Gymnasium entrance exam** (*Aufnahmeprüfung*), specifically the 6th-grade exam for entry into the Langgymnasium. The primary audience is **bilingual children** — fluent speakers of German who are immersed in Schweizerdeutsch but lack the academic Hochdeutsch register the exam demands. The parent pays, monitors progress, and prints worksheets; the child learns.

Phase 1 is German content, Zurich canton, 6th-grade exam. Later phases add other cantons, the 9th-grade exam, and math.

## Business model

Freemium. Free tier has generous access to grammar drills and basic features; paid yearly tier unlocks writing scaffolding, full reading library, mock exams, and the full parent dashboard. Mock exams are always paid — they are the highest-value content.

## Roles in the system

Three roles in v1:

- **Admin** — project owner. Runs generation pipelines, manages everything.
- **Reviewer** — a primary school teacher who reviews AI-generated content through a queue (approve / edit / reject). Part-time, retainer-based.
- **Family** — one household account containing a parent profile and one or more student profiles sharing the subscription.

Future roles (tutor, school) are planned but not built. Permissions should be modeled as relationships between users and scopes, not as flat role properties, so these can be added later without schema changes.

## How content works

Content is **AI-generated and teacher-reviewed**. The pipeline has five stages:

1. **Prompt template** — format-specific, topic-specific, constrained output structure (JSON). Maintained by admin, not teacher.
2. **Generation** — AI fills the template, typically in batches of 50–100.
3. **Auto-validation** — programmatic checks for structure, answer key consistency, sentence length, red flags. Failures never reach the teacher.
4. **Optional self-critique** — a second AI pass against a checklist.
5. **Teacher review** — approve, edit-and-approve, or reject with reason. Only items that pass stages 3–4 reach this stage.

Content lifecycle: **Generated → Published → Rejected / Retired**. Published items collect real-world performance data; items whose actual difficulty diverges from their tag get flagged for re-review.

## The unified exercise template

Every exercise in the app conforms to this structure:

1. **Title** — one line.
2. **Intro** (dismissible after first view in a session): what you'll do, why it matters, worked example.
3. **Task** — one of 11 formats, 5–12 items, immediate feedback per item, XP per correct answer, progress bar, combo recognition.
4. **End summary** — score, XP, badges, one-line recap, error explanations, next-action suggestion.
5. **Metadata** — topic, subtopic, difficulty (1–5), format, canton applicability, exam-relevance weight (1–3), estimated time, lifecycle state, prompt/reviewer provenance, performance data.

## The five learning principles

Every exercise must satisfy all five:

1. **Clear framing** — explanation of task and goal before the kid does anything.
2. **Interactive engagement** — active formats dominate; immediate per-item feedback; optional "why" explanations.
3. **Gamification** — invisible within an exercise, visible across a week. XP, streaks, per-topic levels, milestone celebrations. Parents can disable streaks.
4. **Variety of formats** — 11 formats in the library; never same format twice in a row within a session.
5. **Simplified Hochdeutsch** — 8–15 word sentences in instructions, no Swiss German, no Anglicisms, warm *du* address, consistent terminology (e.g. always "Nomen", never switching to "Substantiv").

## The 11 exercise formats

1. Tap-to-tag (grammar analysis, dominant for Sprachbetrachtung)
2. Multiple choice (minority use, quick checks)
3. Multi-select
4. Fill in the blank (dominant for Orthography and Kasus)
5. Drag and drop (matching, ordering, sorting)
6. Sentence building
7. Audio-based
8. Image-based
9. Error spotting
10. Transformation
11. Writing (printable worksheet + parent photo review) — the only non-auto-graded format

## Content structure — German v1 totals

| Section | Drill exercises | Other content |
|---|---|---|
| Sprachbetrachtung (Wortarten, Satzglieder, Kasus) | ~910 | — |
| Aufsatz (writing) | ~275 micro-skills | ~25 scaffolding docs + ~110 prompts |
| Textverständnis (reading) | ~175 + ~450 text questions | ~75 reading texts |
| Rechtschreibung (orthography) | ~210 | — |
| Assessment | (reuses pool) | 5 diagnostics + 12 topic checks + 6–8 mock exams |
| **Total** | **~2,020 exercises** | **~210 long-form items** |

Sprachbetrachtung is taught in strict order: **Wortarten → Satzglieder → Kasus**, each building on the previous. Kasus is where bilingual kids struggle most, especially Akkusativ vs Dativ after two-way prepositions (*Wechselpräpositionen*).

See `docs/project-documentation.md` for full subtopic breakdowns.

## Tech stack (decided)

- **CMS / Content backend**: Payload (TypeScript-native, self-hosted, owns its data model, good admin UI out of the box, exposes REST + GraphQL).
- **Database**: Postgres (via Cloud SQL in production).
- **Hosting**: Google Cloud Run for the Payload server, Cloud SQL for Postgres, Cloud Storage for media.
- **AI generation**: Anthropic API (Claude) called from scripts that write into Payload with lifecycle state = `generated`.
- **Mobile app**: Not yet scoped. Will consume the Payload API. Decision on React Native vs native vs other deferred until the content system is running.

## Current phase of work

**Building the content authoring system and AI generation pipeline.**

The mobile app comes later. The content engine comes first because the app is worthless without content, and content takes the longest to produce well.

## The 4-week build plan we're following

- **Week 1 — Infrastructure.** Scaffold Payload locally. Define the exercise collection with all metadata fields. Define users and three roles. Get the admin UI running on `localhost:3000` with a manually created test exercise.
- **Week 2 — Lifecycle and review workflow.** Add the state machine (Generated → Published → Rejected → Retired). Build a custom admin view for the reviewer queue — one exercise at a time with approve / edit / reject actions.
- **Week 3 — Generation pipeline.** First Wortarten prompt template. A script that calls the Anthropic API, generates 20 exercises, runs auto-validation, inserts valid items into Payload as `generated`. This is the moment of truth — if the content is good, the project works.
- **Week 4 — Deploy to Google Cloud.** Containerize, deploy Payload to Cloud Run, provision Cloud SQL, get a real admin URL a teacher can log into.

After week 4: scale content production, start recruiting the first teacher reviewer, begin the next topics (Satzglieder, then Orthography, then Kasus).

## Working style for Claude Code sessions

- **Short iterative loops.** Ask for one concrete thing, verify it works, commit, move on. Don't try to build everything at once.
- **Commit often.** Git commits after every working change. Descriptive messages.
- **Test as you go.** For anything non-trivial (the state machine, the generation pipeline, validation logic), write a small test or at least verify manually before moving on.
- **Prefer boring choices.** Standard Payload patterns, standard Postgres, standard Cloud Run. We're not here to be clever; we're here to build a content engine that works.
- **Ask before large decisions.** If a task requires picking between meaningfully different approaches (e.g. authentication strategy, deployment architecture), surface the trade-off and let me choose rather than picking silently.
- **Read `docs/project-documentation.md`** when you need detail this file doesn't cover — especially for content structure, section breakdowns, or the five learning principles in full.

## What NOT to do yet

- No mobile app code. Not now.
- No marketing site. Not now.
- No payment integration. Not now.
- No multi-language parent dashboard. German and English strings are fine for v1.
- No math content. Phase 4.
- No 9th-grade exam content. Phase 3.

Stay focused on the content engine. That's the moat.

## Open decisions (not blockers, flagged for later)

- Final product name (current working name is placeholder).
- Teacher compensation model (likely retainer + bonus).
- Subscription price points.
- Whether the mobile app is React Native, native, or Flutter.
- Whether AI-assisted writing feedback is a v2 feature.

---

**First message to a fresh Claude Code session should be something like:**
*"Read CLAUDE.md and skim docs/project-documentation.md. We're in week 1 of the build plan — let's scaffold the Payload project with Postgres, define the exercise collection, and set up the three user roles. Propose a plan before starting."*

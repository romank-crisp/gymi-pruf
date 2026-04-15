# Gymi-Vorbereitung — Project Documentation

**Version 1.0 · April 2026**

---

## 1. Project Overview

**Working name:** Gymi-Vorbereitung (placeholder)

**What it is:** A mobile self-learning app that prepares children in German-speaking Switzerland for the Gymnasium entrance exam (*Aufnahmeprüfung*). The app targets the 6th-grade exam for entry into the Langgymnasium as its first phase, with the 9th-grade exam and math content planned as later phases.

**The core problem it solves:** There is a structural gap in Swiss primary schools between what kids learn and what the entrance exam demands. The exam selects the strongest writers and analysts under time pressure, while primary schools focus on comfort and even development. Bilingual kids — fluent in spoken German but without structured writing skills, grammatical meta-analysis, or orthographic precision — sit in the hardest spot in that gap. The app exists to close that gap through daily, structured, self-directed practice.

**Primary target user:** Bilingual children aged 10–12 living in German-speaking Switzerland, whose home language is not German (Ukrainian, English, Russian, Italian, Portuguese, and others). These children are not language beginners — they are fluent speakers immersed in Schweizerdeutsch, schooled in Hochdeutsch, but missing the academic and literary register the exam requires.

**Secondary target user:** The parent, who pays for the subscription, installs the app, monitors progress, and prints worksheets. Parents in this segment are typically time-poor, anxious about the exam, and often unable to coach their child directly in German. The app must give them confidence and visibility without requiring their fluency.

**Geographic scope:** German-speaking Switzerland, with Zurich as the launch canton and other cantons (Zug, Schaffhausen, Aargau, Bern, Lucerne, St. Gallen, Basel) added progressively. The content engine is designed to be canton-aware from day one.

**Phasing:**

- **Phase 1** — German, 6th-grade Aufnahmeprüfung, Zurich.
- **Phase 2** — Expansion to other German-speaking cantons for the 6th-grade exam.
- **Phase 3** — 9th-grade Aufnahmeprüfung (Kurzgymnasium entry), all German-speaking cantons.
- **Phase 4** — Math content, both 6th and 9th grade.

---

## 2. Product Logic and Business Model

### 2.1 How the product works end to end

The product is a classic self-learning loop. The child opens the app, receives a recommended set of exercises for the day, works through them, and the system auto-grades each item and updates progress. The parent sees progress in a separate dashboard view and can print worksheets for offline practice. Writing tasks are done on printed worksheets and reviewed by the parent through a guided photo-review flow. A teacher is involved only as a back-office quality reviewer for AI-generated content — never in the live learning loop.

### 2.2 Business model

Freemium subscription with three tiers of access.

**Free tier** — permanent access to core Sprachbetrachtung drills at beginner and intermediate levels, a limited number of printable worksheets per week, one diagnostic test, basic progress tracking, and orthography micro-drills. Generous enough to build habit and prove value.

**Paid tier (yearly subscription)** — unlimited printable worksheets, all four Aufsatz text types with writing-process scaffolding, full Leseverständnis library, all mock exams, the full parent dashboard with diagnostic insights and exam-readiness forecasting, and advanced Sprachbetrachtung with timed analysis exercises. Yearly pricing matches how parents think about exam prep (in school years, not months) and improves unit economics in a category with a hard end date.

**Free trial of the paid tier** — 14 days, activatable by the parent when they are ready to evaluate seriously. This converts; the permanent free tier drives discovery and habit.

Mock exams are always paid. They are the highest-value, highest-anxiety content and parents will pay for them specifically.

### 2.3 Roles in the system

Three roles in v1.

**Admin** — the project owner. Manages the system, runs content generation pipelines, manages the teacher reviewer, handles billing and analytics. Very small number of admins.

**Reviewer (teacher)** — a primary school teacher with experience preparing children for the Aufnahmeprüfung. Works through a queue of AI-generated exercises and approves, edits, or rejects them. Does not author content from scratch as their primary job. Does not see student data. Works part-time on a retainer.

**Family (end user)** — one account per household, containing a parent profile (manages subscription, sees dashboard, does photo reviews, prints worksheets) and one or more student profiles (does exercises, sees progress, earns XP). The parent and the student share the subscription but see completely different interfaces.

Future roles planned but not built: Tutor (read access to one student's progress, for families who hire a human tutor) and School (school-level accounts for bulk sales). The permission model is designed to accommodate these without refactoring, by modeling permissions as a relationship between a user and a scope rather than a flat property of a user.

---

## 3. Content Generation Approach

### 3.1 The pipeline

The content in the app is AI-generated and teacher-reviewed. The pipeline has five stages.

**Stage 1 — Prompt template.** For each exercise format and topic, a carefully designed prompt template specifies the topic, subtopic, difficulty level, output structure (parseable JSON), linguistic constraints (sentence length, vocabulary level, register), and format-specific rules. Prompts are authored and maintained by the admin, not the teacher. The AI never sees free-form requests.

**Stage 2 — Generation.** The AI fills the prompt template and produces a structured exercise object. Runs are typically batched — generating 50 or 100 exercises for a subtopic at once.

**Stage 3 — Auto-validation.** Every generated item is checked programmatically: valid JSON structure, all required fields present, answer key consistent with question (e.g., exactly one correct option in a multiple choice), sentence length within limits, no obvious red flags (profanity, wrong language, non-Swiss references). Failures are dropped or auto-regenerated, never sent to the teacher.

**Stage 4 — Optional self-critique.** A second AI pass re-reads its own output against a checklist and either flags concerns or requests regeneration. This catches a meaningful fraction of quality issues cheaply.

**Stage 5 — Teacher review.** The teacher sees only items that passed stages 3 and 4. The teacher reviews each item in its rendered form (as the child will see it) and chooses approve, edit-and-approve, or reject with reason. Approved items move to the published pool and become available to students.

### 3.2 Content lifecycle

Every content item moves through four states.

- **Generated** — produced by the AI, passed auto-validation, waiting in the teacher's queue.
- **Published** — approved by the teacher, live in the app, being served to students, collecting performance data.
- **Rejected** — teacher rejected. Stored for prompt-improvement analysis, never shown to students.
- **Retired** — was published, now hidden, usually because of a post-publication problem. Historical student progress is preserved.

Published items are monitored for real-world performance. If an item tagged at difficulty 3 is being answered correctly by 95% of students, the system flags it for re-review. This closes the loop between the live app and the content pipeline, so content quality compounds over time.

### 3.3 Quality ceilings by topic

AI generation works well for different topics to different degrees. Planning assumes:

- **Sprachbetrachtung (grammar drills)** — very high AI capability, light teacher editing expected.
- **Orthography** — similarly high capability.
- **Reading comprehension (short texts and questions)** — high capability, though the AI must write both the text and questions, so slightly more review needed.
- **Writing prompts** — easy to generate.
- **Writing scaffolding (model texts, annotated examples, checklists)** — moderate capability, heavier teacher editing.
- **Mock exam assembly** — requires careful human assembly because balance of topics, difficulties, and exam format matters disproportionately.

The production plan budgets more teacher time per item for writing scaffolding and mock exams than for grammar drills.

### 3.4 Economics and production rate

With a well-tuned pipeline and an experienced reviewer, a teacher working part-time can review approximately 150–300 exercises per week (30–60 per hour, 5 hours per week). This is enough to sustain content growth after the initial library is built.

---

## 4. Learning Principles

Every exercise in the app is designed around five principles. These are non-negotiable and apply equally to AI generation prompts, teacher review criteria, and app UI rendering.

### Principle 1 — Explanation of task and goal

Every exercise begins with a clear framing before the child does anything: a one-sentence description of what they will do, a one-sentence reason why it matters, and a worked example showing what good looks like. The framing is dismissible after the first exposure in a session, so kids in flow are not slowed down. Instructions use friendly, kid-appropriate Hochdeutsch, not teacher jargon.

### Principle 2 — Interactive engagement

The child is doing something at every step, not reading passively. Active formats (tap-to-tag, drag-and-drop, sentence building, fill-in-the-blank with typing) dominate over passive ones (multiple choice). Feedback is immediate on every tap, not only at the end of the exercise. After each answer the child can optionally see a short explanation of why the correct answer is correct, and explanations expand automatically on wrong answers.

### Principle 3 — Gamification in every exercise

Gamification is invisible within a single exercise and visible across a week of work. Individual exercises feel like learning with small satisfying moments of feedback. The system around exercises — streaks, XP, per-topic levels, unlockables, milestone celebrations — feels like a game that rewards consistent work.

Within an exercise: subtle positive feedback on correct answers, XP awarded per correct answer, a progress bar visible throughout, combo recognition for streaks of correct answers.

Across exercises and days: daily streak with one or two streak-freeze days per month as a safety valve, weekly XP goals, per-topic levels that map to content difficulty, cosmetic and content-expanding unlockables tied to real milestones, celebrations for completing a topic or hitting 7-day and 30-day streaks.

The gamification system is optional in the parent dashboard — parents can disable streaks if they find them stressful for their child.

### Principle 4 — Variety of learning tools

Eleven exercise formats support the curriculum. Each format serves a specific pedagogical purpose. Within any session, the app avoids showing the same format twice in a row unless the child is deliberately drilling one format. The eleven formats:

1. **Tap-to-tag** — grammar analysis, dominant for Sprachbetrachtung.
2. **Multiple choice** — quick concept checks, minority use.
3. **Multi-select** — deeper understanding tests.
4. **Fill in the blank** — orthography and Kasus, with on-screen keyboard or option picker.
5. **Drag and drop** — matching, ordering, sorting.
6. **Sentence building** — word-order and syntax practice.
7. **Audio-based** — hearing Hochdeutsch, especially for orthography and listening.
8. **Image-based** — vocabulary and description.
9. **Error spotting** — find the mistake in a sentence.
10. **Transformation** — rewrite in a different tense or structure.
11. **Writing (printable + parent review)** — full essay practice, the only non-auto-graded format.

### Principle 5 — Hochdeutsch, simplified for 10–12 year olds

All in-app language is Hochdeutsch at a register appropriate for the age group. Concrete rules: sentences of 8–15 words in instructions and explanations; common concrete vocabulary in scaffolding; no Swiss German leakage; no Anglicisms in instructions; formal but warm *du* address; no grammatical jargon in explanations unless the jargon is the skill being taught; consistent terminology (once the app says *Nomen*, it always says *Nomen*, never switching to *Substantiv*). Content itself (the sentences being analyzed) can use the full range of age-appropriate academic German, but scaffolding around content stays plain.

A style guide documents terminology choices and is referenced by AI generation prompts.

---

## 5. The Unified Exercise Template

Every exercise in the app conforms to a single structure. The AI generates to this structure, the teacher reviews it, and the app renders it.

**1. Title** — one-line name, shown in lists and the review tool.

**2. Intro** (shown before the exercise, dismissible after first view in a session)

- What you'll do — one sentence in simplified Hochdeutsch.
- Why it matters — one sentence connecting this skill to the bigger picture.
- Worked example — one example with the answer shown.

**3. Task**

- One of the eleven formats.
- 5–12 items per exercise, completable in 3–5 minutes.
- Immediate feedback per item (correct / not correct, plus optional explanation).
- XP awarded per correct answer.
- Progress bar visible throughout.
- Combo recognition for streaks of 3, 5, or all-correct.

**4. End-of-exercise summary**

- Score (X correct out of Y).
- XP earned.
- Any badges or level-ups triggered.
- One-line reminder of what was practiced.
- Short explanations of errors if any.
- Next-action suggestion (more of the same, move on, take a break).

**5. Metadata** (not visible to the child; used by the system)

- Topic, subtopic, difficulty level (1–5), format, canton applicability, exam-relevance weight (1–3), estimated time, lifecycle state, generation prompt ID and version, reviewer ID and date, performance data (correct rate, time-to-complete).

---

## 6. Content Structure — German v1

### 6.1 Section overview

| Section | Drill exercises | Other content |
|---|---|---|
| Sprachbetrachtung | ~910 | — |
| Aufsatz | ~275 micro-skills | ~25 scaffolding docs + ~110 prompts |
| Textverständnis | ~175 + ~450 text-based questions | ~75 reading texts |
| Rechtschreibung | ~210 | — |
| Assessment | (reuses pool) | 5 diagnostics + 12 topic checks + 6–8 mock exams |
| **Total** | **~2,020 exercises** | **~210 long-form items** |

### 6.2 Section 1 — Sprachbetrachtung (grammar analysis)

Taught in strict order: Wortarten → Satzglieder → Kasus. Each topic depends on the previous.

**Topic 1.1 — Wortarten (~350 exercises)**

Nine word categories taught as separate subtopics, then combined in mixed exercises. Nomen (40), Verben (40), Adjektive (30), Artikel (25), Pronomen (40), Präpositionen (30), Konjunktionen (25), Adverbien (30), Numerale (15), mixed Wortarten exercises (75). Dominant format: tap-to-tag.

**Topic 1.2 — Satzglieder (~305 exercises)**

Sentence parts identified using the question method (*Wer oder was? Wen oder was? Wem? Wessen?*). Subjekt (40), Prädikat (40), Akkusativobjekt (35), Dativobjekt (35), Genitivobjekt (15), adverbial phrases of place, time, manner, reason (60), mixed full-sentence analysis (80). Dominant format: tap-to-tag.

**Topic 1.3 — Kasus (~255 exercises)**

The four German cases, with particular focus on Akkusativ vs Dativ after two-way prepositions — the single most error-prone area for bilingual children. Nominativ (25), Akkusativ (40), Dativ (40), Genitiv (20), Kasus after prepositions with emphasis on Wechselpräpositionen (80), mixed (50). Dominant format: fill-in-the-blank.

### 6.3 Section 2 — Aufsatz (writing)

Split into three layers.

**Topic 2.1 — Writing micro-skills (~275 drillable exercises)**

Auto-gradable building blocks of good writing. Satzanfänge variieren (40), Wortschatz erweitern (50), Adjektive einsetzen (30), direkte Rede punctuation (25), wörtliche Rede in narrative (25), Zeitformen konsistent (30), Satzverbindungen (30), Adjektivsteigerung (20), Klischees vermeiden (25).

**Topic 2.2 — Writing scaffolding materials (~25 documents)**

Reference materials for each of the four text types. Per text type: planning template, two to three annotated model texts, a good-vs-bad pair, pitfalls checklist, sentence-starter toolbox. Not graded, used as reference while writing.

**Topic 2.3 — Writing prompts (~110 prompts)**

Printable worksheets, one page each. Erlebniserzählung (30), Fantasiegeschichte (30), Beschreibung (25), Stellungnahme (25). Post-writing review done by parent using a structured checklist that does not require German fluency.

### 6.4 Section 3 — Textverständnis (reading comprehension)

**Topic 3.1 — Reading micro-skills (~175 exercises)**

Hauptaussage erkennen (30), Details finden (30), Wortbedeutung im Kontext (40), Schlussfolgerungen ziehen (30), Textstruktur erkennen (20), mit dem Text belegen — the discipline of citing evidence from the text (25).

**Topic 3.2 — Full texts with question sets (~75 texts, ~450 questions)**

Kurze Erzählungen (25), Sachtexte (25), Gedichte (15), Berichte (10). Each text has 5–8 questions.

### 6.5 Section 4 — Rechtschreibung (orthography)

Four narrow rules drilled to automaticity. ss/ß rules (50), lange Vokale (60), Großschreibung (50), Kommasetzung (50). Dominant format: fill-in-the-blank with on-screen keyboard or error spotting.

### 6.6 Section 5 — Assessment infrastructure

**Diagnostics** (5 configurations) — short adaptive assessments, 5–10 minutes, sampling from the exercise pool to estimate skill level. Run at onboarding and every 4–6 weeks.

**Topic checks** (12 configurations) — fixed 15–20 minute tests at the end of each topic. Reuse pool items, curated not adaptive.

**Mock exams** (6–8 full exams) — full-length simulations of the Aufnahmeprüfung including correct section balance, time budget, canton-specific format. Partially drawn from the pool, partially new content. Each mock includes an after-action report. Mock exams are paid content.

### 6.7 Production phasing

**Phase 1 — Launch minimum (~5–6 weeks of production).** Wortarten complete, Satzglieder complete, Orthography complete, one diagnostic, two topic checks, one mock exam. ~900 exercises plus assessment skeleton. Enough to launch meaningfully.

**Phase 2 — Core complete (~4–5 weeks).** Kasus, reading micro-skills, 25 reading texts with questions, writing micro-skills. Brings library to ~1,600 exercises.

**Phase 3 — Polish (ongoing).** Remaining reading texts, writing scaffolding, writing prompts, additional mock exams, refinement based on real student performance data.

Total: approximately 4–5 months from working pipeline to complete v1 library.

---

## 7. Content Metadata Schema

Every content item carries the following fields.

- **Identity** — unique ID, human-readable title, version number.
- **Pedagogical tags** — exam section (Sprachbetrachtung, Aufsatz, Textverständnis, Rechtschreibung), topic, subtopic, specific skill. Multiple tags allowed.
- **Difficulty level** — 1 to 5. Level 1 is first introduction with heavy scaffolding; level 3 is exam-level; level 5 is beyond-exam challenge.
- **Canton applicability** — list of cantons the item is valid for. Most drills are valid for all German-speaking cantons; mock exam questions are canton-specific.
- **Format** — one of the eleven formats, plus an indicator of whether a printable version exists.
- **Exam relevance weight** — 1 to 3. How much this skill matters for the actual exam.
- **Estimated time** — expected completion time in minutes.
- **Answer key and grading rules** — for auto-gradable items, the correct answers and acceptable variants. For writing items, a rubric usable by a parent during photo-review.
- **Source and provenance** — generation prompt ID and version, model used, date generated, reviewer ID, date reviewed, review action taken (approved, edited, rejected with reason).
- **Lifecycle state** — Generated, Published, Rejected, or Retired.
- **Performance data** (populated after publication) — number of times served, correct answer rate, average time to complete, flag status if real-world performance diverges from tagged difficulty.

---

## 8. Technical Approach

### 8.1 System components

The system consists of four loosely coupled components.

**The content database.** A single source of truth for all content items, their metadata, and their lifecycle state. Holds exercises, reading texts, writing prompts, scaffolding documents, diagnostics, topic checks, and mock exam configurations. Also holds student progress and performance data linked to content items.

**The generation pipeline.** A set of scripts and prompt templates that generate exercises through AI, run auto-validation and optional self-critique, and deliver approved items to the teacher queue. Runs on demand (admin triggers a batch) rather than continuously.

**The reviewer tool.** A web application used by the teacher reviewer. Shows a queue of generated items, renders each item as the child will see it, provides approve / edit / reject actions with reason codes, and shows post-publication performance data for flagged items. Desktop-optimized, not mobile.

**The family app.** The mobile application used by parents and children. Contains the student learning loop (exercise delivery, auto-grading, XP and progress, streaks) and the parent dashboard (per-child progress, printable worksheets, photo review, subscription management). Both iOS and Android, with possible web fallback for printing and dashboard use.

### 8.2 Stack decisions

- **CMS / content backend**: Payload (TypeScript-native, self-hosted). Gives a real admin UI, custom fields, relationships, and role-based access control in code. Exposes REST and GraphQL automatically.
- **Database**: Postgres, via Cloud SQL in production.
- **Hosting**: Google Cloud. Cloud Run for the Payload server, Cloud SQL for Postgres, Cloud Storage for media.
- **AI generation**: Anthropic API, called from scripts that write into Payload with lifecycle state = `generated`.
- **Mobile app**: Not yet scoped. Will consume the Payload API. React Native vs native vs Flutter deferred until the content system is running.

### 8.3 Data model highlights

Content items and student progress are modeled separately. Content items are immutable once published (except through a versioned revision process); student progress references content item versions, so if an item is edited, historical progress still points to the version the student actually saw.

Family accounts contain one or more student profiles. A student profile has its own progress, streaks, XP, and level-per-topic, but shares the family's subscription. The parent can switch between student profiles from their dashboard.

Permissions are modeled as relationships between users and scopes (a family, a specific student, the content pool, etc.), not as flat role properties. This makes adding future roles (tutor, school) straightforward without schema changes.

### 8.4 Build order

The build order follows the principle that content infrastructure comes before content, content comes before UI, and UI comes before polish.

**Step 1 — Prompt prototyping.** Prove that AI can reliably generate good Wortarten exercises with careful prompting. Output is a trusted prompt template and a realistic quality baseline. 1–2 weeks.

**Step 2 — Database schema and reviewer tool.** Build the content database and the teacher reviewer web app. Minimal UI, complete functionality: authoring metadata, reviewing items, tracking lifecycle. 3–4 weeks.

**Step 3 — Teacher onboarding and Wortarten production.** Hire or contract the teacher reviewer. Generate ~350 Wortarten exercises. Teacher reviews. Iterate on the prompt, the tool, and the schema based on what the first real review cycle reveals. 4–6 weeks.

**Step 4 — Content library expansion.** Generate and review the remaining topics in the order laid out in Section 6.7. Overlaps with later steps.

**Step 5 — Family app development.** Build the mobile app against the now-populated content database. Student learning loop first, parent dashboard second, printable worksheet flow third, gamification layer fourth. 3–4 months.

**Step 6 — Closed beta.** Small number of real families. Collect real performance data. Refine content based on signal from the field.

**Step 7 — Public launch.** Zurich first, free tier and paid trial both available.

---

## 9. Open Decisions

The following decisions are not yet locked and will be resolved before or during the next phase of work.

- **Product naming and branding.** The working name is a placeholder. Final name affects App Store positioning and SEO; will be resolved before public launch.
- **Teacher compensation model.** Likely a monthly retainer with a target output, possibly with per-exercise bonuses above a threshold. To be decided based on budget and hiring conversations.
- **Pricing.** Specific price points for the yearly subscription, and whether to offer monthly as an alternative, to be determined through market research and early-user feedback.
- **Parent dashboard language support.** At launch, German and English are the minimum. Ukrainian, Russian, Italian, Portuguese, and French are planned as fast follows. Priority order will depend on early user demographics.
- **Writing review automation.** The v1 plan uses parent-guided photo review for writing. A future iteration may introduce AI-assisted writing feedback as an aid to the parent, but the quality bar and pedagogical risks are high enough that this is not a v1 feature.
- **Mobile framework choice.** React Native vs native (Swift/Kotlin) vs Flutter. Deferred until the content engine is running and mobile development starts.
- **Math curriculum.** Deferred to phase 4. A separate planning document will be produced when math is in scope.

---

## 10. Summary

Gymi-Vorbereitung is a bilingual-focused, self-learning mobile app for children preparing for the Swiss Gymnasium entrance exam. It closes a specific pedagogical gap — the one bilingual kids sit in — through structured daily practice of grammar analysis, writing micro-skills, reading comprehension, and orthography. Content is AI-generated and teacher-reviewed through a defined pipeline, built around a unified exercise template that reflects five learning principles (clear framing, interactive engagement, tasteful gamification, varied formats, simplified Hochdeutsch). The v1 library targets roughly 2,000 exercises plus supporting long-form materials, produced in 4–5 months of focused work. The product launches in Zurich with a freemium model, then expands across German-speaking Switzerland, then adds the 9th-grade exam and math in later phases.

The next concrete step is prototyping the Wortarten generation prompt — the single riskiest technical assumption in the project, and the one that determines whether the whole approach works in practice.

---

*End of document.*

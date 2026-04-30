# Exercises Collection

**Slug:** `exercises` · **File:** `src/collections/Exercises.ts`

The central collection. Every exercise across all 11 formats and 4 exam sections is a single row here. The unified structure mirrors the *unified exercise template* in CLAUDE.md.

## Fields

### Title & Intro

| Field | Type | Notes |
|-------|------|-------|
| `title` | text (required) | Max 120 chars. Shown as row title in admin. |
| `intro.what` | textarea (required) | "What you will do" — shown before the task. |
| `intro.why` | textarea (required) | "Why it matters" — pedagogical context. |
| `intro.workedExample` | richText | Optional worked example (Lexical editor). Dismissible after first view in a session. |

### Task

| Field | Type | Notes |
|-------|------|-------|
| `format` | select (required) | One of 11 exercise formats (see below). |
| `items` | json (required) | 5–12 items. Structure is format-specific — see `src/validators/items/`. |

#### Exercise formats

| Value | Label | Primary use |
|-------|-------|-------------|
| `tap_to_tag` | Tap-to-tag | Sprachbetrachtung — grammar tagging |
| `single_choice` | Single choice | Quick comprehension checks (one correct answer) |
| `multi_select` | Multi-select | Multiple-answer questions |
| `fill_blank` | Fill in the blank | Orthography, Kasus |
| `drag_drop` | Drag and drop | Matching, ordering, sorting |
| `sentence_building` | Sentence building | Syntax |
| `audio` | Audio-based | Listening comprehension |
| `image` | Image-based | Visual context exercises |
| `error_spotting` | Error spotting | Spot spelling/grammar errors |
| `transformation` | Transformation | Rewrite sentences in another form |
| `writing` | Writing (worksheet) | The only non-auto-graded format; printable |

### Metadata

| Field | Type | Values / Notes |
|-------|------|---------------|
| `section` | select (required) | `sprachbetrachtung`, `aufsatz`, `textverstaendnis`, `rechtschreibung`, `assessment` |
| `topic` | text (required) | e.g. `Wortarten`, `Satzglieder`, `Kasus` |
| `subtopic` | text | e.g. `Nomen erkennen`, `Akkusativ vs Dativ` |
| `difficulty` | number 1–5 (required) | Default 3. Calibrated from `performance` data over time. |
| `examRelevance` | number 1–3 (required) | 1 = tangential, 2 = common, **3 = high-frequency**. Drives recommendation weighting. |
| `cantonApplicability` | multi-select (required) | `ZH`, `BE`, `LU`, `ALL`. Default `['ZH']`. |
| `estimatedTimeSec` | number 30–1800 (required) | Default 180 (3 min). |

### Lifecycle

| Field | Type | Notes |
|-------|------|-------|
| `lifecycleState` | select (required, indexed) | `generated`, `published`, `rejected`, `retired`. Default `generated`. |
| `rejectionReason` | textarea | Conditionally visible when state = `rejected`. Required by the state machine hook when transitioning to rejected. |

See [Exercise Lifecycle](../lifecycle) for the full state machine.

### Provenance

Tracks where an exercise came from and who reviewed it.

| Field | Type | Notes |
|-------|------|-------|
| `provenance.promptTemplate` | relationship → `prompt-templates` | The template that generated this item. `null` for manually authored exercises. |
| `provenance.generationBatchId` | text | Shared across all items from one AI run. Useful for retracing a bad batch. |
| `provenance.reviewer` | relationship → `users` | The reviewer who last approved/edited/rejected. |
| `provenance.reviewedAt` | date | When the review happened. |

### Performance

Populated by app telemetry — **not hand-editable** (readOnly in admin). When `correctRate` diverges significantly from the `difficulty` tag, the item should be flagged for re-review.

| Field | Type | Notes |
|-------|------|-------|
| `performance.attempts` | number | Total times this exercise was attempted. Default 0. |
| `performance.correctRate` | number | 0.0–1.0 |
| `performance.avgTimeSec` | number | Average completion time |
| `performance.lastComputedAt` | date | When stats were last aggregated |

## Hooks

| Hook | Handler | Trigger |
|------|---------|---------|
| `beforeChange` | `enforceLifecycleTransition` | Validates state transitions before every write |
| `afterChange` | `writeAuditLog` | Appends an entry to the audit log after every write |

## Access control

```
read:   admin → all states
        reviewer → generated + published
        family / unauthenticated → published only

create: admin only
update: admin + reviewer
delete: admin only
```

## Admin list columns

`title`, `format`, `topic`, `subtopic`, `difficulty`, `lifecycleState`, `updatedAt`

Searchable fields: `title`, `topic`, `subtopic`

## `items` JSON structure examples

### `tap_to_tag`
```json
[
  {
    "sentence": "Die Katze schläft auf dem Sofa.",
    "tokens": ["Die", "Katze", "schläft", "auf", "dem", "Sofa"],
    "correctIndices": [1, 5]
  }
]
```

### `fill_blank`
```json
[
  {
    "template": "Er gibt ___ Hund einen Knochen.",
    "options": ["dem", "den", "der"],
    "answer": "dem"
  }
]
```

::: tip Validation
Per-format validators live in `src/validators/items/` (added in Week 3). They run during auto-validation of AI-generated batches before insertion.
:::

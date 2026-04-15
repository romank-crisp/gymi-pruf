# Prompt Templates Collection

**Slug:** `prompt-templates` · **File:** `src/collections/PromptTemplates.ts`

Stores the inputs to the AI generation pipeline. Each template is **format-specific + topic-specific** and is owned by the admin — reviewers read but never edit templates.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `name` | text (required) | Human-readable identifier, e.g. `Wortarten tap-to-tag v1` |
| `format` | select (required) | One of the 11 exercise formats |
| `topic` | text (required) | e.g. `Wortarten`, `Kasus` |
| `subtopic` | text | e.g. `Nomen erkennen`, `Akkusativ vs Dativ` |
| `version` | number (required) | Starts at 1. Increment when changing the prompt — don't mutate. |
| `isActive` | checkbox | Only one version per `(format, topic, subtopic)` should be active. The generation script picks `isActive = true`. |
| `systemPrompt` | textarea (required) | Role and style guardrails. Should reference the five learning principles. |
| `userPromptTemplate` | textarea (required) | Task instructions for the model. Use `{{placeholders}}` for per-batch variables (e.g. `{{difficulty}}`, `{{count}}`). |
| `outputJsonSchema` | json (required) | JSON schema the generator output must conform to. Used by the auto-validator. |
| `notes` | textarea | Admin-only notes on known failure modes, tuning history, etc. |

## Versioning

Template edits **create new rows** with `version` incremented — they do not overwrite the existing row. Every generated exercise references its exact template version via `provenance.promptTemplate`. This means you can always trace a bad exercise back to the prompt that created it.

```
prompt-template#1 (isActive: false) ──▶ exercises generated in batch-001
prompt-template#2 (isActive: true)  ──▶ exercises generated in batch-002 onward
```

## Access control

```
read:   any authenticated user (admin + reviewer)
create: admin only
update: admin only
delete: admin only
```

## Using a template (Week 3)

The generation script (`scripts/generate.ts`, coming in Week 3) will:

1. Find the active template for a given `(format, topic, subtopic)`.
2. Interpolate `{{placeholders}}` with batch parameters.
3. Call the Anthropic API with `systemPrompt` + rendered `userPromptTemplate`.
4. Validate output against `outputJsonSchema`.
5. Insert valid exercises into `exercises` with `lifecycleState = 'generated'` and `provenance.promptTemplate` set to this template's ID.

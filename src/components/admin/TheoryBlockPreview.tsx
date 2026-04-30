import type { DocumentTabServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import './TheoryBlockPreview.scss'

/**
 * Custom edit-view tab for TheoryBlocks.
 *
 * Renders the block as a learner would experience it, based on format:
 *
 *   conversational       → chat bubbles (Leo + kid), with indicators for
 *                          bubbles that expect a reply or trigger an action
 *   worked_example       → problem → numbered step-by-step (thought + action)
 *                          → answer → "why it works" recap
 *   mini_game            → summary of game configuration (game_type, buckets,
 *                          item counts, time limit)
 *   interactive_diagram  → SVG reference + region/interaction summary
 *   video / passage      → rendered text + media ref
 *
 * Always shows: concept breadcrumb, format, L1, status, version, and the
 * raw content JSON (collapsible) for audit.
 */

type ConceptRef = {
  id: number | string
  slug?: string
  name?: string
  unit?: { id: number | string; name?: string; module?: { id: number | string; name?: string } | number | string } | number | string
}

type TheoryDoc = {
  id: number | string
  title: string
  format: string
  l1: string
  status: string
  version: number
  concept: ConceptRef | number | string
  content: unknown
  supersedes?: { id: number | string; title?: string } | number | string | null
}

type Bubble = {
  role: 'leo' | 'kid' | string
  text: string
  expects_reply?: boolean
  action?: string | null
}

type SolutionStep = {
  step: number
  thought: string
  action: string
}

export default async function TheoryBlockPreview({ doc, payload }: DocumentTabServerProps) {
  const block = doc as unknown as TheoryDoc

  // Resolve concept → unit → module breadcrumb (TheoryBlocks don't use
  // the polymorphic anchor system; they anchor directly to a concept).
  const conceptRaw = block.concept
  let conceptName = '—'
  let unitName: string | null = null
  let moduleName: string | null = null

  if (conceptRaw != null) {
    let concept: ConceptRef | null = null
    if (typeof conceptRaw === 'object') {
      concept = conceptRaw as ConceptRef
    } else {
      const c = await payload.findByID({
        collection: 'concepts',
        id: conceptRaw as number,
        depth: 2,
      })
      concept = c as unknown as ConceptRef
    }
    conceptName = concept?.name ?? '—'
    const unit = typeof concept?.unit === 'object' ? concept.unit : null
    unitName = (unit as { name?: string } | null)?.name ?? null
    const mod = unit && typeof unit.module === 'object' ? (unit.module as { name?: string }) : null
    moduleName = mod?.name ?? null
  }

  const breadcrumb = [moduleName, unitName, conceptName].filter(Boolean).join(' › ') || '—'

  const content = (block.content ?? {}) as Record<string, unknown>
  const format = String(block.format || '')
  const formatLabel = format.replace(/_/g, ' ')

  return (
    <Gutter className="theory-preview">
      <header className="theory-preview__header">
        <h2>Preview</h2>
        <p className="theory-preview__subtitle">
          Rendered as the learner would see it. Reload after editing to refresh.
        </p>
      </header>

      <section className="theory-preview__meta-top">
        <dl className="theory-preview__feedback">
          <dt>Title</dt>
          <dd>{block.title || <em>— untitled —</em>}</dd>
          <dt>Concept</dt>
          <dd>{breadcrumb}</dd>
          <dt>Format</dt>
          <dd>
            <span className="theory-preview__format">{formatLabel}</span>
          </dd>
          <dt>L1 / Status / Version</dt>
          <dd>
            <code>{block.l1}</code> · <code>{block.status}</code> · v{block.version}
          </dd>
        </dl>
      </section>

      <section className="theory-preview__learner">
        {format === 'conversational' && <ConversationalView content={content} />}
        {format === 'worked_example' && <WorkedExampleView content={content} />}
        {format === 'mini_game' && <MiniGameView content={content} />}
        {format === 'interactive_diagram' && <InteractiveDiagramView content={content} />}
        {(format === 'video' || format === 'passage') && <FreeformView content={content} />}
        {!['conversational', 'worked_example', 'mini_game', 'interactive_diagram', 'video', 'passage'].includes(format) && (
          <FreeformView content={content} />
        )}
      </section>

      <section className="theory-preview__meta">
        <h3>Raw content JSON</h3>
        <details className="theory-preview__raw">
          <summary>Show / hide</summary>
          <pre>{JSON.stringify(content, null, 2)}</pre>
        </details>
      </section>
    </Gutter>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Per-format renderers
// ───────────────────────────────────────────────────────────────────────────

function ConversationalView({ content }: { content: Record<string, unknown> }) {
  const bubbles = (content.bubbles as Bubble[] | undefined) ?? []
  if (bubbles.length === 0) {
    return <em className="theory-preview__empty">No bubbles defined.</em>
  }
  return (
    <div className="theory-preview__chat">
      {bubbles.map((b, i) => {
        const isLeo = b.role === 'leo'
        return (
          <div
            key={i}
            className={`theory-preview__bubble ${
              isLeo ? 'theory-preview__bubble--leo' : 'theory-preview__bubble--kid'
            }`}
          >
            <div className="theory-preview__bubble-role">{isLeo ? 'Leo' : 'Kid'}</div>
            <div className="theory-preview__bubble-text">{b.text}</div>
            {(b.expects_reply || b.action) && (
              <div className="theory-preview__bubble-flags">
                {b.expects_reply && (
                  <span className="theory-preview__flag theory-preview__flag--reply">
                    expects reply
                  </span>
                )}
                {b.action && (
                  <span className="theory-preview__flag theory-preview__flag--action">
                    action: {b.action}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function WorkedExampleView({ content }: { content: Record<string, unknown> }) {
  const problem = content.problem as string | undefined
  const steps = (content.solution_steps as SolutionStep[] | undefined) ?? []
  const answer = content.answer as string | undefined
  const why = content.why_it_works as string | undefined

  return (
    <div className="theory-preview__worked">
      {problem && (
        <div className="theory-preview__problem">
          <div className="theory-preview__label">Aufgabe</div>
          <p>{problem}</p>
        </div>
      )}

      {steps.length > 0 && (
        <ol className="theory-preview__steps">
          {steps.map((s, i) => (
            <li key={i}>
              <div className="theory-preview__step-num">{s.step}</div>
              <div className="theory-preview__step-body">
                <div className="theory-preview__step-thought">
                  <span className="theory-preview__step-tag">überlege</span>
                  {s.thought}
                </div>
                <div className="theory-preview__step-action">
                  <span className="theory-preview__step-tag">mache</span>
                  {s.action}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {answer && (
        <div className="theory-preview__answer-box">
          <div className="theory-preview__label">Antwort</div>
          <p>{answer}</p>
        </div>
      )}

      {why && (
        <div className="theory-preview__why">
          <div className="theory-preview__label">Warum das funktioniert</div>
          <p>{why}</p>
        </div>
      )}
    </div>
  )
}

function MiniGameView({ content }: { content: Record<string, unknown> }) {
  const gameType = content.game_type as string | undefined
  const buckets = content.buckets as unknown[] | undefined
  const items = content.items as unknown[] | undefined
  const timeLimit = content.time_limit_sec as number | undefined

  return (
    <div className="theory-preview__game">
      <div className="theory-preview__label">Mini-game config</div>
      <dl className="theory-preview__feedback">
        <dt>Game type</dt>
        <dd>{gameType ?? <em>—</em>}</dd>
        <dt>Buckets</dt>
        <dd>{Array.isArray(buckets) ? `${buckets.length} buckets` : <em>—</em>}</dd>
        <dt>Items</dt>
        <dd>{Array.isArray(items) ? `${items.length} items` : <em>—</em>}</dd>
        <dt>Time limit</dt>
        <dd>{typeof timeLimit === 'number' ? `${timeLimit} s` : <em>—</em>}</dd>
      </dl>
      <p className="theory-preview__hint">
        Mini-game rendering runs in the mobile app. This is a summary only.
      </p>
    </div>
  )
}

function InteractiveDiagramView({ content }: { content: Record<string, unknown> }) {
  const svgRef = content.svg_ref as string | undefined
  const regions = content.regions as unknown[] | undefined

  return (
    <div className="theory-preview__diagram">
      <div className="theory-preview__label">Interactive diagram</div>
      <dl className="theory-preview__feedback">
        <dt>SVG ref</dt>
        <dd>{svgRef ? <code>{svgRef}</code> : <em>—</em>}</dd>
        <dt>Regions</dt>
        <dd>{Array.isArray(regions) ? `${regions.length} regions` : <em>—</em>}</dd>
      </dl>
      <p className="theory-preview__hint">
        Diagram rendering runs in the mobile app. This is a summary only.
      </p>
    </div>
  )
}

function FreeformView({ content }: { content: Record<string, unknown> }) {
  const text = (content.text as string | undefined) ?? (content.body as string | undefined)
  if (text) {
    return (
      <div className="theory-preview__freeform">
        {text.split(/\n{2,}/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    )
  }
  return (
    <div className="theory-preview__freeform">
      <em className="theory-preview__empty">
        No recognisable top-level `text` field. See raw JSON below.
      </em>
    </div>
  )
}

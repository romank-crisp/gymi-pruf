import type { DocumentTabServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import {
  renderTemplate,
  type ExerciseTemplateLike,
  type SlotDefinition,
  type SlotItemLike,
} from '../../lib/renderTemplate'
import './ExerciseTemplatePreview.scss'

/**
 * Custom edit-view tab for ExerciseTemplates.
 *
 * Fetches the template's referenced slot pools + items, picks random items,
 * substitutes them into the prompt / feedback / hints, and resolves the
 * correct answer. Shows everything the learner would see plus the author's
 * behind-the-scenes picks and warnings about misconfigured slot paths.
 *
 * Refresh with different picks via the browser reload button.
 */
export default async function ExerciseTemplatePreview({
  doc,
  payload,
}: DocumentTabServerProps) {
  const template = doc as unknown as ExerciseTemplateLike

  // Resolve referenced pools
  const slotDefs = (template.slotDefinitions as SlotDefinition[] | null) ?? []
  const poolSlugs = Array.from(new Set(slotDefs.map((s) => s.pool_slug).filter(Boolean)))

  const itemsByPoolSlug: Record<string, SlotItemLike[]> = {}
  if (poolSlugs.length > 0) {
    const pools = await payload.find({
      collection: 'slot-pools',
      where: { slug: { in: poolSlugs } },
      pagination: false,
      depth: 0,
    })
    for (const pool of pools.docs) {
      const items = await payload.find({
        collection: 'slot-items',
        where: {
          and: [{ pool: { equals: pool.id } }, { active: { equals: true } }],
        },
        pagination: false,
        depth: 0,
      })
      itemsByPoolSlug[pool.slug as string] = items.docs as SlotItemLike[]
    }
  }

  const preview = renderTemplate(template, { itemsByPoolSlug })

  const formatLabel = String(preview.format).replace(/_/g, ' ')

  return (
    <Gutter className="template-preview">
      <header className="template-preview__header">
        <h2>Preview</h2>
        <p className="template-preview__subtitle">
          Rendered with random picks from the referenced slot pools. Reload the
          page to see different slot fills.
        </p>
      </header>

      {preview.warnings.length > 0 && (
        <div className="template-preview__warnings">
          <strong>⚠ Warnings</strong>
          <ul>
            {preview.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="template-preview__learner">
        <header className="template-preview__learner-head">
          <span className="template-preview__format">{formatLabel}</span>
        </header>

        <div className="template-preview__prompt">
          {preview.prompt || <em>— empty prompt —</em>}
        </div>

        {preview.options.length > 0 && (
          <ul className="template-preview__options">
            {preview.options.map((opt, i) => {
              const optStr = String(opt)
              const isCorrect = preview.correctAnswer != null && optStr === preview.correctAnswer
              return (
                <li
                  key={i}
                  className={
                    'template-preview__option' +
                    (isCorrect ? ' template-preview__option--correct' : '')
                  }
                >
                  <span className="template-preview__option-label">{optStr}</span>
                  {isCorrect && <span className="template-preview__option-badge">correct</span>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="template-preview__meta">
        <h3>Resolved correct answer</h3>
        <p className="template-preview__answer">
          {preview.correctAnswer ?? <em>could not resolve — check answerSpec.correct_slot</em>}
        </p>

        {Object.keys(preview.pickedItems).length > 0 && (
          <>
            <h3>Slot picks</h3>
            <table className="template-preview__picks">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Value</th>
                  <th>Metadata</th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(preview.pickedItems).map(([slot, item]) => (
                  <tr key={slot}>
                    <td><code>{slot}</code></td>
                    <td><strong>{item.value}</strong></td>
                    <td>
                      <code>{JSON.stringify(item.metadata ?? {})}</code>
                    </td>
                    <td>{item.difficultyTier ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {preview.hints.length > 0 && (
          <>
            <h3>Hint ladder</h3>
            <ol className="template-preview__hints">
              {preview.hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ol>
          </>
        )}

        {(preview.feedback.correct || preview.feedback.wrong) && (
          <>
            <h3>Feedback (rendered)</h3>
            <dl className="template-preview__feedback">
              {preview.feedback.correct && (
                <><dt>Correct</dt><dd>{preview.feedback.correct}</dd></>
              )}
              {preview.feedback.partial && (
                <><dt>Partial</dt><dd>{preview.feedback.partial}</dd></>
              )}
              {preview.feedback.wrong && (
                <><dt>Wrong</dt><dd>{preview.feedback.wrong}</dd></>
              )}
              {preview.feedback.walkthrough && (
                <><dt>Walkthrough</dt><dd>{preview.feedback.walkthrough}</dd></>
              )}
            </dl>
          </>
        )}
      </section>
    </Gutter>
  )
}

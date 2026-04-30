import type { DocumentTabServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import {
  LEGAL_STATUS_TRANSITIONS,
  contentStatusOptions,
  type ContentStatus,
} from '../../content/enums'
import StatusTransitionButtons from './StatusTransitionButtons'
import './StatusTransitionsTab.scss'

/**
 * Server-rendered wrapper for the Workflow tab.
 *
 * Reads the current doc's status, resolves legal transitions from the shared
 * LEGAL_STATUS_TRANSITIONS map, and hands them to the interactive client
 * component. Available on all collections with a `status` field in the
 * content-status lifecycle (ExerciseTemplates, TheoryBlocks, ConceptCards,
 * L1Variants).
 */
export default function StatusTransitionsTab({
  doc,
  collectionConfig,
}: DocumentTabServerProps) {
  const d = doc as Record<string, unknown>
  const current = (d.status as ContentStatus) ?? 'draft'
  const docId = String(d.id ?? '')
  const collectionSlug = collectionConfig.slug

  const legal = LEGAL_STATUS_TRANSITIONS[current] ?? []
  const statusLabels: Record<string, string> = Object.fromEntries(
    contentStatusOptions.map((o) => [o.value, o.label]),
  )

  return (
    <Gutter className="status-tab">
      <header className="status-tab__header">
        <h2>Workflow</h2>
        <p className="status-tab__subtitle">
          Move this document through the content lifecycle. Illegal transitions
          (e.g. <code>active → draft</code>) are blocked by the{' '}
          <code>enforceStatusTransition</code> hook.
        </p>
      </header>

      <section className="status-tab__current">
        <span className="status-tab__label">Current status</span>
        <span className={`status-tab__badge status-tab__badge--${current}`}>
          {statusLabels[current] ?? current}
        </span>
      </section>

      {legal.length === 0 ? (
        <p className="status-tab__terminal">
          <strong>Terminal state.</strong> No further transitions available from{' '}
          <code>{current}</code>. To reopen, create a new version and link via{' '}
          <code>supersedes</code>.
        </p>
      ) : (
        <section className="status-tab__actions">
          <h3>Available transitions</h3>
          <StatusTransitionButtons
            collectionSlug={collectionSlug}
            docId={docId}
            legalTargets={legal.map((value) => ({
              value,
              label: statusLabels[value] ?? value,
              destructive: value === 'flagged' || value === 'retired',
            }))}
          />
        </section>
      )}

      <footer className="status-tab__footer">
        <details>
          <summary>Full lifecycle graph</summary>
          <pre className="status-tab__graph">
{`draft      → in_review, retired
in_review  → approved, draft, retired
approved   → active, flagged, retired
active     → flagged, retired
flagged    → active, retired
retired    → (terminal)

Any other transition throws from the server hook.
Pass req.context.forcePromote = true to bypass (dev only).`}
          </pre>
        </details>
      </footer>
    </Gutter>
  )
}

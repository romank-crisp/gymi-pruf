import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import './CurriculumTreeView.scss'

type Id = string | number
type RelId = Id | { id: Id } | null | undefined

const relId = (rel: RelId): Id | null => {
  if (rel == null) return null
  if (typeof rel === 'object') return rel.id ?? null
  return rel
}

/**
 * Server-rendered curriculum tree.
 *
 * Loads all Domains / Modules / Sections / Units / Concepts in parallel with
 * depth=0 (so relationships come back as IDs) and stitches them in memory.
 * Renders as nested HTML <details> so collapse works with zero client JS.
 *
 * Drag-to-reorder is Phase 2b — will attach to the same rendered tree.
 */
export default async function CurriculumTreeView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const {
    req: {
      payload,
      user,
    },
    permissions,
    visibleEntities,
  } = initPageResult

  const [domains, modules, sections, units, concepts] = await Promise.all([
    payload.find({ collection: 'domains', sort: 'displayOrder', pagination: false, depth: 0 }),
    payload.find({ collection: 'modules', sort: 'displayOrder', pagination: false, depth: 0 }),
    payload.find({ collection: 'sections', sort: 'displayOrder', pagination: false, depth: 0 }),
    payload.find({ collection: 'units', sort: 'displayOrder', pagination: false, depth: 0 }),
    payload.find({ collection: 'concepts', sort: 'displayOrder', pagination: false, depth: 0 }),
  ])

  // Group children by their parent foreign key for O(1) lookup while rendering.
  const modulesByDomain = new Map<Id, typeof modules.docs>()
  for (const m of modules.docs) {
    const parent = relId(m.domain as RelId)
    if (!parent) continue
    const bucket = modulesByDomain.get(parent) ?? []
    bucket.push(m)
    modulesByDomain.set(parent, bucket)
  }

  const sectionsByModule = new Map<Id, typeof sections.docs>()
  for (const s of sections.docs) {
    const parent = relId(s.module as RelId)
    if (!parent) continue
    const bucket = sectionsByModule.get(parent) ?? []
    bucket.push(s)
    sectionsByModule.set(parent, bucket)
  }

  const unitsBySection = new Map<Id, typeof units.docs>()
  for (const u of units.docs) {
    const parent = relId(u.section as RelId)
    if (!parent) continue
    const bucket = unitsBySection.get(parent) ?? []
    bucket.push(u)
    unitsBySection.set(parent, bucket)
  }

  const conceptsByUnit = new Map<Id, typeof concepts.docs>()
  for (const c of concepts.docs) {
    const parent = relId(c.unit as RelId)
    if (!parent) continue
    const bucket = conceptsByUnit.get(parent) ?? []
    bucket.push(c)
    conceptsByUnit.set(parent, bucket)
  }

  const totals = {
    domains: domains.totalDocs,
    modules: modules.totalDocs,
    sections: sections.totalDocs,
    units: units.totalDocs,
    concepts: concepts.totalDocs,
  }

  // Helper: a link to the default Payload edit view for a given collection row
  const editHref = (collection: string, id: Id) => `/admin/collections/${collection}/${id}`
  const listHref = (collection: string) => `/admin/collections/${collection}`

  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter className="curriculum-tree">
        <header className="curriculum-tree__header">
          <h1>Curriculum Tree</h1>
          <p className="curriculum-tree__subtitle">
            Domain → Module → Section → Unit → Concept. Click any node to open its
            detail page. {' '}
            <em>Drag-to-reorder arrives in Phase 2b.</em>
          </p>
          <dl className="curriculum-tree__stats">
            <span><dt>Domains</dt><dd>{totals.domains}</dd></span>
            <span><dt>Modules</dt><dd>{totals.modules}</dd></span>
            <span><dt>Sections</dt><dd>{totals.sections}</dd></span>
            <span><dt>Units</dt><dd>{totals.units}</dd></span>
            <span><dt>Concepts</dt><dd>{totals.concepts}</dd></span>
          </dl>
        </header>

        {domains.docs.length === 0 ? (
          <p className="curriculum-tree__empty">
            No domains yet. <Link href={listHref('domains')}>Create the first one →</Link>
          </p>
        ) : (
          <ul className="curriculum-tree__list curriculum-tree__list--root">
            {domains.docs.map((domain) => {
              const mods = modulesByDomain.get(domain.id) ?? []
              return (
                <li key={String(domain.id)} className="curriculum-tree__node curriculum-tree__node--domain">
                  <details open>
                    <summary>
                      <span className="curriculum-tree__label">
                        <span className="curriculum-tree__icon" aria-hidden>📚</span>
                        <Link href={editHref('domains', domain.id)}>
                          {domain.name as string}
                        </Link>
                        <small className="curriculum-tree__meta">
                          {domain.examStrand as string} · {mods.length} module{mods.length === 1 ? '' : 's'}
                        </small>
                      </span>
                    </summary>
                    {mods.length === 0 ? (
                      <p className="curriculum-tree__empty curriculum-tree__empty--nested">
                        No modules yet.
                      </p>
                    ) : (
                      <ul className="curriculum-tree__list">
                        {mods.map((mod) => {
                          const secs = sectionsByModule.get(mod.id) ?? []
                          return (
                            <li key={String(mod.id)} className="curriculum-tree__node curriculum-tree__node--module">
                              <details open>
                                <summary>
                                  <span className="curriculum-tree__label">
                                    <span className="curriculum-tree__icon" aria-hidden>📖</span>
                                    <Link href={editHref('modules', mod.id)}>
                                      {mod.name as string}
                                    </Link>
                                    <small className="curriculum-tree__meta">
                                      {secs.length} section{secs.length === 1 ? '' : 's'}
                                    </small>
                                  </span>
                                </summary>
                                {secs.length === 0 ? (
                                  <p className="curriculum-tree__empty curriculum-tree__empty--nested">
                                    No sections yet.
                                  </p>
                                ) : (
                                  <ul className="curriculum-tree__list">
                                    {secs.map((sec) => {
                                      const uns = unitsBySection.get(sec.id) ?? []
                                      return (
                                        <li key={String(sec.id)} className="curriculum-tree__node curriculum-tree__node--section">
                                          <details open>
                                            <summary>
                                              <span className="curriculum-tree__label">
                                                <span className="curriculum-tree__icon" aria-hidden>📂</span>
                                                <Link href={editHref('sections', sec.id)}>
                                                  {sec.name as string}
                                                </Link>
                                                <small className="curriculum-tree__meta">
                                                  {uns.length} unit{uns.length === 1 ? '' : 's'}
                                                </small>
                                              </span>
                                            </summary>
                                            {uns.length === 0 ? (
                                              <p className="curriculum-tree__empty curriculum-tree__empty--nested">
                                                No units yet.
                                              </p>
                                            ) : (
                                              <ul className="curriculum-tree__list">
                                                {uns.map((unit) => {
                                                  const cons = conceptsByUnit.get(unit.id) ?? []
                                                  return (
                                                    <li key={String(unit.id)} className="curriculum-tree__node curriculum-tree__node--unit">
                                                      <details>
                                                        <summary>
                                                          <span className="curriculum-tree__label">
                                                            <span className="curriculum-tree__icon" aria-hidden>🧩</span>
                                                            <Link href={editHref('units', unit.id)}>
                                                              {unit.name as string}
                                                            </Link>
                                                            <small className="curriculum-tree__meta">
                                                              {cons.length} concept{cons.length === 1 ? '' : 's'}
                                                            </small>
                                                          </span>
                                                        </summary>
                                                        {cons.length === 0 ? (
                                                          <p className="curriculum-tree__empty curriculum-tree__empty--nested">
                                                            No concepts yet.
                                                          </p>
                                                        ) : (
                                                          <ul className="curriculum-tree__list curriculum-tree__list--leaf">
                                                            {cons.map((con) => (
                                                              <li
                                                                key={String(con.id)}
                                                                className="curriculum-tree__node curriculum-tree__node--concept"
                                                              >
                                                                <span className="curriculum-tree__label">
                                                                  <span className="curriculum-tree__icon" aria-hidden>🎯</span>
                                                                  <Link href={editHref('concepts', con.id)}>
                                                                    {con.name as string}
                                                                  </Link>
                                                                  {con.dazPainPoint ? (
                                                                    <span className="curriculum-tree__badge curriculum-tree__badge--daz">
                                                                      DaZ · {String(con.dazPainPoint).replace('_', ' ')}
                                                                    </span>
                                                                  ) : null}
                                                                  <small className="curriculum-tree__meta">
                                                                    difficulty {con.baseDifficulty as number}
                                                                  </small>
                                                                </span>
                                                              </li>
                                                            ))}
                                                          </ul>
                                                        )}
                                                      </details>
                                                    </li>
                                                  )
                                                })}
                                              </ul>
                                            )}
                                          </details>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                )}
                              </details>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </details>
                </li>
              )
            })}
          </ul>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}

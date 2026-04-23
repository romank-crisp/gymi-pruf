import { describe, it, expect } from 'vitest'
import { validateAnchors } from '@/hooks/validateAnchors'

/**
 * Unit tests for the curriculum-anchor validation hook.
 * No DB; the hook is a pure synchronous function that mutates/returns `data`.
 */

type HookArgs = Parameters<typeof validateAnchors>[0]

function invoke(data: Record<string, unknown>): Record<string, unknown> {
  // Minimal shape satisfying the hook — we only read `data`.
  const args = { data, operation: 'create', req: {} } as unknown as HookArgs
  return validateAnchors(args) as Record<string, unknown>
}

const concept = (id: number) => ({ relationTo: 'concepts', value: id })
const unit = (id: number) => ({ relationTo: 'units', value: id })
const domain = (id: number) => ({ relationTo: 'domains', value: id })

describe('validateAnchors', () => {
  it('accepts a single primary anchor', () => {
    expect(() => invoke({ primaryAnchor: concept(1), secondaryAnchors: [] })).not.toThrow()
  })

  it('accepts primary + 1 secondary', () => {
    expect(() =>
      invoke({ primaryAnchor: concept(1), secondaryAnchors: [{ anchor: unit(2) }] }),
    ).not.toThrow()
  })

  it('accepts primary + 2 secondaries (max)', () => {
    expect(() =>
      invoke({
        primaryAnchor: concept(1),
        secondaryAnchors: [{ anchor: unit(2) }, { anchor: domain(3) }],
      }),
    ).not.toThrow()
  })

  it('rejects missing primaryAnchor', () => {
    expect(() => invoke({ secondaryAnchors: [] })).toThrow(/primaryAnchor is required/i)
  })

  it('rejects when total anchors exceed 3', () => {
    // We bypass maxRows here to simulate a hand-crafted payload.
    expect(() =>
      invoke({
        primaryAnchor: concept(1),
        secondaryAnchors: [{ anchor: unit(2) }, { anchor: domain(3) }, { anchor: unit(4) }],
      }),
    ).toThrow(/Too many anchors/i)
  })

  it('rejects duplicate (primary == secondary, same collection + id)', () => {
    expect(() =>
      invoke({
        primaryAnchor: concept(1),
        secondaryAnchors: [{ anchor: concept(1) }],
      }),
    ).toThrow(/Duplicate anchor/i)
  })

  it('rejects duplicate between two secondaries', () => {
    expect(() =>
      invoke({
        primaryAnchor: concept(1),
        secondaryAnchors: [{ anchor: unit(2) }, { anchor: unit(2) }],
      }),
    ).toThrow(/Duplicate anchor/i)
  })

  it('allows same id under different collections (e.g. concept 1 and unit 1)', () => {
    expect(() =>
      invoke({
        primaryAnchor: concept(1),
        secondaryAnchors: [{ anchor: unit(1) }],
      }),
    ).not.toThrow()
  })

  it('rejects secondary entry that is missing its anchor value', () => {
    expect(() =>
      invoke({
        primaryAnchor: concept(1),
        secondaryAnchors: [{ anchor: null }],
      }),
    ).toThrow(/missing its anchor value/i)
  })

  it('tolerates populated doc shape for anchor value (depth expansion on read)', () => {
    // After Payload reads with depth > 0, `value` may be the full doc rather
    // than the bare id. The hook should still extract the id correctly.
    expect(() =>
      invoke({
        primaryAnchor: { relationTo: 'concepts', value: { id: 1, name: 'Genus' } },
        secondaryAnchors: [],
      }),
    ).not.toThrow()
  })

  it('detects duplicate across bare id and populated doc shapes', () => {
    expect(() =>
      invoke({
        primaryAnchor: { relationTo: 'concepts', value: { id: 1 } },
        secondaryAnchors: [{ anchor: concept(1) }],
      }),
    ).toThrow(/Duplicate anchor/i)
  })
})

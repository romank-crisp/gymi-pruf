import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

/**
 * Guards the exercise state machine.
 * We care about this because the whole reviewer workflow assumes these transitions
 * are the only ones possible — drifting here would let rejected content leak to
 * the app or would let an unreviewed exercise skip straight to published.
 */
let payload: Payload

const baseExercise = {
  title: 'STATE_MACHINE_TEST',
  intro: { what: 'test', why: 'test' },
  format: 'tap_to_tag' as const,
  items: [{ sentence: 't', tokens: ['t'], correctIndices: [0] }],
  section: 'sprachbetrachtung' as const,
  topic: 'Test',
  difficulty: 3,
  examRelevance: 2,
  cantonApplicability: ['ZH'],
  estimatedTimeSec: 60,
}

describe('Exercise lifecycle state machine', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
    // Clean slate for this suite's exercises only
    await payload.delete({
      collection: 'exercises',
      where: { title: { equals: 'STATE_MACHINE_TEST' } },
    })
  })

  it('allows generated → published', async () => {
    const ex = await payload.create({
      collection: 'exercises',
      data: { ...baseExercise, lifecycleState: 'generated' },
    })
    const updated = await payload.update({
      collection: 'exercises',
      id: ex.id,
      data: { lifecycleState: 'published' },
    })
    expect(updated.lifecycleState).toBe('published')
    await payload.delete({ collection: 'exercises', id: ex.id })
  })

  it('rejects generated → retired (illegal)', async () => {
    const ex = await payload.create({
      collection: 'exercises',
      data: { ...baseExercise, lifecycleState: 'generated' },
    })
    await expect(
      payload.update({
        collection: 'exercises',
        id: ex.id,
        data: { lifecycleState: 'retired' },
      }),
    ).rejects.toThrow(/Illegal lifecycle transition/)
    await payload.delete({ collection: 'exercises', id: ex.id })
  })

  it('rejects transition to rejected without a reason', async () => {
    const ex = await payload.create({
      collection: 'exercises',
      data: { ...baseExercise, lifecycleState: 'generated' },
    })
    await expect(
      payload.update({
        collection: 'exercises',
        id: ex.id,
        data: { lifecycleState: 'rejected' },
      }),
    ).rejects.toThrow(/rejectionReason/)
    await payload.delete({ collection: 'exercises', id: ex.id })
  })

  it('allows generated → rejected with reason, then rejected → generated', async () => {
    const ex = await payload.create({
      collection: 'exercises',
      data: { ...baseExercise, lifecycleState: 'generated' },
    })
    const rejected = await payload.update({
      collection: 'exercises',
      id: ex.id,
      data: { lifecycleState: 'rejected', rejectionReason: 'too hard for grade 6' },
    })
    expect(rejected.lifecycleState).toBe('rejected')

    const requeued = await payload.update({
      collection: 'exercises',
      id: ex.id,
      data: { lifecycleState: 'generated' },
    })
    expect(requeued.lifecycleState).toBe('generated')
    await payload.delete({ collection: 'exercises', id: ex.id })
  })

  it('writes an audit log entry on state transition', async () => {
    const ex = await payload.create({
      collection: 'exercises',
      data: { ...baseExercise, lifecycleState: 'generated' },
    })
    await payload.update({
      collection: 'exercises',
      id: ex.id,
      data: { lifecycleState: 'published' },
    })
    const logs = await payload.find({
      collection: 'audit-log',
      where: { exercise: { equals: ex.id } },
      sort: 'createdAt',
    })
    expect(logs.docs.length).toBeGreaterThanOrEqual(2) // create + transition
    const transitions = logs.docs.filter((d) => d.action === 'transitioned')
    expect(transitions[0]?.fromState).toBe('generated')
    expect(transitions[0]?.toState).toBe('published')
    await payload.delete({ collection: 'exercises', id: ex.id })
  })
})

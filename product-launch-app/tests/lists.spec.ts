import { describe, it, expect, beforeEach } from 'vitest'
import { truncateTables } from './db-test-helper'
import * as listsRepo from '@/lib/repositories/lists'

describe('lists repository', () => {
  beforeEach(() => truncateTables())

  it('creates a list with auto-incremented position', async () => {
    const a = await listsRepo.create('App')
    const b = await listsRepo.create('Content')
    const c = await listsRepo.create('Teachers Zone')
    expect(a.position).toBe(0)
    expect(b.position).toBe(1)
    expect(c.position).toBe(2)
  })

  it('returns lists ordered by position', async () => {
    await listsRepo.create('App')
    await listsRepo.create('Content')
    const all = await listsRepo.listAll()
    expect(all.map((l) => l.name)).toEqual(['App', 'Content'])
  })

  it('rejects empty names', async () => {
    await expect(listsRepo.create('   ')).rejects.toThrow(/VALIDATION/)
  })

  it('updates a list name', async () => {
    const l = await listsRepo.create('Old')
    const updated = await listsRepo.update(l.id, { name: 'New' })
    expect(updated?.name).toBe('New')
  })

  it('deletes a list', async () => {
    const l = await listsRepo.create('Throwaway')
    const ok = await listsRepo.remove(l.id)
    expect(ok).toBe(true)
    expect(await listsRepo.getById(l.id)).toBeNull()
  })

  it('returns false when deleting a missing list', async () => {
    expect(await listsRepo.remove('does-not-exist')).toBe(false)
  })
})

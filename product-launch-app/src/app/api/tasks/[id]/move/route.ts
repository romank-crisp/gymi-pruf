import { NextResponse } from 'next/server'
import { moveTaskSchema } from '@/lib/validators'
import { repositoryError, validationError, notFound } from '@/lib/api-helpers'
import * as tasksRepo from '@/lib/repositories/tasks'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const parsed = moveTaskSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const moved = await tasksRepo.move(id, parsed.data)
    if (!moved) return notFound('task not found')
    return NextResponse.json(moved)
  } catch (err) {
    return repositoryError(err)
  }
}

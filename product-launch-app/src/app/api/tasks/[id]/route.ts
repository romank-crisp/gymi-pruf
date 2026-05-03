import { NextResponse } from 'next/server'
import { updateTaskSchema } from '@/lib/validators'
import { repositoryError, validationError, notFound } from '@/lib/api-helpers'
import * as tasksRepo from '@/lib/repositories/tasks'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    const task = await tasksRepo.getById(id)
    if (!task) return notFound('task not found')
    return NextResponse.json(task)
  } catch (err) {
    return repositoryError(err)
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const updated = await tasksRepo.update(id, parsed.data)
    if (!updated) return notFound('task not found')
    return NextResponse.json(updated)
  } catch (err) {
    return repositoryError(err)
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    const ok = await tasksRepo.remove(id)
    if (!ok) return notFound('task not found')
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return repositoryError(err)
  }
}

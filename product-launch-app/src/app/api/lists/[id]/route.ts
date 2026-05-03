import { NextResponse } from 'next/server'
import { updateListSchema } from '@/lib/validators'
import { repositoryError, validationError, notFound } from '@/lib/api-helpers'
import * as listsRepo from '@/lib/repositories/lists'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const parsed = updateListSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const updated = await listsRepo.update(id, parsed.data)
    if (!updated) return notFound('list not found')
    return NextResponse.json(updated)
  } catch (err) {
    return repositoryError(err)
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    const ok = await listsRepo.remove(id)
    if (!ok) return notFound('list not found')
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return repositoryError(err)
  }
}

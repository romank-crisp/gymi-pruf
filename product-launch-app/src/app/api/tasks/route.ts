import { NextResponse } from 'next/server'
import { createTaskSchema, taskFilterSchema } from '@/lib/validators'
import { repositoryError, validationError } from '@/lib/api-helpers'
import * as tasksRepo from '@/lib/repositories/tasks'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const raw = {
    listId: url.searchParams.get('listId') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
  }
  const parsed = taskFilterSchema.safeParse(raw)
  if (!parsed.success) return validationError(parsed.error)
  try {
    const all = await tasksRepo.listFiltered(parsed.data)
    return NextResponse.json(all)
  } catch (err) {
    return repositoryError(err)
  }
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const created = await tasksRepo.create(parsed.data)
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    return repositoryError(err)
  }
}

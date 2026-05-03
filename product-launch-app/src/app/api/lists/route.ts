import { NextResponse } from 'next/server'
import { createListSchema } from '@/lib/validators'
import { repositoryError, validationError } from '@/lib/api-helpers'
import * as listsRepo from '@/lib/repositories/lists'

export async function GET() {
  try {
    const all = await listsRepo.listAll()
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
  const parsed = createListSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const created = await listsRepo.create(parsed.data.name)
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    return repositoryError(err)
  }
}

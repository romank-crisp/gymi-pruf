/**
 * Helpers used by Next.js Route Handlers to standardise responses and
 * error envelopes.
 */
import { NextResponse } from 'next/server'
import { z, type ZodError } from 'zod'

type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR'

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  status = 400,
) {
  return NextResponse.json({ error: { code, message, details } }, { status })
}

export function validationError(zodError: ZodError) {
  return errorResponse('VALIDATION_ERROR', 'Invalid request body', z.flattenError(zodError), 400)
}

export function notFound(message = 'Resource not found') {
  return errorResponse('NOT_FOUND', message, undefined, 404)
}

export function internalError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  console.error('[API] internal error:', err)
  return errorResponse('INTERNAL_ERROR', message, undefined, 500)
}

/**
 * Map a thrown repository error (which uses MESSAGE prefixes) onto an
 * HTTP error envelope.
 */
export function repositoryError(err: unknown) {
  const msg = err instanceof Error ? err.message : ''
  if (msg.startsWith('VALIDATION:'))
    return errorResponse('VALIDATION_ERROR', msg.replace(/^VALIDATION:\s*/, ''), undefined, 400)
  if (msg.startsWith('NOT_FOUND:'))
    return errorResponse('NOT_FOUND', msg.replace(/^NOT_FOUND:\s*/, ''), undefined, 404)
  return internalError(err)
}

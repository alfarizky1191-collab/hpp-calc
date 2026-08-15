/**
 * Secure error handling utilities.
 *
 * Rules:
 * 1. Never expose stack traces to the client.
 * 2. Never expose SQL/DB error messages.
 * 3. Never expose internal service keys or secrets.
 * 4. Log full errors server-side only.
 * 5. Return generic, safe messages to the client.
 */

// Patterns in error messages that indicate internal details that must not leak
const SENSITIVE_PATTERNS = [
  /sql/i,
  /postgres/i,
  /supabase/i,
  /stack trace/i,
  /at Object\./i,
  /at Module\./i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /fetch failed/i,
  /service_role/i,
  /anon.*key/i,
  /secret/i,
  /password/i,
  /token/i,
]

/**
 * Map known Supabase/Postgres error codes to safe user-facing messages.
 */
const DB_ERROR_MAP: Record<string, string> = {
  '23505': 'Data duplikat — entri ini sudah ada.',
  '23503': 'Data tidak dapat dihapus karena masih digunakan.',
  '23502': 'Data tidak lengkap — ada kolom yang wajib diisi.',
  '42501': 'Akses ditolak.',
  'PGRST116': 'Data tidak ditemukan.',
  'PGRST301': 'Sesi tidak valid. Silakan login kembali.',
}

/**
 * Sanitize an error for safe client exposure.
 *
 * Logs the full error server-side, returns a safe message.
 */
export function sanitizeError(
  err: unknown,
  context = 'operation'
): string {
  // Log full error server-side only
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${context}]`, err)
  }

  if (!err) return 'Terjadi kesalahan. Coba lagi.'

  // Check for known DB error codes
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = String((err as { code: unknown }).code)
    if (code in DB_ERROR_MAP) {
      return DB_ERROR_MAP[code]!
    }
  }

  // Extract message if available
  const message = err instanceof Error ? err.message
    : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : String(err)

  // Check if message contains sensitive internals
  const isSensitive = SENSITIVE_PATTERNS.some((p) => p.test(message))
  if (isSensitive) {
    return 'Terjadi kesalahan internal. Silakan coba lagi atau hubungi administrator.'
  }

  // Return message only if it looks like a safe user-facing message
  // (short, no code-like content)
  if (message.length < 200 && !/[{}[\]()=]/.test(message)) {
    return message
  }

  return 'Terjadi kesalahan. Coba lagi.'
}

/**
 * Wrap an async Route Handler or Server Action safely.
 * Catches all errors and returns a sanitized JSON response.
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T | { error: string }> {
  try {
    return await fn()
  } catch (err) {
    const message = sanitizeError(err, context)
    return { error: message }
  }
}

/**
 * Create a safe 500 JSON response — no internals exposed.
 */
export function serverErrorResponse(err: unknown, context: string): Response {
  const message = sanitizeError(err, context)
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Suitable for single-instance deployments (Vercel Serverless can have
 * multiple instances — for production multi-instance deployments use
 * Upstash Redis or similar). This still provides meaningful protection
 * against single-user abuse patterns.
 *
 * Usage:
 *   const result = rateLimit.check('login', identifier, { max: 5, windowMs: 60_000 })
 *   if (!result.allowed) return Response with 429
 */

interface RateLimitEntry {
  timestamps: number[]
}

// Global store — persists across requests within the same instance
const store = new Map<string, RateLimitEntry>()

// Cleanup stale keys every 5 minutes to prevent memory leaks
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      // Remove entries with no timestamps in the last hour
      const recent = entry.timestamps.filter((t) => now - t < 3_600_000)
      if (recent.length === 0) {
        store.delete(key)
      }
    }
  }
  // Only set interval in non-edge runtimes
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, 5 * 60_000)
  }
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  max: number
  /** Window size in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

const DISTRIBUTED_NAMESPACES = new Set([
  'login',
  'register',
  'forgot-password',
  'import',
  'export',
])

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

/**
 * Check the shared database-backed limiter. If Supabase is temporarily
 * unavailable, fall back to the local limiter so authentication still works
 * with a meaningful safety layer.
 */
export async function checkDistributedRateLimit(
  namespace: string,
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  if (!DISTRIBUTED_NAMESPACES.has(namespace)) {
    return rateLimit.check(namespace, identifier, options)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return rateLimit.check(namespace, identifier, options)
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_namespace: namespace,
        p_identifier_hash: await sha256(identifier),
      }),
      cache: 'no-store',
    })

    if (!response.ok) throw new Error(`Rate limiter returned ${response.status}`)
    const rows = await response.json() as Array<{
      allowed: boolean
      remaining: number
      reset_at: string
    }>
    const result = rows[0]
    if (!result) throw new Error('Rate limiter returned no result')

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: new Date(result.reset_at).getTime(),
    }
  } catch {
    return rateLimit.check(namespace, identifier, options)
  }
}

export const rateLimit = {
  /**
   * Check and record a request for the given key.
   *
   * @param namespace  e.g. 'login', 'import'
   * @param identifier  IP address or user ID
   * @param options    max requests and window
   */
  check(
    namespace: string,
    identifier: string,
    options: RateLimitOptions
  ): RateLimitResult {
    const key = `${namespace}:${identifier}`
    const now = Date.now()
    const windowStart = now - options.windowMs

    const entry = store.get(key) ?? { timestamps: [] }

    // Slide the window — remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

    const remaining = Math.max(0, options.max - entry.timestamps.length - 1)
    const allowed = entry.timestamps.length < options.max

    if (allowed) {
      entry.timestamps.push(now)
      store.set(key, entry)
    }

    // Estimate when the oldest request will expire
    const oldest = entry.timestamps[0] ?? now
    const resetAt = oldest + options.windowMs

    return { allowed, remaining, resetAt }
  },

  /** Reset a specific key (e.g. after successful login) */
  reset(namespace: string, identifier: string) {
    const key = `${namespace}:${identifier}`
    store.delete(key)
  },
}

/**
 * Get the best available identifier from a request.
 * Prefers X-Forwarded-For (set by Vercel/proxies), falls back to 'unknown'.
 */
export function getIdentifier(request: Request): string {
  const forwarded = request instanceof Request
    ? request.headers.get('x-forwarded-for')
    : null
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
  // Sanitize — only allow valid IP-like chars
  return ip.replace(/[^a-zA-Z0-9.:_-]/g, '').slice(0, 64)
}

/**
 * Build a 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(resetAt: number): Response {
  const retryAfterSecs = Math.ceil((resetAt - Date.now()) / 1000)
  return new Response(
    JSON.stringify({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(1, retryAfterSecs)),
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  )
}

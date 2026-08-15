import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { rateLimit, getIdentifier, rateLimitResponse } from '@/lib/security/rate-limit'

// ---------------------------------------------------------------------------
// Route config
// ---------------------------------------------------------------------------
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
]

// API routes that should skip the Supabase session refresh
const API_ROUTES = ['/api/']

// Rate-limited routes and their limits
const RATE_LIMITED_ROUTES: Array<{
  pattern: string
  namespace: string
  max: number
  windowMs: number
}> = [
  { pattern: '/login',           namespace: 'login',          max: 10,  windowMs: 60_000  },
  { pattern: '/register',        namespace: 'register',       max: 5,   windowMs: 60_000  },
  { pattern: '/forgot-password', namespace: 'forgot-password',max: 5,   windowMs: 300_000 },
  { pattern: '/api/import',      namespace: 'import',         max: 20,  windowMs: 60_000  },
  { pattern: '/api/export',      namespace: 'export',         max: 30,  windowMs: 60_000  },
]

// ---------------------------------------------------------------------------
// Security headers added to every response
// ---------------------------------------------------------------------------
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // HSTS is also set in next.config headers, but belt-and-suspenders here
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  return response
}

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const identifier = getIdentifier(request)

  // ── 1. Rate limiting ──────────────────────────────────────────────────────
  for (const rule of RATE_LIMITED_ROUTES) {
    if (pathname.startsWith(rule.pattern)) {
      const result = rateLimit.check(rule.namespace, identifier, {
        max: rule.max,
        windowMs: rule.windowMs,
      })
      if (!result.allowed) {
        return applySecurityHeaders(
          new NextResponse(
            JSON.stringify({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
              },
            }
          )
        )
      }
      break
    }
  }

  // ── 2. Skip session refresh for API routes (they handle auth themselves) ──
  if (API_ROUTES.some((r) => pathname.startsWith(r))) {
    const response = NextResponse.next({ request })
    return applySecurityHeaders(response)
  }

  // ── 3. Supabase session refresh ───────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // MUST call getUser() — refreshes the session cookie
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  // ── 4. Auth guard ─────────────────────────────────────────────────────────
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Only preserve the redirect if it's a relative path (prevent open redirect)
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      url.searchParams.set('redirect', pathname)
    }
    const redirect = NextResponse.redirect(url)
    return applySecurityHeaders(redirect)
  }

  // Redirect authenticated users away from auth pages
  if (user && isPublicRoute && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const redirect = NextResponse.redirect(url)
    return applySecurityHeaders(redirect)
  }

  return applySecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { checkDistributedRateLimit, getIdentifier } from '@/lib/security/rate-limit'

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
  { pattern: '/login',           namespace: 'login',          max: 5,   windowMs: 900_000 },
  { pattern: '/register',        namespace: 'register',       max: 5,   windowMs: 60_000  },
  { pattern: '/forgot-password', namespace: 'forgot-password',max: 5,   windowMs: 300_000 },
  { pattern: '/api/import',      namespace: 'import',         max: 20,  windowMs: 60_000  },
  { pattern: '/api/export',      namespace: 'export',         max: 30,  windowMs: 60_000  },
]

// ---------------------------------------------------------------------------
// Security headers added to every response
// ---------------------------------------------------------------------------
function createContentSecurityPolicy(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const isDevelopment = process.env.NODE_ENV === 'development'

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co",
    `connect-src 'self' ${supabaseUrl} https://*.supabase.co wss://*.supabase.co`.trim(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ')
}

function applySecurityHeaders(
  response: NextResponse,
  contentSecurityPolicy: string
): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // HSTS is also set in next.config headers, but belt-and-suspenders here
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  response.headers.set('Content-Security-Policy', contentSecurityPolicy)
  return response
}

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const identifier = getIdentifier(request)
  const nonce = btoa(crypto.randomUUID())
  const contentSecurityPolicy = createContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)

  // Next.js reads the nonce from the request CSP and attaches it to framework
  // and hydration scripts automatically.
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)

  const nextResponse = () => NextResponse.next({
    request: { headers: requestHeaders },
  })

  // ── 1. Rate limiting ──────────────────────────────────────────────────────
  for (const rule of RATE_LIMITED_ROUTES) {
    if (request.method === 'POST' && pathname.startsWith(rule.pattern)) {
      const result = await checkDistributedRateLimit(rule.namespace, identifier, {
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
          ),
          contentSecurityPolicy
        )
      }
      break
    }
  }

  // ── 2. Skip session refresh for API routes (they handle auth themselves) ──
  if (API_ROUTES.some((r) => pathname.startsWith(r))) {
    return applySecurityHeaders(nextResponse(), contentSecurityPolicy)
  }

  // ── 3. Supabase session refresh ───────────────────────────────────────────
  let supabaseResponse = nextResponse()

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
          supabaseResponse = nextResponse()
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

  const isPublicRoute =
    pathname === '/' || pathname.startsWith('/donasi') ||
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  // ── 4. Auth guard ─────────────────────────────────────────────────────────
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Only preserve the redirect if it's a relative path (prevent open redirect)
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      url.searchParams.set('redirect', pathname)
    }
    const redirect = NextResponse.redirect(url)
    return applySecurityHeaders(redirect, contentSecurityPolicy)
  }

  // Redirect authenticated users away from auth pages, but keep landing page public
  const isAuthRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  if (user && isAuthRoute && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const redirect = NextResponse.redirect(url)
    return applySecurityHeaders(redirect, contentSecurityPolicy)
  }

  return applySecurityHeaders(supabaseResponse, contentSecurityPolicy)
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

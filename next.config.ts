import type { NextConfig } from 'next'

/**
 * Security headers applied to all responses.
 * CSP is set to allow Supabase, fonts, and self-hosted assets only.
 */
const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer in requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Disable browser features not needed by this app
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),
  },
  // HSTS — only applied over HTTPS (Vercel/production handles this; safe to set here)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content Security Policy
  // - 'self' for all same-origin resources
  // - Supabase URL for API / WS connections
  // - fonts.googleapis.com / fonts.gstatic.com for Google Fonts
  // - 'unsafe-inline' required by Next.js App Router for hydration/inline scripts
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: self + inline (required by Next.js App Router) + eval (required in dev)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      // connect-src: always include both https and wss wildcards so Supabase Realtime works
      // regardless of whether NEXT_PUBLIC_SUPABASE_URL is set
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} https://*.supabase.co wss://*.supabase.co`.trim(),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // Disable X-Powered-By header (hides Next.js version)
  poweredByHeader: false,

  // Production-safe settings
  experimental: {},
}

export default nextConfig

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
  // CSP is generated per request in proxy.ts so every Next.js script receives
  // a cryptographically random nonce. A static CSP cannot safely do this.
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

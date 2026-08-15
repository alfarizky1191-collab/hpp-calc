import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth callback handler for:
 * - Email confirmation after signup
 * - Password reset redirect
 * - OAuth (if needed later)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Validate the `next` param — only allow relative paths
      const safePath = next.startsWith('/') ? next : '/dashboard'
      return NextResponse.redirect(`${origin}${safePath}`)
    }
  }

  // Something went wrong — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}

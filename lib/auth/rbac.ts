/**
 * RBAC utilities.
 *
 * Use these in Server Components, Server Actions, and Route Handlers.
 * Never use on the client — these functions read cookies server-side.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'
import type { Tables } from '@/types/database'

export type Profile = Tables<'profiles'>

// ---------------------------------------------------------------------------
// getSession — get the current auth session, or null
// ---------------------------------------------------------------------------
export async function getSession() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}

// ---------------------------------------------------------------------------
// getCurrentProfile — fetch the profile row for the current user
// ---------------------------------------------------------------------------
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) return null
  return data
}

// ---------------------------------------------------------------------------
// requireAuth — redirect to /login if not authenticated
// ---------------------------------------------------------------------------
export async function requireAuth() {
  const user = await getSession()
  if (!user) redirect('/login')
  return user
}

// ---------------------------------------------------------------------------
// requireRole — redirect if user doesn't have required role(s)
// ---------------------------------------------------------------------------
export async function requireRole(roles: UserRole | UserRole[]) {
  const profile = await getCurrentProfile()

  if (!profile) redirect('/login')

  const allowed = Array.isArray(roles) ? roles : [roles]
  if (!allowed.includes(profile.role as UserRole)) {
    redirect('/dashboard?error=unauthorized')
  }

  return profile
}

// ---------------------------------------------------------------------------
// requireOwner — shorthand for owner-only pages
// ---------------------------------------------------------------------------
export async function requireOwner() {
  return requireRole('OWNER')
}

// ---------------------------------------------------------------------------
// canManage — check without redirecting (for conditional UI)
// Returns true if user has one of the specified roles
// ---------------------------------------------------------------------------
export async function canManage(roles: UserRole | UserRole[]): Promise<boolean> {
  const profile = await getCurrentProfile()
  if (!profile) return false
  const allowed = Array.isArray(roles) ? roles : [roles]
  return allowed.includes(profile.role as UserRole)
}

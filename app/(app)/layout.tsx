import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import type { UserRole } from '@/types'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile + org name in parallel
  const [profileResult, orgResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('profiles')
      .select('organization_id, organizations(name)')
      .eq('id', user.id)
      .single(),
  ])

  const profile = profileResult.data
  if (!profile) redirect('/login')

  const orgData = orgResult.data?.organizations
  const orgName = (orgData && typeof orgData === 'object' && !Array.isArray(orgData) && 'name' in orgData)
    ? String(orgData.name)
    : 'HPP Manager'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar
          userRole={profile.role as UserRole}
          userName={profile.full_name}
          orgName={orgName}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <MobileHeader
          userRole={profile.role as UserRole}
          userName={profile.full_name}
          orgName={orgName}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

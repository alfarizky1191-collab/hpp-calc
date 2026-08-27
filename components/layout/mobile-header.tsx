'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LayoutDashboard, Package, UtensilsCrossed, BookOpen, Receipt, TrendingUp, BarChart3, LogOut, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/types'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Master Bahan', href: '/materials', icon: Package },
  { label: 'Menu', href: '/menus', icon: UtensilsCrossed },
  { label: 'Resep', href: '/recipes', icon: BookOpen },
  { label: 'Biaya Operasional', href: '/expenses', icon: Receipt },
  { label: 'Profitabilitas', href: '/profitability', icon: TrendingUp },
  { label: 'Laporan', href: '/reports', icon: BarChart3 },
]

interface MobileHeaderProps {
  userRole: UserRole
  userName: string | null
  orgName: string
  pageTitle?: string
}

export function MobileHeader({ userRole, userName, orgName, pageTitle }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
            H
          </div>
          <span className="font-semibold text-sm">{pageTitle ?? orgName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-background shadow-xl lg:hidden flex flex-col">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                  H
                </div>
                <span className="font-semibold text-sm">{orgName}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3">
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {userRole === 'OWNER' && (
              <div className="border-t px-3 py-2">
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname.startsWith('/settings')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  Pengaturan
                </Link>
              </div>
            )}

            <div className="border-t px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{userName ?? 'User'}</p>
                <p className="text-xs text-muted-foreground">{orgName}</p>
              </div>
              <form action={logout}>
                <Button type="submit" variant="ghost" size="sm" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Keluar
                </Button>
              </form>
            </div>
          </aside>
        </>
      )}
    </>
  )
}

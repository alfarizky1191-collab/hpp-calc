'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  BookOpen,
  Receipt,
  TrendingUp,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Master Bahan', href: '/materials', icon: Package },
  { label: 'Menu', href: '/menus', icon: UtensilsCrossed },
  { label: 'Resep', href: '/recipes', icon: BookOpen },
  { label: 'Biaya Operasional', href: '/expenses', icon: Receipt },
  { label: 'Profitabilitas', href: '/profitability', icon: TrendingUp },
  { label: 'Laporan', href: '/reports', icon: BarChart3 },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Pengaturan', href: '/settings', icon: Settings, roles: ['OWNER'] },
]

interface SidebarProps {
  userRole: UserRole
  userName: string | null
  orgName: string
}

export function Sidebar({ userRole, userName, orgName }: SidebarProps) {
  const pathname = usePathname()

  const visibleBottom = BOTTOM_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  )

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <Image
          src="/logo.png"
          alt="HPP Manager"
          width={32}
          height={32}
          className="rounded-lg shrink-0"
          priority
        />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">HPP Manager</p>
          <p className="text-xs text-muted-foreground truncate">{orgName}</p>
        </div>
      </div>

      {/* Nav */}
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
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
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

      {/* Bottom */}
      <div className="border-t px-3 py-4 space-y-1">
        {visibleBottom.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}

        {/* User info + logout */}
        <div className="flex items-center gap-3 px-3 py-2 mt-2">
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
            {userName?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{userName ?? 'User'}</p>
            <p className="text-xs text-muted-foreground">{userRole}</p>
          </div>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              title="Keluar"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="sr-only">Keluar</span>
            </Button>
          </form>
        </div>
      </div>
    </aside>
  )
}

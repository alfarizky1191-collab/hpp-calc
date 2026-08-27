import Link from 'next/link'
import { Shield, Tag, ChevronRight, Heart } from 'lucide-react'
import { requireRole } from '@/lib/auth/rbac'
import { createDonationClient } from '@/lib/supabase/donation-server'

export default async function SettingsPage() {
  await requireRole(['OWNER', 'ADMIN', 'STAFF'])

  const donationClient = await createDonationClient()
  const { data: { user } } = await donationClient.auth.getUser()
  const { data: platformAdmin } = user
    ? await donationClient
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  const menuItems = [
    ...(platformAdmin ? [{
        href: '/settings/donation',
        icon: Heart,
        title: 'Donasi',
        description: 'Atur rekening bank dan gambar QRIS donasi',
      }] : []),
    {
      href: '/settings/categories',
      icon: Tag,
      title: 'Kategori',
      description: 'Kelola kategori untuk bahan baku dan menu',
    },
    {
      href: '/settings/audit',
      icon: Shield,
      title: 'Audit Log',
      description: 'Riwayat aktivitas pengguna dalam sistem',
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Konfigurasi sistem dan preferensi organisasi
        </p>
      </div>

      {/* Menu */}
      <div className="rounded-md border divide-y">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 px-4 py-4 hover:bg-muted/50 transition-colors group"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

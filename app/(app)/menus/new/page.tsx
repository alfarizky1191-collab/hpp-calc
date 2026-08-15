import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/rbac'
import { createClient } from '@/lib/supabase/server'
import { MenuForm } from '@/components/menus/menu-form'

export default async function NewMenuPage() {
  await requireRole(['OWNER', 'ADMIN'])
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type, organization_id, created_at, updated_at')
    .eq('type', 'MENU')
    .order('name')

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <Link
          href="/menus"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Kembali ke Menu
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Buat Menu</h1>
        <p className="text-muted-foreground text-sm">
          Tambahkan menu baru ke daftar produk
        </p>
      </div>
      <MenuForm categories={categories ?? []} />
    </div>
  )
}

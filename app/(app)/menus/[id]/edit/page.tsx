import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getMenuById } from '@/lib/menus/actions'
import { requireRole } from '@/lib/auth/rbac'
import { createClient } from '@/lib/supabase/server'
import { MenuForm } from '@/components/menus/menu-form'

interface EditMenuPageProps {
  params: Promise<{ id: string }>
}

export default async function EditMenuPage({ params }: EditMenuPageProps) {
  await requireRole(['OWNER', 'ADMIN'])
  const { id } = await params

  const supabase = await createClient()
  const [{ menu, error }, categoriesRes] = await Promise.all([
    getMenuById(id),
    supabase
      .from('categories')
      .select('id, name, type, organization_id, created_at, updated_at')
      .eq('type', 'MENU')
      .order('name'),
  ])

  if (error || !menu) notFound()

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <Link
          href={`/menus/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Kembali ke Detail Menu
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Menu</h1>
        <p className="text-muted-foreground text-sm">Ubah informasi {menu.name}</p>
      </div>
      <MenuForm menu={menu} categories={categoriesRes.data ?? []} />
    </div>
  )
}

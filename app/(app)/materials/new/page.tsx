import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/rbac'
import { createClient } from '@/lib/supabase/server'
import { MaterialForm } from '@/components/materials/material-form'

export default async function NewMaterialPage() {
  await requireRole(['OWNER', 'ADMIN'])

  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type, organization_id, created_at, updated_at')
    .eq('type', 'MATERIAL')
    .order('name')

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <Link
          href="/materials"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Kembali ke Master Bahan
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Tambah Bahan</h1>
        <p className="text-muted-foreground text-sm">
          Isi detail bahan baku yang ingin ditambahkan
        </p>
      </div>

      <MaterialForm categories={categories ?? []} />
    </div>
  )
}

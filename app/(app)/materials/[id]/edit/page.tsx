import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getMaterialById } from '@/lib/materials/actions'
import { requireRole } from '@/lib/auth/rbac'
import { createClient } from '@/lib/supabase/server'
import { MaterialForm } from '@/components/materials/material-form'

interface EditMaterialPageProps {
  params: Promise<{ id: string }>
}

export default async function EditMaterialPage({
  params,
}: EditMaterialPageProps) {
  await requireRole(['OWNER', 'ADMIN'])

  const { id } = await params
  const supabase = await createClient()

  const [{ material, error }, categoriesRes] = await Promise.all([
    getMaterialById(id),
    supabase
      .from('categories')
      .select('id, name, type, organization_id, created_at, updated_at')
      .eq('type', 'MATERIAL')
      .order('name'),
  ])

  if (error || !material) notFound()

  // Cannot edit deleted material
  if (material.deleted_at) notFound()

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <Link
          href={`/materials/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Kembali ke Detail Bahan
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Bahan</h1>
        <p className="text-muted-foreground text-sm">
          Ubah informasi {material.name}
        </p>
      </div>

      <MaterialForm
        material={material}
        categories={categoriesRes.data ?? []}
      />
    </div>
  )
}

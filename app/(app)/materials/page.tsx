import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getMaterials } from '@/lib/materials/actions'
import { getCurrentProfile } from '@/lib/auth/rbac'
import { createClient } from '@/lib/supabase/server'
import { MaterialTable } from '@/components/materials/material-table'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

interface MaterialsPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    page?: string
  }>
}

export default async function MaterialsPage({ searchParams }: MaterialsPageProps) {
  const params = await searchParams
  const q = params.q ?? ''
  const status = (params.status ?? 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'all'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const [profile, { data: materials, total }] = await Promise.all([
    getCurrentProfile(),
    getMaterials({ q, status, page, pageSize: 20 }),
  ])

  const supabase = await createClient()
  // categories fetched for future filter UI
  await supabase
    .from('categories')
    .select('id, name')
    .eq('type', 'MATERIAL')
    .order('name')

  const canEdit = profile?.role === 'OWNER' || profile?.role === 'ADMIN'
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Bahan</h1>
          <p className="text-muted-foreground text-sm">
            {total} bahan terdaftar
          </p>
        </div>
        {canEdit && (
          <Link href="/materials/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Bahan
          </Link>
        )}
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 flex-wrap">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Cari nama bahan..."
          className="w-64"
        />
        <Select name="status" defaultValue={status}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="INACTIVE">Dihapus</SelectItem>
            <SelectItem value="all">Semua</SelectItem>
          </SelectContent>
        </Select>
        <button type="submit" className={cn(buttonVariants({ variant: 'outline' }))}>
          Filter
        </button>
        {(q || status !== 'ACTIVE') && (
          <Link
            href="/materials"
            className={cn(buttonVariants({ variant: 'ghost' }))}
          >
            Reset
          </Link>
        )}
      </form>

      {/* Table */}
      <MaterialTable
        materials={materials as Parameters<typeof MaterialTable>[0]['materials']}
        userRole={(profile?.role ?? 'STAFF') as UserRole}
        showDeleted={status === 'INACTIVE'}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/materials?q=${q}&status=${status}&page=${page - 1}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                ← Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/materials?q=${q}&status=${status}&page=${page + 1}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Berikutnya →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

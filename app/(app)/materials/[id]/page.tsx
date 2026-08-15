import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Pencil } from 'lucide-react'
import { getMaterialById, deleteMaterial } from '@/lib/materials/actions'
import { getCurrentProfile } from '@/lib/auth/rbac'
import { PriceHistoryList } from '@/components/materials/price-history-list'
import { buttonVariants } from '@/components/ui/button'
import { DeleteButton } from '@/components/ui/delete-button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MaterialDetailPageProps {
  params: Promise<{ id: string }>
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b last:border-0">
      <dt className="text-sm text-muted-foreground sm:w-40 shrink-0">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  )
}

export default async function MaterialDetailPage({
  params,
}: MaterialDetailPageProps) {
  const { id } = await params
  const [profile, { material, history, error }] = await Promise.all([
    getCurrentProfile(),
    getMaterialById(id),
  ])

  if (error || !material) notFound()

  const canEdit = profile?.role === 'OWNER' || profile?.role === 'ADMIN'

  async function handleDelete() {
    'use server'
    return await deleteMaterial(material.id)
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/materials"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Master Bahan
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{material.name}</h1>
            {material.supplier && (
              <p className="text-muted-foreground text-sm">{material.supplier}</p>
            )}
          </div>
          {canEdit && !material.deleted_at && (
            <div className="flex items-center gap-2">
              <Link
                href={`/materials/${material.id}/edit`}
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Bahan
              </Link>
              <DeleteButton
                itemName={material.name}
                description="Bahan akan dihapus (soft delete). Data resep yang menggunakan bahan ini tidak terpengaruh. Bahan bisa dipulihkan nanti."
                onDelete={handleDelete}
                redirectTo="/materials"
              />
            </div>
          )}
        </div>
      </div>

      {/* Detail card */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-4">Informasi Bahan</h2>
        <dl>
          <DetailRow
            label="Status"
            value={
              material.deleted_at ? (
                <Badge variant="destructive">Dihapus</Badge>
              ) : material.status === 'ACTIVE' ? (
                <Badge>Aktif</Badge>
              ) : (
                <Badge variant="secondary">Nonaktif</Badge>
              )
            }
          />
          <DetailRow
            label="Harga Pembelian"
            value={
              <span className="tabular-nums">
                {formatRupiah(material.purchase_price)} / {material.purchase_unit}
              </span>
            }
          />
          <DetailRow
            label="Isi Per Kemasan"
            value={
              <span className="tabular-nums">
                {material.package_quantity} {material.base_unit}
              </span>
            }
          />
          <DetailRow
            label="Harga Unit"
            value={
              <span className="tabular-nums font-bold text-primary">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                }).format(material.unit_cost)}
                /{material.base_unit}
              </span>
            }
          />
          <DetailRow label="Satuan Pembelian" value={material.purchase_unit} />
          <DetailRow label="Satuan Terkecil" value={material.base_unit} />
          {material.supplier && (
            <DetailRow label="Supplier" value={material.supplier} />
          )}
          {(material as { categories?: { name: string } | null }).categories?.name && (
            <DetailRow
              label="Kategori"
              value={(material as { categories?: { name: string } | null }).categories!.name}
            />
          )}
          {material.notes && (
            <DetailRow label="Catatan" value={material.notes} />
          )}
          <DetailRow
            label="Ditambahkan"
            value={new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(material.created_at))}
          />
        </dl>
      </div>

      {/* Price history */}
      <div>
        <h2 className="font-semibold mb-4">
          Riwayat Harga
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({history.length} perubahan)
          </span>
        </h2>
        <PriceHistoryList history={history} currentPrice={material.purchase_price} />
      </div>
    </div>
  )
}

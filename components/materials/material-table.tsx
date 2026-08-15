'use client'

import { useTransition, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2, RotateCcw, Eye } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteMaterial, restoreMaterial } from '@/lib/materials/actions'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'
import type { UserRole } from '@/types'

type MaterialWithCategory = Tables<'materials'> & {
  categories: { name: string } | null
}

interface MaterialTableProps {
  materials: MaterialWithCategory[]
  userRole: UserRole
  showDeleted?: boolean
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function MaterialActions({
  mat,
  onDelete,
  onRestore,
}: {
  mat: MaterialWithCategory
  onDelete: (id: string, name: string) => void
  onRestore: (id: string, name: string) => void
}) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Opsi</span>
          </Button>
        } />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/materials/${mat.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            Lihat Detail
          </DropdownMenuItem>

          {!mat.deleted_at && (
            <>
              <DropdownMenuItem onClick={() => router.push(`/materials/${mat.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus
              </DropdownMenuItem>
            </>
          )}

          {mat.deleted_at && (
            <DropdownMenuItem onClick={() => onRestore(mat.id, mat.name)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Pulihkan
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirm delete dialog — rendered outside DropdownMenu to avoid nativeButton conflict */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Bahan?</AlertDialogTitle>
            <AlertDialogDescription>
              Bahan <strong>{mat.name}</strong> akan dihapus. Data resep
              yang menggunakan bahan ini tidak terpengaruh. Kamu bisa
              memulihkannya nanti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                setConfirmOpen(false)
                onDelete(mat.id, mat.name)
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function MaterialTable({
  materials,
  userRole,
  showDeleted = false,
}: MaterialTableProps) {
  const canEdit = userRole === 'OWNER' || userRole === 'ADMIN'
  const router = useRouter()
  const [, startTransition] = useTransition()

  function handleDelete(id: string, name: string) {
    startTransition(async () => {
      const result = await deleteMaterial(id)
      if (result.success) {
        toast.success(`Bahan "${name}" berhasil dihapus`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleRestore(id: string, name: string) {
    startTransition(async () => {
      const result = await restoreMaterial(id)
      if (result.success) {
        toast.success(`Bahan "${name}" berhasil dipulihkan`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  if (materials.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        <p className="font-medium">Belum ada bahan</p>
        <p className="text-sm mt-1">
          {showDeleted
            ? 'Tidak ada bahan yang dihapus'
            : 'Klik "+ Tambah Bahan" untuk mulai'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Bahan</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="text-right">Harga Beli</TableHead>
            <TableHead className="text-right">Isi/Kemasan</TableHead>
            <TableHead className="text-right">Harga Unit</TableHead>
            <TableHead>Status</TableHead>
            {canEdit && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((mat) => (
            <TableRow
              key={mat.id}
              className={mat.deleted_at ? 'opacity-60' : undefined}
            >
              <TableCell className="font-medium">
                <Link
                  href={`/materials/${mat.id}`}
                  className="hover:underline text-primary"
                >
                  {mat.name}
                </Link>
                {mat.supplier && (
                  <p className="text-xs text-muted-foreground">{mat.supplier}</p>
                )}
              </TableCell>
              <TableCell>
                {mat.categories?.name ?? (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                {formatRupiah(mat.purchase_price)}
                <span className="text-xs text-muted-foreground ml-1">
                  /{mat.purchase_unit}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {mat.package_quantity} {mat.base_unit}
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                }).format(mat.unit_cost)}
                <span className="text-xs text-muted-foreground ml-1">
                  /{mat.base_unit}
                </span>
              </TableCell>
              <TableCell>
                {mat.deleted_at ? (
                  <Badge variant="destructive">Dihapus</Badge>
                ) : mat.status === 'ACTIVE' ? (
                  <Badge>Aktif</Badge>
                ) : (
                  <Badge variant="secondary">Nonaktif</Badge>
                )}
              </TableCell>
              {canEdit && (
                <TableCell>
                  <MaterialActions
                    mat={mat}
                    onDelete={handleDelete}
                    onRestore={handleRestore}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

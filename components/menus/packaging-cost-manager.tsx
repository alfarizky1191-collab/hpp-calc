'use client'

import { useActionState, useTransition, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { upsertPackagingCost, deletePackagingCost } from '@/lib/menus/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

type PackagingRow = Tables<'packaging_costs'>

interface PackagingCostManagerProps {
  menuId: string
  initialItems: PackagingRow[]
  canEdit: boolean
}

type FormState = { success: false; error: string } | { success: true; data: unknown }
const initialState: FormState = { success: false, error: '' }

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(v)
}

function AddPackagingForm({ menuId }: { menuId: string }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await upsertPackagingCost(_prev as Parameters<typeof upsertPackagingCost>[0], formData)
      if (result.success) {
        toast.success('Kemasan berhasil ditambahkan')
        return { success: true, data: null }
      }
      return { success: false, error: result.error }
    },
    initialState
  )

  return (
    <form action={formAction} className="rounded-md border p-4 space-y-3 bg-muted/30">
      <p className="text-sm font-medium">Tambah Kemasan</p>
      <input type="hidden" name="menuId" value={menuId} />

      {!state.success && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-1">
          <Label htmlFor="pkg-name" className="text-xs">Nama</Label>
          <Input
            id="pkg-name"
            name="name"
            placeholder="cth: Cup 16oz"
            required
            disabled={isPending}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pkg-qty" className="text-xs">Qty</Label>
          <Input
            id="pkg-qty"
            name="quantity"
            type="number"
            min="0"
            step="any"
            defaultValue="1"
            required
            disabled={isPending}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pkg-cost" className="text-xs">Harga/unit (Rp)</Label>
          <Input
            id="pkg-cost"
            name="unitCost"
            type="number"
            min="0"
            step="any"
            placeholder="cth: 500"
            required
            disabled={isPending}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <Button type="submit" size="sm" disabled={isPending}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        {isPending ? 'Menambahkan...' : 'Tambah'}
      </Button>
    </form>
  )
}

export function PackagingCostManager({
  menuId,
  initialItems,
  canEdit,
}: PackagingCostManagerProps) {
  const [, startTransition] = useTransition()
  const [items, setItems] = useState(initialItems)

  function handleDelete(id: string, name: string) {
    startTransition(async () => {
      const result = await deletePackagingCost(id, menuId)
      if (result.success) {
        toast.success(`Kemasan "${name}" dihapus`)
        setItems((prev) => prev.filter((i) => i.id !== id))
      } else {
        toast.error(result.error)
      }
    })
  }

  const total = items.reduce((sum, i) => sum + i.total_cost, 0)

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada kemasan ditambahkan</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Kemasan</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Harga/unit</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                {canEdit && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatRupiah(item.unit_cost)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatRupiah(item.total_cost)}
                  </td>
                  {canEdit && (
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.name)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="border-t bg-muted/30 font-semibold">
                <td className="px-3 py-2" colSpan={3}>Total Biaya Kemasan</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatRupiah(total)}
                </td>
                {canEdit && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {canEdit && <AddPackagingForm menuId={menuId} />}
    </div>
  )
}

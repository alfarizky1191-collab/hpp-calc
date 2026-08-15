'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createMaterial, updateMaterial } from '@/lib/materials/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Tables } from '@/types/database'

type MaterialRow = Tables<'materials'>
type CategoryRow = Tables<'categories'>

interface MaterialFormProps {
  material?: MaterialRow
  categories: CategoryRow[]
}

type FormState = { success: false; error: string } | { success: true; data: unknown }
const initialState: FormState = { success: false, error: '' }

function UnitCostPreview({
  purchasePrice,
  packageQuantity,
  baseUnit,
}: {
  purchasePrice: string
  packageQuantity: string
  baseUnit: string
}) {
  const price = parseFloat(purchasePrice)
  const qty = parseFloat(packageQuantity)
  if (!price || !qty || qty <= 0) return null
  const unitCost = price / qty
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(unitCost)
  return (
    <div className="rounded-md bg-muted px-3 py-2 text-sm">
      <span className="text-muted-foreground">Harga Unit: </span>
      <span className="font-semibold tabular-nums">
        {formatted}/{baseUnit || '...'}
      </span>
    </div>
  )
}

export function MaterialForm({ material, categories }: MaterialFormProps) {
  const router = useRouter()
  const isEdit = Boolean(material)

  const wrappedAction = async (
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const result = isEdit
      ? await updateMaterial(_prev as Parameters<typeof updateMaterial>[0], formData)
      : await createMaterial(_prev as Parameters<typeof createMaterial>[0], formData)
    if (result.success) return { success: true, data: result.data }
    return { success: false, error: result.error }
  }

  const [state, formAction, isPending] = useActionState(wrappedAction, initialState)

  // Controlled category â€” use 'none' when no valid category
  const initialCategoryId =
    material?.category_id && categories.some((c) => c.id === material.category_id)
      ? material.category_id
      : 'none'
  const [categoryId, setCategoryId] = useState(initialCategoryId)

  const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Aktif', INACTIVE: 'Nonaktif' }
  const [status, setStatus] = useState<string>(material?.status ?? 'ACTIVE')
  const [purchasePrice, setPurchasePrice] = useState(material?.purchase_price?.toString() ?? '')
  const [packageQuantity, setPackageQuantity] = useState(material?.package_quantity?.toString() ?? '')
  const [baseUnit, setBaseUnit] = useState(material?.base_unit ?? '')

  useEffect(() => {
    if (state.success) {
      toast.success(isEdit ? 'Bahan berhasil diperbarui' : 'Bahan berhasil ditambahkan')
      router.push('/materials')
    }
  }, [state.success, isEdit, router])

  // Label to display in trigger
  const categoryLabel =
    categoryId === 'none'
      ? 'â€” Tanpa Kategori â€”'
      : (categories.find((c) => c.id === categoryId)?.name ?? 'â€” Tanpa Kategori â€”')

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {material && <input type="hidden" name="id" value={material.id} />}
      {/* Hidden input carries the actual categoryId value to the server */}
      <input type="hidden" name="categoryId" value={categoryId === 'none' ? '' : categoryId} />

      {!state.success && state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Nama */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Nama Bahan <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          defaultValue={material?.name}
          placeholder="cth: Tepung Terigu, Gula Pasir"
          required
          disabled={isPending}
        />
      </div>

      {/* Kategori â€” controlled, display label correctly */}
      <div className="space-y-2">
        <Label>Kategori</Label>
        <Select value={categoryId} onValueChange={setCategoryId} disabled={isPending}>
          <SelectTrigger>
            <SelectValue>{categoryLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">â€” Tanpa Kategori â€”</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Supplier */}
      <div className="space-y-2">
        <Label htmlFor="supplier">Supplier</Label>
        <Input
          id="supplier"
          name="supplier"
          defaultValue={material?.supplier ?? ''}
          placeholder="Nama supplier (opsional)"
          disabled={isPending}
        />
      </div>

      {/* Satuan Pembelian */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="purchaseUnit">
            Satuan Pembelian <span className="text-destructive">*</span>
          </Label>
          <Input
            id="purchaseUnit"
            name="purchaseUnit"
            defaultValue={material?.purchase_unit}
            placeholder="cth: kg, liter, pack, karton"
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="baseUnit">
            Satuan Terkecil <span className="text-destructive">*</span>
          </Label>
          <Input
            id="baseUnit"
            name="baseUnit"
            defaultValue={material?.base_unit}
            placeholder="cth: gram, ml, butir"
            required
            disabled={isPending}
            onChange={(e) => setBaseUnit(e.target.value)}
          />
        </div>
      </div>

      {/* Harga & Isi */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="purchasePrice">
            Harga Pembelian (Rp) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="purchasePrice"
            name="purchasePrice"
            type="number"
            min="0"
            step="any"
            defaultValue={material?.purchase_price}
            placeholder="cth: 15000"
            required
            disabled={isPending}
            onChange={(e) => setPurchasePrice(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="packageQuantity">
            Isi Per Kemasan <span className="text-destructive">*</span>
          </Label>
          <Input
            id="packageQuantity"
            name="packageQuantity"
            type="number"
            min="0.000001"
            step="any"
            defaultValue={material?.package_quantity}
            placeholder="cth: 1000 (gram per kg)"
            required
            disabled={isPending}
            onChange={(e) => setPackageQuantity(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Berapa {baseUnit || 'satuan terkecil'} dalam 1 {material?.purchase_unit || 'satuan beli'}?
          </p>
        </div>
      </div>

      <UnitCostPreview
        purchasePrice={purchasePrice}
        packageQuantity={packageQuantity}
        baseUnit={baseUnit}
      />

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <input type="hidden" name="status" value={status} />
        <Select value={status} onValueChange={setStatus} disabled={isPending}>
          <SelectTrigger>
            <SelectValue>{STATUS_LABELS[status] ?? status}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="INACTIVE">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Input
          id="notes"
          name="notes"
          defaultValue={material?.notes ?? ''}
          placeholder="Catatan tambahan (opsional)"
          disabled={isPending}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Bahan'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Batal
        </Button>
      </div>
    </form>
  )
}
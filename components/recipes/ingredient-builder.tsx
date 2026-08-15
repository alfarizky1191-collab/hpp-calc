'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { saveRecipeItems } from '@/lib/recipes/actions'
import { calculateRecipeCost } from '@/lib/hpp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

type MaterialOption = Pick<Tables<'materials'>, 'id' | 'name' | 'base_unit' | 'unit_cost'>

interface IngredientRow {
  key: string
  materialId: string
  quantity: string
  unit: string
}

interface IngredientBuilderProps {
  recipeId: string
  yieldQuantity: number
  initialItems: Array<{
    material_id: string
    quantity: number
    unit: string
  }>
  materials: MaterialOption[]
  sellingPrice: number
  targetFoodCost: number
}

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v)
}

export function IngredientBuilder({
  recipeId,
  yieldQuantity,
  initialItems,
  materials,
  sellingPrice,
  targetFoodCost,
}: IngredientBuilderProps) {
  const [rows, setRows] = useState<IngredientRow[]>(
    initialItems.length > 0
      ? initialItems.map((item, i) => ({
          key: `item-${i}`,
          materialId: item.material_id,
          quantity: item.quantity.toString(),
          unit: item.unit,
        }))
      : [{ key: 'item-0', materialId: '', quantity: '', unit: '' }]
  )
  const [isPending, startTransition] = useTransition()
  const [savedResult, setSavedResult] = useState<{
    totalMaterialCost: string
    hppBahanPerUnit: string
  } | null>(null)

  const matMap = new Map(materials.map((m) => [m.id, m]))

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: `item-${Date.now()}`, materialId: '', quantity: '', unit: '' },
    ])
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }

  function updateRow(key: string, field: keyof IngredientRow, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r
        if (field === 'materialId') {
          const mat = matMap.get(value)
          return { ...r, materialId: value, unit: mat?.base_unit ?? r.unit }
        }
        return { ...r, [field]: value }
      })
    )
  }

  const livePreview = (() => {
    const validRows = rows.filter((r) => r.materialId && r.quantity && parseFloat(r.quantity) >= 0)
    if (validRows.length === 0 || yieldQuantity <= 0) return null
    try {
      return calculateRecipeCost({
        items: validRows.map((r) => ({
          materialId: r.materialId,
          quantity: r.quantity,
          unitCost: (matMap.get(r.materialId)?.unit_cost ?? 0).toString(),
        })),
        yieldQuantity: yieldQuantity.toString(),
      })
    } catch {
      return null
    }
  })()

  function handleSave() {
    const validRows = rows.filter((r) => r.materialId && r.quantity)
    if (validRows.length === 0) {
      toast.error('Tambahkan minimal 1 bahan')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('recipeId', recipeId)
      formData.set(
        'items',
        JSON.stringify(
          validRows.map((r) => ({
            materialId: r.materialId,
            quantity: r.quantity,
            unit: r.unit || matMap.get(r.materialId)?.base_unit || 'unit',
          }))
        )
      )

      const result = await saveRecipeItems(
        { success: false, error: '' },
        formData
      )

      if (result.success) {
        toast.success('Bahan resep berhasil disimpan')
        const d = result.data
        if (d && typeof d === 'object' && 'totalMaterialCost' in d) {
          setSavedResult(d as { totalMaterialCost: string; hppBahanPerUnit: string })
        }
      } else {
        toast.error(result.error)
      }
    })
  }

  const hppPreview = savedResult ?? livePreview
  const hppBahan = hppPreview ? parseFloat(hppPreview.hppBahanPerUnit) : 0
  const foodCostPct = sellingPrice > 0 ? (hppBahan / sellingPrice) * 100 : 0
  const targetPriceRaw = targetFoodCost > 0 ? (hppBahan / targetFoodCost) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {rows.map((row, idx) => {
          const mat = matMap.get(row.materialId)
          const itemCost =
            mat && row.quantity && parseFloat(row.quantity) >= 0
              ? parseFloat(row.quantity) * mat.unit_cost
              : null

          return (
            <div key={row.key} className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-48 space-y-1">
                {idx === 0 && <p className="text-xs text-muted-foreground">Bahan</p>}
                <Select
                  value={row.materialId && matMap.has(row.materialId) ? row.materialId : ''}
                  onValueChange={(v) => { if (v) updateRow(row.key, 'materialId', v) }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Pilih bahan...">
                      {mat?.name ?? (row.materialId ? 'Bahan tidak ditemukan' : undefined)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({formatRupiah(m.unit_cost)}/{m.base_unit})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-28 space-y-1">
                {idx === 0 && <p className="text-xs text-muted-foreground">Jumlah</p>}
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.key, 'quantity', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="w-20 space-y-1">
                {idx === 0 && <p className="text-xs text-muted-foreground">Satuan</p>}
                <Input
                  placeholder={mat?.base_unit ?? 'unit'}
                  value={row.unit}
                  onChange={(e) => updateRow(row.key, 'unit', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="w-28 space-y-1">
                {idx === 0 && <p className="text-xs text-muted-foreground">Cost</p>}
                <div className="h-8 flex items-center text-sm tabular-nums text-muted-foreground">
                  {itemCost !== null ? formatRupiah(itemCost) : '—'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="mb-0.5 text-muted-foreground hover:text-destructive transition-colors"
                title="Hapus baris"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4" />
        Tambah Bahan
      </button>

      {hppPreview && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium">Preview HPP Bahan</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total Cost Bahan</p>
              <p className="font-semibold tabular-nums">
                {formatRupiah(parseFloat(hppPreview.totalMaterialCost))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">HPP Bahan/unit</p>
              <p className="font-semibold tabular-nums">
                {formatRupiah(parseFloat(hppPreview.hppBahanPerUnit))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Food Cost</p>
              <p
                className={`font-semibold tabular-nums ${
                  foodCostPct > targetFoodCost
                    ? 'text-destructive'
                    : 'text-green-600'
                }`}
              >
                {foodCostPct.toFixed(1)}%
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  (target {targetFoodCost}%)
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Harga Rekomendasi</p>
              <p className="font-semibold tabular-nums">
                {formatRupiah(targetPriceRaw)}
              </p>
            </div>
          </div>
        </div>
      )}

      <Button type="button" onClick={handleSave} disabled={isPending}>
        <Save className="h-4 w-4 mr-2" />
        {isPending ? 'Menyimpan...' : 'Simpan Bahan Resep'}
      </Button>
    </div>
  )
}

'use client'

import { useActionState, useEffect, useState } from 'react'
import { calculateAndSaveHpp } from '@/lib/profitability/actions'
import { calculatePriceRecommendation } from '@/lib/hpp'
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
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

type Recipe = Pick<Tables<'recipes'>, 'id' | 'version' | 'yield_quantity' | 'yield_unit' | 'status'>

interface HppFormProps {
  menuId: string
  menuName: string
  sellingPrice: number
  targetFoodCost: number
  packagingTotal: number
  recipes: Recipe[]
  defaultOverhead?: number
}

type FormState =
  | { success: false; error: string }
  | { success: true; data: Tables<'hpp_calculations'> }

const initialState: FormState = { success: false, error: '' }

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v)
}

export function HppCalculationForm({
  menuId,
  menuName,
  targetFoodCost,
  packagingTotal,
  recipes,
  defaultOverhead = 0,
}: HppFormProps) {
  const activeRecipe = recipes.find((r) => r.status === 'ACTIVE') ?? recipes[0]
  const [selectedRecipeId, setSelectedRecipeId] = useState(activeRecipe?.id ?? '')
  const [overhead, setOverhead] = useState(defaultOverhead.toFixed(2))
  const [otherCost, setOtherCost] = useState('0')

  const wrappedAction = async (
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const result = await calculateAndSaveHpp(
      _prev as Parameters<typeof calculateAndSaveHpp>[0],
      formData
    )
    if (result.success) return { success: true, data: result.data }
    return { success: false, error: result.error }
  }

  const [state, formAction, isPending] = useActionState(wrappedAction, initialState)

  useEffect(() => {
    if (state.success) {
      toast.success('HPP berhasil dihitung dan disimpan')
    }
  }, [state.success, state])

  // Smart pricing preview after successful calculation
  const smartPricing = (() => {
    const hpp = state.success ? state.data.total_hpp : null
    if (!hpp || hpp <= 0) return null
    try {
      return calculatePriceRecommendation({
        totalHpp: hpp.toString(),
        targetFoodCostPct: targetFoodCost.toString(),
      })
    } catch {
      return null
    }
  })()

  const result = state.success ? state.data : null

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="menuId" value={menuId} />
        <input type="hidden" name="recipeId" value={selectedRecipeId} />

        {!state.success && state.error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {state.error}
          </div>
        )}

        {/* Recipe selector */}
        <div className="space-y-2">
          <Label>Resep yang Dihitung</Label>
          {recipes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada resep. Buat resep terlebih dahulu.
            </p>
          ) : (
            <Select
              value={selectedRecipeId}
              onValueChange={(v) => { if (v) setSelectedRecipeId(v) }}
            >
              <SelectTrigger>
                <SelectValue>
                  {(() => {
                    const r = recipes.find((r) => r.id === selectedRecipeId)
                    if (!r) return 'Pilih resep...'
                    return `Resep v${r.version} — Yield: ${r.yield_quantity} ${r.yield_unit}${r.status === 'ACTIVE' ? ' ● Aktif' : ''}`
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {recipes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Resep v{r.version} — Yield: {r.yield_quantity} {r.yield_unit}
                    {r.status === 'ACTIVE' && ' ● Aktif'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Packaging info (read-only) */}
        {(() => {
          const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId)
          const yieldQty = selectedRecipe?.yield_quantity ?? 1
          const yieldUnit = selectedRecipe?.yield_unit ?? 'porsi'
          const packagingPerUnit = yieldQty > 0 ? packagingTotal / yieldQty : packagingTotal
          return (
            <div className="rounded-md bg-muted/40 px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Biaya Kemasan (total)</span>
                <span className="font-medium tabular-nums">{formatRupiah(packagingTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per {yieldUnit}</span>
                <span className="font-medium tabular-nums">{formatRupiah(packagingPerUnit)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Dibagi {yieldQty} {yieldUnit} (yield resep) = per porsi
              </p>
            </div>
          )
        })()}

        {/* Overhead */}
        <div className="space-y-2">
          <Label htmlFor="overheadCost">Overhead / Biaya Operasional (Rp)</Label>
          <Input
            id="overheadCost"
            name="overheadCost"
            type="number"
            min="0"
            step="any"
            value={overhead}
            onChange={(e) => setOverhead(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Total overhead per batch resep ini — akan dibagi yield secara otomatis
          </p>
        </div>

        {/* Other cost */}
        <div className="space-y-2">
          <Label htmlFor="otherCost">Biaya Lain-lain (Rp)</Label>
          <Input
            id="otherCost"
            name="otherCost"
            type="number"
            min="0"
            step="any"
            value={otherCost}
            onChange={(e) => setOtherCost(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Total biaya lain per batch — akan dibagi yield secara otomatis
          </p>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Catatan (opsional)</Label>
          <Input
            id="notes"
            name="notes"
            placeholder="cth: Kalkulasi bulan Agustus 2024"
            disabled={isPending}
          />
        </div>

        <Button
          type="submit"
          disabled={isPending || !selectedRecipeId || recipes.length === 0}
        >
          {isPending ? 'Menghitung...' : 'Hitung & Simpan HPP'}
        </Button>
      </form>

      {/* Result card */}
      {result && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-sm font-medium">Hasil Kalkulasi HPP — {menuName}</p>
            <p className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(result.calculated_at))}
              {' · '}{result.calculation_version}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border">
            {[
              { label: 'Biaya Bahan', value: formatRupiah(result.material_cost) },
              { label: 'Biaya Kemasan', value: formatRupiah(result.packaging_cost) },
              { label: 'Overhead', value: formatRupiah(result.overhead_cost) },
              { label: 'Biaya Lain', value: formatRupiah(result.other_cost) },
              {
                label: 'Total HPP',
                value: formatRupiah(result.total_hpp),
                className: 'font-bold text-primary',
              },
              {
                label: 'Food Cost',
                value: `${result.food_cost.toFixed(2)}%`,
                className:
                  result.food_cost > targetFoodCost ? 'text-destructive' : 'text-green-600',
              },
              { label: 'Harga Jual', value: formatRupiah(result.selling_price) },
              {
                label: 'Profit',
                value: formatRupiah(result.profit),
                className: result.profit >= 0 ? 'text-green-600' : 'text-destructive',
              },
              { label: 'Margin', value: `${result.margin.toFixed(2)}%` },
            ].map((item) => (
              <div key={item.label} className="bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-sm font-semibold tabular-nums mt-0.5 ${item.className ?? ''}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Pricing */}
      {smartPricing && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">Smart Pricing</p>
          <p className="text-xs text-muted-foreground">
            Rekomendasi harga jual berdasarkan HPP dan target food cost {targetFoodCost}%
          </p>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Harga rekomendasi</p>
            <p className="text-lg font-bold tabular-nums">
              {formatRupiah(parseFloat(smartPricing.recommendedPrice))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Opsi pembulatan</p>
            <div className="flex flex-wrap gap-2">
              {smartPricing.roundedOptions.map((price) => (
                <div
                  key={price}
                  className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm font-semibold tabular-nums"
                >
                  {formatRupiah(parseFloat(price))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

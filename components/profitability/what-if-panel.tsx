'use client'

import { useState, useTransition } from 'react'
import { runWhatIfServer } from '@/lib/profitability/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { WhatIfResult } from '@/lib/hpp/simulate-what-if'

interface WhatIfPanelProps {
  hppBahan: string
  packagingCost: string
  overheadCost: string
  otherCost: string
  sellingPrice: string
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

function DeltaBadge({ original, simulated }: { original: number; simulated: number }) {
  const diff = simulated - original
  const pct = original !== 0 ? ((diff / original) * 100).toFixed(1) : null
  if (Math.abs(diff) < 0.01) return null
  return (
    <span
      className={`text-xs ml-2 ${diff > 0 ? 'text-destructive' : 'text-green-600'}`}
    >
      {diff > 0 ? '+' : ''}
      {pct !== null ? `${pct}%` : formatRupiah(diff)}
    </span>
  )
}

export function WhatIfPanel({
  hppBahan,
  packagingCost,
  overheadCost,
  otherCost,
  sellingPrice,
  targetFoodCost,
}: WhatIfPanelProps) {
  const [matChange, setMatChange] = useState('0')
  const [priceChange, setPriceChange] = useState('0')
  const [overheadChange, setOverheadChange] = useState('0')
  const [result, setResult] = useState<WhatIfResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const origHpp = parseFloat(hppBahan) + parseFloat(packagingCost) + parseFloat(overheadCost) + parseFloat(otherCost)
  const origFoodCost = parseFloat(sellingPrice) > 0
    ? (parseFloat(hppBahan) / parseFloat(sellingPrice)) * 100
    : 0

  function handleSimulate() {
    startTransition(async () => {
      const res = await runWhatIfServer({
        hppBahan,
        packagingCost,
        overheadCost,
        otherCost,
        sellingPrice,
        materialPriceChangePct: parseFloat(matChange) || undefined,
        sellingPriceChangePct: parseFloat(priceChange) || undefined,
        overheadChangePct: parseFloat(overheadChange) || undefined,
      })

      if (res.success) {
        setResult(res.data)
      } else {
        toast.error(res.error)
      }
    })
  }

  function handleReset() {
    setMatChange('0')
    setPriceChange('0')
    setOverheadChange('0')
    setResult(null)
  }

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5">
      <div>
        <p className="font-medium text-sm">What-If Simulation</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Simulasi perubahan parameter tanpa mengubah data produksi
        </p>
      </div>

      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="mat-change" className="text-xs">
            Perubahan Harga Bahan (%)
          </Label>
          <Input
            id="mat-change"
            type="number"
            step="any"
            value={matChange}
            onChange={(e) => setMatChange(e.target.value)}
            placeholder="cth: 10 = +10%"
            className="h-8 text-sm"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price-change" className="text-xs">
            Perubahan Harga Jual (%)
          </Label>
          <Input
            id="price-change"
            type="number"
            step="any"
            value={priceChange}
            onChange={(e) => setPriceChange(e.target.value)}
            placeholder="cth: 5 = +5%"
            className="h-8 text-sm"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="overhead-change" className="text-xs">
            Perubahan Overhead (%)
          </Label>
          <Input
            id="overhead-change"
            type="number"
            step="any"
            value={overheadChange}
            onChange={(e) => setOverheadChange(e.target.value)}
            placeholder="cth: 20 = +20%"
            className="h-8 text-sm"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSimulate} disabled={isPending}>
          {isPending ? 'Mensimulasikan...' : 'Jalankan Simulasi'}
        </Button>
        {result && (
          <Button size="sm" variant="ghost" onClick={handleReset}>
            Reset
          </Button>
        )}
      </div>

      {/* Result comparison */}
      {result && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-xs">Metrik</th>
                <th className="px-3 py-2 text-right font-medium text-xs">Sekarang</th>
                <th className="px-3 py-2 text-right font-medium text-xs">Simulasi</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: 'Total HPP',
                  orig: origHpp,
                  sim: parseFloat(result.newTotalHpp),
                  format: (v: number) => formatRupiah(v),
                },
                {
                  label: 'Harga Jual',
                  orig: parseFloat(sellingPrice),
                  sim: parseFloat(result.newSellingPrice),
                  format: (v: number) => formatRupiah(v),
                },
                {
                  label: 'Food Cost',
                  orig: origFoodCost,
                  sim: parseFloat(result.newFoodCostPct),
                  format: (v: number) => `${v.toFixed(2)}%`,
                  warnHigh: true,
                },
                {
                  label: 'Profit',
                  orig: parseFloat(sellingPrice) - origHpp,
                  sim: parseFloat(result.newProfit),
                  format: (v: number) => formatRupiah(v),
                  greenPos: true,
                },
                {
                  label: 'Margin',
                  orig: parseFloat(sellingPrice) > 0
                    ? ((parseFloat(sellingPrice) - origHpp) / parseFloat(sellingPrice)) * 100
                    : 0,
                  sim: parseFloat(result.newMarginPct),
                  format: (v: number) => `${v.toFixed(2)}%`,
                },
              ].map((row) => {
                const improved = row.warnHigh
                  ? row.sim <= row.orig
                  : row.greenPos
                    ? row.sim >= row.orig
                    : false
                const worsened = row.warnHigh
                  ? row.sim > targetFoodCost + 2
                  : row.greenPos
                    ? row.sim < 0
                    : false

                return (
                  <tr key={row.label} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.format(row.orig)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums font-medium ${
                        worsened ? 'text-destructive' : improved ? 'text-green-600' : ''
                      }`}
                    >
                      {row.format(row.sim)}
                      <DeltaBadge original={row.orig} simulated={row.sim} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground">
            ⚠ Simulasi tidak disimpan ke database dan tidak mempengaruhi data produksi.
          </div>
        </div>
      )}
    </div>
  )
}

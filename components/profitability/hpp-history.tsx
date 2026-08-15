import type { Tables } from '@/types/database'

type HppCalcRow = Tables<'hpp_calculations'>

interface HppHistoryProps {
  history: HppCalcRow[]
}

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(v)
}

export function HppHistory({ history }: HppHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Belum ada riwayat kalkulasi HPP
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Tanggal</th>
            <th className="px-4 py-3 text-right font-medium">Total HPP</th>
            <th className="px-4 py-3 text-right font-medium">Harga Jual</th>
            <th className="px-4 py-3 text-right font-medium">Food Cost</th>
            <th className="px-4 py-3 text-right font-medium">Profit</th>
            <th className="px-4 py-3 text-right font-medium">Margin</th>
            <th className="px-4 py-3 text-left font-medium">Versi</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row, idx) => (
            <tr
              key={row.id}
              className={`border-t ${idx === 0 ? 'bg-primary/5' : 'hover:bg-muted/20'} transition-colors`}
            >
              <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                {new Intl.DateTimeFormat('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(row.calculated_at))}
                {idx === 0 && (
                  <span className="ml-2 text-xs text-primary font-medium">Terbaru</span>
                )}
              </td>
              <td className="px-4 py-2 text-right tabular-nums font-medium">
                {formatRupiah(row.total_hpp)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {formatRupiah(row.selling_price)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {row.food_cost.toFixed(2)}%
              </td>
              <td
                className={`px-4 py-2 text-right tabular-nums ${
                  row.profit < 0 ? 'text-destructive' : 'text-green-600'
                }`}
              >
                {formatRupiah(row.profit)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {row.margin.toFixed(2)}%
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">
                {row.calculation_version}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

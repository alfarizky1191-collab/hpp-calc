import { EXPENSE_CATEGORY_LABELS } from '@/lib/expenses/schemas'
import type { EXPENSE_CATEGORIES } from '@/lib/expenses/schemas'

interface SummaryItem {
  category: string
  total: number
}

interface PeriodSummaryProps {
  summary: SummaryItem[]
  grandTotal: number
  period: string
}

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(v)
}

function formatPeriod(period: string) {
  const [year, month] = period.split('-')
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ]
  const monthIdx = parseInt(month ?? '1', 10) - 1
  return `${monthNames[monthIdx] ?? month} ${year}`
}

export function PeriodSummary({ summary, grandTotal, period }: PeriodSummaryProps) {
  if (summary.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Belum ada data biaya untuk periode ini
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="text-sm font-medium">
          Ringkasan Biaya — {formatPeriod(period)}
        </p>
      </div>

      <div className="divide-y">
        {summary.map((item) => {
          const label =
            EXPENSE_CATEGORY_LABELS[
              item.category as (typeof EXPENSE_CATEGORIES)[number]
            ] ?? item.category
          const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0

          return (
            <div key={item.category} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm">{label}</span>
                <span className="text-sm font-medium tabular-nums">
                  {formatRupiah(item.total)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {pct.toFixed(1)}% dari total
              </p>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
        <span className="text-sm font-semibold">Total Overhead</span>
        <span className="text-sm font-bold tabular-nums text-primary">
          {formatRupiah(grandTotal)}
        </span>
      </div>
    </div>
  )
}

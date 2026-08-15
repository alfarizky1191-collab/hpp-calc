import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Tables } from '@/types/database'

type PriceHistoryRow = Tables<'material_price_history'>

interface PriceHistoryListProps {
  history: PriceHistoryRow[]
  currentPrice: number
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function PriceHistoryList({
  history,
  currentPrice,
}: PriceHistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Belum ada riwayat perubahan harga
      </div>
    )
  }

  return (
    <ol className="relative border-l border-border ml-3 space-y-4">
      {/* Current price as first item */}
      <li className="ml-6">
        <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {formatRupiah(currentPrice)}
          </span>
          <span className="text-xs text-muted-foreground">Harga saat ini</span>
        </div>
      </li>

      {history.map((entry) => {
        const diff = entry.new_price - entry.old_price
        const pct =
          entry.old_price > 0
            ? ((diff / entry.old_price) * 100).toFixed(1)
            : null

        return (
          <li key={entry.id} className="ml-6">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-muted ring-4 ring-background" />
            <div className="rounded-md border bg-card px-3 py-2 shadow-sm">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  {diff > 0 ? (
                    <TrendingUp className="h-4 w-4 text-destructive shrink-0" />
                  ) : diff < 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm">
                    <span className="line-through text-muted-foreground">
                      {formatRupiah(entry.old_price)}
                    </span>
                    {' → '}
                    <span className="font-medium">
                      {formatRupiah(entry.new_price)}
                    </span>
                  </span>
                  {pct !== null && (
                    <span
                      className={`text-xs font-medium ${
                        diff > 0
                          ? 'text-destructive'
                          : diff < 0
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {diff > 0 ? '+' : ''}
                      {pct}%
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDate(entry.created_at)}
                </span>
              </div>
              {entry.notes && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.notes}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

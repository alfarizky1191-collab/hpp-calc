import Link from 'next/link'
import { Trophy, TrendingUp, AlertTriangle } from 'lucide-react'
import type { RankedMenu } from '@/lib/dashboard/actions'

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(v)
}

interface RankingCardProps {
  title: string
  subtitle: string
  icon: React.ElementType
  iconClass: string
  items: RankedMenu[]
  valueKey: keyof RankedMenu
  valueFormat: (v: number) => string
  higherIsBetter?: boolean
}

function RankingCard({
  title,
  subtitle,
  icon: Icon,
  iconClass,
  items,
  valueKey,
  valueFormat,
  higherIsBetter = true,
}: RankingCardProps) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada data</p>
      ) : (
        <ol className="space-y-2">
          {items.map((menu, idx) => {
            const value = menu[valueKey] as number
            return (
              <li key={menu.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">
                  {idx + 1}
                </span>
                <Link
                  href={`/profitability/${menu.id}`}
                  className="flex-1 min-w-0 hover:underline text-sm font-medium truncate"
                >
                  {menu.name}
                </Link>
                <span
                  className={`text-sm font-semibold tabular-nums shrink-0 ${
                    !higherIsBetter && value > menu.target_food_cost + 5
                      ? 'text-destructive'
                      : ''
                  }`}
                >
                  {valueFormat(value)}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

interface RankingCardsProps {
  highestMargin: RankedMenu[]
  highestProfit: RankedMenu[]
  highestFoodCost: RankedMenu[]
  needsAttention: RankedMenu[]
}

export function RankingCards({
  highestMargin,
  highestProfit,
  highestFoodCost,
  needsAttention,
}: RankingCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <RankingCard
        title="Margin Tertinggi"
        subtitle="Persentase margin terbesar"
        icon={Trophy}
        iconClass="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30"
        items={highestMargin}
        valueKey="margin"
        valueFormat={(v) => `${v.toFixed(1)}%`}
      />
      <RankingCard
        title="Profit Tertinggi"
        subtitle="Profit per porsi terbesar"
        icon={TrendingUp}
        iconClass="bg-green-100 text-green-700 dark:bg-green-900/30"
        items={highestProfit}
        valueKey="profit"
        valueFormat={formatRupiah}
      />
      <RankingCard
        title="Food Cost Tertinggi"
        subtitle="Persentase food cost terbesar"
        icon={AlertTriangle}
        iconClass="bg-amber-100 text-amber-700 dark:bg-amber-900/30"
        items={highestFoodCost}
        valueKey="food_cost"
        valueFormat={(v) => `${v.toFixed(1)}%`}
        higherIsBetter={false}
      />
      <RankingCard
        title="Perlu Perhatian"
        subtitle="Food cost melebihi target >3%"
        icon={AlertTriangle}
        iconClass="bg-red-100 text-red-700 dark:bg-red-900/30"
        items={needsAttention}
        valueKey="food_cost"
        valueFormat={(v) => `${v.toFixed(1)}%`}
        higherIsBetter={false}
      />
    </div>
  )
}

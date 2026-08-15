import Link from 'next/link'
import { TrendingUp, TrendingDown, AlertTriangle, Minus } from 'lucide-react'
import { getMenusWithLatestHpp } from '@/lib/profitability/actions'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { MenuDeleteButton } from '@/components/menus/menu-delete-button'
import { getCurrentProfile } from '@/lib/auth/rbac'
import { cn } from '@/lib/utils'

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(v)
}

function FoodCostBadge({
  foodCost,
  target,
}: {
  foodCost: number
  target: number
}) {
  const diff = foodCost - target
  if (diff > 5)
    return (
      <span className="flex items-center gap-1 text-destructive text-xs font-medium">
        <TrendingUp className="h-3 w-3" />
        {foodCost.toFixed(1)}%
      </span>
    )
  if (diff < -5)
    return (
      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
        <TrendingDown className="h-3 w-3" />
        {foodCost.toFixed(1)}%
      </span>
    )
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
      <Minus className="h-3 w-3" />
      {foodCost.toFixed(1)}%
    </span>
  )
}

export default async function ProfitabilityPage() {
  const [{ data: menus, error }, profile] = await Promise.all([
    getMenusWithLatestHpp(),
    getCurrentProfile(),
  ])

  const canEdit = profile?.role === 'OWNER' || profile?.role === 'ADMIN'

  // Summary stats
  const withHpp = menus.filter((m) => m.latestHpp)
  const avgFoodCost =
    withHpp.length > 0
      ? withHpp.reduce((s, m) => s + (m.latestHpp?.food_cost ?? 0), 0) / withHpp.length
      : null
  const avgMargin =
    withHpp.length > 0
      ? withHpp.reduce((s, m) => s + (m.latestHpp?.margin ?? 0), 0) / withHpp.length
      : null
  const totalProfit =
    withHpp.length > 0
      ? withHpp.reduce((s, m) => s + (m.latestHpp?.profit ?? 0), 0)
      : null
  const needsAttention = menus.filter(
    (m) =>
      m.latestHpp &&
      m.latestHpp.food_cost > m.target_food_cost + 5
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profitabilitas</h1>
        <p className="text-muted-foreground text-sm">
          HPP, food cost, profit, dan margin per menu
        </p>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Menu dengan HPP</p>
          <p className="text-2xl font-bold mt-1">{withHpp.length}<span className="text-sm text-muted-foreground font-normal">/{menus.length}</span></p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Rata-rata Food Cost</p>
          <p className="text-2xl font-bold mt-1">
            {avgFoodCost !== null ? `${avgFoodCost.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Rata-rata Margin</p>
          <p className="text-2xl font-bold mt-1">
            {avgMargin !== null ? `${avgMargin.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Profit (snapshot)</p>
          <p className="text-2xl font-bold mt-1">
            {totalProfit !== null ? formatRupiah(totalProfit) : '—'}
          </p>
        </div>
      </div>

      {/* Perlu perhatian */}
      {needsAttention.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-800">
              {needsAttention.length} menu food cost melebihi target
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {needsAttention.map((m) => (
              <Link
                key={m.id}
                href={`/profitability/${m.id}`}
                className="text-xs text-amber-700 hover:underline bg-amber-100 px-2 py-0.5 rounded"
              >
                {m.name} ({m.latestHpp!.food_cost.toFixed(1)}%)
              </Link>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Table */}
      {menus.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="font-medium">Belum ada menu</p>
          <p className="text-sm mt-1">Buat menu terlebih dahulu di halaman Menu</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Menu</th>
                <th className="px-4 py-3 text-right font-medium">Harga Jual</th>
                <th className="px-4 py-3 text-right font-medium">HPP</th>
                <th className="px-4 py-3 text-right font-medium">Food Cost</th>
                <th className="px-4 py-3 text-right font-medium">Profit</th>
                <th className="px-4 py-3 text-right font-medium">Margin</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((menu) => {
                const hpp = menu.latestHpp
                return (
                  <tr
                    key={menu.id}
                    className="border-t hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/profitability/${menu.id}`}
                        className="font-medium hover:underline text-primary"
                      >
                        {menu.name}
                      </Link>
                      {(menu.categories as { name: string } | null)?.name && (
                        <p className="text-xs text-muted-foreground">
                          {(menu.categories as { name: string }).name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatRupiah(menu.selling_price)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {hpp ? formatRupiah(hpp.total_hpp) : (
                        <Link
                          href={`/profitability/${menu.id}`}
                          className="text-xs text-primary hover:underline whitespace-nowrap"
                        >
                          Hitung HPP →
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hpp ? (
                        <FoodCostBadge
                          foodCost={hpp.food_cost}
                          target={menu.target_food_cost}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {hpp ? (
                        <span className={hpp.profit < 0 ? 'text-destructive' : 'text-green-600'}>
                          {formatRupiah(hpp.profit)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {hpp ? `${hpp.margin.toFixed(1)}%` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          menu.status === 'ACTIVE' ? 'default'
                            : menu.status === 'DRAFT' ? 'outline'
                            : 'secondary'
                        }
                      >
                        {menu.status === 'ACTIVE' ? 'Aktif'
                          : menu.status === 'DRAFT' ? 'Draft'
                          : 'Nonaktif'}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/menus/${menu.id}/edit`}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                          >
                            Edit
                          </Link>
                          <MenuDeleteButton menuId={menu.id} menuName={menu.name} />
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

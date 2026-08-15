import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getProfitabilityDetail } from '@/lib/profitability/actions'
import { getCurrentProfile } from '@/lib/auth/rbac'
import { HppCalculationForm } from '@/components/profitability/hpp-calculation-form'
import { WhatIfPanel } from '@/components/profitability/what-if-panel'
import { HppHistory } from '@/components/profitability/hpp-history'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProfitabilityDetailPageProps {
  params: Promise<{ menuId: string }>
}

export default async function ProfitabilityDetailPage({
  params,
}: ProfitabilityDetailPageProps) {
  const { menuId } = await params
  const [profile, { menu, recipes, packagingTotal, history, error }] =
    await Promise.all([getCurrentProfile(), getProfitabilityDetail(menuId)])

  if (error || !menu) notFound()

  const canCalculate = profile?.role === 'OWNER' || profile?.role === 'ADMIN'
  const latestHpp = history[0] ?? null

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/profitability"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Profitabilitas
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{menu.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Harga jual:{' '}
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(menu.selling_price)}
              {' · '}Target FC: {menu.target_food_cost}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/menus/${menu.id}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Lihat Menu
            </Link>
            <Badge
              variant={
                menu.status === 'ACTIVE'
                  ? 'default'
                  : menu.status === 'DRAFT'
                    ? 'outline'
                    : 'secondary'
              }
            >
              {menu.status === 'ACTIVE'
                ? 'Aktif'
                : menu.status === 'DRAFT'
                  ? 'Draft'
                  : 'Nonaktif'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Latest HPP summary */}
      {latestHpp && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'HPP Terakhir', value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(latestHpp.total_hpp) },
            {
              label: 'Food Cost',
              value: `${latestHpp.food_cost.toFixed(2)}%`,
              highlight: latestHpp.food_cost > menu.target_food_cost,
            },
            {
              label: 'Profit',
              value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(latestHpp.profit),
              green: latestHpp.profit >= 0,
            },
            { label: 'Margin', value: `${latestHpp.margin.toFixed(2)}%` },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p
                className={`text-lg font-bold tabular-nums mt-1 ${
                  item.highlight
                    ? 'text-destructive'
                    : item.green === false
                      ? 'text-destructive'
                      : item.green
                        ? 'text-green-600'
                        : ''
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* HPP Calculation Form */}
        {canCalculate && (
          <section>
            <h2 className="font-semibold text-lg mb-4">Hitung HPP</h2>
            <HppCalculationForm
              menuId={menu.id}
              menuName={menu.name}
              sellingPrice={menu.selling_price}
              targetFoodCost={menu.target_food_cost}
              packagingTotal={packagingTotal}
              recipes={recipes}
            />
          </section>
        )}

        {/* What-If Simulation (only if there's a previous calculation) */}
        {latestHpp && (
          <section>
            <h2 className="font-semibold text-lg mb-4">Simulasi</h2>
            <WhatIfPanel
              hppBahan={latestHpp.material_cost.toString()}
              packagingCost={latestHpp.packaging_cost.toString()}
              overheadCost={latestHpp.overhead_cost.toString()}
              otherCost={latestHpp.other_cost.toString()}
              sellingPrice={latestHpp.selling_price.toString()}
              targetFoodCost={menu.target_food_cost}
            />
          </section>
        )}
      </div>

      {/* History */}
      <section>
        <h2 className="font-semibold text-lg mb-4">
          Riwayat Kalkulasi
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({history.length} kalkulasi)
          </span>
        </h2>
        <HppHistory history={history} />
      </section>
    </div>
  )
}

import Link from 'next/link'
import { getDashboardData } from '@/lib/dashboard/actions'
import { AlertSection } from '@/components/dashboard/alert-section'
import { RankingCards } from '@/components/dashboard/ranking-cards'
import { ProfitabilityChart } from '@/components/dashboard/profitability-chart'

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(v)
}

function KpiCard({
  title,
  value,
  description,
  href,
  highlight,
}: {
  title: string
  value: string
  description: string
  href?: string
  highlight?: boolean
}) {
  const content = (
    <div
      className={`rounded-lg border bg-card p-5 shadow-sm space-y-1 ${
        href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
      } ${highlight ? 'border-primary/30 bg-primary/5' : ''}`}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </p>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  const { kpis, highestMargin, highestProfit, highestFoodCost, needsAttention, alerts, chartData } = data

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Ringkasan HPP dan profitabilitas bisnis kamu
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Total Bahan"
          value={kpis.totalMaterials.toString()}
          description="Bahan aktif"
          href="/materials"
        />
        <KpiCard
          title="Total Menu"
          value={kpis.totalMenus.toString()}
          description={`${kpis.activeMenus} aktif`}
          href="/menus"
        />
        <KpiCard
          title="Menu dengan HPP"
          value={kpis.totalMenusWithHpp.toString()}
          description={`dari ${kpis.totalMenus} menu`}
          href="/profitability"
          highlight={kpis.totalMenusWithHpp < kpis.totalMenus}
        />
        <KpiCard
          title="Rata-rata Food Cost"
          value={
            kpis.avgFoodCost !== null
              ? `${kpis.avgFoodCost.toFixed(1)}%`
              : '—'
          }
          description="Dari semua menu ber-HPP"
          href="/profitability"
        />
        <KpiCard
          title="Rata-rata Margin"
          value={
            kpis.avgMargin !== null
              ? `${kpis.avgMargin.toFixed(1)}%`
              : '—'
          }
          description="Dari semua menu ber-HPP"
          href="/profitability"
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <section>
          <h2 className="font-semibold text-base mb-3">
            Notifikasi
            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1">
              {alerts.length}
            </span>
          </h2>
          <AlertSection alerts={alerts} />
        </section>
      )}

      {/* Rankings */}
      {kpis.totalMenusWithHpp > 0 && (
        <section>
          <h2 className="font-semibold text-base mb-3">Ranking Menu</h2>
          <RankingCards
            highestMargin={highestMargin}
            highestProfit={highestProfit}
            highestFoodCost={highestFoodCost}
            needsAttention={needsAttention}
          />
        </section>
      )}

      {/* Chart */}
      {chartData.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">Profitabilitas Menu</h2>
            <Link
              href="/profitability"
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Lihat semua →
            </Link>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <ProfitabilityChart data={chartData} />
          </div>
        </section>
      ) : (
        /* Empty state */
        <div className="rounded-lg border border-dashed p-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="font-semibold mb-1">Belum ada data profitabilitas</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Mulai dengan menambahkan bahan baku, buat menu dan resep, lalu hitung
            HPP untuk melihat dashboard terisi.
          </p>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <Link
              href="/materials/new"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              + Tambah Bahan
            </Link>
            <Link
              href="/menus/new"
              className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              + Buat Menu
            </Link>
            <Link
              href="/profitability"
              className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Hitung HPP
            </Link>
          </div>
        </div>
      )}

      {/* Quick stats footer */}
      {kpis.totalMenusWithHpp > 0 && (
        <div className="rounded-lg border bg-muted/30 px-5 py-4">
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>
              Total profit snapshot:{' '}
              <span className="font-semibold text-foreground">
                {formatRupiah(
                  highestProfit.reduce((s, m) => s + m.profit, 0)
                )}
              </span>
            </span>
            <span>
              Menu margin terbaik:{' '}
              <span className="font-semibold text-foreground">
                {highestMargin[0]
                  ? `${highestMargin[0].name} (${highestMargin[0].margin.toFixed(1)}%)`
                  : '—'}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

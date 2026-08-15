import Link from 'next/link'
import { Plus } from 'lucide-react'
import {
  getExpenses,
  getAvailablePeriods,
  getPeriodSummary,
} from '@/lib/expenses/actions'
import { getCurrentProfile } from '@/lib/auth/rbac'
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORIES } from '@/lib/expenses/schemas'
import { PeriodSummary } from '@/components/expenses/period-summary'
import { ExpenseActions } from '@/components/expenses/expense-actions'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface ExpensesPageProps {
  searchParams: Promise<{
    period?: string
    category?: string
    page?: string
  }>
}

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(v)
}

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatPeriod(period: string) {
  const [year, month] = period.split('-')
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  const idx = parseInt(month ?? '1', 10) - 1
  return `${monthNames[idx] ?? month} ${year}`
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = await searchParams
  const period = params.period ?? currentPeriod()
  const category = params.category ?? 'all'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const [profile, { data: expenses, total }, periods, { summary, grandTotal }] =
    await Promise.all([
      getCurrentProfile(),
      getExpenses({ period, category, page, pageSize: 50 }),
      getAvailablePeriods(),
      getPeriodSummary(period),
    ])

  const canEdit = profile?.role === 'OWNER' || profile?.role === 'ADMIN'
  const totalPages = Math.ceil(total / 50)

  // Ensure current period is always in the list
  const allPeriods = periods.includes(period) ? periods : [period, ...periods]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Biaya Operasional</h1>
          <p className="text-muted-foreground text-sm">
            {total} biaya di periode {formatPeriod(period)}
          </p>
        </div>
        {canEdit && (
          <Link
            href={`/expenses/new?period=${period}`}
            className={cn(buttonVariants())}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Biaya
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: filters + table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <form method="GET" className="flex gap-3 flex-wrap">
            <Select name="period" defaultValue={period}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allPeriods.map((p) => (
                  <SelectItem key={p} value={p}>
                    {formatPeriod(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select name="category" defaultValue={category}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {EXPENSE_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="submit"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Filter
            </button>
          </form>

          {/* Table */}
          {expenses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              <p className="font-medium">Belum ada biaya</p>
              <p className="text-sm mt-1">
                {canEdit
                  ? 'Klik "+ Tambah Biaya" untuk mulai'
                  : 'Belum ada data biaya untuk periode ini'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Nama Biaya</th>
                    <th className="px-4 py-3 text-left font-medium">Kategori</th>
                    <th className="px-4 py-3 text-left font-medium">Tanggal</th>
                    <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                    {canEdit && <th className="w-16" />}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{exp.name}</p>
                        {exp.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-48">
                            {exp.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {EXPENSE_CATEGORY_LABELS[
                            exp.category as (typeof EXPENSE_CATEGORIES)[number]
                          ] ?? exp.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Intl.DateTimeFormat('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }).format(new Date(exp.expense_date))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {formatRupiah(exp.amount)}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-3">
                          <ExpenseActions id={exp.id} name={exp.name} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {/* Footer total */}
                {expenses.length > 1 && (
                  <tfoot>
                    <tr className="border-t bg-muted/30 font-semibold">
                      <td className="px-4 py-2 text-sm" colSpan={3}>
                        Total ({category === 'all' ? 'semua kategori' : EXPENSE_CATEGORY_LABELS[category as (typeof EXPENSE_CATEGORIES)[number]] ?? category})
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-sm">
                        {formatRupiah(expenses.reduce((s, e) => s + e.amount, 0))}
                      </td>
                      {canEdit && <td />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Halaman {page} dari {totalPages}</span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/expenses?period=${period}&category=${category}&page=${page - 1}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    ← Sebelumnya
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/expenses?period=${period}&category=${category}&page=${page + 1}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    Berikutnya →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Period summary */}
        <div className="space-y-4">
          <PeriodSummary
            summary={summary}
            grandTotal={grandTotal}
            period={period}
          />

          {/* Overhead per menu hint */}
          {grandTotal > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
              <p className="font-medium">Alokasi Overhead</p>
              <p className="text-muted-foreground text-xs">
                Total overhead bulan ini:{' '}
                <span className="font-semibold text-foreground">
                  {formatRupiah(grandTotal)}
                </span>
              </p>
              <p className="text-muted-foreground text-xs">
                Gunakan angka ini saat menghitung HPP di halaman Profitabilitas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

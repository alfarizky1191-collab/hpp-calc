import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/rbac'
import { ExpenseForm } from '@/components/expenses/expense-form'

interface NewExpensePageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function NewExpensePage({ searchParams }: NewExpensePageProps) {
  await requireRole(['OWNER', 'ADMIN'])
  const params = await searchParams

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <Link
          href="/expenses"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Kembali ke Biaya Operasional
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Tambah Biaya</h1>
        <p className="text-muted-foreground text-sm">
          Catat biaya operasional untuk periode ini
        </p>
      </div>
      <Suspense fallback={null}>
        <ExpenseForm defaultPeriod={params.period} />
      </Suspense>
    </div>
  )
}

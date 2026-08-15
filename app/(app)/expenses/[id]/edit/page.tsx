import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getExpenseById } from '@/lib/expenses/actions'
import { requireRole } from '@/lib/auth/rbac'
import { ExpenseForm } from '@/components/expenses/expense-form'

interface EditExpensePageProps {
  params: Promise<{ id: string }>
}

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  await requireRole(['OWNER', 'ADMIN'])
  const { id } = await params

  const { expense, error } = await getExpenseById(id)
  if (error || !expense) notFound()

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
        <h1 className="text-2xl font-bold tracking-tight">Edit Biaya</h1>
        <p className="text-muted-foreground text-sm">Ubah informasi {expense.name}</p>
      </div>
      <ExpenseForm expense={expense} />
    </div>
  )
}

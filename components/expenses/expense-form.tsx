'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createExpense, updateExpense } from '@/lib/expenses/actions'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from '@/lib/expenses/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Tables } from '@/types/database'

type ExpenseRow = Tables<'expenses'>

interface ExpenseFormProps {
  expense?: ExpenseRow
  defaultPeriod?: string | undefined
}

type FormState = { success: false; error: string } | { success: true; data: unknown }
const initialState: FormState = { success: false, error: '' }

// Generate current period default
function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Today's date in YYYY-MM-DD
function today() {
  return new Date().toISOString().split('T')[0]
}

export function ExpenseForm({ expense, defaultPeriod }: ExpenseFormProps) {
  const router = useRouter()
  const isEdit = Boolean(expense)

  // Controlled selects to avoid "uncontrolled → controlled" Base UI warning
  const [category, setCategory] = useState<string>(expense?.category ?? 'OTHER')

  const wrappedAction = async (
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const result = isEdit
      ? await updateExpense(_prev as Parameters<typeof updateExpense>[0], formData)
      : await createExpense(_prev as Parameters<typeof createExpense>[0], formData)
    if (result.success) return { success: true, data: result.data }
    return { success: false, error: result.error }
  }

  const [state, formAction, isPending] = useActionState(wrappedAction, initialState)

  useEffect(() => {
    if (state.success) {
      toast.success(isEdit ? 'Biaya berhasil diperbarui' : 'Biaya berhasil ditambahkan')
      router.push('/expenses')
    }
  }, [state.success, isEdit, router])

  const period = expense?.period ?? defaultPeriod ?? currentPeriod()

  const categoryLabel = EXPENSE_CATEGORY_LABELS[category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? category

  return (
    <form action={formAction} className="space-y-6 max-w-lg">
      {expense && <input type="hidden" name="id" value={expense.id} />}
      {/* Hidden input carries category value to server since Select is controlled without name */}
      <input type="hidden" name="category" value={category} />

      {!state.success && state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Nama */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Nama Biaya <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          defaultValue={expense?.name}
          placeholder="cth: Tagihan Gas Mei, Gaji Karyawan"
          required
          disabled={isPending}
        />
      </div>

      {/* Kategori — controlled to fix Base UI uncontrolled warning */}
      <div className="space-y-2">
        <Label htmlFor="category">
          Kategori <span className="text-destructive">*</span>
        </Label>
        <Select value={category} onValueChange={(v) => v != null && setCategory(v)} disabled={isPending}>
          <SelectTrigger id="category">
            <SelectValue>{categoryLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {EXPENSE_CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Jumlah */}
      <div className="space-y-2">
        <Label htmlFor="amount">
          Jumlah (Rp) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="0"
          step="any"
          defaultValue={expense?.amount}
          placeholder="cth: 150000"
          required
          disabled={isPending}
        />
      </div>

      {/* Periode & Tanggal */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="period">
            Periode <span className="text-destructive">*</span>
          </Label>
          <Input
            id="period"
            name="period"
            defaultValue={period}
            placeholder="YYYY-MM"
            pattern="\d{4}-\d{2}"
            required
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">Format: YYYY-MM (cth: 2024-08)</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expenseDate">
            Tanggal <span className="text-destructive">*</span>
          </Label>
          <Input
            id="expenseDate"
            name="expenseDate"
            type="date"
            defaultValue={expense?.expense_date ?? today()}
            required
            disabled={isPending}
          />
        </div>
      </div>

      {/* Catatan */}
      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Input
          id="notes"
          name="notes"
          defaultValue={expense?.notes ?? ''}
          placeholder="Catatan tambahan (opsional)"
          disabled={isPending}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Biaya'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Batal
        </Button>
      </div>
    </form>
  )
}

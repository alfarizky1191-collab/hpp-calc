'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/rbac'
import { expenseSchema, updateExpenseSchema } from './schemas'
import type { ActionResult } from '@/types'
import type { Tables } from '@/types/database'

export type ExpenseRow = Tables<'expenses'>

// ---------------------------------------------------------------------------
// createExpense
// ---------------------------------------------------------------------------
export async function createExpense(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const raw = {
    name: formData.get('name'),
    category: formData.get('category'),
    amount: formData.get('amount'),
    period: formData.get('period'),
    expenseDate: formData.get('expenseDate'),
    notes: formData.get('notes') || null,
  }

  const parsed = expenseSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Input tidak valid' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      organization_id: profile.organization_id,
      name: parsed.data.name,
      category: parsed.data.category,
      amount: parseFloat(parsed.data.amount),
      period: parsed.data.period,
      expense_date: parsed.data.expenseDate,
      notes: parsed.data.notes ?? null,
      created_by: profile.id,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: 'Gagal menyimpan biaya operasional.' }

  await supabase.rpc('log_audit', {
    p_action: 'CREATE',
    p_entity_type: 'expense',
    p_entity_id: data.id,
    p_new_value: { name: parsed.data.name, amount: parsed.data.amount, period: parsed.data.period },
  })

  revalidatePath('/expenses')
  return { success: true, data: { id: data.id } }
}

// ---------------------------------------------------------------------------
// updateExpense
// ---------------------------------------------------------------------------
export async function updateExpense(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const raw = {
    id: formData.get('id'),
    name: formData.get('name'),
    category: formData.get('category'),
    amount: formData.get('amount'),
    period: formData.get('period'),
    expenseDate: formData.get('expenseDate'),
    notes: formData.get('notes') || null,
  }

  const parsed = updateExpenseSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Input tidak valid' }
  }

  const supabase = await createClient()

  const { data: oldData } = await supabase
    .from('expenses')
    .select('amount, name')
    .eq('id', parsed.data.id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!oldData) return { success: false, error: 'Data tidak ditemukan.' }

  const payload: Record<string, string | number | null> = {}
  if (parsed.data.name !== undefined) payload.name = parsed.data.name
  if (parsed.data.category !== undefined) payload.category = parsed.data.category
  if (parsed.data.amount !== undefined) payload.amount = parseFloat(parsed.data.amount)
  if (parsed.data.period !== undefined) payload.period = parsed.data.period
  if (parsed.data.expenseDate !== undefined) payload.expense_date = parsed.data.expenseDate
  if (parsed.data.notes !== undefined) payload.notes = parsed.data.notes

  const { error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', parsed.data.id)
    .eq('organization_id', profile.organization_id)

  if (error) return { success: false, error: 'Gagal memperbarui biaya.' }

  await supabase.rpc('log_audit', {
    p_action: 'UPDATE',
    p_entity_type: 'expense',
    p_entity_id: parsed.data.id,
    p_old_value: { name: oldData.name, amount: oldData.amount },
    p_new_value: payload,
  })

  revalidatePath('/expenses')
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// deleteExpense
// ---------------------------------------------------------------------------
export async function deleteExpense(id: string): Promise<ActionResult> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const supabase = await createClient()
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (error) return { success: false, error: 'Gagal menghapus biaya.' }

  await supabase.rpc('log_audit', {
    p_action: 'DELETE',
    p_entity_type: 'expense',
    p_entity_id: id,
  })

  revalidatePath('/expenses')
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// getExpenses — with period filter
// ---------------------------------------------------------------------------
export async function getExpenses(params?: {
  period?: string
  category?: string
  page?: number
  pageSize?: number
}) {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('organization_id', profile.organization_id)
    .order('expense_date', { ascending: false })
    .range(from, to)

  if (params?.period) query = query.eq('period', params.period)
  if (params?.category && params.category !== 'all') {
    const validCats = ['GAS','ELECTRICITY','WATER','RENT','SALARY','TRANSPORT','MAINTENANCE','CONDIMENT','GENERAL_PACKAGING','OTHER'] as const
    if (validCats.includes(params.category as (typeof validCats)[number])) {
      query = query.eq('category', params.category as (typeof validCats)[number])
    }
  }

  const { data, count, error } = await query
  if (error) return { data: [], total: 0, error: error.message }
  return { data: data ?? [], total: count ?? 0, error: null }
}

// ---------------------------------------------------------------------------
// getExpenseById
// ---------------------------------------------------------------------------
export async function getExpenseById(id: string) {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (error || !data) return { expense: null, error: 'Data tidak ditemukan' }
  return { expense: data, error: null }
}

// ---------------------------------------------------------------------------
// getPeriodSummary — total per kategori untuk satu periode
// ---------------------------------------------------------------------------
export async function getPeriodSummary(period: string) {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('organization_id', profile.organization_id)
    .eq('period', period)

  if (error) return { summary: [], grandTotal: 0, error: error.message }

  // Aggregate per category in JS
  const categoryMap = new Map<string, number>()
  let grandTotal = 0

  for (const row of data ?? []) {
    const cur = categoryMap.get(row.category) ?? 0
    categoryMap.set(row.category, cur + row.amount)
    grandTotal += row.amount
  }

  const summary = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  return { summary, grandTotal, error: null }
}

// ---------------------------------------------------------------------------
// getAvailablePeriods — list semua periode yang ada datanya
// ---------------------------------------------------------------------------
export async function getAvailablePeriods() {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('expenses')
    .select('period')
    .eq('organization_id', profile.organization_id)
    .order('period', { ascending: false })

  if (error) return []

  // Deduplicate
  const seen = new Set<string>()
  const periods: string[] = []
  for (const row of data ?? []) {
    if (!seen.has(row.period)) {
      seen.add(row.period)
      periods.push(row.period)
    }
  }
  return periods
}

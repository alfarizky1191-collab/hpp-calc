import { z } from 'zod'

export const EXPENSE_CATEGORIES = [
  'GAS',
  'ELECTRICITY',
  'WATER',
  'RENT',
  'SALARY',
  'TRANSPORT',
  'MAINTENANCE',
  'CONDIMENT',
  'GENERAL_PACKAGING',
  'OTHER',
] as const

export const EXPENSE_CATEGORY_LABELS: Record<(typeof EXPENSE_CATEGORIES)[number], string> = {
  GAS: 'Gas',
  ELECTRICITY: 'Listrik',
  WATER: 'Air',
  RENT: 'Sewa',
  SALARY: 'Gaji',
  TRANSPORT: 'Transportasi',
  MAINTENANCE: 'Perawatan',
  CONDIMENT: 'Condiment',
  GENERAL_PACKAGING: 'Kemasan Umum',
  OTHER: 'Lain-lain',
}

// Generate current period YYYY-MM
function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const expenseSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama biaya wajib diisi')
    .max(255, 'Nama terlalu panjang')
    .trim(),

  category: z.enum(EXPENSE_CATEGORIES, {
    errorMap: () => ({ message: 'Kategori tidak valid' }),
  }),

  amount: z
    .string()
    .min(1, 'Jumlah wajib diisi')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Jumlah harus angka positif')
    .refine((v) => parseFloat(v) <= 999_999_999_99, 'Jumlah terlalu besar'),

  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Format periode harus YYYY-MM, cth: 2024-08')
    .default(currentPeriod),

  expenseDate: z
    .string()
    .min(1, 'Tanggal wajib diisi')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),

  notes: z.string().max(1000).trim().optional().nullable(),
})

export const updateExpenseSchema = expenseSchema.partial().extend({
  id: z.string().uuid('ID tidak valid'),
})

export type ExpenseFormInput = z.infer<typeof expenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>

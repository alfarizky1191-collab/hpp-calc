import { describe, it, expect } from 'vitest'
import { expenseSchema } from './schemas'

const valid = {
  name: 'Tagihan Gas Agustus',
  category: 'GAS' as const,
  amount: '150000',
  period: '2024-08',
  expenseDate: '2024-08-01',
}

describe('expenseSchema', () => {
  it('accepts valid expense', () => {
    expect(expenseSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(expenseSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })

  it('rejects negative amount', () => {
    expect(expenseSchema.safeParse({ ...valid, amount: '-100' }).success).toBe(false)
  })

  it('accepts zero amount', () => {
    expect(expenseSchema.safeParse({ ...valid, amount: '0' }).success).toBe(true)
  })

  it('rejects non-numeric amount', () => {
    expect(expenseSchema.safeParse({ ...valid, amount: 'abc' }).success).toBe(false)
  })

  it('rejects invalid period format YYYY/MM', () => {
    expect(expenseSchema.safeParse({ ...valid, period: '2024/08' }).success).toBe(false)
  })

  it('rejects period with only year', () => {
    expect(expenseSchema.safeParse({ ...valid, period: '2024' }).success).toBe(false)
  })

  it('accepts valid period 2024-08', () => {
    expect(expenseSchema.safeParse({ ...valid, period: '2024-08' }).success).toBe(true)
  })

  it('rejects invalid date format', () => {
    expect(expenseSchema.safeParse({ ...valid, expenseDate: '01-08-2024' }).success).toBe(false)
  })

  it('accepts valid expenseDate YYYY-MM-DD', () => {
    expect(expenseSchema.safeParse({ ...valid, expenseDate: '2024-08-31' }).success).toBe(true)
  })

  it('rejects invalid category', () => {
    expect(expenseSchema.safeParse({ ...valid, category: 'INVALID' }).success).toBe(false)
  })

  it('accepts all valid categories', () => {
    const cats = ['GAS','ELECTRICITY','WATER','RENT','SALARY','TRANSPORT','MAINTENANCE','CONDIMENT','GENERAL_PACKAGING','OTHER'] as const
    for (const cat of cats) {
      expect(expenseSchema.safeParse({ ...valid, category: cat }).success).toBe(true)
    }
  })

  it('accepts optional notes as null', () => {
    expect(expenseSchema.safeParse({ ...valid, notes: null }).success).toBe(true)
  })

  it('rejects notes longer than 1000 chars', () => {
    expect(expenseSchema.safeParse({ ...valid, notes: 'x'.repeat(1001) }).success).toBe(false)
  })
})

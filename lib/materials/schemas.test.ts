import { describe, it, expect } from 'vitest'
import { materialSchema, updateMaterialSchema, materialSearchSchema } from './schemas'

const valid = {
  name: 'Tepung Terigu',
  purchaseUnit: 'kg',
  purchasePrice: '15000',
  packageQuantity: '1000',
  baseUnit: 'gram',
  status: 'ACTIVE' as const,
}

// ---------------------------------------------------------------------------
// materialSchema
// ---------------------------------------------------------------------------

describe('materialSchema', () => {
  it('accepts valid material', () => {
    expect(materialSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(materialSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })

  it('rejects name longer than 255 chars', () => {
    expect(materialSchema.safeParse({ ...valid, name: 'A'.repeat(256) }).success).toBe(false)
  })

  it('trims whitespace from name', () => {
    const r = materialSchema.safeParse({ ...valid, name: '  Gula Pasir  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.name).toBe('Gula Pasir')
  })

  it('rejects negative purchasePrice', () => {
    expect(materialSchema.safeParse({ ...valid, purchasePrice: '-100' }).success).toBe(false)
  })

  it('accepts zero purchasePrice', () => {
    expect(materialSchema.safeParse({ ...valid, purchasePrice: '0' }).success).toBe(true)
  })

  it('rejects non-numeric purchasePrice', () => {
    expect(materialSchema.safeParse({ ...valid, purchasePrice: 'abc' }).success).toBe(false)
  })

  it('rejects zero packageQuantity', () => {
    const r = materialSchema.safeParse({ ...valid, packageQuantity: '0' })
    expect(r.success).toBe(false)
    expect(r.error?.errors[0]?.message).toMatch(/lebih dari 0/i)
  })

  it('rejects negative packageQuantity', () => {
    expect(materialSchema.safeParse({ ...valid, packageQuantity: '-1' }).success).toBe(false)
  })

  it('rejects empty purchaseUnit', () => {
    expect(materialSchema.safeParse({ ...valid, purchaseUnit: '' }).success).toBe(false)
  })

  it('rejects empty baseUnit', () => {
    expect(materialSchema.safeParse({ ...valid, baseUnit: '' }).success).toBe(false)
  })

  it('accepts optional categoryId as null', () => {
    expect(materialSchema.safeParse({ ...valid, categoryId: null }).success).toBe(true)
  })

  it('accepts optional supplier as null', () => {
    expect(materialSchema.safeParse({ ...valid, supplier: null }).success).toBe(true)
  })

  it('rejects invalid UUID for categoryId', () => {
    expect(materialSchema.safeParse({ ...valid, categoryId: 'not-a-uuid' }).success).toBe(false)
  })

  it('accepts valid UUID for categoryId', () => {
    expect(materialSchema.safeParse({
      ...valid,
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
    }).success).toBe(true)
  })

  it('accepts INACTIVE status', () => {
    expect(materialSchema.safeParse({ ...valid, status: 'INACTIVE' }).success).toBe(true)
  })

  it('rejects invalid status', () => {
    expect(materialSchema.safeParse({ ...valid, status: 'DELETED' }).success).toBe(false)
  })

  it('rejects very large purchasePrice', () => {
    expect(materialSchema.safeParse({ ...valid, purchasePrice: '999999999999' }).success).toBe(false)
  })

  it('accepts supplier up to 255 chars', () => {
    expect(materialSchema.safeParse({ ...valid, supplier: 'S'.repeat(255) }).success).toBe(true)
  })

  it('rejects supplier longer than 255 chars', () => {
    expect(materialSchema.safeParse({ ...valid, supplier: 'S'.repeat(256) }).success).toBe(false)
  })

  it('accepts decimal purchasePrice', () => {
    expect(materialSchema.safeParse({ ...valid, purchasePrice: '15000.50' }).success).toBe(true)
  })

  it('accepts decimal packageQuantity', () => {
    expect(materialSchema.safeParse({ ...valid, packageQuantity: '500.5' }).success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// updateMaterialSchema
// ---------------------------------------------------------------------------

describe('updateMaterialSchema', () => {
  it('accepts partial update with id', () => {
    const r = updateMaterialSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Gula Halus',
    })
    expect(r.success).toBe(true)
  })

  it('rejects missing id', () => {
    expect(updateMaterialSchema.safeParse({ name: 'Gula' }).success).toBe(false)
  })

  it('rejects invalid id format', () => {
    expect(updateMaterialSchema.safeParse({ id: 'not-uuid', name: 'Gula' }).success).toBe(false)
  })

  it('allows updating only price', () => {
    expect(updateMaterialSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      purchasePrice: '20000',
    }).success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// materialSearchSchema
// ---------------------------------------------------------------------------

describe('materialSearchSchema', () => {
  it('accepts empty params with defaults', () => {
    const r = materialSearchSchema.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.status).toBe('ACTIVE')
      expect(r.data.page).toBe(1)
      expect(r.data.pageSize).toBe(20)
    }
  })

  it('coerces string page to number', () => {
    const r = materialSearchSchema.safeParse({ page: '3' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.page).toBe(3)
  })

  it('rejects page 0', () => {
    expect(materialSearchSchema.safeParse({ page: '0' }).success).toBe(false)
  })

  it('rejects pageSize above 100', () => {
    expect(materialSearchSchema.safeParse({ pageSize: '101' }).success).toBe(false)
  })

  it('accepts status INACTIVE', () => {
    const r = materialSearchSchema.safeParse({ status: 'INACTIVE' })
    expect(r.success).toBe(true)
  })

  it('accepts status all', () => {
    expect(materialSearchSchema.safeParse({ status: 'all' }).success).toBe(true)
  })

  it('rejects invalid status', () => {
    expect(materialSearchSchema.safeParse({ status: 'DELETED' }).success).toBe(false)
  })
})

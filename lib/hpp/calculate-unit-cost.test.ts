import { describe, it, expect } from 'vitest'
import { calculateUnitCost } from './calculate-unit-cost'

describe('calculateUnitCost', () => {
  it('calculates basic unit cost', () => {
    // Rp15.000 / 1000g = Rp15.000000 per gram
    const result = calculateUnitCost({
      purchasePrice: '15000.00',
      packageQuantity: '1000.000000',
    })
    expect(result.unitCost).toBe('15.000000')
  })

  it('calculates with decimal result', () => {
    // Rp12.500 / 750ml = Rp16.666666... per ml
    const result = calculateUnitCost({
      purchasePrice: '12500.00',
      packageQuantity: '750.000000',
    })
    // 12500 / 750 = 16.666666...
    expect(result.unitCost).toBe('16.666666')
  })

  it('calculates harga per butir telur', () => {
    // Rp28.000 / 30 butir = Rp933.333333 per butir
    const result = calculateUnitCost({
      purchasePrice: '28000.00',
      packageQuantity: '30.000000',
    })
    expect(result.unitCost).toBe('933.333333')
  })

  it('handles whole number package quantity', () => {
    const result = calculateUnitCost({
      purchasePrice: '50000.00',
      packageQuantity: '5.000000',
    })
    expect(result.unitCost).toBe('10000.000000')
  })

  it('returns zero cost for zero purchase price', () => {
    const result = calculateUnitCost({
      purchasePrice: '0.00',
      packageQuantity: '100.000000',
    })
    expect(result.unitCost).toBe('0.000000')
  })

  it('throws when packageQuantity is zero', () => {
    expect(() =>
      calculateUnitCost({
        purchasePrice: '15000.00',
        packageQuantity: '0.000000',
      })
    ).toThrow('packageQuantity must be greater than zero')
  })

  it('throws when packageQuantity is negative', () => {
    expect(() =>
      calculateUnitCost({
        purchasePrice: '15000.00',
        packageQuantity: '-1.000000',
      })
    ).toThrow('packageQuantity must be greater than zero')
  })

  it('throws when purchasePrice is negative', () => {
    expect(() =>
      calculateUnitCost({
        purchasePrice: '-100.00',
        packageQuantity: '10.000000',
      })
    ).toThrow('purchasePrice must be non-negative')
  })

  it('handles very large values without precision loss', () => {
    const result = calculateUnitCost({
      purchasePrice: '999999999.00',
      packageQuantity: '1.000000',
    })
    expect(result.unitCost).toBe('999999999.000000')
  })

  it('handles very small unit cost (micro quantities)', () => {
    // Rp1.200 / 600.000000 = Rp0.002000 per unit
    const result = calculateUnitCost({
      purchasePrice: '1200.00',
      packageQuantity: '600000.000000',
    })
    expect(result.unitCost).toBe('0.002000')
  })
})

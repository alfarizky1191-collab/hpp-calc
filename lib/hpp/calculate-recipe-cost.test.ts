import { describe, it, expect } from 'vitest'
import { calculateRecipeCost } from './calculate-recipe-cost'

describe('calculateRecipeCost', () => {
  it('calculates recipe cost for a single ingredient', () => {
    const result = calculateRecipeCost({
      items: [
        {
          materialId: 'mat-1',
          quantity: '200.000000',       // 200g
          unitCost: '15.000000',        // Rp15/g
        },
      ],
      yieldQuantity: '1.000000',         // 1 portion
    })

    expect(result.itemCosts[0]?.totalCost).toBe('3000.00')
    expect(result.totalMaterialCost).toBe('3000.00')
    expect(result.hppBahanPerUnit).toBe('3000.000000')
  })

  it('calculates recipe cost for multiple ingredients', () => {
    const result = calculateRecipeCost({
      items: [
        { materialId: 'm1', quantity: '100.000000', unitCost: '10.000000' }, // 1000
        { materialId: 'm2', quantity: '50.000000', unitCost: '5.000000' },   // 250
        { materialId: 'm3', quantity: '20.000000', unitCost: '2.500000' },   // 50
      ],
      yieldQuantity: '1.000000',
    })

    expect(result.totalMaterialCost).toBe('1300.00')
    expect(result.hppBahanPerUnit).toBe('1300.000000')
  })

  it('divides by yield quantity correctly', () => {
    // 5 portions, total cost = 5000
    const result = calculateRecipeCost({
      items: [
        { materialId: 'm1', quantity: '500.000000', unitCost: '10.000000' }, // 5000
      ],
      yieldQuantity: '5.000000',
    })

    expect(result.totalMaterialCost).toBe('5000.00')
    expect(result.hppBahanPerUnit).toBe('1000.000000')
  })

  it('handles fractional yield', () => {
    const result = calculateRecipeCost({
      items: [
        { materialId: 'm1', quantity: '300.000000', unitCost: '10.000000' }, // 3000
      ],
      yieldQuantity: '2.500000', // 2.5 portions
    })

    expect(result.totalMaterialCost).toBe('3000.00')
    expect(result.hppBahanPerUnit).toBe('1200.000000')
  })

  it('handles empty recipe (no ingredients)', () => {
    const result = calculateRecipeCost({
      items: [],
      yieldQuantity: '1.000000',
    })

    expect(result.totalMaterialCost).toBe('0.00')
    expect(result.hppBahanPerUnit).toBe('0.000000')
    expect(result.itemCosts).toHaveLength(0)
  })

  it('throws when yieldQuantity is zero', () => {
    expect(() =>
      calculateRecipeCost({
        items: [{ materialId: 'm1', quantity: '100.000000', unitCost: '10.000000' }],
        yieldQuantity: '0.000000',
      })
    ).toThrow('yieldQuantity must be greater than zero')
  })

  it('throws when yieldQuantity is negative', () => {
    expect(() =>
      calculateRecipeCost({
        items: [],
        yieldQuantity: '-1.000000',
      })
    ).toThrow('yieldQuantity must be greater than zero')
  })

  it('throws when quantity is negative', () => {
    expect(() =>
      calculateRecipeCost({
        items: [{ materialId: 'm1', quantity: '-10.000000', unitCost: '5.000000' }],
        yieldQuantity: '1.000000',
      })
    ).toThrow('quantity must be non-negative')
  })

  it('handles zero quantity ingredient (optional ingredient)', () => {
    const result = calculateRecipeCost({
      items: [
        { materialId: 'm1', quantity: '0.000000', unitCost: '5.000000' },
        { materialId: 'm2', quantity: '100.000000', unitCost: '2.000000' },
      ],
      yieldQuantity: '1.000000',
    })

    expect(result.itemCosts[0]?.totalCost).toBe('0.00')
    expect(result.totalMaterialCost).toBe('200.00')
  })

  it('preserves materialId in output', () => {
    const result = calculateRecipeCost({
      items: [
        { materialId: 'uuid-abc-123', quantity: '1.000000', unitCost: '1000.000000' },
      ],
      yieldQuantity: '1.000000',
    })

    expect(result.itemCosts[0]?.materialId).toBe('uuid-abc-123')
  })
})

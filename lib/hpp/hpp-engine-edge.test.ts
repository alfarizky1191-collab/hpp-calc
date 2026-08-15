import { describe, it, expect } from 'vitest'
import {
  calculateUnitCost,
  calculateRecipeCost,
  calculateHpp,
  calculateFoodCost,
  calculateProfit,
  calculateMargin,
  calculatePriceRecommendation,
  runWhatIfSimulation,
  HPP_ENGINE_VERSION,
} from './index'

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

describe('HPP_ENGINE_VERSION', () => {
  it('is defined and starts with hpp-engine-v', () => {
    expect(HPP_ENGINE_VERSION).toMatch(/^hpp-engine-v/)
  })
})

// ---------------------------------------------------------------------------
// Edge cases: very large values
// ---------------------------------------------------------------------------

describe('calculateUnitCost — large values', () => {
  it('handles large purchase price without floating point error', () => {
    // Rp 5,000,000 / 5000 gram = Rp 1000.000000/gram
    const result = calculateUnitCost({ purchasePrice: '5000000.00', packageQuantity: '5000.000000' })
    expect(result.unitCost).toBe('1000.000000')
  })

  it('handles very small unit cost without losing precision', () => {
    // Rp 1,000 / 1,000,000 units = Rp 0.001000
    const result = calculateUnitCost({ purchasePrice: '1000.00', packageQuantity: '1000000.000000' })
    expect(result.unitCost).toBe('0.001000')
  })
})

// ---------------------------------------------------------------------------
// Edge cases: zero values
// ---------------------------------------------------------------------------

describe('calculateHpp — zero components', () => {
  it('total is hppBahan when all other costs are zero', () => {
    const result = calculateHpp({
      hppBahan: '5000.000000',
      packagingCost: '0.00',
      overheadCost: '0.00',
      otherCost: '0.00',
    })
    expect(result.totalHpp).toBe('5000.00')
  })

  it('all zeros produces zero', () => {
    const result = calculateHpp({
      hppBahan: '0.000000',
      packagingCost: '0.00',
      overheadCost: '0.00',
      otherCost: '0.00',
    })
    expect(result.totalHpp).toBe('0.00')
  })
})

// ---------------------------------------------------------------------------
// Edge cases: food cost at 100%
// ---------------------------------------------------------------------------

describe('calculateFoodCost — boundary', () => {
  it('food cost 100% when hppBahan equals selling price', () => {
    const result = calculateFoodCost({ hppBahan: '10000.00', sellingPrice: '10000.00' })
    expect(result.foodCostPct).toBe('100.0000')
  })

  it('food cost 0% when hppBahan is zero', () => {
    const result = calculateFoodCost({ hppBahan: '0.00', sellingPrice: '10000.00' })
    expect(result.foodCostPct).toBe('0.0000')
  })
})

// ---------------------------------------------------------------------------
// Edge cases: profit
// ---------------------------------------------------------------------------

describe('calculateProfit — boundary', () => {
  it('profit is zero at break-even', () => {
    const result = calculateProfit({ sellingPrice: '7500.00', totalHpp: '7500.00' })
    expect(result.profit).toBe('0.00')
  })

  it('profit is negative when HPP exceeds selling price', () => {
    const result = calculateProfit({ sellingPrice: '5000.00', totalHpp: '7500.00' })
    expect(parseFloat(result.profit)).toBeLessThan(0)
  })
})

// ---------------------------------------------------------------------------
// Edge cases: margin
// ---------------------------------------------------------------------------

describe('calculateMargin — boundary', () => {
  it('100% margin when selling price is all profit (HPP = 0)', () => {
    // profit = sellingPrice - totalHpp; margin = profit / sellingPrice * 100
    const { profit } = calculateProfit({ sellingPrice: '10000.00', totalHpp: '0.00' })
    const { marginPct } = calculateMargin({ profit, sellingPrice: '10000.00' })
    expect(marginPct).toBe('100.0000')
  })

  it('0% margin at break-even', () => {
    const { profit } = calculateProfit({ sellingPrice: '7500.00', totalHpp: '7500.00' })
    const { marginPct } = calculateMargin({ profit, sellingPrice: '7500.00' })
    expect(marginPct).toBe('0.0000')
  })
})

// ---------------------------------------------------------------------------
// Edge cases: recipe cost with single ingredient
// ---------------------------------------------------------------------------

describe('calculateRecipeCost — edge cases', () => {
  it('single ingredient, yield > 1 portion', () => {
    // 1 kg ayam @ Rp50/gram, yield 2 portions → HPP bahan/porsi = 25000
    const result = calculateRecipeCost({
      items: [{ materialId: 'mat-1', quantity: '1000.000000', unitCost: '50.000000' }],
      yieldQuantity: '2.000000',
    })
    expect(result.totalMaterialCost).toBe('50000.00')
    expect(result.hppBahanPerUnit).toBe('25000.000000')
  })

  it('very small quantity truncates to 2 decimal places in output', () => {
    // 0.001 gram @ Rp15/gram = Rp0.015 → stored as Rp0.01 (floor at 2dp)
    const result = calculateRecipeCost({
      items: [{ materialId: 'm1', quantity: '0.001000', unitCost: '15.000000' }],
      yieldQuantity: '1.000000',
    })
    // totalMaterialCost is 2dp — 0.015 floors to 0.01
    expect(result.totalMaterialCost).toBe('0.01')
    // hppBahanPerUnit is 6dp — should be 0.015000
    expect(result.hppBahanPerUnit).toBe('0.015000')
  })
})

// ---------------------------------------------------------------------------
// Smart pricing — boundary
// ---------------------------------------------------------------------------

describe('calculatePriceRecommendation — boundary', () => {
  it('recommended price = HPP when target food cost = 100%', () => {
    const result = calculatePriceRecommendation({ totalHpp: '7500.00', targetFoodCostPct: '100' })
    expect(parseFloat(result.recommendedPrice)).toBeCloseTo(7500, 0)
  })

  it('all rounding options are >= recommended price', () => {
    const result = calculatePriceRecommendation({ totalHpp: '7500.00', targetFoodCostPct: '30' })
    const raw = parseFloat(result.recommendedPrice)
    for (const opt of result.roundedOptions) {
      expect(parseFloat(opt)).toBeGreaterThanOrEqual(raw - 0.01)
    }
  })

  it('throws for 0% target food cost', () => {
    expect(() => calculatePriceRecommendation({ totalHpp: '7500.00', targetFoodCostPct: '0' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// What-if: combined changes
// ---------------------------------------------------------------------------

describe('runWhatIfSimulation — combined', () => {
  const base = {
    hppBahan: '3000.00',
    packagingCost: '500.00',
    overheadCost: '500.00',
    otherCost: '0.00',
    sellingPrice: '10000.00',
  }

  it('simultaneous material+overhead increase raises total HPP', () => {
    const result = runWhatIfSimulation({
      current: base,
      changes: { materialPriceChangePct: 10, overheadChangePct: 20 },
    })
    // new hppBahan=3300, overhead=600, total=3300+500+600=4400
    expect(result.newTotalHpp).toBe('4400.00')
  })

  it('selling price decrease reduces margin', () => {
    const before = runWhatIfSimulation({ current: base, changes: {} })
    const after = runWhatIfSimulation({
      current: base,
      changes: { sellingPriceChangePct: -20 },
    })
    expect(parseFloat(after.newMarginPct)).toBeLessThan(parseFloat(before.newMarginPct))
  })

  it('does not mutate the input base object', () => {
    const snapshot = { ...base }
    runWhatIfSimulation({ current: base, changes: { materialPriceChangePct: 50 } })
    expect(base).toEqual(snapshot)
  })
})

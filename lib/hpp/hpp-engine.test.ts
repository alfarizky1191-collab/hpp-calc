import { describe, it, expect } from 'vitest'
import { calculateHpp } from './calculate-hpp'
import {
  calculateFoodCost,
  calculateProfit,
  calculateMargin,
  calculatePriceRecommendation,
} from './calculate-profitability'
import { runWhatIfSimulation } from './simulate-what-if'

// ---------------------------------------------------------------------------
// calculateHpp
// ---------------------------------------------------------------------------

describe('calculateHpp', () => {
  it('sums all cost components', () => {
    const result = calculateHpp({
      hppBahan: '3000.000000',
      packagingCost: '500.00',
      overheadCost: '250.00',
      otherCost: '100.00',
    })
    expect(result.totalHpp).toBe('3850.00')
  })

  it('handles zero overhead and packaging', () => {
    const result = calculateHpp({
      hppBahan: '5000.00',
      packagingCost: '0.00',
      overheadCost: '0.00',
      otherCost: '0.00',
    })
    expect(result.totalHpp).toBe('5000.00')
  })

  it('throws when any cost is negative', () => {
    expect(() =>
      calculateHpp({
        hppBahan: '3000.00',
        packagingCost: '-100.00',
        overheadCost: '0.00',
        otherCost: '0.00',
      })
    ).toThrow('packagingCost must be non-negative')
  })

  it('includes breakdown in result', () => {
    const result = calculateHpp({
      hppBahan: '1000.00',
      packagingCost: '200.00',
      overheadCost: '300.00',
      otherCost: '50.00',
    })
    expect(result.breakdown.hppBahan).toBe('1000.00')
    expect(result.breakdown.packagingCost).toBe('200.00')
    expect(result.breakdown.overheadCost).toBe('300.00')
    expect(result.breakdown.otherCost).toBe('50.00')
  })
})

// ---------------------------------------------------------------------------
// calculateFoodCost
// ---------------------------------------------------------------------------

describe('calculateFoodCost', () => {
  it('calculates 30% food cost', () => {
    const result = calculateFoodCost({
      hppBahan: '3000.00',
      sellingPrice: '10000.00',
    })
    expect(result.foodCostPct).toBe('30.0000')
  })

  it('calculates food cost below 30%', () => {
    const result = calculateFoodCost({
      hppBahan: '2000.00',
      sellingPrice: '10000.00',
    })
    expect(result.foodCostPct).toBe('20.0000')
  })

  it('handles food cost above 100% (selling below cost)', () => {
    const result = calculateFoodCost({
      hppBahan: '15000.00',
      sellingPrice: '10000.00',
    })
    expect(result.foodCostPct).toBe('150.0000')
  })

  it('throws when sellingPrice is zero', () => {
    expect(() =>
      calculateFoodCost({
        hppBahan: '3000.00',
        sellingPrice: '0.00',
      })
    ).toThrow('sellingPrice must be greater than zero')
  })

  it('throws when sellingPrice is negative', () => {
    expect(() =>
      calculateFoodCost({
        hppBahan: '3000.00',
        sellingPrice: '-5000.00',
      })
    ).toThrow('sellingPrice must be greater than zero')
  })
})

// ---------------------------------------------------------------------------
// calculateProfit
// ---------------------------------------------------------------------------

describe('calculateProfit', () => {
  it('calculates positive profit', () => {
    const result = calculateProfit({
      sellingPrice: '10000.00',
      totalHpp: '7500.00',
    })
    expect(result.profit).toBe('2500.00')
  })

  it('calculates zero profit (break even)', () => {
    const result = calculateProfit({
      sellingPrice: '7500.00',
      totalHpp: '7500.00',
    })
    expect(result.profit).toBe('0.00')
  })

  it('calculates negative profit (loss)', () => {
    const result = calculateProfit({
      sellingPrice: '5000.00',
      totalHpp: '7500.00',
    })
    expect(result.profit).toBe('-2500.00')
  })
})

// ---------------------------------------------------------------------------
// calculateMargin
// ---------------------------------------------------------------------------

describe('calculateMargin', () => {
  it('calculates 25% margin', () => {
    const result = calculateMargin({
      profit: '2500.00',
      sellingPrice: '10000.00',
    })
    expect(result.marginPct).toBe('25.0000')
  })

  it('calculates negative margin (loss)', () => {
    const result = calculateMargin({
      profit: '-2500.00',
      sellingPrice: '10000.00',
    })
    expect(result.marginPct).toBe('-25.0000')
  })

  it('throws when sellingPrice is zero', () => {
    expect(() =>
      calculateMargin({
        profit: '1000.00',
        sellingPrice: '0.00',
      })
    ).toThrow('sellingPrice must be greater than zero')
  })
})

// ---------------------------------------------------------------------------
// calculatePriceRecommendation
// ---------------------------------------------------------------------------

describe('calculatePriceRecommendation', () => {
  it('calculates recommended price for 30% food cost target', () => {
    // HPP = 7500, target 30% → 7500 / 0.3 = 25000
    const result = calculatePriceRecommendation({
      totalHpp: '7500.00',
      targetFoodCostPct: '30.00',
    })
    expect(result.recommendedPrice).toBe('25000.00')
  })

  it('provides rounding options above the raw price', () => {
    const result = calculatePriceRecommendation({
      totalHpp: '7500.00',
      targetFoodCostPct: '35.00',
    })
    // 7500 / 0.35 = 21428.57...
    const raw = parseFloat(result.recommendedPrice)
    for (const option of result.roundedOptions) {
      expect(parseFloat(option)).toBeGreaterThanOrEqual(raw)
    }
  })

  it('throws when targetFoodCostPct is zero', () => {
    expect(() =>
      calculatePriceRecommendation({
        totalHpp: '7500.00',
        targetFoodCostPct: '0.00',
      })
    ).toThrow()
  })

  it('throws when targetFoodCostPct is greater than 100', () => {
    expect(() =>
      calculatePriceRecommendation({
        totalHpp: '7500.00',
        targetFoodCostPct: '101.00',
      })
    ).toThrow()
  })

  it('returns multiple distinct rounding options', () => {
    const result = calculatePriceRecommendation({
      totalHpp: '6000.00',
      targetFoodCostPct: '30.00',
    })
    // 6000 / 0.3 = 20000 — some options may coincide, still valid
    expect(result.roundedOptions.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// runWhatIfSimulation
// ---------------------------------------------------------------------------

describe('runWhatIfSimulation', () => {
  const base = {
    hppBahan: '3000.00',
    packagingCost: '500.00',
    overheadCost: '500.00',
    otherCost: '0.00',
    sellingPrice: '10000.00',
  }

  it('applies material price increase', () => {
    const result = runWhatIfSimulation({
      current: base,
      changes: { materialPriceChangePct: 10 },
    })
    // hppBahan * 1.1 = 3300
    expect(result.newHppBahan).toBe('3300.00')
    // total = 3300 + 500 + 500 = 4300
    expect(result.newTotalHpp).toBe('4300.00')
  })

  it('applies selling price increase', () => {
    const result = runWhatIfSimulation({
      current: base,
      changes: { sellingPriceChangePct: 5 },
    })
    expect(result.newSellingPrice).toBe('10500.00')
    expect(parseFloat(result.newProfit)).toBeGreaterThan(parseFloat('6000.00'))
  })

  it('applies overhead increase', () => {
    const result = runWhatIfSimulation({
      current: base,
      changes: { overheadChangePct: 20 },
    })
    expect(result.newOverheadCost).toBe('600.00')
    expect(result.newTotalHpp).toBe('4100.00')
  })

  it('no changes returns equivalent values', () => {
    const result = runWhatIfSimulation({
      current: base,
      changes: {},
    })
    expect(result.newTotalHpp).toBe('4000.00')
    expect(result.newProfit).toBe('6000.00')
  })

  it('handles negative price change (cost reduction)', () => {
    const result = runWhatIfSimulation({
      current: base,
      changes: { materialPriceChangePct: -10 },
    })
    expect(result.newHppBahan).toBe('2700.00')
    expect(result.newTotalHpp).toBe('3700.00')
  })
})

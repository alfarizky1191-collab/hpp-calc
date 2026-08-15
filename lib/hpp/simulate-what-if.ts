/**
 * HPP Engine — What-If Simulation
 *
 * Simulates changes to HPP parameters WITHOUT mutating the database.
 * All computations are in-memory and ephemeral.
 */

import { calculateHpp } from './calculate-hpp'
import { calculateFoodCost } from './calculate-profitability'
import { calculateProfit } from './calculate-profitability'
import { calculateMargin } from './calculate-profitability'

export interface WhatIfInput {
  /** Current values */
  current: {
    hppBahan: string
    packagingCost: string
    overheadCost: string
    otherCost: string
    sellingPrice: string
  }
  /** Percentage change params (can be positive or negative) */
  changes: {
    materialPriceChangePct?: number
    sellingPriceChangePct?: number
    overheadChangePct?: number
  }
}

export interface WhatIfResult {
  newHppBahan: string
  newPackagingCost: string
  newOverheadCost: string
  newTotalHpp: string
  newSellingPrice: string
  newFoodCostPct: string
  newProfit: string
  newMarginPct: string
}

function applyPct(value: string, changePct: number): string {
  const num = parseFloat(value)
  const multiplier = 1 + changePct / 100
  return (num * multiplier).toFixed(6)
}

/**
 * Run a what-if simulation.
 * This function is PURE — it never touches the database.
 *
 * @throws {Error} when sellingPrice becomes zero or negative after adjustment
 */
export function runWhatIfSimulation(input: WhatIfInput): WhatIfResult {
  const { current, changes } = input

  // Apply material price change to hpp bahan
  const newHppBahan = changes.materialPriceChangePct !== undefined
    ? applyPct(current.hppBahan, changes.materialPriceChangePct)
    : current.hppBahan

  // Apply overhead change
  const newOverheadCost = changes.overheadChangePct !== undefined
    ? applyPct(current.overheadCost, changes.overheadChangePct)
    : current.overheadCost

  // Apply selling price change
  const newSellingPrice = changes.sellingPriceChangePct !== undefined
    ? applyPct(current.sellingPrice, changes.sellingPriceChangePct)
    : current.sellingPrice

  // Recalculate total HPP
  const hppResult = calculateHpp({
    hppBahan: newHppBahan,
    packagingCost: current.packagingCost,
    overheadCost: newOverheadCost,
    otherCost: current.otherCost,
  })

  const { profit } = calculateProfit({
    sellingPrice: newSellingPrice,
    totalHpp: hppResult.totalHpp,
  })

  const { foodCostPct } = calculateFoodCost({
    hppBahan: newHppBahan,
    sellingPrice: newSellingPrice,
  })

  const { marginPct } = calculateMargin({
    profit,
    sellingPrice: newSellingPrice,
  })

  return {
    newHppBahan: parseFloat(newHppBahan).toFixed(2),
    newPackagingCost: current.packagingCost,
    newOverheadCost: parseFloat(newOverheadCost).toFixed(2),
    newTotalHpp: hppResult.totalHpp,
    newSellingPrice: parseFloat(newSellingPrice).toFixed(2),
    newFoodCostPct: foodCostPct,
    newProfit: profit,
    newMarginPct: marginPct,
  }
}

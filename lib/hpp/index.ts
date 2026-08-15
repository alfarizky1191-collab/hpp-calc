/**
 * HPP Engine — Public API
 *
 * Import from this barrel to use the HPP calculation engine.
 * All formulas have a single source of truth here.
 *
 * @example
 *   import { calculateUnitCost, calculateHpp } from '@/lib/hpp'
 */

export { calculateUnitCost } from './calculate-unit-cost'
export type { UnitCostInput, UnitCostResult } from './calculate-unit-cost'

export { calculateRecipeCost } from './calculate-recipe-cost'
export type {
  RecipeItemCostInput,
  RecipeItemCostResult,
  RecipeCostInput,
  RecipeCostResult,
} from './calculate-recipe-cost'

export { calculateHpp } from './calculate-hpp'
export type { TotalHppInput, TotalHppResult } from './calculate-hpp'

export {
  calculateFoodCost,
  calculateProfit,
  calculateMargin,
  calculatePriceRecommendation,
} from './calculate-profitability'
export type {
  FoodCostInput,
  FoodCostResult,
  ProfitInput,
  ProfitResult,
  MarginInput,
  MarginResult,
  PriceRecommendationInput,
  PriceRecommendationResult,
} from './calculate-profitability'

export { runWhatIfSimulation } from './simulate-what-if'
export type { WhatIfInput, WhatIfResult } from './simulate-what-if'

/** Current engine version — bump when formulas change */
export const HPP_ENGINE_VERSION = 'hpp-engine-v1' as const

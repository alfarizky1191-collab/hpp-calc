/**
 * HPP (Harga Pokok Produksi) domain types.
 *
 * Monetary values are represented as strings in TypeScript to avoid
 * floating-point precision issues. The actual source of truth is
 * PostgreSQL NUMERIC columns.
 */

// ---------------------------------------------------------------------------
// Material
// ---------------------------------------------------------------------------

export type MaterialStatus = 'ACTIVE' | 'INACTIVE'

export interface Material {
  id: string
  organizationId: string
  name: string
  categoryId: string | null
  purchaseUnit: string
  purchasePrice: string   // NUMERIC(15,2) stored as string
  packageQuantity: string // NUMERIC(15,4)
  baseUnit: string
  unitCost: string        // NUMERIC(18,6) = purchasePrice / packageQuantity
  supplierId: string | null
  status: MaterialStatus
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  deletedBy: string | null
}

export interface MaterialPriceHistory {
  id: string
  materialId: string
  oldPrice: string
  newPrice: string
  effectiveAt: string
  changedBy: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export type MenuStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT'

export interface Menu {
  id: string
  organizationId: string
  name: string
  categoryId: string | null
  sellingPrice: string     // NUMERIC(15,2)
  targetFoodCost: string   // NUMERIC(5,2) — percentage, e.g. "30.00" = 30%
  status: MenuStatus
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Recipe
// ---------------------------------------------------------------------------

export type RecipeStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED'

export interface Recipe {
  id: string
  menuId: string
  version: number
  yieldQuantity: string    // NUMERIC(15,4)
  yieldUnit: string
  status: RecipeStatus
  createdAt: string
}

export interface RecipeItem {
  id: string
  recipeId: string
  materialId: string
  quantity: string          // NUMERIC(15,4)
  unit: string
  unitCostSnapshot: string  // NUMERIC(18,6) — locked at time of calculation
  totalCost: string         // NUMERIC(18,2)
}

// ---------------------------------------------------------------------------
// Packaging
// ---------------------------------------------------------------------------

export interface PackagingCost {
  id: string
  menuId: string
  name: string
  quantity: string          // NUMERIC(15,4)
  unitCost: string          // NUMERIC(18,6)
  totalCost: string         // NUMERIC(18,2)
}

// ---------------------------------------------------------------------------
// Expense
// ---------------------------------------------------------------------------

export type ExpenseCategory =
  | 'GAS'
  | 'ELECTRICITY'
  | 'WATER'
  | 'RENT'
  | 'SALARY'
  | 'TRANSPORT'
  | 'MAINTENANCE'
  | 'CONDIMENT'
  | 'GENERAL_PACKAGING'
  | 'OTHER'

export interface Expense {
  id: string
  organizationId: string
  name: string
  category: ExpenseCategory
  amount: string            // NUMERIC(15,2)
  period: string            // e.g. "2024-08"
  expenseDate: string
  createdBy: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// HPP Calculation
// ---------------------------------------------------------------------------

export interface HppCalculation {
  id: string
  organizationId: string
  menuId: string
  recipeId: string
  materialCost: string       // NUMERIC(18,2)
  packagingCost: string      // NUMERIC(18,2)
  overheadCost: string       // NUMERIC(18,2)
  otherCost: string          // NUMERIC(18,2)
  totalHpp: string           // NUMERIC(18,2)
  sellingPrice: string       // NUMERIC(15,2)
  foodCost: string           // NUMERIC(7,4) — percentage
  profit: string             // NUMERIC(18,2)
  margin: string             // NUMERIC(7,4) — percentage
  calculationVersion: string // e.g. "hpp-engine-v1"
  calculatedAt: string
}

// ---------------------------------------------------------------------------
// What-if simulation input (never saved to DB)
// ---------------------------------------------------------------------------

export interface WhatIfParams {
  materialPriceChangePct?: number   // e.g. 10 = +10%
  sellingPriceChangePct?: number
  overheadChangePct?: number
  productionVolumeChangePct?: number
}

export interface WhatIfResult {
  newTotalHpp: string
  newFoodCost: string
  newProfit: string
  newMargin: string
}

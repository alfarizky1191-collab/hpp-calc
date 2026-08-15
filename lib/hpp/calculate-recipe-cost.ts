/**
 * HPP Engine — Recipe Cost Calculation
 *
 * Formulas:
 *   Cost Bahan = Quantity × Harga Unit
 *   HPP Bahan per Unit = Total Cost Bahan ÷ Yield
 *
 * Design: all intermediate values are stored as BigInt in "nano-units"
 * (scaled by NANO = 10^9). This gives enough room to multiply a 6-decimal
 * quantity by a 6-decimal unit cost without overflow, and still produce
 * 2-decimal (totalCost) and 6-decimal (hppBahanPerUnit) outputs.
 */

/** Parse a decimal string into nano-units (10^9 fixed-point) */
function toNano(value: string): bigint {
  const NANO_DECIMALS = 9
  const [intPart = '0', fracPart = ''] = value.split('.')
  const frac = fracPart.padEnd(NANO_DECIMALS, '0').slice(0, NANO_DECIMALS)
  return BigInt(intPart) * BigInt(10 ** NANO_DECIMALS) + BigInt(frac)
}

/**
 * Convert nano-units back to a decimal string with `decimals` places.
 * Performs floor division (truncates, does not round).
 */
function fromNano(nano: bigint, decimals: number): string {
  const scale = BigInt(10 ** (9 - decimals))
  const units = nano / scale                          // now in (10^decimals)-units
  const absUnits = units < 0n ? -units : units
  const sign = units < 0n ? '-' : ''
  const divisor = BigInt(10 ** decimals)
  const intPart = absUnits / divisor
  const fracPart = (absUnits % divisor).toString().padStart(decimals, '0')
  return `${sign}${intPart}.${fracPart}`
}

export interface RecipeItemCostInput {
  materialId: string
  /** Quantity used in recipe (e.g. "200.000000" grams) */
  quantity: string
  /** Unit cost (NUMERIC 18,6) — from material.unitCost */
  unitCost: string
}

export interface RecipeItemCostResult {
  materialId: string
  quantity: string
  unitCost: string
  /** quantity × unitCost rounded to 2 decimal places */
  totalCost: string
}

export interface RecipeCostInput {
  items: RecipeItemCostInput[]
  /** Number of portions this recipe produces */
  yieldQuantity: string
}

export interface RecipeCostResult {
  itemCosts: RecipeItemCostResult[]
  /** Sum of all item totalCosts (NUMERIC 18,2) */
  totalMaterialCost: string
  /** totalMaterialCost ÷ yieldQuantity (NUMERIC 18,6) */
  hppBahanPerUnit: string
}

/**
 * Hitung total cost per bahan dan HPP bahan per unit produk.
 *
 * @throws {Error} when yieldQuantity is zero or negative
 * @throws {Error} when any quantity or unitCost is negative
 */
export function calculateRecipeCost(input: RecipeCostInput): RecipeCostResult {
  const { items, yieldQuantity } = input

  const yieldNano = toNano(yieldQuantity)
  if (yieldNano <= 0n) {
    throw new Error(
      `yieldQuantity must be greater than zero, got: ${yieldQuantity}`
    )
  }

  const itemCosts: RecipeItemCostResult[] = []
  let totalNano = 0n

  for (const item of items) {
    const qtyNano = toNano(item.quantity)
    const unitNano = toNano(item.unitCost)

    if (qtyNano < 0n) {
      throw new Error(
        `quantity must be non-negative for material ${item.materialId}, got: ${item.quantity}`
      )
    }
    if (unitNano < 0n) {
      throw new Error(
        `unitCost must be non-negative for material ${item.materialId}, got: ${item.unitCost}`
      )
    }

    // Both values are in nano-units (10^9), so product is in 10^18.
    // Divide by 10^9 once to bring back to nano-units.
    const itemNano = (qtyNano * unitNano) / BigInt(10 ** 9)

    totalNano += itemNano

    itemCosts.push({
      materialId: item.materialId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: fromNano(itemNano, 2),
    })
  }

  // hppBahanPerUnit = totalNano / yieldNano
  // To get the result in nano-units: (totalNano * 10^9) / yieldNano
  const hppNano = (totalNano * BigInt(10 ** 9)) / yieldNano

  return {
    itemCosts,
    totalMaterialCost: fromNano(totalNano, 2),
    hppBahanPerUnit: fromNano(hppNano, 6),
  }
}

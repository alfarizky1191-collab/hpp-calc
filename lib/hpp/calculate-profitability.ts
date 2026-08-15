/**
 * HPP Engine — Profitability Calculations
 *
 * Formulas:
 *   Profit = Harga Jual - HPP Total
 *   Food Cost % = HPP Bahan ÷ Harga Jual × 100
 *   Profit Margin % = Profit ÷ Harga Jual × 100
 *   Rekomendasi Harga Jual = HPP ÷ Target Food Cost %
 */

const PRICE_PRECISION = 2
const PCT_PRECISION = 4     // store percentages to 4 decimal places
const PRICE_SCALE = BigInt(10 ** PRICE_PRECISION)
const PCT_SCALE = BigInt(10 ** PCT_PRECISION)

function toCents(value: string): bigint {
  const [i = '0', f = ''] = value.split('.')
  return BigInt(i) * PRICE_SCALE + BigInt(f.padEnd(PRICE_PRECISION, '0').slice(0, PRICE_PRECISION))
}

function fromCents(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents
  const sign = cents < 0n ? '-' : ''
  return `${sign}${abs / PRICE_SCALE}.${(abs % PRICE_SCALE).toString().padStart(PRICE_PRECISION, '0')}`
}

function fromPct(micro: bigint): string {
  const abs = micro < 0n ? -micro : micro
  const sign = micro < 0n ? '-' : ''
  return `${sign}${abs / PCT_SCALE}.${(abs % PCT_SCALE).toString().padStart(PCT_PRECISION, '0')}`
}

// ---------------------------------------------------------------------------
// Food Cost
// ---------------------------------------------------------------------------

export interface FoodCostInput {
  /** HPP Bahan per unit */
  hppBahan: string
  /** Harga jual */
  sellingPrice: string
}

export interface FoodCostResult {
  /** Food Cost % (NUMERIC 7,4) */
  foodCostPct: string
}

/**
 * Food Cost % = HPP Bahan ÷ Harga Jual × 100
 *
 * @throws {Error} when sellingPrice is zero or negative
 */
export function calculateFoodCost(input: FoodCostInput): FoodCostResult {
  const sellingCents = toCents(input.sellingPrice)
  if (sellingCents <= 0n) {
    throw new Error(`sellingPrice must be greater than zero, got: ${input.sellingPrice}`)
  }
  const hppCents = toCents(parseFloat(input.hppBahan).toFixed(PRICE_PRECISION))

  // foodCost% = (hppBahan / sellingPrice) * 100
  // scaled: (hppCents * PCT_SCALE * 100) / sellingCents
  const pctMicro = (hppCents * PCT_SCALE * 100n) / sellingCents

  return { foodCostPct: fromPct(pctMicro) }
}

// ---------------------------------------------------------------------------
// Profit
// ---------------------------------------------------------------------------

export interface ProfitInput {
  sellingPrice: string
  totalHpp: string
}

export interface ProfitResult {
  /** Can be negative */
  profit: string
}

/** Profit = Harga Jual − HPP Total */
export function calculateProfit(input: ProfitInput): ProfitResult {
  const selling = toCents(input.sellingPrice)
  const hpp = toCents(input.totalHpp)
  return { profit: fromCents(selling - hpp) }
}

// ---------------------------------------------------------------------------
// Profit Margin
// ---------------------------------------------------------------------------

export interface MarginInput {
  profit: string
  sellingPrice: string
}

export interface MarginResult {
  /** Profit Margin % (NUMERIC 7,4) */
  marginPct: string
}

/**
 * Profit Margin % = Profit ÷ Harga Jual × 100
 *
 * @throws {Error} when sellingPrice is zero or negative
 */
export function calculateMargin(input: MarginInput): MarginResult {
  const sellingCents = toCents(input.sellingPrice)
  if (sellingCents <= 0n) {
    throw new Error(`sellingPrice must be greater than zero, got: ${input.sellingPrice}`)
  }
  const profitCents = toCents(input.profit)

  const pctMicro = (profitCents * PCT_SCALE * 100n) / sellingCents

  return { marginPct: fromPct(pctMicro) }
}

// ---------------------------------------------------------------------------
// Smart Pricing — Price Recommendation
// ---------------------------------------------------------------------------

export interface PriceRecommendationInput {
  totalHpp: string
  /** Target food cost as a percentage, e.g. "30.00" = 30% */
  targetFoodCostPct: string
}

export interface PriceRecommendationResult {
  /** Raw recommended price (NUMERIC 15,2) */
  recommendedPrice: string
  /** Rounded options for display */
  roundedOptions: string[]
}

/**
 * Rekomendasi Harga Jual = HPP ÷ (Target Food Cost / 100)
 *
 * @throws {Error} when targetFoodCostPct is zero or negative or > 100
 */
export function calculatePriceRecommendation(
  input: PriceRecommendationInput
): PriceRecommendationResult {
  const targetPct = parseFloat(input.targetFoodCostPct)
  if (targetPct <= 0 || targetPct > 100) {
    throw new Error(
      `targetFoodCostPct must be between 0 and 100 (exclusive), got: ${input.targetFoodCostPct}`
    )
  }

  const hppFloat = parseFloat(input.totalHpp)
  if (hppFloat < 0) {
    throw new Error(`totalHpp must be non-negative, got: ${input.totalHpp}`)
  }

  const raw = (hppFloat / targetPct) * 100
  const recommendedPrice = raw.toFixed(2)

  // Generate rounding options: nearest 500, 1000, 2500, 5000
  const roundingSteps = [500, 1000, 2500, 5000]
  const roundedOptions = roundingSteps
    .map((step) => {
      const rounded = Math.ceil(raw / step) * step
      return rounded.toFixed(2)
    })
    .filter((v, i, arr) => arr.indexOf(v) === i) // deduplicate

  return { recommendedPrice, roundedOptions }
}

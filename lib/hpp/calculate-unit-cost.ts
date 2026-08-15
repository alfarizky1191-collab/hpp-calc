/**
 * HPP Engine — Unit Cost Calculation
 *
 * Formula: Harga Unit = Harga Pembelian ÷ Isi Per Kemasan
 *
 * All monetary arithmetic uses integer math (in sub-units) to avoid
 * JavaScript floating-point errors. Results are strings matching
 * PostgreSQL NUMERIC(18,6) precision.
 */

const PRECISION = 6           // decimal places for unit cost
const SCALE = 10 ** PRECISION // 1_000_000

/**
 * Parse a decimal string to an integer in micro-units.
 * E.g. "15000.00" → 15_000_000_000 (scaled by 10^6)
 */
function toMicro(value: string): bigint {
  const [intPart = '0', fracPart = ''] = value.split('.')
  const frac = fracPart.padEnd(PRECISION, '0').slice(0, PRECISION)
  return BigInt(intPart) * BigInt(SCALE) + BigInt(frac)
}

/**
 * Convert micro-unit integer back to a decimal string with fixed precision.
 */
function fromMicro(micro: bigint, decimals: number = PRECISION): string {
  const scale = BigInt(10 ** decimals)
  const abs = micro < 0n ? -micro : micro
  const sign = micro < 0n ? '-' : ''
  const intPart = abs / scale
  const fracPart = (abs % scale).toString().padStart(decimals, '0')
  return `${sign}${intPart}.${fracPart}`
}

export interface UnitCostInput {
  /** Harga pembelian per kemasan (e.g. "15000.00") */
  purchasePrice: string
  /** Isi per kemasan dalam satuan terkecil (e.g. "1000.000000" for 1 kg = 1000 g) */
  packageQuantity: string
}

export interface UnitCostResult {
  /** Harga per satuan terkecil (NUMERIC 18,6) */
  unitCost: string
}

/**
 * Hitung harga per satuan terkecil.
 *
 * @throws {Error} when packageQuantity is zero or negative
 * @throws {Error} when purchasePrice is negative
 */
export function calculateUnitCost(input: UnitCostInput): UnitCostResult {
  const { purchasePrice, packageQuantity } = input

  const priceMicro = toMicro(purchasePrice)
  const qtyMicro = toMicro(packageQuantity)

  if (qtyMicro <= 0n) {
    throw new Error(
      `packageQuantity must be greater than zero, got: ${packageQuantity}`
    )
  }

  if (priceMicro < 0n) {
    throw new Error(
      `purchasePrice must be non-negative, got: ${purchasePrice}`
    )
  }

  // Divide with extra precision, then round to PRECISION decimals
  // We compute (priceMicro * SCALE) / qtyMicro to maintain precision
  const resultMicro = (priceMicro * BigInt(SCALE)) / qtyMicro

  return {
    unitCost: fromMicro(resultMicro),
  }
}

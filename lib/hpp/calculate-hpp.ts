/**
 * HPP Engine — Total HPP Calculation
 *
 * Formula:
 *   HPP Total = HPP Bahan + Kemasan + Overhead + Biaya Lain
 */

const PRECISION = 2
const SCALE = BigInt(10 ** PRECISION)

function toUnits(value: string): bigint {
  const [intPart = '0', fracPart = ''] = value.split('.')
  const frac = fracPart.padEnd(PRECISION, '0').slice(0, PRECISION)
  return BigInt(intPart) * SCALE + BigInt(frac)
}

function fromUnits(units: bigint): string {
  const abs = units < 0n ? -units : units
  const sign = units < 0n ? '-' : ''
  const intPart = abs / SCALE
  const fracPart = (abs % SCALE).toString().padStart(PRECISION, '0')
  return `${sign}${intPart}.${fracPart}`
}

export interface TotalHppInput {
  /** HPP Bahan per unit (NUMERIC 18,6 or 18,2) */
  hppBahan: string
  /** Total packaging cost per unit (NUMERIC 18,2) */
  packagingCost: string
  /** Overhead allocated per unit (NUMERIC 18,2) */
  overheadCost: string
  /** Other costs per unit (NUMERIC 18,2) */
  otherCost: string
}

export interface TotalHppResult {
  /** HPP Total per unit (NUMERIC 18,2) */
  totalHpp: string
  breakdown: {
    hppBahan: string
    packagingCost: string
    overheadCost: string
    otherCost: string
  }
}

/**
 * Hitung total HPP per unit produk.
 *
 * @throws {Error} when any cost component is negative
 */
export function calculateHpp(input: TotalHppInput): TotalHppResult {
  const { hppBahan, packagingCost, overheadCost, otherCost } = input

  // Normalize hppBahan to 2 decimal places first
  const hppBahanNorm = parseFloat(hppBahan).toFixed(2)

  const components = [
    { name: 'hppBahan', value: hppBahanNorm },
    { name: 'packagingCost', value: packagingCost },
    { name: 'overheadCost', value: overheadCost },
    { name: 'otherCost', value: otherCost },
  ]

  let total = 0n
  for (const c of components) {
    const units = toUnits(c.value)
    if (units < 0n) {
      throw new Error(`${c.name} must be non-negative, got: ${c.value}`)
    }
    total += units
  }

  return {
    totalHpp: fromUnits(total),
    breakdown: {
      hppBahan: parseFloat(hppBahanNorm).toFixed(2),
      packagingCost: parseFloat(packagingCost).toFixed(2),
      overheadCost: parseFloat(overheadCost).toFixed(2),
      otherCost: parseFloat(otherCost).toFixed(2),
    },
  }
}

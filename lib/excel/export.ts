/**
 * Excel Export Utilities — SheetJS (xlsx)
 *
 * All exports run server-side. Data is fetched, transformed, and
 * returned as a Buffer. The Route Handler streams it to the client.
 *
 * Security: values starting with =, +, -, @ are sanitized to prevent
 * formula injection when the file is opened in Excel.
 */

import * as XLSX from 'xlsx'

// ---------------------------------------------------------------------------
// Formula injection prevention
// ---------------------------------------------------------------------------
const FORMULA_CHARS = ['=', '+', '-', '@', '\t', '\r']

export function sanitizeCell(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (FORMULA_CHARS.some((c) => value.startsWith(c))) {
    return `'${value}` // prefix with apostrophe — Excel treats it as text
  }
  return value
}

function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(row)) {
    result[key] = sanitizeCell(val)
  }
  return result
}

// ---------------------------------------------------------------------------
// Build workbook helpers
// ---------------------------------------------------------------------------
export function createWorkbook(): XLSX.WorkBook {
  return XLSX.utils.book_new()
}

export function addSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  data: Record<string, unknown>[]
): void {
  const sanitized = data.map(sanitizeRow)
  const ws = XLSX.utils.json_to_sheet(sanitized)

  // Auto column widths (estimate from content)
  const colWidths: number[] = []
  for (const row of sanitized) {
    Object.values(row).forEach((val, i) => {
      const len = String(val ?? '').length
      colWidths[i] = Math.min(Math.max(colWidths[i] ?? 10, len + 2), 50)
    })
  }
  ws['!cols'] = colWidths.map((w) => ({ wch: w }))

  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
}

export function workbookToBuffer(wb: XLSX.WorkBook): Buffer {
  const ab = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return Buffer.from(ab)
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------
function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

function fmtPct(v: number): string {
  return `${v.toFixed(2)}%`
}

// ---------------------------------------------------------------------------
// Export: Materials
// ---------------------------------------------------------------------------
export interface MaterialExportRow {
  id: string
  name: string
  category: string | null
  purchase_unit: string
  purchase_price: number
  package_quantity: number
  base_unit: string
  unit_cost: number
  supplier: string | null
  status: string
  created_at: string
}

export function buildMaterialsSheet(
  wb: XLSX.WorkBook,
  materials: MaterialExportRow[]
): void {
  const rows = materials.map((m) => ({
    ID: m.id,
    'Nama Bahan': m.name,
    Kategori: m.category ?? '',
    'Satuan Pembelian': m.purchase_unit,
    'Harga Pembelian (Rp)': m.purchase_price,
    'Isi Per Kemasan': m.package_quantity,
    'Satuan Terkecil': m.base_unit,
    'Harga Unit (Rp)': parseFloat(m.unit_cost.toFixed(4)),
    Supplier: m.supplier ?? '',
    Status: m.status,
    'Tanggal Ditambahkan': fmtDate(m.created_at),
  }))
  addSheet(wb, 'Master Bahan', rows)
}

// ---------------------------------------------------------------------------
// Export: Menus
// ---------------------------------------------------------------------------
export interface MenuExportRow {
  id: string
  name: string
  category: string | null
  selling_price: number
  target_food_cost: number
  status: string
  total_hpp: number | null
  food_cost: number | null
  profit: number | null
  margin: number | null
}

export function buildMenusSheet(wb: XLSX.WorkBook, menus: MenuExportRow[]): void {
  const rows = menus.map((m) => ({
    ID: m.id,
    'Nama Menu': m.name,
    Kategori: m.category ?? '',
    'Harga Jual (Rp)': m.selling_price,
    'Target Food Cost': fmtPct(m.target_food_cost),
    'Total HPP (Rp)': m.total_hpp ?? '',
    'Food Cost (%)': m.food_cost !== null ? fmtPct(m.food_cost) : '',
    'Profit (Rp)': m.profit ?? '',
    'Margin (%)': m.margin !== null ? fmtPct(m.margin) : '',
    Status: m.status,
  }))
  addSheet(wb, 'Menu', rows)
}

// ---------------------------------------------------------------------------
// Export: HPP Report
// ---------------------------------------------------------------------------
export interface HppExportRow {
  menu_name: string
  recipe_version: number
  material_cost: number
  packaging_cost: number
  overhead_cost: number
  other_cost: number
  total_hpp: number
  selling_price: number
  food_cost: number
  profit: number
  margin: number
  calculated_at: string
  calculation_version: string
}

export function buildHppSheet(wb: XLSX.WorkBook, rows: HppExportRow[]): void {
  const data = rows.map((r) => ({
    Menu: r.menu_name,
    'Versi Resep': r.recipe_version,
    'Biaya Bahan (Rp)': r.material_cost,
    'Biaya Kemasan (Rp)': r.packaging_cost,
    'Overhead (Rp)': r.overhead_cost,
    'Biaya Lain (Rp)': r.other_cost,
    'Total HPP (Rp)': r.total_hpp,
    'Harga Jual (Rp)': r.selling_price,
    'Food Cost (%)': fmtPct(r.food_cost),
    'Profit (Rp)': r.profit,
    'Margin (%)': fmtPct(r.margin),
    'Tanggal Kalkulasi': fmtDate(r.calculated_at),
    'Versi Engine': r.calculation_version,
  }))
  addSheet(wb, 'HPP Report', data)
}

// ---------------------------------------------------------------------------
// Export: Price History
// ---------------------------------------------------------------------------
export interface PriceHistoryExportRow {
  material_name: string
  old_price: number
  new_price: number
  change_pct: number
  created_at: string
}

export function buildPriceHistorySheet(
  wb: XLSX.WorkBook,
  rows: PriceHistoryExportRow[]
): void {
  const data = rows.map((r) => ({
    'Nama Bahan': r.material_name,
    'Harga Lama (Rp)': r.old_price,
    'Harga Baru (Rp)': r.new_price,
    'Perubahan (%)': `${r.change_pct >= 0 ? '+' : ''}${r.change_pct.toFixed(1)}%`,
    Tanggal: fmtDate(r.created_at),
  }))
  addSheet(wb, 'Riwayat Harga', data)
}

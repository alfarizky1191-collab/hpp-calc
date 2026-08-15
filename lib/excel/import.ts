/**
 * Excel Import Utilities — SheetJS (xlsx)
 *
 * Security:
 * - Max file size: 10 MB
 * - Only .xlsx and .xls
 * - Validate workbook structure
 * - Sanitize formula injection chars
 * - Validate all data server-side with Zod
 */

import * as XLSX from 'xlsx'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// File validation constants
// ---------------------------------------------------------------------------
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls']
export const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream', // some browsers send this
]
export const MAX_ROWS = 1000
export const MAX_COLS = 50

// ---------------------------------------------------------------------------
// Parse Excel buffer to rows
// ---------------------------------------------------------------------------
export function parseExcelBuffer(
  buffer: Buffer,
  sheetNameOrIndex: string | number = 0
): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellText: false,
  })

  const sheetName =
    typeof sheetNameOrIndex === 'number'
      ? wb.SheetNames[sheetNameOrIndex]
      : sheetNameOrIndex

  if (!sheetName || !wb.Sheets[sheetName]) {
    throw new Error('Sheet tidak ditemukan dalam file Excel')
  }

  const ws = wb.Sheets[sheetName]

  // Check cell count
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:A1')
  const rows = range.e.r - range.s.r
  const cols = range.e.c - range.s.c

  if (rows > MAX_ROWS) {
    throw new Error(`Terlalu banyak baris (${rows}). Maksimal ${MAX_ROWS} baris.`)
  }
  if (cols > MAX_COLS) {
    throw new Error(`Terlalu banyak kolom (${cols}). Maksimal ${MAX_COLS} kolom.`)
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
    raw: false, // all values as strings/numbers
  })
}

// ---------------------------------------------------------------------------
// Material import schema (columns expected in Excel)
// ---------------------------------------------------------------------------
const materialImportRowSchema = z.object({
  'Nama Bahan': z
    .string({ required_error: 'Kolom "Nama Bahan" wajib diisi' })
    .min(1, 'Nama bahan tidak boleh kosong')
    .max(255)
    .trim(),

  'Satuan Pembelian': z
    .string({ required_error: 'Kolom "Satuan Pembelian" wajib diisi' })
    .min(1)
    .max(50)
    .trim(),

  'Harga Pembelian (Rp)': z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.]/g, ''))
      return n
    })
    .refine((v) => !isNaN(v) && v >= 0, 'Harga pembelian harus angka positif'),

  'Isi Per Kemasan': z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.]/g, ''))
      return n
    })
    .refine((v) => !isNaN(v) && v > 0, 'Isi per kemasan harus lebih dari 0'),

  'Satuan Terkecil': z
    .string({ required_error: 'Kolom "Satuan Terkecil" wajib diisi' })
    .min(1)
    .max(50)
    .trim(),

  Supplier: z.string().max(255).trim().optional().nullable().default(null),

  Kategori: z.string().max(100).trim().optional().nullable().default(null),
})

export type MaterialImportRow = z.infer<typeof materialImportRowSchema>

export type RowStatus = 'valid' | 'warning' | 'error'

export interface ParsedImportRow {
  rowIndex: number
  status: RowStatus
  errors: string[]
  warnings: string[]
  data: MaterialImportRow | null
  raw: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Validate rows
// ---------------------------------------------------------------------------
export function validateMaterialRows(
  rawRows: Record<string, unknown>[]
): ParsedImportRow[] {
  return rawRows.map((raw, idx) => {
    const rowIndex = idx + 2 // +2 because row 1 = header, 0-indexed

    const result = materialImportRowSchema.safeParse(raw)
    const errors: string[] = []
    const warnings: string[] = []

    if (!result.success) {
      for (const err of result.error.errors) {
        errors.push(err.message)
      }
      return { rowIndex, status: 'error', errors, warnings, data: null, raw }
    }

    // Warnings for valid rows
    const data = result.data
    if (!data.Supplier) {
      warnings.push('Supplier tidak diisi')
    }
    if (!data.Kategori) {
      warnings.push('Kategori tidak diisi')
    }

    const status: RowStatus = warnings.length > 0 ? 'warning' : 'valid'
    return { rowIndex, status, errors, warnings, data, raw }
  })
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
export interface ImportSummary {
  total: number
  valid: number
  warning: number
  error: number
}

export function getImportSummary(rows: ParsedImportRow[]): ImportSummary {
  return {
    total: rows.length,
    valid: rows.filter((r) => r.status === 'valid').length,
    warning: rows.filter((r) => r.status === 'warning').length,
    error: rows.filter((r) => r.status === 'error').length,
  }
}

// ---------------------------------------------------------------------------
// Template generator — for users to download before importing
// ---------------------------------------------------------------------------
export function generateImportTemplate(): Buffer {
  const wb = XLSX.utils.book_new()
  const sampleRows = [
    {
      'Nama Bahan': 'Tepung Terigu',
      'Satuan Pembelian': 'kg',
      'Harga Pembelian (Rp)': 15000,
      'Isi Per Kemasan': 1000,
      'Satuan Terkecil': 'gram',
      Supplier: 'Toko ABC',
      Kategori: 'Bahan Baku',
    },
    {
      'Nama Bahan': 'Gula Pasir',
      'Satuan Pembelian': 'kg',
      'Harga Pembelian (Rp)': 14000,
      'Isi Per Kemasan': 1000,
      'Satuan Terkecil': 'gram',
      Supplier: '',
      Kategori: '',
    },
  ]
  const ws = XLSX.utils.json_to_sheet(sampleRows)
  XLSX.utils.book_append_sheet(wb, ws, 'Master Bahan')
  const ab = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return Buffer.from(ab)
}

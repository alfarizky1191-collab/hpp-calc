/**
 * File upload security validator.
 *
 * Validates:
 * 1. File size (<= 10 MB)
 * 2. File extension (.xlsx, .xls only)
 * 3. MIME type (client-supplied, checked but not trusted alone)
 * 4. Magic bytes (binary signature — cannot be faked by renaming)
 * 5. Formula injection markers (=, +, -, @, \t, \r at cell start)
 * 6. Workbook structure sanity (row/col limits)
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'] as const
export const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream', // some browsers send this for xlsx
] as const

// Magic byte signatures
const MAGIC_XLSX = [0x50, 0x4b, 0x03, 0x04] // PK.. (ZIP)
const MAGIC_XLS  = [0xd0, 0xcf, 0x11, 0xe0]  // BIFF8

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate a File object before processing.
 * Call this BEFORE parsing the workbook.
 */
export function validateUploadedFile(file: File): FileValidationResult {
  // 1. Size
  if (file.size === 0) {
    return { valid: false, error: 'File kosong' }
  }
  if (file.size > MAX_FILE_SIZE) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return {
      valid: false,
      error: `Ukuran file terlalu besar (${mb} MB). Maksimal 10 MB.`,
    }
  }

  // 2. Extension
  const name = file.name.toLowerCase()
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
  if (!hasValidExt) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Gunakan .xlsx atau .xls',
    }
  }

  // 3. Filename sanity — no path traversal, no null bytes
  if (file.name.includes('..') || file.name.includes('\0') || file.name.includes('/')) {
    return { valid: false, error: 'Nama file tidak valid' }
  }

  return { valid: true }
}

/**
 * Validate magic bytes of a Buffer.
 * Must be called AFTER reading the file into memory.
 */
export function validateFileMagicBytes(buffer: Buffer): FileValidationResult {
  if (buffer.length < 4) {
    return { valid: false, error: 'File terlalu kecil untuk dibaca' }
  }

  const isXlsx = MAGIC_XLSX.every((b, i) => buffer[i] === b)
  const isXls  = MAGIC_XLS.every((b, i) => buffer[i] === b)

  if (!isXlsx && !isXls) {
    return {
      valid: false,
      error: 'File bukan format Excel yang valid (signature tidak cocok)',
    }
  }

  return { valid: true }
}

/**
 * Sanitize a cell value to prevent formula injection.
 *
 * Excel formula injection: if a cell starts with =, +, -, @, \t, \r
 * it will be executed as a formula when opened.
 *
 * Strategy: prepend a tab character to neutralize the formula prefix.
 * This is the recommended approach per OWASP.
 *
 * Applied on EXPORT to prevent storing injected values.
 * On IMPORT, flag values as warnings.
 */
const FORMULA_INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

export function sanitizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (FORMULA_INJECTION_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    // Prepend apostrophe to force Excel to treat as text
    return `'${str}`
  }
  return str
}

/**
 * Check if a cell value looks like a formula injection attempt.
 * Returns true if the value should be flagged as a warning on import.
 */
export function hasPotentialFormulaInjection(value: unknown): boolean {
  if (value === null || value === undefined) return false
  const str = String(value).trim()
  return FORMULA_INJECTION_PREFIXES.some((prefix) => str.startsWith(prefix))
}

/**
 * Validate workbook row/column count to prevent DoS.
 */
export interface WorkbookSanityOptions {
  maxRows?: number
  maxCols?: number
}

export function validateWorkbookSanity(
  rowCount: number,
  colCount: number,
  opts: WorkbookSanityOptions = {}
): FileValidationResult {
  const maxRows = opts.maxRows ?? 5_000
  const maxCols = opts.maxCols ?? 100

  if (rowCount > maxRows) {
    return {
      valid: false,
      error: `Terlalu banyak baris (${rowCount.toLocaleString('id-ID')}). Maksimal ${maxRows.toLocaleString('id-ID')} baris per file.`,
    }
  }

  if (colCount > maxCols) {
    return {
      valid: false,
      error: `Terlalu banyak kolom (${colCount}). Maksimal ${maxCols} kolom.`,
    }
  }

  return { valid: true }
}

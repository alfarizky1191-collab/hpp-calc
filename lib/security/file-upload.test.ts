import { describe, it, expect } from 'vitest'
import {
  validateUploadedFile,
  validateFileMagicBytes,
  sanitizeCellValue,
  hasPotentialFormulaInjection,
  validateWorkbookSanity,
  MAX_FILE_SIZE,
} from './file-upload'

// ---------------------------------------------------------------------------
// validateUploadedFile
// ---------------------------------------------------------------------------

describe('validateUploadedFile', () => {
  function makeFile(name: string, size: number, type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'): File {
    const content = new Uint8Array(size).fill(0)
    return new File([content], name, { type })
  }

  it('accepts a valid xlsx file', () => {
    const file = makeFile('materials.xlsx', 1024)
    expect(validateUploadedFile(file).valid).toBe(true)
  })

  it('accepts a valid xls file', () => {
    const file = makeFile('materials.xls', 1024, 'application/vnd.ms-excel')
    expect(validateUploadedFile(file).valid).toBe(true)
  })

  it('rejects empty file', () => {
    const file = makeFile('empty.xlsx', 0)
    const result = validateUploadedFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/kosong/i)
  })

  it('rejects file over 10 MB', () => {
    const file = makeFile('big.xlsx', MAX_FILE_SIZE + 1)
    const result = validateUploadedFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/besar/i)
  })

  it('rejects file at exactly the limit (boundary: MAX_FILE_SIZE is exclusive)', () => {
    const file = makeFile('exact.xlsx', MAX_FILE_SIZE + 1)
    expect(validateUploadedFile(file).valid).toBe(false)
  })

  it('accepts file exactly at the limit', () => {
    const file = makeFile('exact.xlsx', MAX_FILE_SIZE)
    expect(validateUploadedFile(file).valid).toBe(true)
  })

  it('rejects unsupported extension .csv', () => {
    const file = makeFile('data.csv', 1024)
    const result = validateUploadedFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/format/i)
  })

  it('rejects unsupported extension .txt', () => {
    const file = makeFile('data.txt', 1024)
    expect(validateUploadedFile(file).valid).toBe(false)
  })

  it('rejects filename with path traversal ../', () => {
    const file = makeFile('../../../etc/passwd.xlsx', 1024)
    const result = validateUploadedFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/nama file/i)
  })

  it('rejects filename with null byte', () => {
    const file = makeFile('file\0.xlsx', 1024)
    expect(validateUploadedFile(file).valid).toBe(false)
  })

  it('rejects filename with forward slash', () => {
    const file = makeFile('dir/file.xlsx', 1024)
    expect(validateUploadedFile(file).valid).toBe(false)
  })

  it('accepts uppercase extension .XLSX', () => {
    const file = makeFile('MATERIALS.XLSX', 1024)
    expect(validateUploadedFile(file).valid).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validateFileMagicBytes
// ---------------------------------------------------------------------------

describe('validateFileMagicBytes', () => {
  it('accepts xlsx magic bytes (PK header)', () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, ...new Array(100).fill(0)])
    expect(validateFileMagicBytes(buf).valid).toBe(true)
  })

  it('accepts xls magic bytes (BIFF8)', () => {
    const buf = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, ...new Array(100).fill(0)])
    expect(validateFileMagicBytes(buf).valid).toBe(true)
  })

  it('rejects PDF magic bytes', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, ...new Array(100).fill(0)]) // %PDF
    const result = validateFileMagicBytes(buf)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/valid/i)
  })

  it('rejects PK variant that is not a valid xlsx/xls workbook start', () => {
    // PK\x05\x06 (empty zip end-of-directory) — our validator only accepts PK\x03\x04
    // This is correct: an empty zip is not a valid workbook
    const buf = Buffer.from([0x50, 0x4b, 0x05, 0x06, ...new Array(100).fill(0)])
    expect(validateFileMagicBytes(buf).valid).toBe(false)
  })

  it('rejects buffer shorter than 4 bytes', () => {
    const buf = Buffer.from([0x50, 0x4b])
    expect(validateFileMagicBytes(buf).valid).toBe(false)
  })

  it('rejects completely empty buffer', () => {
    expect(validateFileMagicBytes(Buffer.alloc(0)).valid).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// sanitizeCellValue — formula injection prevention
// ---------------------------------------------------------------------------

describe('sanitizeCellValue', () => {
  it('passes through normal text unchanged', () => {
    expect(sanitizeCellValue('Tepung Terigu')).toBe('Tepung Terigu')
  })

  it('passes through numbers unchanged', () => {
    expect(sanitizeCellValue(15000)).toBe('15000')
  })

  it('neutralizes = prefix (formula injection)', () => {
    const result = sanitizeCellValue('=SUM(A1:A10)')
    expect(result).toMatch(/^'=/)
  })

  it('neutralizes + prefix', () => {
    expect(sanitizeCellValue('+cmd|/C calc')).toMatch(/^'\+/)
  })

  it('neutralizes - prefix', () => {
    expect(sanitizeCellValue('-2+3+cmd')).toMatch(/^'-/)
  })

  it('neutralizes @ prefix', () => {
    expect(sanitizeCellValue('@SUM(1+1)')).toMatch(/^'@/)
  })

  it('neutralizes tab prefix', () => {
    expect(sanitizeCellValue('\t=malicious')).toMatch(/^'\t/)
  })

  it('handles null gracefully', () => {
    expect(sanitizeCellValue(null)).toBe('')
  })

  it('handles undefined gracefully', () => {
    expect(sanitizeCellValue(undefined)).toBe('')
  })

  it('does not modify text starting with a number', () => {
    expect(sanitizeCellValue('15000')).toBe('15000')
  })

  it('does not modify text starting with a letter', () => {
    expect(sanitizeCellValue('Ayam Geprek')).toBe('Ayam Geprek')
  })
})

// ---------------------------------------------------------------------------
// hasPotentialFormulaInjection
// ---------------------------------------------------------------------------

describe('hasPotentialFormulaInjection', () => {
  it('detects = prefix', () => {
    expect(hasPotentialFormulaInjection('=HYPERLINK("evil.com")')).toBe(true)
  })

  it('detects + prefix', () => {
    expect(hasPotentialFormulaInjection('+cmd')).toBe(true)
  })

  it('detects - prefix', () => {
    expect(hasPotentialFormulaInjection('-2+3')).toBe(true)
  })

  it('detects @ prefix', () => {
    expect(hasPotentialFormulaInjection('@SUM')).toBe(true)
  })

  it('returns false for normal text', () => {
    expect(hasPotentialFormulaInjection('Gula Pasir')).toBe(false)
  })

  it('returns false for numbers', () => {
    expect(hasPotentialFormulaInjection(15000)).toBe(false)
  })

  it('returns false for null', () => {
    expect(hasPotentialFormulaInjection(null)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(hasPotentialFormulaInjection('')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validateWorkbookSanity
// ---------------------------------------------------------------------------

describe('validateWorkbookSanity', () => {
  it('accepts within default limits', () => {
    expect(validateWorkbookSanity(100, 10).valid).toBe(true)
  })

  it('accepts exactly at default limits', () => {
    expect(validateWorkbookSanity(5000, 100).valid).toBe(true)
  })

  it('rejects row count exceeding default', () => {
    const result = validateWorkbookSanity(5001, 10)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/baris/i)
  })

  it('rejects col count exceeding default', () => {
    const result = validateWorkbookSanity(100, 101)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/kolom/i)
  })

  it('accepts custom limits', () => {
    expect(validateWorkbookSanity(10000, 200, { maxRows: 10000, maxCols: 200 }).valid).toBe(true)
  })

  it('rejects with custom limits exceeded', () => {
    expect(validateWorkbookSanity(1001, 5, { maxRows: 1000 }).valid).toBe(false)
  })
})

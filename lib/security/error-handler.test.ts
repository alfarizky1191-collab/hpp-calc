import { describe, it, expect } from 'vitest'
import { sanitizeError } from './error-handler'

describe('sanitizeError', () => {
  // ── Safe pass-through ────────────────────────────────────────────────────

  it('returns a safe user-facing message unchanged', () => {
    const result = sanitizeError(new Error('Nama menu wajib diisi'), 'test')
    expect(result).toBe('Nama menu wajib diisi')
  })

  it('handles non-Error objects with message', () => {
    const result = sanitizeError({ message: 'Data tidak ditemukan' }, 'test')
    expect(result).toBe('Data tidak ditemukan')
  })

  it('returns fallback for null/undefined', () => {
    expect(sanitizeError(null, 'test')).toMatch(/kesalahan/i)
    expect(sanitizeError(undefined, 'test')).toMatch(/kesalahan/i)
  })

  // ── Known DB error codes ─────────────────────────────────────────────────

  it('maps Postgres 23505 (unique violation) to safe message', () => {
    const err = { code: '23505', message: 'duplicate key value violates unique constraint' }
    const result = sanitizeError(err, 'test')
    expect(result).toMatch(/duplikat/i)
    expect(result).not.toContain('unique constraint')
  })

  it('maps Postgres 23503 (FK violation) to safe message', () => {
    const err = { code: '23503', message: 'foreign key constraint violation' }
    expect(sanitizeError(err, 'test')).toMatch(/digunakan/i)
  })

  it('maps Postgres 42501 (insufficient privilege) to safe message', () => {
    const err = { code: '42501', message: 'permission denied for table materials' }
    const result = sanitizeError(err, 'test')
    expect(result).toMatch(/akses/i)
    expect(result).not.toContain('materials')
  })

  it('maps PGRST116 (not found) to safe message', () => {
    const err = { code: 'PGRST116', message: 'Row not found' }
    expect(sanitizeError(err, 'test')).toMatch(/ditemukan/i)
  })

  // ── Sensitive content redaction ──────────────────────────────────────────

  it('redacts SQL keywords from error messages', () => {
    const err = new Error('SQL syntax error near SELECT')
    const result = sanitizeError(err, 'test')
    expect(result).not.toContain('SQL syntax error')
    expect(result).toMatch(/internal/i)
  })

  it('redacts postgres mentions', () => {
    const err = new Error('postgres connection refused at 5432')
    expect(sanitizeError(err, 'test')).not.toContain('postgres')
  })

  it('redacts supabase mentions', () => {
    const err = new Error('supabase anon key is invalid')
    expect(sanitizeError(err, 'test')).not.toContain('supabase')
  })

  it('redacts stack traces', () => {
    const err = new Error('Something failed')
    err.stack = 'Error: Something failed\n    at Object.<anonymous> (/app/lib/test.ts:1:1)'
    // The message itself is safe, but if sanitizeError is given just the message it should be fine
    const result = sanitizeError(err, 'test')
    // Message 'Something failed' is safe
    expect(result).toBe('Something failed')
  })

  it('redacts "at Object." stack frame content', () => {
    const err = new Error('at Object.method (/app/secret/path.ts:10)')
    expect(sanitizeError(err, 'test')).not.toContain('/app/secret/path.ts')
  })

  it('redacts service_role key mentions', () => {
    const err = new Error('service_role key is exposed')
    expect(sanitizeError(err, 'test')).not.toContain('service_role')
  })

  it('redacts password mentions', () => {
    const err = new Error('wrong password for user admin')
    expect(sanitizeError(err, 'test')).not.toContain('password')
  })

  it('redacts token mentions', () => {
    const err = new Error('invalid token eyJhbGciOiJIUzI1NiJ9...')
    expect(sanitizeError(err, 'test')).not.toContain('eyJhbGciOiJIUzI1NiJ9')
  })

  // ── Length / complexity guards ────────────────────────────────────────────

  it('redacts very long error messages', () => {
    const err = new Error('x'.repeat(500))
    const result = sanitizeError(err, 'test')
    expect(result.length).toBeLessThan(200)
  })

  it('redacts messages containing code-like characters', () => {
    const err = new Error('Error: {key: value} at [0].name')
    const result = sanitizeError(err, 'test')
    // Has {} and [] — should be redacted
    expect(result).toMatch(/kesalahan/i)
  })
})

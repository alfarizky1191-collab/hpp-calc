import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schemas'

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'Password1' }).success).toBe(true)
  })

  it('rejects empty email', () => {
    expect(loginSchema.safeParse({ email: '', password: 'Password1' }).success).toBe(false)
  })

  it('rejects invalid email format', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'Password1' }).success).toBe(false)
  })

  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: '' }).success).toBe(false)
  })

  it('rejects password longer than 72 chars', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'P'.repeat(73) }).success).toBe(false)
  })

  it('accepts password exactly 72 chars', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'Aa1' + 'x'.repeat(69) }).success).toBe(true)
  })

  it('rejects email longer than 255 chars', () => {
    expect(loginSchema.safeParse({ email: 'a'.repeat(250) + '@x.com', password: 'Password1' }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------

describe('registerSchema', () => {
  const valid = {
    email: 'owner@bisnis.com',
    password: 'Password1!',
    fullName: 'Budi Santoso',
    organizationName: 'Warung Makan Enak',
  }

  it('accepts valid registration data', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects password without uppercase', () => {
    const r = registerSchema.safeParse({ ...valid, password: 'password1!' })
    expect(r.success).toBe(false)
    expect(r.error?.errors[0]?.message).toMatch(/huruf besar/i)
  })

  it('rejects password without lowercase', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'PASSWORD1!' }).success).toBe(false)
  })

  it('rejects password without digit', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'PasswordOnly!' }).success).toBe(false)
  })

  it('rejects password without symbol', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'Password1' }).success).toBe(false)
  })

  it('rejects password shorter than 8 chars', () => {
    const r = registerSchema.safeParse({ ...valid, password: 'Pa1' })
    expect(r.success).toBe(false)
    expect(r.error?.errors[0]?.message).toMatch(/minimal 8/i)
  })

  it('rejects empty fullName', () => {
    expect(registerSchema.safeParse({ ...valid, fullName: '' }).success).toBe(false)
  })

  it('rejects empty organizationName', () => {
    expect(registerSchema.safeParse({ ...valid, organizationName: '' }).success).toBe(false)
  })

  it('rejects fullName longer than 255 chars', () => {
    expect(registerSchema.safeParse({ ...valid, fullName: 'A'.repeat(256) }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// forgotPasswordSchema
// ---------------------------------------------------------------------------

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(true)
  })

  it('rejects empty email', () => {
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false)
  })

  it('rejects invalid email format', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'not-email' }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// resetPasswordSchema
// ---------------------------------------------------------------------------

describe('resetPasswordSchema', () => {
  const valid = { password: 'NewPassword1!', confirmPassword: 'NewPassword1!' }

  it('accepts matching valid passwords', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects mismatched confirmPassword', () => {
    const r = resetPasswordSchema.safeParse({ ...valid, confirmPassword: 'DifferentPass1!' })
    expect(r.success).toBe(false)
    expect(r.error?.errors[0]?.message).toMatch(/tidak cocok/i)
  })

  it('error path is confirmPassword on mismatch', () => {
    const r = resetPasswordSchema.safeParse({ password: 'Password1!', confirmPassword: 'Password2!' })
    expect(r.error?.errors[0]?.path).toContain('confirmPassword')
  })

  it('rejects weak password', () => {
    expect(resetPasswordSchema.safeParse({ password: 'weak', confirmPassword: 'weak' }).success).toBe(false)
  })
})

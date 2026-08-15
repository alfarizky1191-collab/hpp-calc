import { describe, it, expect, vi } from 'vitest'
import { rateLimit, getIdentifier } from './rate-limit'

// Reset the internal store between tests by exploiting the module's store
// We do this by just using unique namespaces per test group
const NS = () => `test-${Math.random().toString(36).slice(2)}`

describe('rateLimit.check', () => {
  it('allows requests under the limit', () => {
    const ns = NS()
    for (let i = 0; i < 5; i++) {
      const result = rateLimit.check(ns, 'user-1', { max: 5, windowMs: 60_000 })
      expect(result.allowed).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    const ns = NS()
    for (let i = 0; i < 5; i++) {
      rateLimit.check(ns, 'user-1', { max: 5, windowMs: 60_000 })
    }
    const blocked = rateLimit.check(ns, 'user-1', { max: 5, windowMs: 60_000 })
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('counts remaining correctly', () => {
    const ns = NS()
    rateLimit.check(ns, 'user-1', { max: 5, windowMs: 60_000 })
    rateLimit.check(ns, 'user-1', { max: 5, windowMs: 60_000 })
    const result = rateLimit.check(ns, 'user-1', { max: 5, windowMs: 60_000 })
    // After 3rd request succeeds: remaining = max - used = 5 - 3 = 2
    expect(result.remaining).toBe(2)
    expect(result.allowed).toBe(true)
  })

  it('isolates different identifiers', () => {
    const ns = NS()
    for (let i = 0; i < 5; i++) {
      rateLimit.check(ns, 'user-1', { max: 5, windowMs: 60_000 })
    }
    // user-2 should be unaffected
    const result = rateLimit.check(ns, 'user-2', { max: 5, windowMs: 60_000 })
    expect(result.allowed).toBe(true)
  })

  it('isolates different namespaces', () => {
    const ns1 = NS()
    const ns2 = NS()
    for (let i = 0; i < 5; i++) {
      rateLimit.check(ns1, 'user-1', { max: 5, windowMs: 60_000 })
    }
    // Same user, different namespace — should be allowed
    const result = rateLimit.check(ns2, 'user-1', { max: 5, windowMs: 60_000 })
    expect(result.allowed).toBe(true)
  })

  it('slides the window — old requests expire', () => {
    vi.useFakeTimers()
    const ns = NS()

    // Use up 5 requests
    for (let i = 0; i < 5; i++) {
      rateLimit.check(ns, 'user-1', { max: 5, windowMs: 1_000 })
    }

    // 6th is blocked
    expect(rateLimit.check(ns, 'user-1', { max: 5, windowMs: 1_000 }).allowed).toBe(false)

    // Advance time past the window
    vi.advanceTimersByTime(1_001)

    // Now allowed again
    expect(rateLimit.check(ns, 'user-1', { max: 5, windowMs: 1_000 }).allowed).toBe(true)

    vi.useRealTimers()
  })

  it('returns a resetAt timestamp in the future', () => {
    const ns = NS()
    const now = Date.now()
    const result = rateLimit.check(ns, 'user-1', { max: 5, windowMs: 60_000 })
    expect(result.resetAt).toBeGreaterThanOrEqual(now)
    expect(result.resetAt).toBeLessThanOrEqual(now + 60_000 + 100)
  })
})

describe('rateLimit.reset', () => {
  it('clears the limit so requests are allowed again', () => {
    const ns = NS()
    for (let i = 0; i < 5; i++) {
      rateLimit.check(ns, 'user-1', { max: 5, windowMs: 60_000 })
    }
    expect(rateLimit.check(ns, 'user-1', { max: 5, windowMs: 60_000 }).allowed).toBe(false)

    rateLimit.reset(ns, 'user-1')

    expect(rateLimit.check(ns, 'user-1', { max: 5, windowMs: 60_000 }).allowed).toBe(true)
  })
})

describe('getIdentifier', () => {
  it('extracts IP from X-Forwarded-For header', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getIdentifier(req)).toBe('1.2.3.4')
  })

  it('returns unknown when no header present', () => {
    const req = new Request('https://example.com')
    expect(getIdentifier(req)).toBe('unknown')
  })

  it('sanitizes unusual characters from IP', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4<script>' },
    })
    const id = getIdentifier(req)
    expect(id).not.toContain('<')
    expect(id).not.toContain('>')
  })

  it('truncates very long identifiers to 64 chars', () => {
    const longIp = 'a'.repeat(200)
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': longIp },
    })
    expect(getIdentifier(req).length).toBeLessThanOrEqual(64)
  })
})

import { describe, expect, it } from 'vitest'
import { hasValidImageSignature } from '@/lib/security/image-signature'

describe('hasValidImageSignature', () => {
  it('accepts PNG, JPEG, and WebP signatures', () => {
    expect(hasValidImageSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png')).toBe(true)
    expect(hasValidImageSignature(new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg')).toBe(true)
    expect(hasValidImageSignature(new TextEncoder().encode('RIFF1234WEBP'), 'image/webp')).toBe(true)
  })

  it('rejects spoofed and unsupported files', () => {
    expect(hasValidImageSignature(new TextEncoder().encode('<script>'), 'image/png')).toBe(false)
    expect(hasValidImageSignature(new Uint8Array([0xff, 0xd8, 0xff]), 'image/png')).toBe(false)
    expect(hasValidImageSignature(new Uint8Array([0x00]), 'image/gif')).toBe(false)
  })
})

export function hasValidImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'image/png') {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    return png.every((value, index) => bytes[index] === value)
  }
  if (mimeType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (mimeType === 'image/webp') {
    const decoder = new TextDecoder()
    return decoder.decode(bytes.slice(0, 4)) === 'RIFF' &&
      decoder.decode(bytes.slice(8, 12)) === 'WEBP'
  }
  return false
}

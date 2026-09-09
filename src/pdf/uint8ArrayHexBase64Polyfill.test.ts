import { describe, expect, it } from 'vitest'
import { base64ToBytes, bytesToBase64, bytesToHex, hexToBytes } from './uint8ArrayHexBase64Polyfill'

describe('bytesToHex / hexToBytes', () => {
  it('encodes bytes as lowercase, zero-padded hex', () => {
    expect(bytesToHex(new Uint8Array([0, 1, 15, 16, 255, 128]))).toBe('00010f10ff80')
  })

  it('round-trips arbitrary bytes through hex', () => {
    const bytes = new Uint8Array([3, 250, 0, 17, 254])
    expect(Array.from(hexToBytes(bytesToHex(bytes)))).toEqual(Array.from(bytes))
  })
})

describe('bytesToBase64 / base64ToBytes', () => {
  it('matches a known base64 encoding', () => {
    const bytes = new TextEncoder().encode('Hello!')
    expect(bytesToBase64(bytes)).toBe('SGVsbG8h')
  })

  it('round-trips arbitrary bytes through base64', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111, 33, 0, 255])
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes))
  })
})

import { describe, expect, it } from 'vitest'
import { fontCoverage } from './fontCoverage'
function font(format: 4 | 12, collection = false) {
  const bytes = new Uint8Array(180), v = new DataView(bytes.buffer), base = collection ? 20 : 0
  if (collection) { bytes.set(new TextEncoder().encode('ttcf')); v.setUint32(8, 1); v.setUint32(12, base) }
  v.setUint32(base, 0x10000); v.setUint16(base + 4, 1)
  bytes.set(new TextEncoder().encode('cmap'), base + 12); v.setUint32(base + 20, 60); v.setUint32(base + 24, 100)
  v.setUint16(62, 1); v.setUint16(64, 3); v.setUint16(66, format === 12 ? 10 : 1); v.setUint32(68, 12)
  const o = 72; v.setUint16(o, format)
  if (format === 12) {
    v.setUint32(o + 4, 40); v.setUint32(o + 12, 2)
    v.setUint32(o + 16, 65); v.setUint32(o + 20, 67); v.setUint32(o + 24, 0)
    v.setUint32(o + 28, 0x1f600); v.setUint32(o + 32, 0x1f601); v.setUint32(o + 36, 9)
  } else {
    v.setUint16(o + 2, 36); v.setUint16(o + 6, 4)
    v.setUint16(o + 14, 66); v.setUint16(o + 16, 0xffff)
    v.setUint16(o + 20, 65); v.setUint16(o + 22, 0xffff)
    v.setInt16(o + 24, 1); v.setInt16(o + 26, 1)
    v.setUint16(o + 28, 4); v.setUint16(o + 32, 4); v.setUint16(o + 34, 0)
  }
  return bytes
}
describe('actual font cmap coverage', () => {
  it('resolves format 4 word-relative glyph arrays, excluding glyph zero', () => {
    expect(fontCoverage(font(4))).toEqual([[65, 65]])
  })
  it('reads astral format 12 groups and the first TTC face', () => {
    expect(fontCoverage(font(12))).toEqual([[66, 67], [0x1f600, 0x1f601]])
    expect(fontCoverage(font(12, true))).toEqual([[66, 67], [0x1f600, 0x1f601]])
  })
  it('rejects truncated and out-of-bounds glyph data', () => {
    expect(() => fontCoverage(new Uint8Array(8))).toThrow()
    const bytes = font(4); new DataView(bytes.buffer).setUint16(100, 60000)
    expect(() => fontCoverage(bytes)).toThrow()
  })
})

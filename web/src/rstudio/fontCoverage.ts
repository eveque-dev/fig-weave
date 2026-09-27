/** Read the actual sfnt Unicode cmap, not the browser's fallback font stack. */
export function fontCoverage(bytes: Uint8Array): [number, number][] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const u16 = (offset: number) => view.getUint16(offset)
  const u32 = (offset: number) => view.getUint32(offset)
  const tag = (offset: number) => String.fromCharCode(...bytes.slice(offset, offset + 4))
  const root = tag(0) === 'ttcf' ? u32(12) : 0
  if (u32(root) !== 0x00010000 && tag(root) !== 'OTTO') throw new Error('Unsupported font container')
  let cmap = -1, cmapEnd = -1
  for (let i = 0; i < u16(root + 4); i++) {
    const record = root + 12 + i * 16
    if (tag(record) === 'cmap') { cmap = u32(record + 8); cmapEnd = cmap + u32(record + 12) }
  }
  if (cmap < 0 || cmapEnd > bytes.length || cmapEnd < cmap + 4) throw new Error('Invalid font cmap')
  const subtables: { offset: number; format: number }[] = []
  for (let i = 0; i < u16(cmap + 2); i++) {
    const record = cmap + 4 + 8 * i
    if (record + 8 > cmapEnd) throw new Error('Invalid font encoding')
    const platform = u16(record), encoding = u16(record + 2), offset = cmap + u32(record + 4)
    if (offset < cmap || offset + 2 > cmapEnd) throw new Error('Invalid cmap offset')
    const format = u16(offset)
    if ((platform === 0 || (platform === 3 && [1, 10].includes(encoding))) && [4, 12].includes(format)) subtables.push({ offset, format })
  }
  const table = subtables.find((s) => s.format === 12) ?? subtables.find((s) => s.format === 4)
  if (!table) throw new Error('Font has no supported Unicode cmap')
  const { offset, format } = table
  const ranges: [number, number][] = []
  const add = (start: number, end: number) => {
    if (start > end) return
    if (start < 0 || end > 0x10ffff || (ranges.length && start <= ranges.at(-1)![1])) throw new Error('Invalid cmap range')
    if (ranges.length && start === ranges.at(-1)![1] + 1) ranges.at(-1)![1] = end
    else ranges.push([start, end])
  }
  if (format === 12) {
    if (offset + 16 > cmapEnd) throw new Error('Truncated cmap header')
    const end = offset + u32(offset + 4), count = u32(offset + 12)
    if (end > cmapEnd || end < offset + 16 || count > (end - offset - 16) / 12) throw new Error('Invalid cmap groups')
    for (let i = 0; i < count; i++) {
      const group = offset + 16 + i * 12
      if (u32(group) > u32(group + 4)) throw new Error('Invalid cmap group')
      add(u32(group) + (u32(group + 8) === 0 ? 1 : 0), u32(group + 4))
    }
  } else {
    if (offset + 16 > cmapEnd) throw new Error('Truncated cmap header')
    const end = offset + u16(offset + 2), count = u16(offset + 6) / 2
    if (!Number.isInteger(count) || count < 1 || end > cmapEnd || offset + 16 + count * 8 > end) throw new Error('Invalid cmap segments')
    const ends = offset + 14, starts = ends + count * 2 + 2, deltas = starts + count * 2, offsets = deltas + count * 2
    let previous = -1
    for (let i = 0; i < count; i++) {
      const start = u16(starts + i * 2), last = u16(ends + i * 2), delta = view.getInt16(deltas + i * 2), range = u16(offsets + i * 2)
      if (start > last || start <= previous) throw new Error('Overlapping cmap segments')
      previous = last
      for (let cp = start; cp <= last && cp !== 0xffff; cp++) {
        let glyph = (cp + delta) & 0xffff
        if (range) {
          const address = offsets + i * 2 + range + (cp - start) * 2
          if (address < offsets || address + 2 > end) throw new Error('Invalid glyph address')
          glyph = u16(address); if (glyph) glyph = (glyph + delta) & 0xffff
        }
        if (glyph) add(cp, cp)
      }
    }
  }
  if (!ranges.length) throw new Error('Font has no mapped glyphs')
  return ranges
}

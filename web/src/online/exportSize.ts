export const DEFAULT_PNG_WIDTH = 2400
export const MIN_PNG_WIDTH = 320
export const MAX_PNG_WIDTH = 8192
/** Preserve the rendered figure's aspect; reject oversized allocations before rendering. */
export function pngSize(width: number, nativeWidth: number, nativeHeight: number) {
  if (!Number.isInteger(width) || width < MIN_PNG_WIDTH || width > MAX_PNG_WIDTH
    || ![nativeWidth, nativeHeight].every((n) => Number.isFinite(n) && n > 0)) throw new Error('Invalid PNG dimensions')
  const height = Math.round(width * nativeHeight / nativeWidth)
  if (height < 1 || height > MAX_PNG_WIDTH || width * height > 32_000_000) throw new Error('PNG exceeds pixel budget')
  return { width, height }
}

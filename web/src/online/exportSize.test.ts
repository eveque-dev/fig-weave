import { expect, it } from 'vitest'
import { pngSize } from './exportSize'

// Subject: downloadable dimensions of the rendered figure, independent of viewport scale.
it('preserves landscape, portrait and square figure proportions at the requested width', () => {
  expect(pngSize(2400, 900, 450)).toEqual({ width: 2400, height: 1200 })
  expect(pngSize(1200, 450, 900)).toEqual({ width: 1200, height: 2400 })
  expect(pngSize(2400, 720, 720)).toEqual({ width: 2400, height: 2400 })
})
it('rejects invalid dimensions and excessive allocations before calling a renderer', () => {
  for (const width of [0, NaN, 300, 9000, 320.5]) expect(() => pngSize(width, 1, 1)).toThrow()
  expect(() => pngSize(8192, 1, 1)).toThrow('budget')
  expect(() => pngSize(2400, 0, 1)).toThrow('dimensions')
})

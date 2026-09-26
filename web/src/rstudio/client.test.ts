import { describe, expect, it } from 'vitest'
import { DEFAULT_STYLE, LEGEND_POSITIONS, styleExpression } from './client'

describe('R style operations', () => {
  it('leaves the original ggplot object untouched until a style is requested', () => {
    expect(styleExpression(DEFAULT_STYLE)).toBe('p')
    expect(styleExpression({ ...DEFAULT_STYLE, title: 'A "quoted" title' })).toBe('p + ggplot2::labs(title = "A \\"quoted\\" title")')
    expect(styleExpression({ ...DEFAULT_STYLE, fontSize: 10 })).toBe('p + ggplot2::theme(text = ggplot2::element_text(size = 10))')
  })

  it('accepts each offered legend position and rejects unbounded style inputs', () => {
    for (const legend of LEGEND_POSITIONS) expect(() => styleExpression({ ...DEFAULT_STYLE, legend })).not.toThrow()
    for (const fontSize of [NaN, Infinity, 0, 49]) expect(() => styleExpression({ ...DEFAULT_STYLE, fontSize })).toThrow()
    for (const width of [NaN, 0, 21]) expect(() => styleExpression({ ...DEFAULT_STYLE, width })).toThrow()
    expect(() => styleExpression({ ...DEFAULT_STYLE, fontFamily: 'custom' as 'sans' })).toThrow()
    expect(() => styleExpression({ ...DEFAULT_STYLE, legend: 'injected' as 'right' })).toThrow()
  })
})

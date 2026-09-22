import { describe, expect, it } from 'vitest'
import { editLabels, exportPython, labelsOf, parseChart } from './model'
describe('native chart snapshots', () => {
  it('preserves series and extra axes while editing visible labels', () => {
    const original = { series: [{ data: [1, 2], type: 'bar' }], xAxis: [{ name: 'old', data: ['A', 'B'] }, { name: 'secondary' }] }
    const edited = editLabels(original, 'pyecharts', { title: 'title', x: 'x', y: 'y' })
    expect(edited.series).toEqual(original.series)
    expect((edited.xAxis as object[])[1]).toEqual({ name: 'secondary' })
    expect(labelsOf(edited, 'pyecharts')).toEqual({ title: 'title', x: 'x', y: 'y' })
    expect(original.xAxis[0].name).toBe('old')
  })
  it('exports Python string literals without evaluating user labels', () => {
    const chart = { data: [], layout: { title: { text: "quote ' and newline\n中文" } } }
    const code = exportPython(chart, 'plotly')
    const literal = code.split('pio.from_json(')[1].split(')\n')[0]
    expect(JSON.parse(JSON.parse(literal))).toEqual(chart)
  })
  it('rejects callbacks and non-chart input before rendering', () => {
    expect(() => parseChart('{"series":[],"formatter":"--x_x--function(){}--x_x--"}', 'pyecharts')).toThrow('callbacks')
    expect(() => parseChart('{"data":null}', 'plotly')).toThrow('Invalid chart')
  })
})

import { describe, expect, it } from 'vitest'
import { ASSET_LIMITS, assetSignature, mergeAssets, readSnippet, validateAssets, type RAsset } from './assets'
const file = (name: string, bytes = new Uint8Array([1])): RAsset => ({ name, bytes, digest: 'abc' })
describe('R session files', () => {
  it('confines files to simple names and bounded memory without interpreting paths', () => {
    for (const name of ['../data.csv', 'a/b.csv', 'a\\b.csv', '.hidden.csv', 'a\u0000.csv', 'a.exe']) expect(() => validateAssets([file(name)], 'data')).toThrow()
    validateAssets([file('实验 数据.csv'), file('data.TSV'), file('data.rds')], 'data')
    expect(() => validateAssets([file('data.csv', new Uint8Array(ASSET_LIMITS.data.file + 1))], 'data')).toThrow()
    expect(() => validateAssets(Array.from({ length: 21 }, (_, i) => file(`${i}.csv`)), 'data')).toThrow()
    expect(() => validateAssets([file('data.csv'), file('data.csv')], 'data')).toThrow()
  })
  it('replaces selected filenames and distinguishes changed bytes from a loaded snapshot', () => {
    const original = [file('data.csv')], replacement = { ...file('data.csv'), digest: 'changed' }
    const next = mergeAssets(original, [replacement], 'data')
    expect(next).toEqual([replacement]); expect(original[0].digest).toBe('abc')
    expect(assetSignature(next)).not.toBe(assetSignature(original))
    expect(readSnippet('a"b.csv')).toBe('data <- read.csv("a\\"b.csv")')
    expect(readSnippet('x.tsv')).toBe('data <- read.delim("x.tsv")')
    expect(readSnippet('x.rds')).toBe('data <- readRDS("x.rds")')
  })
})

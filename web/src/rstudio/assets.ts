import { fontCoverage } from './fontCoverage'
/** User-selected assets live only in this tab and the current R worker. */
export interface RAsset { name: string; bytes: Uint8Array; digest: string; family?: string }
export type AssetKind = 'data' | 'font'
export class AssetError extends Error {
  readonly code: 'name' | 'type' | 'size' | 'duplicate' | 'font'
  readonly filename: string
  constructor(code: AssetError['code'], filename = '') { super(code); this.code = code; this.filename = filename }
}
export const ASSET_LIMITS = { data: { file: 20 * 1024 ** 2, total: 50 * 1024 ** 2, count: 20 }, font: { file: 32 * 1024 ** 2, total: 64 * 1024 ** 2, count: 8 } } as const
export function validateAssets(assets: RAsset[], kind: AssetKind): void {
  const limits = ASSET_LIMITS[kind]
  if (assets.length > limits.count || assets.reduce((sum, file) => sum + file.bytes.byteLength, 0) > limits.total) throw new AssetError('size')
  const names = new Set<string>(), families = new Set<string>()
  for (const file of assets) {
    if (!file.name || file.name.length > 160 || file.name !== file.name.normalize('NFC') || /[/\\\u0000-\u001f\u007f]/.test(file.name) || file.name.startsWith('.')) throw new AssetError('name', file.name)
    if (!(kind === 'data' ? /\.(csv|tsv|rds)$/i : /\.(ttf|otf)$/i).test(file.name)) throw new AssetError('type', file.name)
    if (!file.bytes.byteLength || file.bytes.byteLength > limits.file) throw new AssetError('size', file.name)
    if (names.has(file.name)) throw new AssetError('duplicate', file.name)
    names.add(file.name)
    if (kind === 'font') {
      const family = file.family
      if (!family || ['original', 'sans', 'serif', 'mono', 'wqy-microhei'].includes(family) || families.has(family)) throw new AssetError('duplicate', file.name)
      families.add(family)
      const signature = Array.from(file.bytes.slice(0, 4)).join(',')
      if (!['0,1,0,0', '79,84,84,79'].includes(signature)) throw new AssetError('font', file.name)
      try { fontCoverage(file.bytes) } catch { throw new AssetError('font', file.name) }
    }
  }
}
export async function readAssets(files: File[], kind: AssetKind): Promise<RAsset[]> {
  const limits = ASSET_LIMITS[kind]
  if (files.length > limits.count || files.some((file) => file.size > limits.file) || files.reduce((sum, file) => sum + file.size, 0) > limits.total) throw new AssetError('size')
  const assets = await Promise.all(files.map(async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (v) => v.toString(16).padStart(2, '0')).join('')
    return { name: file.name.normalize('NFC'), bytes, digest, ...(kind === 'font' ? { family: file.name.replace(/\.(ttf|otf)$/i, '').normalize('NFC') } : {}) }
  }))
  validateAssets(assets, kind)
  return assets
}
export function mergeAssets(current: RAsset[], incoming: RAsset[], kind: AssetKind): RAsset[] {
  const updated = current.filter((file) => !incoming.some((next) => next.name === file.name)).concat(incoming)
  validateAssets(updated, kind)
  return updated
}
export const assetSignature = (assets: RAsset[]) => JSON.stringify(assets.map(({ name, digest }) => [name, digest]))
export function readSnippet(name: string): string {
  const fn = /\.rds$/i.test(name) ? 'readRDS' : /\.tsv$/i.test(name) ? 'read.delim' : 'read.csv'
  return `data <- ${fn}(${JSON.stringify(name)})`
}

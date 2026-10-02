import { zip, unzipSync, strToU8, strFromU8 } from 'fflate'
import { ONLINE_PROJECT_KIND, PRODUCT_NAME } from '@/lib/brand'
import type { RAsset } from '@/rstudio/assets'
import { DEFAULT_PNG_WIDTH, MAX_PNG_WIDTH, MIN_PNG_WIDTH } from './exportSize'

export type OnlineEngine = 'matplotlib' | 'plotly' | 'pyecharts' | 'ggplot2'
export interface OnlineProject {
  engine: OnlineEngine
  filename: string
  source: string
  renderedSource: string
  state: unknown
  history: unknown[]
  future: unknown[]
  assets: RAsset[]
  pngWidth: number
  draft?: { options: string; labels: { title: string; x: string; y: string } }
}
const LIMIT = 128 * 1024 ** 2
const JSON_LIMIT = 16 * 1024 ** 2
const safeName = (name: string) => !!name && name.length <= 160 && !name.startsWith('.') && !/[/\\\u0000-\u001f\u007f]/.test(name)
export function parseProjectJSON(text: string): unknown {
  if (new TextEncoder().encode(text).length > JSON_LIMIT) throw new Error('Project metadata exceeds 16 MiB')
  return JSON.parse(text, (key, value) => {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Invalid project key')
    return value
  })
}
export function validateProject(project: OnlineProject) {
  if (!project || !['matplotlib', 'plotly', 'pyecharts', 'ggplot2'].includes(project.engine)
    || typeof project.filename !== 'string' || !safeName(project.filename)
    || ![project.source, project.renderedSource].every((s) => typeof s === 'string' && new TextEncoder().encode(s).length <= 256 * 1024)
    || !Array.isArray(project.history) || !Array.isArray(project.future) || project.history.length > 200 || project.future.length > 200
    || !Array.isArray(project.assets) || project.assets.length > 28
    || !Number.isInteger(project.pngWidth) || project.pngWidth < MIN_PNG_WIDTH || project.pngWidth > MAX_PNG_WIDTH) throw new Error('Invalid project')
  if (project.draft && (typeof project.draft.options !== 'string' || project.draft.options.length > 8_000_000 || !project.draft.labels || !['title', 'x', 'y'].every((key) => typeof project.draft!.labels[key as 'title'] === 'string'))) throw new Error('Invalid project draft')
  const names = new Set<string>()
  for (const asset of project.assets) {
    if (!safeName(asset.name) || names.has(asset.name) || !(asset.bytes instanceof Uint8Array) || !asset.bytes.length) throw new Error('Invalid project asset')
    names.add(asset.name)
  }
}
export const emptyProject = (engine: OnlineEngine, source: string): OnlineProject => ({ engine, filename: engine === 'ggplot2' ? 'source.R' : 'source.py', source, renderedSource: '', state: null, history: [], future: [], assets: [], pngWidth: DEFAULT_PNG_WIDTH })
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
/** All decompression is bounded by declared uncompressed sizes, including unreferenced entries. */
export function unpackArchive(bytes: Uint8Array): Record<string, Uint8Array> {
  if (bytes.length > LIMIT) throw new Error('Archive exceeds 128 MiB')
  let size = 0, count = 0
  const names = new Set<string>()
  return unzipSync(bytes, { filter: (entry) => {
    size += entry.originalSize
    if (++count > 100 || size > LIMIT || !Number.isSafeInteger(entry.originalSize)
      || names.has(entry.name) || !/^(?:assets\/[^/\\]+|[^/\\]+)$/.test(entry.name)
      || entry.name.split('/').some((n) => !safeName(n))) throw new Error('Invalid archive entries')
    names.add(entry.name)
    return true
  } })
}
const sha256 = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))), (n) => n.toString(16).padStart(2, '0')).join('')
export async function readProject(file: File): Promise<OnlineProject> {
  if (file.size > LIMIT) throw new Error('Project exceeds 128 MiB')
  const entries = unpackArchive(new Uint8Array(await file.arrayBuffer()))
  if (!entries['project.json']) throw new Error('Missing project.json')
  const manifest = parseProjectJSON(strFromU8(entries['project.json'])) as OnlineProject & { kind: string; version: number }
  if (manifest.kind !== ONLINE_PROJECT_KIND || manifest.version !== 1 || !Array.isArray(manifest.assets)) throw new Error('Unsupported project format')
  const assets: RAsset[] = []
  for (const asset of manifest.assets) {
    if (!asset || typeof asset.name !== 'string' || !safeName(asset.name)) throw new Error('Invalid asset name')
    const bytes = entries[`assets/${asset.name}`]
    if (!bytes || await sha256(bytes) !== asset.digest) throw new Error('Project asset checksum mismatch')
    assets.push({ name: asset.name, digest: asset.digest, bytes, ...(asset.family ? { family: asset.family } : {}) })
  }
  const project = { ...manifest, assets }
  validateProject(project)
  return project
}
export async function projectArchive(project: OnlineProject, extra: Record<string, Uint8Array> = {}): Promise<Blob> {
  validateProject(project)
  const entries: Record<string, Uint8Array> = { ...extra }
  for (const asset of project.assets) entries[`assets/${asset.name}`] = new Uint8Array(asset.bytes)
  entries['project.json'] = strToU8(JSON.stringify({ ...project, kind: ONLINE_PROJECT_KIND, version: 1, assets: await Promise.all(project.assets.map(async ({ name, bytes, family }) => ({ name, digest: await sha256(bytes), ...(family ? { family } : {}) }))) }, null, 2))
  if (entries['project.json'].length > JSON_LIMIT || Object.values(entries).reduce((n, v) => n + v.length, 0) > LIMIT) throw new Error('Project exceeds size budget')
  const binaryEntries = Object.fromEntries(Object.entries(entries).map(([name, bytes]) => [name, new Uint8Array(bytes)]))
  return new Promise((resolve, reject) => zip(binaryEntries, { level: 6 }, (error, bytes) => error ? reject(error) : bytes.length > LIMIT ? reject(new Error('Compressed project exceeds size budget')) : resolve(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }))))
}
export function bundleNotes(engine: OnlineEngine): Uint8Array {
  return strToU8(`${PRODUCT_NAME} reproduction bundle\n\nOpen this ZIP in the matching online editor, then explicitly click Run to replay.\nproject.json is the authoritative edit state; source.* retains the original input.\nEnvironment locks record browser runtime/package versions, not a complete native installation.\nFor R: copy assets/* next to replay.R and run Rscript replay.R from that folder after installing the listed dependencies. Font redistribution rights remain the user's responsibility.\nFor Charts: replay.py reproduces the edited chart configuration; source.py separately retains the original data-processing code.\nFor Matplotlib: reopen in /try/, or install requirements.txt and explicitly run replay.py. The bundled engine.zip is the same licensed engine used by the editor. Native platforms may have different font rendering.\nNo files are uploaded by project save/export. Scripts can make their own network requests.\nEngine: ${engine}\n`)
}

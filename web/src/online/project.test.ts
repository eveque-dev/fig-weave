import { describe, expect, it } from 'vitest'
import { webcrypto } from 'node:crypto'
import { Blob as NodeBlob } from 'node:buffer'
import { strToU8 as encode, unzipSync, zipSync } from 'fflate'
import { emptyProject, parseProjectJSON, projectArchive, readProject, unpackArchive } from './project'
import { chartProject, matplotlibProject, rProject } from './restore'
import { DEFAULT_STYLE } from '@/rstudio/client'

const strToU8 = (text: string) => new Uint8Array(encode(text))
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
// fflate executes in Node's realm in Vitest; use matching binary constructors.
Object.defineProperty(globalThis, 'Blob', { value: NodeBlob, configurable: true })
const asFile = (bytes: Uint8Array) => ({ size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }) as File
const blobBytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer())
describe('local project boundary', () => {
  it('round trips source, Unicode assets, edits and both history directions', async () => {
    const project = { ...emptyProject('ggplot2', 'p <- input'), renderedSource: 'p <- old_input', state: { ...DEFAULT_STYLE, title: '标题' }, history: [DEFAULT_STYLE], future: [{ ...DEFAULT_STYLE, title: 'Future' }], assets: [{ name: '实验.csv', bytes: strToU8('x,y\n1,2'), digest: '' }] }
    const restored = await readProject(asFile(await blobBytes(await projectArchive(project))))
    expect(restored.source).toBe(project.source)
    expect(restored.renderedSource).toBe(project.renderedSource)
    expect(restored.assets[0].bytes).toEqual(project.assets[0].bytes)
    expect(restored.assets[0].digest).toMatch(/^[a-f0-9]{64}$/)
    expect(rProject(restored)).toMatchObject({ state: project.state, history: project.history, future: project.future })
  })
  it('verifies asset bytes before an import is accepted', async () => {
    const p = { ...emptyProject('ggplot2', 'p <- data'), assets: [{ name: 'data.csv', bytes: strToU8('a'), digest: '' }] }
    const entries = unzipSync(await blobBytes(await projectArchive(p)))
    entries['assets/data.csv'] = strToU8('b')
    await expect(readProject(asFile(zipSync(entries)))).rejects.toThrow('checksum')
  })
  it('rejects zip bombs and traversal before decompression', () => {
    expect(() => unpackArchive(zipSync({ 'oversized.txt': new Uint8Array(129 * 1024 ** 2) }))).toThrow('Invalid archive')
    expect(() => unpackArchive(zipSync({ '../outside': strToU8('x') }))).toThrow('Invalid archive')
    expect(() => unpackArchive(zipSync({ 'assets/../outside': strToU8('x') }))).toThrow('Invalid archive')
  })
  it('rejects incompatible versions and prototype keys', async () => {
    const entries = unzipSync(await blobBytes(await projectArchive(emptyProject('plotly', 'fig = input'))))
    const manifest = JSON.parse(new TextDecoder().decode(entries['project.json'])); manifest.version = 2
    entries['project.json'] = strToU8(JSON.stringify(manifest))
    await expect(readProject(asFile(zipSync(entries)))).rejects.toThrow('Unsupported')
    expect(() => parseProjectJSON('{"__proto__":{"value":1}}')).toThrow('Invalid project key')
  })
  it('keeps adapters separated and validates their state before replacement', () => {
    const plotly = { ...emptyProject('plotly', ''), state: { data: [], layout: { title: { text: 'Edited' } } }, history: [{ data: [], layout: {} }] }
    expect(chartProject(plotly).state).toEqual(plotly.state)
    expect(() => rProject(plotly)).toThrow('matching editor')
    expect(() => chartProject({ ...plotly, state: { data: [], callback: 'function(){}' } })).toThrow('callbacks')
    const matplotlib = { ...emptyProject('matplotlib', ''), state: { stem: 'Figure_1', overrides: [{ gid: 'axes_0.title', prop: 'fontsize', value: 22 }] } }
    expect(matplotlibProject(matplotlib).overrides).toEqual(matplotlib.state.overrides)
    expect(() => matplotlibProject({ ...matplotlib, history: [null] })).toThrow('overrides')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('optional online usage at the network boundary', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true })) })
  it('unset and refusal generate no identifier and send zero requests', async () => {
    const uuid = vi.spyOn(crypto, 'randomUUID')
    const usage = await import('./usage')
    usage.openUsagePage('matplotlib'); usage.captureUsage('render_completed', 'matplotlib')
    expect(usage.usageChoice()).toBe('unset'); expect(uuid).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled()
    usage.setUsageChoice('disabled'); usage.captureUsage('export_completed', 'matplotlib')
    expect(uuid).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled()
  })
  it('opt-in sends exactly the closed fields, deduplicates mount, and stops after withdrawal', async () => {
    const usage = await import('./usage')
    usage.openUsagePage('plotly'); usage.setUsageChoice('enabled'); usage.openUsagePage('plotly')
    usage.captureUsage('render_completed', 'plotly'); usage.captureUsage('export_completed', 'plotly')
    expect(fetch).toHaveBeenCalledTimes(3)
    const payloads = vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(init!.body as string))
    expect(payloads.map(p => p.event)).toEqual(['page_view', 'render_completed', 'export_completed'])
    for (const payload of payloads) expect(Object.keys(payload).sort()).toEqual(['consent_version','distinct_id','engine','event','event_id','schema_version'])
    expect(new Set(payloads.map(p => p.distinct_id)).size).toBe(1)
    const id=payloads[0].distinct_id
    usage.setUsageChoice('disabled'); usage.captureUsage('render_completed', 'plotly'); expect(fetch).toHaveBeenCalledTimes(3)
    usage.setUsageChoice('enabled'); expect(JSON.parse(vi.mocked(fetch).mock.calls[3][1]!.body as string).distinct_id).toBe(id)
  })
  it('expired consent returns to unset with no transmission', async () => {
    localStorage.setItem('tavotto:online-usage-consent', JSON.stringify({ version: 0, choice:'enabled', id:crypto.randomUUID() }))
    const usage=await import('./usage'); usage.captureUsage('render_completed','ggplot2')
    expect(usage.usageChoice()).toBe('unset'); expect(fetch).not.toHaveBeenCalled()
  })
  it('hard off overrides saved consent', async () => {
    const usage=await import('./usage'); usage.setUsageChoice('enabled'); vi.stubEnv('FIGWEAVE_TELEMETRY_OFF','1')
    usage.openUsagePage('plotly'); usage.captureUsage('render_completed','plotly')
    expect(usage.usageChoice()).toBe('disabled'); expect(fetch).not.toHaveBeenCalled()
  })
  it('storage and network failures never break plotting', async () => {
    const usage=await import('./usage'); usage.setUsageChoice('enabled'); vi.mocked(fetch).mockRejectedValue(new Error('offline'))
    expect(()=>usage.captureUsage('render_completed','plotly')).not.toThrow()
    await Promise.resolve(); vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked')})
    expect(usage.setUsageChoice('enabled')).toBe(false)
  })
})

import contract from '../../../services/figweave_admin/contract.json'

export type UsageEngine = 'site' | 'matplotlib' | 'ggplot2' | 'plotly' | 'pyecharts'
export type UsageEvent = 'page_view' | 'render_completed' | 'export_completed'
export type UsageChoice = 'unset' | 'enabled' | 'disabled'
const KEY = 'tavotto:online-usage-consent'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export const usageOff = () => import.meta.env.FIGWEAVE_TELEMETRY_OFF === '1'
let opened: UsageEngine | null = null

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (value?.version === contract.consent_version && ['enabled', 'disabled'].includes(value.choice)) {
      return { choice: value.choice as UsageChoice, id: typeof value.id === 'string' && UUID.test(value.id) ? value.id : null }
    }
  } catch { /* Storage unavailable: never infer consent. */ }
  return { choice: 'unset' as UsageChoice, id: null }
}
export function usageChoice(): UsageChoice { return usageOff() ? 'disabled' : read().choice }
export function setUsageChoice(choice: Exclude<UsageChoice, 'unset'>): boolean {
  if (usageOff()) return false
  try {
    const previous = read()
    const id = previous.id || (choice === 'enabled' ? crypto.randomUUID() : null)
    localStorage.setItem(KEY, JSON.stringify({ version: contract.consent_version, choice, id }))
    if (choice === 'enabled' && previous.choice !== 'enabled' && opened) captureUsage('page_view', opened)
    return true
  } catch { return false }
}
export function openUsagePage(engine: UsageEngine) {
  if (opened === engine) return // React StrictMode replays mount effects.
  opened = engine
  captureUsage('page_view', engine)
}
/** Closed arguments only. No properties object, script, exception, URL or filename can be sent. */
export function captureUsage(event: UsageEvent, engine: UsageEngine) {
  try {
    if (usageOff() || !contract.events.includes(event) || !contract.engines.includes(engine) || (engine === 'site' && event !== 'page_view')) return
    const { choice, id } = read()
    if (choice !== 'enabled' || !id) return
    const body = JSON.stringify({ schema_version: contract.schema_version, consent_version: contract.consent_version, distinct_id: id, event_id: crypto.randomUUID(), event, engine })
    void fetch('/usage/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', body, signal: AbortSignal.timeout(2500) }).catch(() => {})
  } catch { /* Best effort; no retries, queue, or product failure. */ }
}

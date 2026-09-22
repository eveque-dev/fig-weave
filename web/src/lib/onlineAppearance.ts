import { useSyncExternalStore } from 'react'

export const ONLINE_BACKGROUNDS = ['paper', 'white', 'slate', 'blue', 'sage', 'lavender'] as const
export type OnlineBackground = (typeof ONLINE_BACKGROUNDS)[number]
const STORAGE_KEY = 'tavotto.onlineBackground'
const listeners = new Set<() => void>()
let background: OnlineBackground = 'paper'

function valid(value: unknown): value is OnlineBackground {
  return ONLINE_BACKGROUNDS.includes(value as OnlineBackground)
}
function apply(value: OnlineBackground) {
  background = value
  document.documentElement.dataset.onlineBackground = value
  listeners.forEach((notify) => notify())
}

/** Online chrome only: never changes document, figure or export colors. */
export function initOnlineAppearance() {
  let value: string | null = null
  try { value = localStorage.getItem(STORAGE_KEY) } catch { /* session-only when storage is blocked */ }
  apply(valid(value) ? value : 'paper')
}
export function setOnlineBackground(value: OnlineBackground) {
  if (!valid(value)) return
  apply(value)
  try { localStorage.setItem(STORAGE_KEY, value) } catch { /* switching still works */ }
}
function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => { listeners.delete(notify) }
}
export function useOnlineBackground() {
  return useSyncExternalStore(subscribe, () => background, () => 'paper' as OnlineBackground)
}

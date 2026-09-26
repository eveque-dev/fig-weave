import { useSyncExternalStore } from 'react'

export const ONLINE_BACKGROUNDS = ['black', 'paper', 'white', 'slate', 'blue', 'sage', 'lavender'] as const
export type OnlineBackground = (typeof ONLINE_BACKGROUNDS)[number]
const DEFAULT_BACKGROUND: OnlineBackground = 'black'
const listeners = new Set<() => void>()
let background: OnlineBackground = DEFAULT_BACKGROUND

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
  // Every page visit starts with the product default, including browsers with old preferences.
  apply(DEFAULT_BACKGROUND)
}
export function setOnlineBackground(value: OnlineBackground) {
  if (!valid(value)) return
  apply(value)
}
function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => { listeners.delete(notify) }
}
export function useOnlineBackground() {
  return useSyncExternalStore(subscribe, () => background, () => DEFAULT_BACKGROUND)
}

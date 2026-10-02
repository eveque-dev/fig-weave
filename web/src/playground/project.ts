import { applyPatches } from 'immer'
import { useDocumentStore } from '@/store/documentStore'
import { runUndoRedo } from '@/hooks/useKeyboard'
import { finishActiveGesture } from '@/store/gestureCoordinator'
import { msg } from '@/i18n'
import type { FigureDocument, PanelObject, PanelOverride } from '@/types/document'
import { emptyProject, type OnlineProject } from '@/online/project'
import { matplotlibProject } from '@/online/restore'
import type { ActiveSession } from './playgroundSession'

export function playgroundProject(session: ActiveSession, panelId: string, pngWidth: number): OnlineProject {
  finishActiveGesture()
  const state = useDocumentStore.getState()
  const overrides = (doc: FigureDocument) => {
    const panel = doc.objects.find((p) => p.id === panelId) as PanelObject | undefined
    if (!panel || panel.type !== 'panel') throw new Error('Figure is unavailable')
    return structuredClone(panel.overrides)
  }
  let doc = state.doc
  const history: PanelOverride[][] = []
  for (const entry of [...state.past].reverse()) { doc = applyPatches(doc, entry.inverse); history.push(overrides(doc)) }
  doc = state.doc
  const future: PanelOverride[][] = []
  for (const entry of state.future) { doc = applyPatches(doc, entry.patches); future.push(overrides(doc)) }
  const panel = state.doc.objects.find((p) => p.id === panelId) as PanelObject
  return { ...emptyProject('matplotlib', session.originalSource), filename: session.filename, renderedSource: session.originalSource, state: { stem: panel.fileId.replace(/\.pdf$/, ''), overrides: overrides(state.doc) }, history: history.reverse(), future, pngWidth }
}
/** Reconstruct history using the existing document writer and undo action. */
export function restorePlaygroundEdits(project: OnlineProject, panelId: string) {
  const value = matplotlibProject(project)
  const set = (overrides: PanelOverride[]) => useDocumentStore.getState().commit(msg('history.playgroundOpenFigure', undefined, 'workspace'), (doc) => {
    const panel = doc.objects.find((p) => p.id === panelId)
    if (panel?.type === 'panel') panel.overrides = structuredClone(overrides)
  })
  set(value.history[0] ?? value.overrides)
  useDocumentStore.setState({ past: [], future: [] })
  for (const item of [...value.history.slice(1), value.overrides, ...value.future]) set(item)
  for (const _ of value.future) runUndoRedo(false)
}

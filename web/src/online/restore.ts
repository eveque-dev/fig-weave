import { parseChart, type Kind } from '@/charts/model'
import { FONT_FAMILIES, movesExpression, styleExpression, textExpression, type PlotStyle } from '@/rstudio/client'
import { validateAssets } from '@/rstudio/assets'
import type { PanelOverride } from '@/types/document'
import type { OnlineProject } from './project'

export function chartProject(project: OnlineProject) {
  if (project.engine !== 'plotly' && project.engine !== 'pyecharts' || project.assets.length) throw new Error('Open this project in its matching editor')
  const check = (v: unknown) => parseChart(JSON.stringify(v), project.engine as Kind)
  return { state: project.state === null ? null : check(project.state), history: project.history.map(check), future: project.future.map(check) }
}
export function rProject(project: OnlineProject) {
  if (project.engine !== 'ggplot2') throw new Error('Open this project in its matching editor')
  const data = project.assets.filter((a) => !a.family), fonts = project.assets.filter((a) => a.family)
  validateAssets(data, 'data'); validateAssets(fonts, 'font')
  const families = [...FONT_FAMILIES, ...fonts.map((f) => f.family!)]
  const check = (value: unknown) => {
    const style = value as PlotStyle
    if (!style || typeof style !== 'object' || !style.moves || !style.textEdits
      || !['title', 'x', 'y'].every((key) => style[key as 'title'] === null || typeof style[key as 'title'] === 'string')) throw new Error('Invalid R style')
    styleExpression(style, 'p', families); movesExpression(style.moves); textExpression(style.textEdits, families)
    return style
  }
  return { data, fonts, state: project.state === null ? null : check(project.state), history: project.history.map(check), future: project.future.map(check) }
}
/** Engine validates the property vocabulary during real replay; this checks the boundary shape. */
export function matplotlibProject(project: OnlineProject) {
  if (project.engine !== 'matplotlib' || project.assets.length) throw new Error('Open this project in its matching editor')
  const value = project.state as { stem: string; overrides: PanelOverride[] }
  const check = (v: unknown): PanelOverride[] => {
    if (!Array.isArray(v) || v.length > 20_000 || !v.every((patch) => patch && typeof patch.gid === 'string' && typeof patch.prop === 'string' && 'value' in patch)) throw new Error('Invalid Matplotlib overrides')
    return v
  }
  if (!value || typeof value.stem !== 'string' || !value.stem || value.stem.length > 512) throw new Error('Invalid figure identity')
  return { stem: value.stem, overrides: check(value.overrides), history: project.history.map(check), future: project.future.map(check) }
}

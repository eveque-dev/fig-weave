import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TypographyControls } from '@/components/inspector/controls/TypographyControls'
import type { TypographyAdapter } from '@/components/inspector/typographyAdapter'
import { GESTURE_QUIET_MS } from '@/components/inspector/elementWrite'
import { TextInput } from '@/components/ui/Input'
import { coerceTypography, propertyPathOf, type TypographyProp } from '@/lib/typography'
import type { EditableField } from '@/lib/api'
import type { RObject, TextEdit } from './client'

/** R owns its transaction; the shared controls own typography interaction. */
export function TextInspector({ object, edit, families, disabled, commit }: {
  object: RObject; edit: TextEdit; families: string[]; disabled: boolean; commit: (patch: TextEdit) => void
}) {
  const { t } = useTranslation('dialogs')
  const [draft, setDraft] = useState<TextEdit | null>(null)
  const queued = useRef<TextEdit | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const scrubbing = useRef(false)
  const latest = useRef(commit); latest.current = commit
  useEffect(() => { setDraft(null) }, [edit])
  useEffect(() => () => { clearTimeout(timer.current); const patch = queued.current; queued.current = null; if (patch) latest.current(patch) }, [])
  const fieldOf = (prop: TypographyProp): EditableField | undefined => {
    const path = propertyPathOf('figureText', prop)
    if (!path) return
    if (prop === 'sizePt') return { prop: path, type: 'number', value: null, min: 6, max: 72, step: .5, unit: 'pt' }
    if (prop === 'fontFamily') return { prop: path, type: 'enum', value: null, options: [...new Set([...families.filter((f) => f !== 'original'), object.typography!.fontFamily])] }
    if (prop === 'color') return { prop: path, type: 'color', value: null }
  }
  const flush = () => {
    clearTimeout(timer.current); scrubbing.current = false
    const patch = queued.current; queued.current = null
    if (patch) latest.current(patch)
  }
  const write = (prop: TypographyProp, value: unknown, once = false) => {
    if (disabled || (prop === 'fontFamily' && !families.includes(String(value)))) return
    const field = fieldOf(prop)
    if (!field) return
    const parsed = coerceTypography(prop, value, field)
    if (!parsed.ok) return
    const patch = { ...(queued.current ?? edit), [prop]: parsed.value }
    queued.current = patch; setDraft(patch); clearTimeout(timer.current)
    if (once) flush()
    else if (!scrubbing.current) timer.current = setTimeout(flush, GESTURE_QUIET_MS)
  }
  const adapter: TypographyAdapter = {
    count: 1, kinds: ['figureText'], fieldOf,
    valueOf: (prop) => {
      if (!fieldOf(prop)) return { kind: 'unsupported', reason: 'not_in_manifest' }
      const key = prop as 'sizePt' | 'fontFamily' | 'color'
      const patch = draft ?? edit
      return { kind: patch[key] === undefined ? 'inherit' : 'uniform', value: patch[key] ?? object.typography![key] }
    },
    write: (prop, value) => write(prop, value), writeOnce: (prop, value) => write(prop, value, true),
    beginGesture: () => { scrubbing.current = true; clearTimeout(timer.current) }, endGesture: flush,
    overrideStateOf: (prop) => prop in (draft ?? edit) ? 'all' : 'none',
    reset: (prop) => {
      const patch = { ...edit }; delete patch[prop as keyof TextEdit]
      clearTimeout(timer.current); queued.current = null; setDraft(null); commit(patch)
    },
    pathOf: (prop) => propertyPathOf('figureText', prop), unsupportedReason: (prop) => fieldOf(prop) ? null : 'not_in_manifest',
    unavailableOptions: (prop) => prop === 'fontFamily' && !families.includes(object.typography!.fontFamily) ? [object.typography!.fontFamily] : [],
  }
  return <fieldset data-r-text-editor disabled={disabled} className="r-text-inspector space-y-3">
    <legend className="text-sm font-medium">{t('rStudio.selectedText')}</legend>
    {object.editable && <label className="block space-y-1 text-sm"><span>{t('rStudio.textContent')}</span>
      <TextInput data-r-text-content key={`${object.id}:${object.text}`} defaultValue={object.text} maxLength={2048} onBlur={(e) => {
        if (e.target.value !== object.text) commit({ ...edit, text: e.target.value })
      }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
    </label>}
    <TypographyControls adapter={adapter} />
    <p data-r-actual-font className="text-xs text-ink-3">{t('rStudio.actualFont', { family: object.font?.actual })}</p>
    {object.font?.requested !== object.font?.actual && <p className="text-sm text-ink-2">{t('rStudio.fontSubstitution', { requested: object.font?.requested, actual: object.font?.actual })}</p>}
  </fieldset>
}

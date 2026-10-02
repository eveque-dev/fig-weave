import { useTranslation } from 'react-i18next'
import { TextInput } from '@/components/ui/Input'
import { MAX_PNG_WIDTH, MIN_PNG_WIDTH } from './exportSize'

export function ExportWidth({ width, change, disabled = false }: { width: number; change: (width: number) => void; disabled?: boolean }) {
  const { t } = useTranslation('dialogs')
  return <label className="flex flex-wrap items-center gap-2 text-sm">
    <span>{t('onlineProject.pngWidth')}</span>
    <TextInput data-export-width type="number" key={width} defaultValue={width} min={MIN_PNG_WIDTH} max={MAX_PNG_WIDTH} step={1} disabled={disabled} className="max-w-32" onBlur={(e) => {
      const value = Number(e.target.value)
      if (Number.isInteger(value) && value >= MIN_PNG_WIDTH && value <= MAX_PNG_WIDTH) change(value)
      else e.target.value = String(width)
    }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
    <span className="text-xs text-ink-3">{t('onlineProject.keepRatio')}</span>
  </label>
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ONLINE_BACKGROUNDS, setOnlineBackground, useOnlineBackground } from '@/lib/onlineAppearance'
import { Button } from './Button'
import { Popover } from './Popover'
import { Check, Paintbrush } from './icons'
import { ICON_SIZE } from './Icon'

export function BackgroundPicker() {
  const { t } = useTranslation('dialogs')
  const value = useOnlineBackground()
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen} width={220} ariaLabel={t('appearance.title')}
      trigger={<Button data-background-picker variant="ghost" aria-label={t('appearance.title')} title={t('appearance.title')}>
        <Paintbrush aria-hidden size={ICON_SIZE.md} /><span className="hidden sm:inline">{t('appearance.title')}</span>
      </Button>}>
      <div className="space-y-1" data-background-options>
        <p className="px-2 py-1 text-sm text-ink-2">{t('appearance.title')}</p>
        {ONLINE_BACKGROUNDS.map((choice) => (
          <Button key={choice} data-background-choice={choice} active={value === choice} aria-pressed={value === choice}
            className="w-full justify-start" onClick={() => { setOnlineBackground(choice); setOpen(false) }}>
            <span aria-hidden data-background-swatch={choice} className="h-4 w-4 shrink-0 rounded-xs border border-control" />
            <span className="flex-1 text-left">{t(`appearance.${choice}`)}</span>
            {value === choice && <Check aria-hidden />}
          </Button>
        ))}
        <p className="px-2 py-1 text-xs leading-relaxed text-ink-3">{t('appearance.note')}</p>
      </div>
    </Popover>
  )
}

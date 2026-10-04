import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'
import { openUsagePage, setUsageChoice, usageChoice, usageOff, type UsageEngine } from './usage'

/** Non-modal preference: unset sends nothing and creates no identifier. */
export function UsageConsent({ engine }: { engine: UsageEngine }) {
  const { t } = useTranslation('dialogs')
  const [choice, setChoice] = useState(usageChoice)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => { openUsagePage(engine) }, [engine])
  if (usageOff()) return null
  const choose = (next: 'enabled' | 'disabled') => {
    if (!setUsageChoice(next)) { setFailed(true); return }
    setChoice(next); setFailed(false); setOpen(false)
  }
  return <div className="fixed bottom-3 left-3 z-40">
    <Popover width={280} side="top" align="start" open={open} onOpenChange={setOpen} ariaLabel={t('onlineUsage.title')} trigger={<Button data-usage-preference className="bg-surface shadow-pop" size="sm">{t('onlineUsage.status', { state: t(`onlineUsage.${choice}`) })}</Button>}>
      <div data-usage-consent className="space-y-2 text-sm">
        <p className="font-medium">{t('onlineUsage.title')}</p><p className="text-ink-2">{t('onlineUsage.disclosure')}</p><p className="text-xs text-ink-3">{t('onlineUsage.privacy')}</p>
        {failed && <p role="alert">{t('onlineUsage.storageFailed')}</p>}
        <div className="flex gap-2"><Button data-usage-allow variant="primary" onClick={() => choose('enabled')}>{t('onlineUsage.allow')}</Button><Button data-usage-refuse variant="secondary" onClick={() => choose('disabled')}>{t('onlineUsage.refuse')}</Button></div>
      </div>
    </Popover>
  </div>
}

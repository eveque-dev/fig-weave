import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'

/** Timing is local and structural; no script, path, or chart contents are recorded. */
export function LoadFeedback({ phase, busy, error, retry }: { phase: string; busy: boolean; error: string; retry: () => void }) {
  const { t } = useTranslation('dialogs')
  const start = useRef<number | null>(null)
  const lastPhase = useRef('loadingRuntime')
  const [seconds, setSeconds] = useState<number | null>(null)
  const [offline, setOffline] = useState(!navigator.onLine)
  if (phase !== 'idle' && phase !== 'ready') lastPhase.current = phase
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  useEffect(() => {
    if (busy && phase !== 'idle' && phase !== 'ready') {
      lastPhase.current = phase
      if (start.current === null) start.current = performance.now()
      const update = () => setSeconds(Math.round((performance.now() - start.current!) / 1000))
      update(); const timer = setInterval(update, 1000)
      return () => clearInterval(timer)
    }
    if (!busy && start.current !== null) {
      setSeconds(Math.round((performance.now() - start.current) / 1000)); start.current = null
    }
  }, [phase, busy])
  return <div data-load-feedback className="space-y-2 text-xs text-ink-3">
    {seconds !== null && <p data-load-seconds>{t('onlineProject.elapsed', { seconds })}</p>}
    {error && <>
      <p>{offline ? t('onlineProject.offline') : t('onlineProject.failureAt', { phase: t(`rStudio.${lastPhase.current as 'loadingRuntime' | 'loadingPackages' | 'running'}`) })}</p>
      <Button data-load-retry disabled={busy} onClick={retry}>{t('onlineProject.retry')}</Button>
    </>}
  </div>
}

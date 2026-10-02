import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { ONLINE_PROJECT_EXT } from '@/lib/brand'
import { downloadBlob, projectArchive, readProject, type OnlineProject } from './project'

export function ProjectControls({ snapshot, restore, bundle, revision, disabled = false, canSave = true }: {
  snapshot: () => OnlineProject
  restore: (project: OnlineProject) => void | Promise<void>
  bundle?: () => Promise<Blob>
  revision: string
  disabled?: boolean
  canSave?: boolean
}) {
  const { t } = useTranslation('dialogs')
  const input = useRef<HTMLInputElement>(null)
  const current = useRef(revision); current.current = revision
  const [saved, setSaved] = useState(revision)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (revision === saved) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [revision, saved])
  const save = async (reproduction: boolean) => {
    const atStart = current.current
    setWorking(true); setError(''); setDone(false)
    try {
      const blob = reproduction && bundle ? await bundle() : await projectArchive(snapshot())
      downloadBlob(blob, reproduction ? 'reproduction.zip' : `project${ONLINE_PROJECT_EXT}`)
      if (current.current === atStart) setSaved(atStart)
      setDone(true)
    } catch (e) { setError(String(e)) }
    finally { setWorking(false) }
  }
  return <div data-project-controls className="space-y-2 text-sm">
    <div className="flex flex-wrap gap-2">
      <Button data-project-save disabled={disabled || working || !canSave} onClick={() => void save(false)}>{t('onlineProject.save')}</Button>
      <Button data-project-open disabled={disabled || working} onClick={() => input.current?.click()}>{t('onlineProject.open')}</Button>
      {bundle && <Button data-project-bundle disabled={disabled || working} onClick={() => void save(true)}>{t('onlineProject.bundle')}</Button>}
      <input ref={input} data-project-file type="file" accept=".zip" hidden onChange={async (e) => {
        const file = e.target.files?.[0]; e.target.value = ''; if (!file) return
        setWorking(true); setError(''); setDone(false)
        try { const project = await readProject(file); await restore(project) }
        catch (e) { setError(String(e)) }
        finally { setWorking(false) }
      }} />
    </div>
    <p className="text-xs text-ink-3">{t(working ? 'onlineProject.working' : 'onlineProject.localOnly')}</p>
    {done && <p data-project-saved className="text-xs text-ink-2">{t('onlineProject.saved')}</p>}
    {error && <p data-project-error role="alert" className="break-words text-danger">{t('onlineProject.failed')} {error}</p>}
  </div>
}

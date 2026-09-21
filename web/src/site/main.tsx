import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initI18n, readStoredLocale, systemLocale, urlLocale } from '@/i18n'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { SiteApp } from './SiteApp'
import '@/index.css'

initI18n(urlLocale() ?? readStoredLocale() ?? systemLocale() ?? 'en-US')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider><SiteApp /></TooltipProvider>
  </StrictMode>,
)

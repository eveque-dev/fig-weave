import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initI18n, readStoredLocale, systemLocale, urlLocale } from '@/i18n'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { IconProvider } from '@/components/ui/Icon'
import { RStudio } from './RStudio'
import '@/index.css'

initI18n(urlLocale() ?? readStoredLocale() ?? systemLocale() ?? 'en-US')
createRoot(document.getElementById('root')!).render(
  <StrictMode><TooltipProvider><IconProvider><RStudio /></IconProvider></TooltipProvider></StrictMode>,
)

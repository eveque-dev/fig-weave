import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initI18n, onlineLocale } from '@/i18n'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { SiteApp } from './SiteApp'
import '@/index.css'
import { initOnlineAppearance } from '@/lib/onlineAppearance'

initOnlineAppearance()

initI18n(onlineLocale())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider><SiteApp /></TooltipProvider>
  </StrictMode>,
)

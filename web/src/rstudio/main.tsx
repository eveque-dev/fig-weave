import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initI18n, onlineLocale } from '@/i18n'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { IconProvider } from '@/components/ui/Icon'
import { RStudio } from './RStudio'
import '@/index.css'
import { initOnlineAppearance } from '@/lib/onlineAppearance'
import { UsageConsent } from '@/online/UsageConsent'

initOnlineAppearance()

initI18n(onlineLocale())
createRoot(document.getElementById('root')!).render(
  <StrictMode><TooltipProvider><IconProvider><RStudio /><UsageConsent engine="ggplot2" /></IconProvider></TooltipProvider></StrictMode>,
)

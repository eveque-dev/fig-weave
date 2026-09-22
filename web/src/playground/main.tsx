import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { IconProvider } from '@/components/ui/Icon'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { currentLocale, i18n, initI18n, onlineLocale, t as translate } from '@/i18n'
import { PRODUCT_NAME, playgroundDesktopHref } from '@/lib/brand'
import { PlaygroundApp } from './PlaygroundApp'
import '@/index.css'
import { initOnlineAppearance } from '@/lib/onlineAppearance'

initOnlineAppearance()

/**
 * 浏览器 playground 的入口（`/try`，产物由 scripts/build_browser_playground.py
 * 构建、同步进网站仓库）。
 *
 * 语言：本次链接的 `?lang=` > 已保存的选择 > **zh-CN**。
 * 官网的中英文入口显式传递语言；首次无语言提示时使用中文。
 *
 * 能力检测放在挂载之前：不满足就说清楚缺什么，绝不留一个坏掉的编辑器。
 */

const rootEl = document.getElementById('root')!

const missing: string[] = []
if (typeof WebAssembly === 'undefined') missing.push('WebAssembly')
if (typeof Worker === 'undefined') missing.push('Web Worker')
if (typeof TextDecoder === 'undefined' || typeof File === 'undefined') missing.push('File API')

initI18n(onlineLocale())
const syncPageMetadata = () => {
  document.title = `${PRODUCT_NAME} · ${translate('playground.title', { ns: 'dialogs' })}`
  document.documentElement.lang = currentLocale()
}
syncPageMetadata()
i18n.on('languageChanged', syncPageMetadata)

if (missing.length) {
  // 还没有可用的 React 环境保证（老浏览器），用最朴素的 DOM 说清楚；
  // 文案仍走 i18n（上面已经 initI18n），产品名来自 brand，不手写第二份
  const sep = translate('playground.bootListSeparator', { ns: 'dialogs' })
  rootEl.innerHTML = ''
  const p = document.createElement('p')
  p.style.cssText = 'max-width:32rem;margin:20vh auto 0;padding:0 1.5rem;font-size:14px;line-height:1.6;color:#5c5c56;text-align:center'
  p.textContent = translate('playground.bootUnsupportedBrowser', {
    ns: 'dialogs',
    product: PRODUCT_NAME,
    missing: missing.join(sep),
  })
  const a = document.createElement('a')
  a.href = playgroundDesktopHref(currentLocale())
  a.textContent = translate('playground.bootDownloadDesktop', { ns: 'dialogs', product: PRODUCT_NAME })
  a.style.cssText = 'display:block;margin-top:1rem;color:#2868b7'
  p.appendChild(a)
  rootEl.appendChild(p)
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        {/* 画布与属性页里有 Tooltip：Provider 必须在根上（与 App.tsx 同） */}
        <TooltipProvider>
          <IconProvider>
            <PlaygroundApp />
          </IconProvider>
        </TooltipProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}

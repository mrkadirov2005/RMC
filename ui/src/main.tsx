// Application bootstrap entry point.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeContextProvider } from './theme/ThemeContext.tsx'
import { LanguageProvider } from './i18n/LanguageContext.tsx'
import { initializeListRowColors } from './features/crm/settings/listAppearance.ts'

initializeListRowColors()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeContextProvider>
        <App />
      </ThemeContextProvider>
    </LanguageProvider>
  </StrictMode>,
)

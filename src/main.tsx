import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/components/shared/Toast'
import { SessionProvider } from '@/lib/session'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <SessionProvider>
        <TooltipProvider delayDuration={150}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </TooltipProvider>
      </SessionProvider>
    </HashRouter>
  </StrictMode>,
)

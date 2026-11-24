import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/components/shared/Toast'
import { SessionProvider } from '@/lib/session'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <TooltipProvider delayDuration={150}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </TooltipProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { App } from '@/app/App'
import { queryClient } from '@/shared/api/queryClient'
import { AuthProvider } from '@/shared/auth/AuthContext'
import { ToastProvider } from '@/shared/ui/Toast'
import { ErrorBoundary } from '@/shared/error/ErrorBoundary'
import { ThemeProvider } from '@/shared/theme/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <App />
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)

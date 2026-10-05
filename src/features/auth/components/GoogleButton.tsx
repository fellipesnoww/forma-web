import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void
          renderButton: (parent: HTMLElement, options: Record<string, string>) => void
        }
      }
    }
  }
}

const SCRIPT_ID = 'google-identity-services'

export function GoogleButton({ onIdToken }: { onIdToken: (idToken: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) return

    function render() {
      if (!containerRef.current || !window.google) return
      window.google.accounts.id.initialize({
        client_id: clientId!,
        callback: (resp) => onIdToken(resp.credential),
      })
      // GIS renders its button in a cross-origin iframe, so its font can't be styled.
      // It's kept invisible on top of our own button and still receives the click.
      const width = Math.min(400, Math.max(200, containerRef.current.offsetWidth))
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        width: String(width),
      })
    }

    if (window.google) {
      render()
      return
    }

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', render)
    return () => script?.removeEventListener('load', render)
  }, [clientId, onIdToken])

  if (!clientId) return null

  return (
    <div className="group relative h-11 w-full">
      <div
        aria-hidden
        className="flex h-full w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-surface text-sm font-bold text-ink-700 transition-colors group-hover:bg-surface-soft"
      >
        <GoogleIcon />
        Continuar com Google
      </div>
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-0"
      />
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

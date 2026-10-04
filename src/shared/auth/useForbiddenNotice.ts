import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '@/shared/ui/Toast'

/** Explains a `RequireRole` redirect with a toast, then clears the flag so a reload doesn't repeat it. */
export function useForbiddenNotice() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const forbidden = (location.state as { forbidden?: boolean } | null)?.forbidden

  useEffect(() => {
    if (!forbidden) return
    toast('Você não tem permissão para acessar essa área.', 'warning')
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [forbidden, location.pathname, location.search, navigate, toast])
}

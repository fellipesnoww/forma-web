import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useAuth } from '@/shared/auth/AuthContext'
import { tokenStorage } from '@/shared/auth/tokenStorage'

const BASE_URL = import.meta.env.VITE_API_URL

/** Presigned S3 links carry their signature in the query string. */
const isPresigned = (url: string) => url.includes('X-Amz-')

/** Each expired link gets one refresh attempt, so a genuinely broken image can't loop. */
const retried = new Set<string>()
let refreshing: Promise<unknown> | null = null

/**
 * Presigned links expire (403 from S3). Refetch what's on screen so the server signs fresh ones:
 * the active queries plus `/auth/me` for the avatar. Images failing together share one refresh.
 */
function refreshExpiredImages(queryClient: QueryClient, refreshMe: () => Promise<void>) {
  refreshing ??= Promise.allSettled([queryClient.invalidateQueries({ refetchType: 'active' }), refreshMe()]).finally(
    () => {
      refreshing = null
    },
  )
}

/**
 * Renders an image URL from the API.
 * - Presigned S3 and third-party URLs (e.g. the Google OAuth `picture` avatar) are plain <img>.
 * - Legacy relative `/media/{id}` URLs need a Bearer header, which a plain <img src> can't send.
 * Shows `fallback` while nothing can be rendered (loading legacy media, or a broken link).
 */
export function AuthedImage({
  src,
  alt,
  className,
  fallback = null,
}: {
  src: string
  alt: string
  className?: string
  fallback?: ReactNode
}) {
  const queryClient = useQueryClient()
  const { refreshMe } = useAuth()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const url = src.startsWith('http') ? src : `${BASE_URL}${src}`
  const isOwnApi = !src.startsWith('http') || (!!BASE_URL && src.startsWith(BASE_URL))

  useEffect(() => {
    if (!isOwnApi) return
    let objectUrl: string | null = null
    fetch(url, { headers: { authorization: `Bearer ${tokenStorage.getAccess() ?? ''}` } })
      .then((res) => (res.ok ? res.blob() : Promise.reject(res)))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      })
      .catch(() => setBlobUrl(null))
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, isOwnApi])

  const onError = () => {
    setFailedSrc(src)
    if (isPresigned(src) && !retried.has(src)) {
      retried.add(src)
      refreshExpiredImages(queryClient, refreshMe)
    }
  }

  if (failedSrc === src) return <>{fallback}</>
  // Google's image CDN can answer 403 when a referrer is sent.
  if (!isOwnApi) return <img src={url} alt={alt} className={className} referrerPolicy="no-referrer" onError={onError} />
  if (!blobUrl) return <>{fallback}</>
  return <img src={blobUrl} alt={alt} className={className} />
}

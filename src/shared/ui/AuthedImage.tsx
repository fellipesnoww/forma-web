import { useEffect, useState } from 'react'
import { tokenStorage } from '@/shared/auth/tokenStorage'

const BASE_URL = import.meta.env.VITE_API_URL

/**
 * GET /media/{id} requires a Bearer header, which a plain <img src> can't send.
 * Third-party URLs (e.g. the Google OAuth `picture` used as avatar) are public and reject an
 * Authorization header via CORS, so they render as a plain <img>.
 */
export function AuthedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
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

  // Google's image CDN can answer 403 when a referrer is sent.
  if (!isOwnApi) return <img src={url} alt={alt} className={className} referrerPolicy="no-referrer" />
  if (!blobUrl) return null
  return <img src={blobUrl} alt={alt} className={className} />
}

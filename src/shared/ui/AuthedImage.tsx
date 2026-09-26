import { useEffect, useState } from 'react'
import { tokenStorage } from '@/shared/auth/tokenStorage'

const BASE_URL = import.meta.env.VITE_API_URL

/** GET /media/{id} requires a Bearer header, which a plain <img src> can't send. */
export function AuthedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    const url = src.startsWith('http') ? src : `${BASE_URL}${src}`
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
  }, [src])

  if (!blobUrl) return null
  return <img src={blobUrl} alt={alt} className={className} />
}

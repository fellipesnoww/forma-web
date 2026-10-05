const MAX_EDGE = 1600
const QUALITY = 0.82

/** What the API accepts (magic-number checked server-side). */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Photo uploads (sessions, activities, avatar) aren't compressed server-side and cap at 5 MB,
 * so phone photos are downscaled to JPEG before upload. Returns base64 without the data-URL prefix.
 */
export async function compressImage(
  file: File,
  { maxEdge = MAX_EDGE }: { maxEdge?: number } = {},
): Promise<{ data: string; mimeType: string; filename: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
  const filename = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return { data: dataUrl.split(',')[1], mimeType: 'image/jpeg', filename }
}

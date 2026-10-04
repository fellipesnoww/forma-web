import { compressImage } from '@/shared/lib/image'
import { fileToBase64 } from '@/shared/lib/file'
import type { MediaInput } from '@/features/admin/api'

/** Below this size the file goes as-is: keeps PNG/WebP transparency, which JPEG compression would turn black. */
const PASSTHROUGH_BYTES = 1.5 * 1024 * 1024

/** Global media for catalog images and achievement icons (server cap: 5 MB, JPEG/PNG/WebP). */
export async function toMediaInput(file: File): Promise<MediaInput> {
  if (file.size <= PASSTHROUGH_BYTES) {
    return { data: await fileToBase64(file), mimeType: file.type, filename: file.name }
  }
  return compressImage(file)
}

import { useEffect, useId, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { AuthedImage } from '@/shared/ui/AuthedImage'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Admin image picker (exercise image, achievement icon). Shows the saved image until a new file is
 * picked or it's removed. No `capture`: admins pick existing files, not camera shots.
 */
export function ImageField({
  label,
  currentUrl,
  file,
  removed,
  onFile,
  onRemove,
  onReject,
}: {
  label: string
  /** Image already saved on the server (`mediaUrl`/`iconUrl`). */
  currentUrl: string | null
  file: File | null
  /** The saved image was marked for removal. */
  removed: boolean
  onFile: (file: File | null) => void
  onRemove: () => void
  onReject: (message: string) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const accept = (picked: File | undefined) => {
    if (!picked) return
    if (!ACCEPTED.includes(picked.type)) return onReject('Use uma imagem JPG, PNG ou WebP.')
    onFile(picked)
  }

  const showSaved = !file && !removed && currentUrl

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-ink-700">
        {label}
      </label>
      {preview || showSaved ? (
        <div className="relative h-[110px] overflow-hidden rounded-[14px] bg-surface-soft">
          {preview ? (
            <img src={preview} alt="Imagem selecionada" className="h-full w-full object-contain" />
          ) : (
            <AuthedImage src={currentUrl!} alt="Imagem atual" className="h-full w-full object-contain" />
          )}
          <button
            type="button"
            aria-label="Remover imagem"
            onClick={() => (file ? onFile(null) : onRemove())}
            className="absolute top-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            accept(e.dataTransfer.files[0])
          }}
          className={cn(
            'flex h-[110px] flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed text-primary-500',
            dragging ? 'border-primary-500 bg-primary-50' : 'border-[#C2CCEA] bg-[#F4F7FF]',
          )}
        >
          <Upload size={20} />
          <span className="text-[13px] font-extrabold">Enviar arquivo</span>
          <span className="text-[11.5px] font-semibold text-ink-400">JPG, PNG ou WebP · compressão automática</span>
        </button>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          accept(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

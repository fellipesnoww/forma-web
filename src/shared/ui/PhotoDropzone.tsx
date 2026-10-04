import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/** Click (opens the rear camera on mobile via `capture`) or drag a file in. Holds the file; the parent uploads it. */
export function PhotoDropzone({
  file,
  onChange,
  onReject,
  previewAlt = 'Foto do treino selecionada',
}: {
  file: File | null
  onChange: (file: File | null) => void
  onReject: (message: string) => void
  previewAlt?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)

  const setPreviewUrl = (url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setPreview(url)
  }

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  const accept = (picked: File | undefined) => {
    if (!picked) return
    if (!ACCEPTED.includes(picked.type)) return onReject('Use uma imagem JPG, PNG ou WebP.')
    setPreviewUrl(URL.createObjectURL(picked))
    onChange(picked)
  }

  if (file && preview) {
    return (
      <div className="relative mt-3.5 h-[200px] overflow-hidden rounded-2xl bg-surface-soft sm:h-[260px]">
        <img src={preview} alt={previewAlt} className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => {
            setPreviewUrl(null)
            onChange(null)
          }}
          aria-label="Remover foto"
          className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white"
        >
          <X size={18} />
        </button>
      </div>
    )
  }

  return (
    <>
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
          'mt-3.5 flex h-[200px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed text-primary-500 transition-colors',
          dragging ? 'border-primary-500 bg-primary-50' : 'border-[#C2CCEA] bg-[#F4F7FF]',
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white shadow-[0_4px_12px_rgba(45,91,255,0.12)]">
          <ImagePlus size={22} />
        </span>
        <span className="text-sm font-extrabold">
          <span className="sm:hidden">Tirar ou escolher foto</span>
          <span className="hidden sm:inline">Arraste uma foto ou clique para enviar</span>
        </span>
        <span className="text-xs font-semibold text-ink-400">JPG, PNG ou WebP · comprimida automaticamente</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </>
  )
}

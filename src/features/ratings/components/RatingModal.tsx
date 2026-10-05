import { useEffect, useId, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Monitor, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { ratingsApi, type RatingRank } from '@/features/ratings/api'
import { OBSERVATION_MAX, RANKS, RANK_INFO } from '@/features/ratings/lib/rank'
import { describeDevice } from '@/features/ratings/lib/device'
import { Barbell } from '@/features/ratings/components/Barbell'

interface Props {
  open: boolean
  onClose: () => void
}

/** "Avaliar o Forma" (5.4): pick a barbell 1–5, optional comment, sent as a web rating. */
export function RatingModal({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const textId = useId()
  const toast = useToast()
  const [rank, setRank] = useState<RatingRank | null>(null)
  const [text, setText] = useState('')
  const [sentRank, setSentRank] = useState<RatingRank | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setRank(null)
      setText('')
      setSentRank(null)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const send = useMutation({
    mutationFn: (value: RatingRank) =>
      ratingsApi.create({
        rank: value,
        observation: text.trim() || null,
        platform: 'web',
        device: describeDevice(),
      }),
    onSuccess: (rating) => setSentRank(rating.rank),
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível enviar sua avaliação.', 'error'),
  })

  const close = () => {
    if (!send.isPending) onClose()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={(e) => {
        if (e.target === ref.current) onClose()
      }}
      onCancel={(e) => {
        if (e.target !== ref.current) return
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === ref.current) close()
      }}
      className="m-auto w-[min(620px,calc(100vw-32px))] overflow-hidden rounded-3xl p-0 shadow-[0_30px_60px_rgba(18,20,26,0.28)] backdrop:backdrop-blur-sm"
    >
      {sentRank ? (
        <div className="flex flex-col items-center px-6 pt-10 pb-[30px] text-center sm:px-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-50 text-primary-500">
            <Barbell rank={5} className="h-8 w-16" />
          </div>
          <h2 id={titleId} className="mt-[18px] text-[21px] font-extrabold tracking-[-0.4px] text-ink-900">
            Obrigado pela avaliação!
          </h2>
          <p className="mt-1.5 max-w-[380px] text-sm font-medium text-pretty text-ink-500">
            Sua nota <b className="text-primary-500">{RANK_INFO[sentRank].label}</b> foi enviada. Ela ajuda a gente a
            deixar o Forma cada vez mais forte.
          </p>
          <Button onClick={onClose} className="mt-[22px] rounded-[13px] px-7 font-extrabold">
            Fechar
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (rank) send.mutate(rank)
          }}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-6 sm:px-7 sm:pt-[26px]">
            <div>
              <h2 id={titleId} className="text-lg font-extrabold tracking-[-0.4px] text-ink-900 sm:text-[21px]">
                Como está sua experiência com o Forma?
              </h2>
              <p className="mt-1 text-[13.5px] font-medium text-ink-500">
                Escolha o peso que representa sua nota — do mais leve ao mais pesado.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-surface-soft text-ink-600 hover:bg-[#ECEEF3]"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>

          <div role="radiogroup" aria-label="Nota" className="flex gap-1.5 px-5 pt-[22px] sm:gap-2.5 sm:px-7">
            {RANKS.map((n) => {
              const selected = rank === n
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${n} · ${RANK_INFO[n].label}`}
                  onClick={() => setRank(n)}
                  className={cn(
                    'flex h-[116px] min-w-0 flex-1 flex-col items-center justify-end gap-2.5 rounded-2xl border-[1.5px] px-1 pb-3 transition-[background,border-color,box-shadow] hover:shadow-[0_8px_18px_rgba(45,91,255,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:h-[136px] sm:gap-3 sm:pb-3.5',
                    selected ? 'border-primary-500 bg-primary-50 text-primary-500' : 'border-[#E6E8EF] bg-white text-ink-100',
                  )}
                >
                  <Barbell rank={n} className="h-auto w-full max-w-[88px]" />
                  <span className="text-center">
                    <span
                      className={cn(
                        'block text-xs leading-tight font-extrabold sm:text-[13px]',
                        selected ? 'text-primary-500' : 'text-ink-700',
                      )}
                    >
                      {RANK_INFO[n].label}
                    </span>
                    <span className="mt-px block text-[11px] font-bold text-ink-200">{RANK_INFO[n].weight}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between px-5 pt-3 text-xs font-bold text-ink-200 sm:px-7">
            <span>1 · ruim</span>
            <span className={cn('text-[13px] font-extrabold', rank ? 'text-primary-500' : 'text-ink-200')}>
              {rank ? `${rank} · ${RANK_INFO[rank].label}` : 'Escolha uma nota'}
            </span>
            <span>5 · muito bom</span>
          </div>

          <div className="px-5 pt-5 sm:px-7">
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor={textId} className="text-[13.5px] font-extrabold text-ink-900">
                Conte mais <span className="font-semibold text-ink-200">(opcional)</span>
              </label>
              <span className="text-[11.5px] font-bold text-ink-200 tabular-nums">
                {text.length}/{OBSERVATION_MAX}
              </span>
            </div>
            <textarea
              id={textId}
              value={text}
              maxLength={OBSERVATION_MAX}
              onChange={(e) => setText(e.target.value)}
              placeholder="O que você mais gosta? O que podemos melhorar?"
              className="h-[104px] w-full resize-none rounded-[14px] border-[1.5px] border-[#E6E8EF] bg-[#F9FAFC] px-3.5 py-3 text-sm leading-normal font-medium text-ink-900 outline-none placeholder:text-ink-200 focus:border-primary-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 px-5 pt-5 pb-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-400">
              <Monitor size={14} />
              Enviando pela web
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={close}
                className="flex-1 rounded-[13px] sm:flex-none"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!rank}
                loading={send.isPending}
                className="flex-1 rounded-[13px] font-extrabold sm:flex-none"
              >
                Enviar avaliação
              </Button>
            </div>
          </div>
        </form>
      )}
    </dialog>
  )
}

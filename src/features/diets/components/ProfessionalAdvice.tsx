import { Lightbulb } from 'lucide-react'

/** Reminder on the diets list that Forma organizes a routine; it doesn't replace a nutritionist. */
export function ProfessionalAdvice() {
  return (
    <div
      role="note"
      aria-label="Dica: conte sempre com um profissional"
      className="flex items-start gap-3.5 rounded-[18px] border border-[#FFE3A0] bg-[#FFF6DB] px-[18px] py-4 dark:border-warning-500/25 dark:bg-warning-50"
    >
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-warning-500 text-white">
        <Lightbulb size={20} strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-[#7A5200] dark:text-warning-500">Dica: conte sempre com um profissional</p>
        <p className="mt-[3px] text-[13.5px] leading-normal font-medium text-pretty text-[#7A5A12] dark:text-[#E8C77A]">
          As dietas do Forma servem para organizar sua rotina. Faça acompanhamento com um nutricionista para ajustar
          calorias e alimentos ao seu corpo e aos seus objetivos.
        </p>
      </div>
    </div>
  )
}

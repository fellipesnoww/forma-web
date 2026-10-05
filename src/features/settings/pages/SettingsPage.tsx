import { cn } from '@/shared/lib/cn'
import { useTheme, type ThemePreference } from '@/shared/theme/ThemeContext'

// Previews use fixed colors: each one depicts its theme regardless of the active one.
const themeOptions: { value: ThemePreference; label: string; preview: string; hint: string }[] = [
  {
    value: 'light',
    label: 'Claro',
    preview: 'bg-[#F6F7FB] border border-[#ECEEF3]',
    hint: 'Usa sempre o tema claro.',
  },
  { value: 'dark', label: 'Escuro', preview: 'bg-[#14161D]', hint: 'Usa sempre o tema escuro.' },
  {
    value: 'system',
    label: 'Sistema',
    preview: 'bg-[linear-gradient(90deg,#F6F7FB_50%,#14161D_50%)] border border-[#ECEEF3]',
    hint: 'Segue o tema do sistema operacional automaticamente.',
  },
]

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Configurações</h1>
      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-2">
        <AppearanceCard />
      </div>
    </div>
  )
}

function AppearanceCard() {
  const { preference, setPreference } = useTheme()
  const hint = themeOptions.find((o) => o.value === preference)?.hint

  return (
    <section className="rounded-[20px] border border-border bg-surface p-5">
      <h2 id="appearance-title" className="text-base font-extrabold text-ink-900">
        Aparência
      </h2>
      <div role="radiogroup" aria-labelledby="appearance-title" className="mt-3.5 grid grid-cols-3 gap-2.5">
        {themeOptions.map((option) => {
          const selected = option.value === preference
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPreference(option.value)}
              className={cn(
                'rounded-[14px] text-center transition-colors',
                selected
                  ? 'border-2 border-primary-500 bg-primary-50 p-[7px]'
                  : 'border border-border-strong p-2 hover:bg-surface-soft',
              )}
            >
              <div className={cn('h-[58px] rounded-[9px]', option.preview)} />
              <div
                className={cn(
                  'mt-2 text-[13px]',
                  selected ? 'font-extrabold text-primary-500' : 'font-bold text-ink-900',
                )}
              >
                {option.label}
              </div>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[12.5px] font-semibold text-ink-400">{hint}</p>
    </section>
  )
}

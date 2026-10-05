import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

const DURATION = '4s'

const anim = (name: string, origin: string): CSSProperties => ({
  animation: `${name} ${DURATION} ease-in-out infinite`,
  transformBox: 'view-box',
  transformOrigin: origin,
})

function FailedLiftScene() {
  return (
    <svg
      viewBox="0 0 400 320"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible"
      role="img"
      aria-label="Pessoa deixando cair uma barra de peso"
    >
      <ellipse cx="200" cy="284" rx="150" ry="10" fill="#E6E9F2" />
      <ellipse cx="200" cy="282" rx="110" ry="7" fill="#12141A" style={anim('nf-shadow', '200px 282px')} />
      <g style={anim('nf-jump', '200px 280px')}>
        <path d="M190 200 L180 276 M210 200 L220 276" stroke="#12141A" strokeWidth="12" strokeLinecap="round" />
        <path d="M170 278 h20 M210 278 h20" stroke="#12141A" strokeWidth="10" strokeLinecap="round" />
        <g style={anim('nf-armL', '184px 142px')}>
          <path d="M184 142 L170 100 L160 62" fill="none" stroke="#F2B48C" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g style={anim('nf-armR', '216px 142px')}>
          <path d="M216 142 L230 100 L240 62" fill="none" stroke="#F2B48C" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <rect x="176" y="130" width="48" height="76" rx="18" fill="#2D5BFF" />
        <rect x="186" y="196" width="28" height="12" rx="4" fill="#12141A" />
        <rect x="192" y="122" width="16" height="12" rx="4" fill="#F2B48C" />
        <circle cx="200" cy="104" r="23" fill="#F2B48C" />
        <path d="M178 96 q22 -20 44 0" fill="none" stroke="#FF5A2C" strokeWidth="6" strokeLinecap="round" />
        <g style={{ animation: `nf-calm ${DURATION} steps(1) infinite` }}>
          <path d="M190 104 l5 -2 M210 104 l-5 -2" stroke="#12141A" strokeWidth="3" strokeLinecap="round" />
          <path d="M192 116 h16" stroke="#12141A" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g style={{ animation: `nf-shock ${DURATION} steps(1) infinite`, opacity: 0 }}>
          <circle cx="192" cy="103" r="4" fill="#fff" stroke="#12141A" strokeWidth="2.5" />
          <circle cx="208" cy="103" r="4" fill="#fff" stroke="#12141A" strokeWidth="2.5" />
          <ellipse cx="200" cy="117" rx="4.5" ry="5.5" fill="#12141A" />
        </g>
        <path d="M226 92 q4 7 0 10 q-4 -3 0 -10z" fill="#7FB2FF" style={anim('nf-sweat', '226px 96px')} />
        <path
          d="M172 98 q4 7 0 10 q-4 -3 0 -10z"
          fill="#7FB2FF"
          style={{ ...anim('nf-sweat', '172px 102px'), animationDelay: '-0.25s' }}
        />
      </g>
      <g style={anim('nf-dust', '120px 278px')}>
        <circle cx="96" cy="272" r="9" fill="#D5D9E2" />
        <circle cx="82" cy="262" r="6" fill="#E1E4EC" />
        <circle cx="108" cy="264" r="5" fill="#E1E4EC" />
      </g>
      <g style={anim('nf-dust', '280px 278px')}>
        <circle cx="304" cy="272" r="9" fill="#D5D9E2" />
        <circle cx="318" cy="262" r="6" fill="#E1E4EC" />
        <circle cx="292" cy="264" r="5" fill="#E1E4EC" />
      </g>
      <g style={anim('nf-bar', '200px 56px')}>
        <rect x="96" y="52" width="208" height="8" rx="4" fill="#3A4252" />
        <rect x="108" y="28" width="16" height="56" rx="5" fill="#12141A" />
        <rect x="124" y="36" width="10" height="40" rx="4" fill="#3A4252" />
        <rect x="276" y="28" width="16" height="56" rx="5" fill="#12141A" />
        <rect x="266" y="36" width="10" height="40" rx="4" fill="#3A4252" />
      </g>
      <g style={anim('nf-pop', '320px 150px')}>
        <text
          x="320"
          y="160"
          textAnchor="middle"
          fontFamily="Plus Jakarta Sans, sans-serif"
          fontWeight="800"
          fontSize="34"
          fill="#FF5A2C"
          stroke="#fff"
          strokeWidth="6"
          paintOrder="stroke"
        >
          PLOFT!
        </text>
      </g>
    </svg>
  )
}

export function NotFoundPage() {
  return (
    <div className="nf-scene flex min-h-screen flex-col bg-surface-muted text-ink-900">
      <div className="flex items-center gap-3 px-8 py-6">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 shadow-[0_6px_14px_rgba(45,91,255,0.35)]">
          <span className="text-xl font-extrabold text-white">F</span>
        </div>
        <div className="text-xl font-extrabold tracking-[-0.4px]">Forma</div>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-2 pb-14 text-center">
        <div className="aspect-[400/320] w-full max-w-[440px]">
          <FailedLiftScene />
        </div>
        <div className="mt-2 inline-flex items-center rounded-full bg-primary-50 px-3 py-1.5 text-[12.5px] font-extrabold tracking-[0.6px] text-primary-500">
          ERRO 404
        </div>
        <h1 className="mt-4 text-[40px] leading-[1.1] font-extrabold tracking-[-1px] text-balance">
          Página não encontrada
        </h1>
        <p className="mt-3 max-w-[420px] text-base leading-[1.55] font-medium text-pretty text-ink-500">
          Essa carga foi pesada demais. A página que você procura não existe ou mudou de lugar.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/app"
            className="flex h-12 items-center gap-2 rounded-[13px] bg-primary-500 px-[22px] text-[15px] font-bold text-white shadow-[0_8px_18px_rgba(45,91,255,0.28)] transition-colors hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            <ChevronLeft size={16} strokeWidth={2.4} />
            Voltar ao início
          </Link>
          <Link
            to="/app/sheets"
            className="flex h-12 items-center rounded-[13px] border border-[#E6E8EF] bg-white px-[22px] text-[15px] font-bold text-ink-700 transition-colors hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            Ver meus treinos
          </Link>
        </div>
      </main>
    </div>
  )
}

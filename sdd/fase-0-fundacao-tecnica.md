# Fase 0 — Fundação técnica

## Escopo entregue

- `create-vite` (React 19 + TypeScript) + Tailwind CSS v4 + React Router v7
- Cliente HTTP (`shared/api/client.ts`) com interceptor de auth + refresh automático
- Contexto de sessão (`shared/auth/AuthContext.tsx`) + guards `RequireAuth`/`RequireRole`
- Design system base: `Button`, `Input`, `Card`, `Modal`, `Toast`, `Spinner` — responsivos
- Variáveis de ambiente por ambiente (`.env.local`, `.env.staging`, `.env.production`)
- Error boundary global (`shared/error/ErrorBoundary.tsx`)

## Decisões técnicas

| Decisão | Motivo |
|---|---|
| **Tokens Bearer (não cookie httpOnly)** | O roadmap original assumia cookie httpOnly, mas a API real (`GET /docs/json`, ver artifact de referência) devolve `accessToken`/`refreshToken` no corpo JSON. `accessToken` fica em `localStorage` via `shared/auth/tokenStorage.ts`; enviado como `Authorization: Bearer`. Refresh automático em qualquer `401` (dedupe de chamadas concorrentes de refresh). |
| **Fetch nativo, sem axios** | `apiFetch` (client.ts) cobre header injection, retry de refresh e parsing do envelope de erro em ~80 linhas — axios seria peso sem ganho. |
| **`<dialog>` nativo para Modal** | Focus trap e `Esc` de graça, sem lib de modal. |
| **Toast/Spinner escritos à mão** | Poucas linhas, evita dependência de UI kit externo — mantém 100% alinhado à paleta do design. |
| **Tailwind v4 + `@tailwindcss/vite`** | Zero `postcss.config`/`tailwind.config.js` — tokens de cor/fonte/radius direto em `@theme` (`src/index.css`), extraídos do mockup Claude Design (`Forma Web.dc.html`, projeto "App de Treino Personalizado"). |
| **`lucide-react`** | Ícones stroke consistentes com o mockup sem redesenhar ~15 SVGs à mão. |
| **Google Identity Services via `<script>`, sem SDK npm** | GSI é carregado direto do CDN do Google (`accounts.google.com/gsi/client`); evita dependência extra para OAuth. |

## Estrutura criada

```
src/
  app/            # rotas, layouts (AppLayout com sidebar, AuthLayout), páginas de app-shell
  features/auth/  # 1.1 — login, registro, onboarding
  features/profile/  # 1.2 — perfil e medidas
  shared/
    api/          # client.ts, queryClient.ts
    auth/         # AuthContext, tokenStorage, RequireAuth/RequireRole, types
    ui/           # design system
    error/        # ErrorBoundary
    lib/          # cn(), fileToBase64()
```

## Variáveis de ambiente

`VITE_API_URL` (base da API) e `VITE_GOOGLE_CLIENT_ID` (Client ID do Google OAuth, vazio até ter um configurado) em `.env.local` / `.env.staging` / `.env.production`.

## Como testar

```
npm install
npm run build   # tsc -b && vite build
npm run dev      # http://localhost:5173
```

Sem backend rodando em `http://localhost:3333`, a UI carrega normalmente e mostra estados de erro/vazio nas chamadas — não há crash.

## Pendências

- `roadmap-backend.md` e `roadmap-features.md` foram **perdidos** durante o setup inicial (`create-vite --overwrite` apagou o diretório sem confirmação prévia). `roadmap-frontend.md` foi restaurado a partir do conteúdo já lido nesta sessão. Os outros dois não têm cópia recuperável nesta máquina — se existir cópia em outro lugar, restaurar antes de confiar em detalhes de contrato de backend não documentados no artifact de referência da API.
- `VITE_GOOGLE_CLIENT_ID` ainda não configurado — botão Google fica oculto até haver um Client ID real.

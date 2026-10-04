# Roadmap Frontend — Forma (Checklist)

> Checklist de entregas do **forma-web** derivado do [roadmap-features.md](roadmap-features.md). Marque `[x]` conforme concluir cada item.
>
> **Stack:** ReactJS · TypeScript · Vite · React Router · Tailwind CSS · React Query · Zod
>
> **Escopo:** SPA React única, responsiva (desktop + mobile no mesmo código, sem app nativo). Cobre app do usuário final e painel admin. Onde existir diferença real de comportamento em telas pequenas, o item é marcado **Responsivo:** — não existe checklist duplicado "web vs mobile".

**Como usar:** siga a [ordem sugerida](#ordem-de-implementação) no final. Ao concluir cada etapa, registre em [`sdd/`](#documentação-sdd).

---

## Progresso geral

| Fase | Status |
|---|---|
| 0 — Fundação técnica | ✅ |
| 1 — MVP Core | 🟡 (1.1–1.5 feitos) |
| 2 — Completude do usuário | 🟡 (2.1–2.2 feitos) |
| 3 — Painel administrativo | 🟡 (3.1–3.5 feitos; falta o teste manual da 3.6) |
| 4 — Gamificação | ⬜ |
| 5 — Experiência avançada | ⬜ |
| 6 — Integrações e expansão | ⬜ |

---

## Convenções (referência)

### Arquitetura — package by feature

Mesmo princípio do backend ([roadmap-backend.md](roadmap-backend.md#arquitetura--package-by-feature)): organizado **por feature**, não por camada técnica.

```
src/
  app/                     # rotas (React Router), layout raiz
  features/
    auth/
      index.ts             # exports públicos
      components/
      api.ts               # chamadas à API (React Query)
      schemas.ts           # Zod: espelha contratos do backend
    profile/
    exercises/
    workout-sheets/
    workout-sessions/
    activities/
    calendar/
    progress/
    admin/
    achievements/
    challenges/
    notifications/
    export/
  shared/                  # design system, cliente HTTP, auth context, hooks genéricos
```

| Regra | Diretriz |
|---|---|
| **Colocation** | Tudo da feature vive em `features/<nome>/` |
| **Export público** | Outras features importam só de `features/<nome>/index.ts` |
| **`shared/`** | Design system, cliente HTTP, contexto de auth — só o genuinamente transversal |
| **Schemas** | Zod por feature, espelhando os schemas do backend |
| **Admin** | `features/admin/` — rotas atrás de `/admin/*`, mesmo bundle, guard por role |
| **Responsivo** | Breakpoints Tailwind (`sm`/`md`/`lg`); nenhum componente assume mouse (touch-first: hit targets ≥ 44px, sem hover-only) |
| **Testes** | Cada etapa entrega seu spec Playwright em `e2e/<feature>.spec.ts`, rodando nos projetos `desktop` e `mobile` contra a API real (ver [sdd/testes-e2e.md](sdd/testes-e2e.md)) |
| **SDD** | Ao concluir etapa, criar/atualizar markdown em `sdd/` |

**Mapa feature ↔ rota:**

| Feature | Rota |
|---|---|
| `auth` | `/login`, `/register` |
| `profile` | `/profile` |
| `exercises` | `/exercises` |
| `workout-sheets` | `/sheets` |
| `workout-sessions` | `/sheets/:id/run` |
| `activities` | `/activities` |
| `calendar` | `/calendar` |
| `progress` | `/progress` |
| `admin` | `/admin/*` |
| `achievements` | `/achievements` |
| `challenges` | `/challenges` |
| `notifications` | `/notifications` |
| `export` | `/export` |

### Estado e integração

| Tema | Diretriz |
|---|---|
| Estado servidor | React Query; nenhum `fetch` direto em componente |
| Estado de formulário | React Hook Form + Zod resolver |
| Autenticação | JWT em cookie httpOnly; refresh automático via interceptor do cliente HTTP |
| Autorização | Guard de rota por role (`user`, `admin`, `super_user`) |
| Erros | Mapear `{ error: { code, message } }` do backend para toast/inline |
| Imagens | `<input type="file" accept="image/*" capture="environment">` abre câmera direto em mobile, sem lib extra |
| Acessibilidade | Label em todo input, contraste AA, foco visível, hit targets ≥ 44px |

### Documentação SDD

Mesmo padrão do backend — ver [roadmap-backend.md § Documentação SDD](roadmap-backend.md#documentação-sdd).

```
sdd/
  1.1-autenticacao.md
  1.2-perfil.md
  ...
```

**Conteúdo mínimo:** etapa, escopo entregue, decisões técnicas, estrutura criada, rotas, integrações de API consumidas, variáveis de ambiente, como testar, pendências.

---

## Fase 0 — Fundação técnica

> Pré-requisito para as demais fases. **Estimativa:** 1 semana

- [x] `create-vite` (React + TypeScript) + Tailwind + React Router
- [x] Cliente HTTP (`shared/api/client.ts`) com interceptor de auth + refresh
- [x] Contexto/store de sessão (usuário, role, token) + guard de rota autenticada + guard por role
- [x] Design system base: Button, Input, Card, Modal, Toast, Spinner — responsivos desde o primeiro componente
- [x] Variáveis de ambiente por ambiente (`.env.local`, `.env.staging`, `.env.production`)
- [x] Error boundary global
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/navigation.spec.ts` — layout, menu desktop/mobile, 404, redirecionamentos
- [x] `sdd/fase-0-fundacao-tecnica.md`

---

## Fase 1 — MVP Core

> **Objetivo:** autenticar, perfilar, exercícios, planilhas e sessões de treino, ponta a ponta. **Estimativa:** 6–8 semanas

### 1.1 Autenticação e onboarding

- [x] `/login`, `/register`, callback OAuth Google
- [x] Onboarding pós-login (apresentação das funcionalidades principais)
- [x] Redirecionamento pós-login conforme `onboarding_completed_at`
- [x] `POST /auth/register`, `/auth/login`, `/auth/google`
- [x] `POST /auth/refresh` automático via interceptor; `POST /auth/logout` limpa sessão
- [x] `GET /auth/me` hidrata sessão no boot do app
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/auth.spec.ts` — cadastro, login, validações, refresh automático, logout, onboarding
- [x] `sdd/1.1-autenticacao.md`

> Login com Apple (`POST /auth/apple`) depende de fluxo nativo Sign in with Apple JS — avaliar se faz sentido fora de app nativo antes de implementar.

---

### 1.2 Perfil do usuário

- [x] Tela de perfil (peso, altura, cintura, peitoral) + edição + upload de avatar
- [x] Histórico de medidas (lista + gráfico simples)
- [x] `GET/PATCH /profile`, `POST /profile/avatar`, `GET/POST /profile/measurements`
- [x] Validação client-side espelhando regras do backend (valores > 0)
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/profile.spec.ts` — nome, avatar, medidas + histórico, validação > 0
- [x] `sdd/1.2-perfil.md`

---

### 1.3 Exercícios

- [x] Biblioteca de exercícios com busca e filtro por grupo muscular
- [x] Criação/edição/exclusão de exercício personalizado (só do próprio usuário)
- [x] `GET /exercises?muscle_group=&q=`, `POST /exercises/custom`, `PATCH/DELETE /exercises/custom/:id`
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/exercises.spec.ts` — busca, filtro por grupo, CRUD de personalizado
- [x] `sdd/1.3-exercicios.md`

---

### 1.4 Planilha de treino

- [x] Listagem, criação (nome + dias da semana + exercícios por dia), edição, exclusão
- [x] Reordenação de exercícios (drag and drop mouse **e** touch — usar lib com suporte a Pointer Events, ex. `@dnd-kit`, não `react-beautiful-dnd`)
- [x] `GET/POST /workout-sheets`, `GET/PATCH/DELETE /workout-sheets/:id`, `PATCH /workout-sheets/:id/reorder`
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/sheets.spec.ts` — criação, validações, edição, exclusão, drag and drop
- [x] `sdd/1.4-planilhas.md`

---

### 1.5 Execução de treino

- [x] Tela de execução com séries, repetições e carga por exercício
- [x] Finalização com foto (câmera via `capture="environment"` em mobile) e comentário opcionais
- [x] Histórico de sessões (`?from=&to=&sheet_id=`)
- [x] Estado local otimista durante a execução (evitar perder série em queda de rede)
- [x] `POST /workout-sessions`, `PATCH /workout-sessions/:id`, `POST /workout-sessions/:id/complete`, `POST /workout-sessions/:id/photo`, `GET /workout-sessions`
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/sessions.spec.ts` — execução, sync otimista/offline, finalização com foto, histórico com filtros
- [x] `sdd/1.5-sessoes-treino.md`

---

### 1.6 Entrega Fase 1

- [x] Testes de guard de rota — não autenticado (`e2e/auth.spec.ts`)
- [x] Testes de guard de rota — role incorreta (coberto em `e2e/admin/infra.spec.ts`)
- [x] Smoke test end-to-end: login → planilha → sessão → histórico, em viewport desktop e mobile (`e2e/`, projetos `desktop` e `mobile`)
- [x] Atualizar `sdd/README.md` com links das etapas 1.1–1.5

---

## Fase 2 — Completude do usuário

> **Objetivo:** atividades livres, calendário, retroativo e progressão. **Estimativa:** 4–6 semanas

### 2.1 Atividades livres

- [x] Listagem (`?from=&to=`), registro (tipo, duração, comentário, foto), criação de tipo custom, edição/exclusão
- [x] `GET/POST /activity-types`, `/activity-types/custom`, `GET/POST/PATCH/DELETE /activities`, `POST /activities/:id/photo`
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/activities.spec.ts`
- [x] `sdd/2.1-atividades-livres.md`

---

### 2.2 Calendário

- [x] Calendário mensal com indicação visual de dias com treino/atividade + miniaturas de fotos
- [x] Visualização detalhada do dia ao clicar/tocar na data
- [x] **Responsivo:** grade mensal completa em desktop; grade compacta + cartão do dia em telas < `sm` (o design substituiu a lista/agenda prevista aqui — ver `sdd/2.2-calendario.md`)
- [x] `GET /calendar?year=&month=`, `GET /calendar/:date`
- [x] Timezone do browser enviado ao backend (gravado no perfil via `PATCH /profile`, que é onde o backend agrupa os dias)
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/calendar.spec.ts` — incluir grade desktop vs. grade compacta mobile
- [x] `sdd/2.2-calendario.md`

---

### 2.3 Registro retroativo

- [ ] Seleção de data passada via calendário no fluxo de registro; `<input type="date" max={hoje}>` bloqueia futuro no próprio input, sem JS extra
- [ ] Mensagem de erro amigável se backend rejeitar (fallback de validação)
- [ ] Testes E2E (Playwright, desktop + mobile): `e2e/retroactive.spec.ts` — data futura bloqueada, erro amigável do backend
- [ ] `sdd/2.3-registro-retroativo.md`

---

### 2.4 Gráficos de progressão

- [ ] Gráfico de evolução de carga por exercício e de medidas corporais (peso, cintura, peitoral)
- [ ] Filtros de período (30, 60, 90 dias e customizado)
- [ ] **Responsivo:** gráfico redimensiona por container (`ResponsiveContainer` do Recharts), sem overflow horizontal em mobile
- [ ] `GET /progress/load?exercise_id=&from=&to=`, `GET /progress/measurements?metric=&from=&to=`
- [ ] Testes E2E (Playwright, desktop + mobile): `e2e/progress.spec.ts` — filtros de período; gráfico sem overflow em mobile
- [ ] `sdd/2.4-progressao.md`

---

### 2.5 Entrega Fase 2

- [ ] Smoke test: atividade retroativa aparece no calendário e nos gráficos
- [ ] Atualizar `sdd/README.md` com links das etapas 2.1–2.4

---

## Fase 3 — Painel administrativo

> **Objetivo:** UI completa para `/admin/*`, mesmo bundle React. **Estimativa:** 3–4 semanas

### 3.1 Infra admin

- [x] Layout admin (`/admin/*`) com navegação própria; guard `requireRole('admin')` no layout, `requireRole('super_user')` nas rotas exclusivas
- [x] Tabela genérica com paginação/busca/filtro reutilizável entre telas admin
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/admin/infra.spec.ts` — guard por role: user → 403/redirect, admin vs. super_user
- [x] `sdd/3.1-infra-admin.md`

### 3.2 Gestão de exercícios (admin)

- [x] Listagem com filtros (inclui inativos), criação com upload de imagem/GIF, edição, ativação/desativação
- [x] Gestão de grupos musculares (CRUD)
- [x] `GET/POST/PATCH /admin/exercises`, `PATCH /admin/exercises/:id/status`, `GET/POST/PATCH /admin/muscle-groups`
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/admin/exercises.spec.ts`
- [x] `sdd/3.2-admin-exercicios.md`

### 3.3 Gestão de usuários (admin)

- [x] Listagem paginada com busca/filtro (`status`, `role`), perfil individual (dados + estatísticas)
- [x] Ativar/desativar/banir; promoção para admin (visível só para `super_user`)
- [x] `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/status`, `PATCH /admin/users/:id/role`
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/admin/users.spec.ts`
- [x] `sdd/3.3-admin-usuarios.md`

### 3.4 Gestão de administradores (super user)

- [x] Listagem de admins/super users, promoção/rebaixamento, log de auditoria (`?actor_id=&action=&from=&to=`)
- [x] `GET /admin/admins`, `PATCH /admin/admins/:id/role`, `GET /admin/audit-logs`
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/admin/super-user.spec.ts`
- [x] `sdd/3.4-admin-super-user.md`

### 3.5 Conquistas e desafios (admin)

- [x] CRUD de conquistas (nome, descrição, ícone, critério) e desafios (nome, descrição, período, meta, recompensa)
- [x] Ativação/desativação de desafio; visualização de quem desbloqueou cada conquista
- [x] CRUD `/admin/achievements`, CRUD `/admin/challenges`, `GET /admin/achievements/:id/unlocks`
- [x] Testes E2E (Playwright, desktop + mobile): `e2e/admin/achievements-challenges.spec.ts`
- [x] `sdd/3.5-admin-conquistas-desafios.md`

### 3.6 Entrega Fase 3

- [ ] Teste manual: usuário não-admin não acessa `/admin/*` (redirect/403). Já coberto automaticamente em `e2e/admin/infra.spec.ts`
- [x] Atualizar `sdd/README.md` com links das etapas 3.1–3.5

---

## Fase 4 — Engajamento e gamificação

> **Objetivo:** conquistas, desafios e streaks visíveis e motivadores. **Estimativa:** 3–4 semanas

### 4.1 Conquistas

- [ ] Vitrine de conquistas (desbloqueadas e bloqueadas) + destaque no perfil
- [ ] Notificação in-app ao desbloquear (toast/banner)
- [ ] `GET /achievements`, `GET /achievements/mine`
- [ ] Testes E2E (Playwright, desktop + mobile): `e2e/achievements.spec.ts` — notificação de desbloqueio exibida uma única vez
- [ ] `sdd/4.1-conquistas.md`

### 4.2 Desafios

- [ ] Listagem de desafios ativos com prazo/meta, entrar + acompanhar progresso, ranking, histórico
- [ ] `GET /challenges/active`, `POST /challenges/:id/join`, `GET /challenges/:id/progress`, `GET /challenges/:id/ranking`, `GET /challenges/history`
- [ ] Testes E2E (Playwright, desktop + mobile): `e2e/challenges.spec.ts`
- [ ] `sdd/4.2-desafios.md`

### 4.3 Streaks e consistência

- [ ] Contador de dias consecutivos no perfil + indicador visual no calendário
- [ ] Destaque de conquista automática em marcos (7, 30, 60, 90 dias) — via 4.1
- [ ] Consumir `currentStreak`/`longestStreak` do payload de perfil ou `/calendar`
- [ ] Testes E2E (Playwright, desktop + mobile): `e2e/streaks.spec.ts`
- [ ] `sdd/4.3-streaks.md`

### 4.4 Entrega Fase 4

- [ ] Teste manual: desbloqueio de conquista exibe notificação uma única vez
- [ ] Atualizar `sdd/README.md` com links das etapas 4.1–4.3

---

## Fase 5 — Experiência avançada

> **Objetivo:** produtividade no treino, notificações push e modo escuro. **Estimativa:** 3–5 semanas

### 5.1 Qualidade de vida no treino

- [ ] Cronômetro de descanso entre séries (configurável por exercício)
- [ ] Sugestão automática de carga (última sessão) exibida no input
- [ ] Duplicar planilha existente
- [ ] `GET /exercises/:id/last-session`, `POST /workout-sheets/:id/duplicate`
- [ ] Testes E2E (Playwright, desktop + mobile): `e2e/workout-qol.spec.ts` — cronômetro de descanso (`page.clock`), sugestão de carga, duplicar planilha
- [ ] `sdd/5.1-qualidade-vida-treino.md`

### 5.2 Notificações

- [ ] Tela de configuração de horário/frequência de lembretes
- [ ] Web Push via Service Worker (Push API + Notifications API) — cobre desktop e mobile (Android; iOS 16.4+ como PWA instalada)
- [ ] Notificação de conquista desbloqueada e novo desafio (via 4.1/4.2)
- [ ] `POST/DELETE /devices` (token de push), `GET/PATCH /notification-preferences`, `GET /notifications`, `PATCH /notifications/:id/read`
- [ ] Testes E2E (Playwright, desktop + mobile): `e2e/notifications.spec.ts` — preferências; Push API mockada via `context.grantPermissions`
- [ ] `sdd/5.2-notificacoes.md`

### 5.3 Modo escuro

- [ ] Tema escuro completo, detecção automática via `prefers-color-scheme`, toggle manual persistido (sobrepõe detecção)
- [ ] Testes E2E (Playwright, desktop + mobile): `e2e/dark-mode.spec.ts` — `colorScheme` do contexto + toggle persistido
- [ ] `sdd/5.3-modo-escuro.md`

### 5.4 Entrega Fase 5

- [ ] Teste manual: preferências de notificação respeitadas (opt-out não recebe push)
- [ ] Teste manual: duplicar planilha preserva ordem e defaults
- [ ] Atualizar `sdd/README.md` com links das etapas 5.1–5.3

---

## Fase 6 — Integrações e expansão

> **Objetivo:** health sync, exportação/compartilhamento e modo offline. **Estimativa:** 4–6 semanas

### 6.1 Integrações de saúde

> Apple Health (HealthKit) **não tem API web** — só acessível via app nativo (Swift/Capacitor). Fora de escopo enquanto o projeto for React puro; revisitar se/quando existir wrapper nativo.

- [ ] Google Fit: REST API tem OAuth server-side, funciona a partir do browser — tela de conexão + sincronização de peso
- [ ] `POST /integrations/health/sync`, `GET /integrations/health/status`, `DELETE /integrations/health`
- [ ] Testes E2E (Playwright, desktop + mobile): `e2e/health-integrations.spec.ts`
- [ ] `sdd/6.1-integracoes-saude.md`

### 6.2 Exportação e compartilhamento

- [ ] Exportar histórico em PDF/CSV (download direto); compartilhar treino/gráfico via Web Share API com fallback de download em browsers sem suporte
- [ ] `GET /export/workouts.pdf`, `GET /export/workouts.csv`, `GET /share/workout-sessions/:id/card`
- [ ] Testes E2E (Playwright, desktop + mobile): `e2e/export.spec.ts` — download (`page.waitForEvent("download")`) e Web Share com fallback
- [ ] `sdd/6.2-exportacao.md`

### 6.3 Modo offline *(complexidade alta)*

- [ ] Cache local de planilhas/exercícios via Service Worker (Workbox) + IndexedDB
- [ ] Fila de mutações pendentes com `client_generated_id`, sync automático ao voltar conexão, indicador de status
- [ ] `GET /sync/pull?since=`, `POST /sync/push`, `GET /sync/status`
- [ ] Testes E2E (Playwright, desktop + mobile): `e2e/offline-sync.spec.ts` — `context.setOffline`, fila de mutações e idempotência
- [ ] `sdd/6.3-sync-offline.md`

### 6.4 Entrega Fase 6

- [ ] Teste manual: push/pull idempotente (mesmo `client_id` não duplica)
- [ ] Teste manual: export CSV/PDF com intervalo grande
- [ ] Atualizar `sdd/README.md` com links das etapas 6.1–6.3

---

## Ordem de implementação

1. [ ] **Fase 0** — setup, design system, cliente HTTP, auth guard
2. [ ] **1.1** — Auth (login/register/OAuth) — depende de `roadmap-backend.md` 1.1
3. [ ] **1.3** — Exercícios (biblioteca + custom)
4. [ ] **1.4** — Planilhas
5. [x] **1.5** — Sessões de treino
6. [ ] **1.2** — Perfil e medidas
7. [x] **2.1** — Atividades livres
8. [ ] **2.2–2.3** — Calendário + retroativo
9. [ ] **2.4** — Progressão (gráficos)
10. [ ] **Fase 3** — Admin
11. [ ] **Fase 4** — Conquistas, desafios, streaks
12. [ ] **Fase 5** — Qualidade de vida, push, modo escuro
13. [ ] **Fase 6** — Google Fit, export, offline

> Cada etapa depende do endpoint correspondente estar disponível em [roadmap-backend.md](roadmap-backend.md).

---

## Resumo por fase

| Fase | Entregável | Prioridade | Estimativa |
|---|---|---|---|
| 0 | Setup, design system, auth guard | 🔴 Crítica | 1 semana |
| 1 | Auth, perfil, exercícios, planilhas, sessões | 🔴 Crítica | 6–8 semanas |
| 2 | Atividades, calendário, progressão | 🔴 Crítica | 4–6 semanas |
| 3 | Painel administrativo | 🟠 Alta | 3–4 semanas |
| 4 | Conquistas, desafios, streaks | 🟠 Alta | 3–4 semanas |
| 5 | Cronômetro, push, modo escuro | 🟡 Média | 3–5 semanas |
| 6 | Google Fit, export, offline (sem Apple Health) | 🟢 Futura | 4–6 semanas |

---

## Referências

- [roadmap-features.md](roadmap-features.md) — visão produto completa
- [roadmap-backend.md](roadmap-backend.md) — contratos de API e ordem de entrega do backend
- [sdd/](sdd/) — registros de implementação por etapa (SDD)

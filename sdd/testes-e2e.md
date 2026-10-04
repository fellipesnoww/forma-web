# Testes E2E (Playwright)

## Escopo entregue

Suíte Playwright cobrindo tudo o que está implementado (Fase 0 e 1.1–1.5), rodando em dois projetos, `desktop` (Chrome 1280×800) e `mobile` (Pixel 7, touch), contra a **API real**.

| Spec | Cobre |
|---|---|
| `e2e/navigation.spec.ts` | Fase 0: sidebar (desktop) vs. tab bar/header (mobile), navegação entre seções, atalhos da home, 404, `/` → `/app`, hit target ≥ 44px |
| `e2e/auth.spec.ts` | 1.1: cadastro, validações do cadastro, e-mail duplicado, login, senha errada, redirect de rota protegida com retorno, hidratação via `/auth/me`, refresh automático do access token, refresh inválido → login, logout, onboarding + gate |
| `e2e/profile.spec.ts` | 1.2: dados do usuário, editar nome, nome vazio, upload de avatar, medidas + histórico + gráfico, validação > 0 |
| `e2e/exercises.spec.ts` | 1.3: catálogo, busca, estado vazio, filtro por grupo, criar/editar/excluir personalizado, nome obrigatório, catálogo não editável |
| `e2e/sheets.spec.ts` | 1.4: estado vazio, criar com 2 dias, dia sem exercício, nome obrigatório, desmarcar dia, remover exercício, editar, excluir, drag and drop com `PATCH /reorder` persistido, botão Iniciar |
| `e2e/sessions.spec.ts` | 1.5: dia de hoje + alvos, troca de dia, criação da sessão na 1ª série, herança de carga, vírgula decimal, sync via `PATCH`, desfazer, adicionar/remover série, navegação (rail desktop, barra mobile), reload retoma, offline → "salvo no aparelho" → sincroniza ao voltar, finalizar sem série, finalizar com foto + comentário, arquivo inválido, "Voltar ao treino" sem rascunho local, histórico (status, ordem, filtros por planilha/período, filtros na URL, paginação, detalhe) |

Resultado atual: **126 passed, 2 skipped** (≈35 s). Os skips são intencionais e só no `mobile`: logout (o botão Sair só existe na sidebar desktop) e drag and drop (arrasto por toque do `TouchSensor` não é simulável de forma confiável; a lógica é a mesma coberta pelo mouse no desktop). `sessions` + `sheets` com `--repeat-each=3`: 183/183.

## Como rodar

```bash
npm run test:e2e            # tudo, desktop + mobile
npx playwright test --project=desktop e2e/sessions.spec.ts
npm run test:e2e:ui         # modo interativo
npm run test:e2e:report     # abre o último relatório HTML
```

Pré-requisitos: Postgres do `forma-server` rodando (o mesmo banco de dev) e o checkout do backend em `../forma-server` (ou `FORMA_SERVER_DIR=<caminho>`). Na primeira vez: `npx playwright install chromium`.

## Decisões técnicas

- **API real, não mockada**: pega divergência de contrato e problemas de integração (a suíte achou três bugs, abaixo). Mock (`context.setOffline`) só para simular queda de rede.
- **O Playwright sobe sua própria instância do backend** (`npx tsx src/server.ts` em `forma-server`, porta 3334) com `RATE_LIMIT_MAX` e `RATE_LIMIT_UPLOAD_MAX` altos: os limites de dev (100 req/min global, 10/min em auth e uploads) estrangulariam uma execução completa. Ela usa o mesmo banco de dev. `E2E_API_URL=<url>` pula essa etapa e usa uma API já rodando.
- **Front servido como build de produção** (`vite build` + `vite preview` na porta 4174, saída em `node_modules/.e2e-dist`), não o dev server: o pre-bundling sob demanda do Vite recarrega a página no meio do teste em cold start, o que causava falhas intermitentes.
- **Um usuário novo por teste** (fixture `user`, via `POST /auth`), com dados semeados direto pela API (`e2e/support/api.ts`). A UI só é dirigida no que o teste verifica. Testes rodam em paralelo sem colidir e sem limpeza.
- **Login por `localStorage`** (fixture `authedPage`): os tokens e a flag de onboarding são gravados antes do app carregar, só uma vez por página, para que reloads vejam o que o próprio app gravou (ex.: depois do logout).
- **Timezone e locale fixos** (`America/Sao_Paulo`, `pt-BR`), já que execução e histórico dependem do dia da semana e das datas locais.

## Estrutura criada

```
playwright.config.ts
tsconfig.e2e.json               # referenciado em tsconfig.json → `tsc -b` checa os testes
e2e/
  support/env.ts                # portas/URLs
  support/api.ts                # cliente de seed (usuário, planilha, sessão, exercício custom…)
  support/fixtures.ts           # fixtures api/user/authedPage, signIn, helpers (dia de hoje, PNG)
  navigation.spec.ts  auth.spec.ts  profile.spec.ts
  exercises.spec.ts   sheets.spec.ts  sessions.spec.ts
```

`.gitignore`: `test-results`, `playwright-report`, `playwright/.cache`.

## Bugs encontrados e corrigidos

| Onde | Bug | Correção |
|---|---|---|
| `forma-server/src/app.ts` | CORS sem `methods`: o default do `@fastify/cors` (`GET,HEAD,POST`) bloqueava `PATCH`/`DELETE` no browser (editar/excluir planilha e exercício, perfil, sync da sessão) | `methods` explícito com `PUT`, `PATCH`, `DELETE`, `OPTIONS` |
| 1.2 · avatar | Front fazia `POST /media` + `PATCH /profile { avatarUrl }`, mas `PATCH /profile` não aceita `avatarUrl` (400 "Envie ao menos um campo") | Usa `POST /profile/avatar`, que sobe e aplica num passo |
| 1.2 · medidas | Cintura/peitoral vazios viravam `0` (`z.coerce`) e falhavam "> 0", então só dava para salvar preenchendo os 4 campos | `z.preprocess` trata `""` como ausente |
| 1.2 · histórico | Front esperava array com `recordedAt`; API devolve `{ items, total, page, limit }` com `createdAt` e campos anuláveis. O histórico nunca aparecia | `listMeasurements` lê `items`; tipo `Measurement` espelha a API; gráfico ordena e ignora peso nulo |

## Pendências

- Nenhum pipeline de CI ainda. A config já trata `CI` (retries, `forbidOnly`, reporter `github`), mas o job precisa de Postgres + `forma-server` disponíveis.
- No cadastro, "Nome" é opcional na API mas o formulário exige (string vazia não passa em `min(1)`). Os testes preenchem o nome; mudar isso é decisão de produto.

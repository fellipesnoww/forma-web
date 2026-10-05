# Dietas

Fora do `roadmap-frontend.md` (no backend é a "Fase 5.3 — dietas"; no front, a 5.3 é o modo escuro). Entregue a partir do design `Forma Web.dc.html` ("Dietas · listagem…" e "Editor de dieta · refeições, horários, alimentos e calorias com IA") e da seção Dietas do artifact de referência da API.

## Escopo entregue

- **Listagem** `/app/diets` (item "Dietas" no menu, depois de Planilhas, como no design): cartões com "Ativa agora"/"Inativa", objetivo, "4 refeições · 12 alimentos", "≈ 1.850 kcal / dia" e as refeições com horário e kcal. Ativa: "Editar dieta". Inativas: "Ativar dieta" + editar. Todas: excluir (com confirmação). Ativa primeiro, depois as mais novas (ordem do servidor)
- **Editor** `/app/diets/new` e `/app/diets/:id`:
  - Nome e objetivo
  - Refeições numeradas com nome, horário (`type="time"`), kcal da refeição e remover
  - Alimentos com nome, quantidade (aceita vírgula: "0,15"), unidade G/KG/ML/L, calorias, botão **IA** e remover
  - "Adicionar alimento" e "Adicionar refeição" (nova refeição: 3 h depois da anterior, com uma linha em branco)
  - Coluna direita: **Total aproximado** ao vivo, chave **Dieta ativa**, **Por refeição** (barras na escala da maior refeição, por horário) e o aviso da IA
  - Cancelar / Salvar dieta
- **Botão IA** (`POST /diets/calorie-estimate`): habilitado só com nome e quantidade. Preenche as calorias e mostra "Estimativa da IA: <base>. Revise antes de salvar." com o campo em lilás; editar o valor tira a marca. Erros:
  - **503:** IA desligada no servidor → desabilita todos os botões IA da tela e avisa "IA indisponível no momento. Digite as calorias."
  - **400:** "A IA não reconheceu esse alimento…"
  - **429:** "Muitas consultas seguidas…"
- **Início:** cartão "Dieta ativa" com kcal e **próxima refeição** (horário do aparelho; depois da última, volta para a primeira) ou "Nenhuma dieta ativa", acima dos atalhos
- **Responsivo:** no mobile, cada alimento vira um cartão de 3 linhas (nome · qtd/unidade/kcal · IA/remover), o nome da refeição ocupa a linha inteira e o resumo desce para depois das refeições
- `e2e/diets.spec.ts` (8 casos × desktop/mobile); `e2e/navigation.spec.ts` inclui Dietas

## Decisões técnicas

- **Rascunho com texto, não número.** Quantidade e kcal ficam como digitados até salvar (`lib/editor.ts`), então "0," ou "62,5" não são normalizados no meio da digitação. Os totais ao vivo usam o que já é número.
- **Validação espelha o backend** (nome 1–120, objetivo ≤ 255, ≤ 20 refeições, ≤ 50 alimentos, `HH:mm`, quantidade > 0, kcal inteiro 0–20000). Os erros só aparecem depois da primeira tentativa de salvar e então acompanham o rascunho: cada correção some com a própria mensagem.
- **Linhas de alimento totalmente em branco não são enviadas**, então a linha vazia de uma refeição nova não bloqueia o salvamento.
- **Salvar = um request de conteúdo + no máximo um de ativação.** `POST` (criação, sempre inativa) ou `PATCH` com todas as refeições (all-or-nothing, como no backend); se a chave "Dieta ativa" mudou, `activate`/`deactivate` em seguida. A dica da chave avisa quando ativar vai substituir outra dieta.
- **Atualizações funcionais no rascunho:** a resposta da IA chega depois de um `await` e não pode desfazer o que o usuário digitou enquanto isso.
- **Cartão do início usa `GET /diets`** em vez do `activeDiet` de `/auth/me`: mesmo `DietSummary`, e compartilha o cache `['diets']` com as telas de dieta, então ativar/editar reflete no início sem recarregar a sessão.
- **IA nos testes é mockada** (`page.route`): o servidor de dev não tem chave e cada chamada real custa.

## Estrutura criada

```
features/diets/
  api.ts                          # dietsApi, Diet/DietSummary/Meal/Food, FOOD_UNITS
  lib/format.ts                   # kcal pt-BR, "4 refeições · 12 alimentos", nextMeal()
  lib/editor.ts                   # rascunho, totais, validação, draft → body
  components/DietCard.tsx
  components/MealEditor.tsx       # refeição + linhas de alimento + botão IA
  components/EditorSummary.tsx    # total, chave "Dieta ativa", por refeição
  pages/DietsListPage.tsx
  pages/DietEditorPage.tsx
  index.ts
features/dashboard/components/ActiveDietCard.tsx
e2e/diets.spec.ts
```

Alterados: `app/App.tsx` (rotas), `AppLayout` (menu), `DashboardPage` (cartão), `e2e/support/api.ts` (helpers de dieta), `e2e/navigation.spec.ts`.

## Rotas

`/app/diets`, `/app/diets/new`, `/app/diets/:id`

## Integrações de API consumidas

| Endpoint | Uso |
|---|---|
| `GET /diets` | Listagem e cartão do início |
| `POST /diets` | Criar (inativa) |
| `GET /diets/:id` | Abrir no editor |
| `PATCH /diets/:id` | Salvar (nome, objetivo, refeições) |
| `DELETE /diets/:id` | Excluir |
| `POST /diets/:id/activate`, `/deactivate` | Listagem e chave do editor |
| `POST /diets/calorie-estimate` | Botão IA |

## Variáveis de ambiente

Nenhuma no front. No backend: `CALORIE_AI_PROVIDER`, `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` ou `GEMINI_API_KEY`/`GEMINI_MODEL`, `CALORIE_AI_TIMEOUT_MS`. Sem chave, a IA responde 503 e o resto funciona.

## Como testar

```bash
npx playwright test e2e/diets.spec.ts
```

| Caso | O que verifica |
|---|---|
| Criar | totais ao vivo (≈ 365, "2 refeições · 3 alimentos", kcal da refeição); body com "0,15 KG" → `0.15`; cartão na listagem |
| Validação | mensagens antes de salvar, somem ao corrigir; linha em branco não vai no body |
| IA | body do pedido, kcal preenchido, nota da IA; editar remove a nota |
| IA com erro | 400 → mensagem na linha; 503 → aviso e botão desabilitado |
| Ativar | ativa primeiro na lista; ativar outra desativa a anterior; início mostra a dieta e a próxima refeição |
| Editar | valores carregados; objetivo limpo → `null`; chave ativa → `isActive: true` |
| Excluir | estado vazio |
| Inexistente | "Dieta não encontrada" |

## Pendências

- Reordenar refeições/alimentos por arrastar não existe (o servidor ordena refeições pelo horário; alimentos seguem a ordem de inserção).
- Sem aviso de alterações não salvas ao sair do editor.

# Alinhamento com o design web (out/2026)

Comparação de `Forma Web.dc.html` (projeto de design `c998bfa4…`) com o que já estava implementado. Dietas ficaram de fora nesta passada e foram entregues em seguida: ver [dietas.md](dietas.md). Itens do roadmap estão nos SDDs próprios: [2.3](2.3-registro-retroativo.md), [2.4](2.4-progressao.md), [5.1](5.1-qualidade-vida-treino.md).

## Refatorado para bater com o design

| Tela | Antes | Agora |
|---|---|---|
| **Menu** | Sidebar no desktop + tab bar inferior de 6 itens no mobile | Sidebar com a ordem do design (Início, Planilhas, Dietas, Biblioteca, Calendário, Atividades, Evolução) + Histórico; CTA "Criar planilha" em Início e Planilhas. No mobile, header com ☰ / logo / avatar e **drawer** lateral (`<dialog>` modal: Esc, backdrop e foco preso), sem tab bar |
| **Início** | Saudação + 4 atalhos | Dashboard: cartão "Treino de hoje" (ou próximo treino / dia de descanso / criar primeira planilha) com nº de exercícios, ~min e grupos musculares; "Volume na semana" com ↑%, "Treinos no mês" com % do plano, "Atividades livres" com tipos; gráfico "Volume por dia · últimos 7 dias" com tooltip por barra. Atalhos na coluna direita |
| **Planilhas** | Cartões com nome e data de atualização | Selo Hoje/Amanhã/dia, "6 exercícios · ~45 min", dias da semana S T Q Q S S D, Iniciar / editar / **duplicar** / excluir, cartão de hoje destacado, ordenação pelo próximo treino e painel **"Sua semana"** |
| **Nova planilha** | Sem alvos | Séries × reps e descanso por exercício ("4 × 10 · descanso 1:30") |
| **Execução** | — | Sugestão de carga e descanso (5.1) |
| **Calendário** | Só "Lançar atividade livre" | "Lançar registro" + "Lançar treino neste dia" (2.3); cartão do treino com "48 min · 7 exercícios · 26 séries" |
| **Modais** | Presos no canto superior esquerdo (preflight do Tailwind zera a margem do `<dialog>`) | Centralizados (`m-auto`) |

## Fora do escopo (sem backend ainda)

O artifact de referência da API diz para não construir essas telas contra dados reais antes do backend:

| No design | Depende de |
|---|---|
| Desafios (ativos, progresso, ranking, histórico), card "Desafio ativo" no Início | Fase 4.2 (`/challenges/*`) |
| Conquistas (vitrine, marcos), "Nova conquista" ao finalizar, conquistas no Início | Fase 4.1 (`/achievements/*`) |
| Ofensiva / streak no Início e no calendário, "🔥 12 dias" no card de compartilhar | Fase 4.3 |
| Configurações: notificações | Fase 5.2 (`/notification-preferences`, `/devices`) |
| Configurações: tema escuro | Fase 5.3 (só front, mas exige trocar as cores fixas de todas as telas por tokens — etapa própria) |
| Configurações: integrações, exportação, offline; "Exportar", "Compartilhar imagem", card para redes sociais | Fase 6 |
| Busca global e sino de notificações no cabeçalho do desktop | 5.2 / sem endpoint de busca |

## Decisões

- **Histórico continua no menu**, embora o design não tenha o item: é a única entrada para `/app/sessions`.
- **Drawer por rota**: o estado guarda o caminho em que foi aberto, então qualquer navegação (tocar num item, Voltar) fecha sem efeito colateral.
- **Estimativa "~45 min"**: séries × (45 s + descanso, 60 s se não configurado), arredondado a 5 min (`workout-sheets/lib/schedule.ts`).
- Textos verdes de variação usam `success-600` (contraste melhor que o `#18C26B` do design sobre branco).

## Testes

`e2e/navigation.spec.ts` atualizado (drawer, Evolução, Calendário, CTA), `e2e/sheets.spec.ts` (cartão localizado por `role=article`), novo `e2e/dashboard.spec.ts` (2 casos × desktop/mobile).

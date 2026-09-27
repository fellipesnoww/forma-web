# SDD — Forma Web

Registro de implementação por etapa, seguindo `roadmap-frontend.md`.

## Concluído

- [Fase 0 — Fundação técnica](fase-0-fundacao-tecnica.md)
- [1.1 — Autenticação e onboarding](1.1-autenticacao.md)
- [1.2 — Perfil do usuário](1.2-perfil.md)
- [1.3 — Exercícios](1.3-exercicios.md)
- [1.4 — Planilha de treino](1.4-planilhas.md)

## Pausado

**1.5 (Sessões de treino)** — nenhum endpoint dessa etapa existe no backend ainda. Rotas `/app/sheets/:id/run`, `/app/sessions` seguem mapeadas em `app/App.tsx` apontando para o placeholder (`app/pages/ComingSoon.tsx`).

> Nota: este arquivo antes listava 1.3 e 1.4 como pausadas pelo mesmo motivo ("só Auth e Media estão implementados"). Isso ficou desatualizado — o backend evoluiu, o artifact de referência da API já documenta `/exercises` e `/workout-sheets` completos (tag "Fase 1.4"), e ambos foram confirmados funcionando ao vivo antes de fechar as etapas. Só 1.5 continua de fato bloqueada.

## Pendência transversal

`roadmap-backend.md` e `roadmap-features.md` foram apagados acidentalmente durante o setup (`create-vite --overwrite`) e não têm cópia recuperável nesta máquina. `roadmap-frontend.md` foi restaurado a partir do conteúdo lido nesta mesma sessão antes do incidente. Contratos de API usados neste projeto vêm do artifact de referência da API (`https://claude.ai/artifact/LhfKv6ia96xy7Ukd2WdS6r`), não do roadmap-backend perdido.

Link do design: https://claude.ai/design/p/c998bfa4-f257-476b-872e-20523d25d341?file=Forma+Web.dc.html


# SDD — Forma Web

Registro de implementação por etapa, seguindo `roadmap-frontend.md`.

## Concluído

- [Fase 0 — Fundação técnica](fase-0-fundacao-tecnica.md)
- [1.1 — Autenticação e onboarding](1.1-autenticacao.md)
- [1.2 — Perfil do usuário](1.2-perfil.md)

## Pausado

**1.3 (Exercícios), 1.4 (Planilhas), 1.5 (Sessões de treino)** — trabalho parado a pedido do usuário. Motivo: nenhum dos endpoints dessas três etapas existe no backend ainda (confirmado no artifact de referência da API — só Auth e Media estão implementados). Rotas `/app/exercises`, `/app/sheets`, `/app/sheets/:id`, `/app/sheets/:id/run`, `/app/sessions` estão mapeadas em `app/App.tsx` mas apontam para um placeholder (`app/pages/ComingSoon.tsx`) em vez das telas reais, para manter o build e a navegação íntegros sem código incompleto.

## Pendência transversal

`roadmap-backend.md` e `roadmap-features.md` foram apagados acidentalmente durante o setup (`create-vite --overwrite`) e não têm cópia recuperável nesta máquina. `roadmap-frontend.md` foi restaurado a partir do conteúdo lido nesta mesma sessão antes do incidente. Contratos de API usados neste projeto vêm do artifact de referência da API (`https://claude.ai/artifact/LhfKv6ia96xy7Ukd2WdS6r`), não do roadmap-backend perdido.

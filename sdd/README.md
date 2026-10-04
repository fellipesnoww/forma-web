# SDD — Forma Web

Registro de implementação por etapa, seguindo `roadmap-frontend.md`.

## Concluído

- [Fase 0 — Fundação técnica](fase-0-fundacao-tecnica.md)
- [1.1 — Autenticação e onboarding](1.1-autenticacao.md)
- [1.2 — Perfil do usuário](1.2-perfil.md)
- [1.3 — Exercícios](1.3-exercicios.md)
- [1.4 — Planilha de treino](1.4-planilhas.md)
- [1.5 — Execução de treino](1.5-sessoes-treino.md)
- [2.1 — Atividades livres](2.1-atividades-livres.md)
- [2.2 — Calendário](2.2-calendario.md)
- [Testes E2E (Playwright)](testes-e2e.md)

## Corrigido: CORS no backend

`forma-server/src/app.ts` registrava `@fastify/cors` sem `methods` (default `GET,HEAD,POST`), o que bloqueava `PATCH`/`DELETE` vindos do browser. Corrigido no backend com `methods` explícito, e a suíte E2E cobre esses fluxos. Ver [testes-e2e.md](testes-e2e.md#bugs-encontrados-e-corrigidos).

## Pendência transversal

`roadmap-backend.md` e `roadmap-features.md` foram apagados acidentalmente durante o setup (`create-vite --overwrite`) e não têm cópia recuperável nesta máquina. `roadmap-frontend.md` foi restaurado a partir do conteúdo lido nesta mesma sessão antes do incidente. Contratos de API usados neste projeto vêm do artifact de referência da API (`https://claude.ai/artifact/LhfKv6ia96xy7Ukd2WdS6r`), não do roadmap-backend perdido.

Link do design: https://claude.ai/design/p/c998bfa4-f257-476b-872e-20523d25d341?file=Forma+Web.dc.html


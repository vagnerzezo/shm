# Studio Heitor Macks (SHM)

Agendamento online do estúdio: site para clientes, painel do admin, tela "Minha agenda" do barbeiro e a API v1 para o app.
Next.js 16 (App Router), Postgres no Neon (Drizzle), e-mails pelo Resend. Gerenciador de pacotes: **pnpm**.

## Rodar

```bash
pnpm install
pnpm dev          # http://localhost:3000, banco do .env
```

## API e testes

- Contrato: `app/doc/api/openapi.yaml` (OpenAPI 3.1). Base `/api/v1`, JSON, login por cookie (site) ou `Authorization: Bearer <token>` (app).
- Erros sempre em `{ "error": { "code", "message", "fields"? } }`.
- O banco de teste é o branch `teste` do Neon, configurado no `.env.test` (fora do git).

```bash
pnpm test         # testes de domínio (node:test), uns 5 minutos
pnpm test:server  # servidor de teste na porta 3100, com o banco de teste (deixe rodando)
pnpm test:api     # zera e semeia o banco de teste e roda a coleção Postman contra a porta 3100
```

A coleção é gerada: a fonte é `tests/api/requests.mjs` e `tests/api/build-collection.mjs` grava `tests/api/shm-api-v1.postman_collection.json` (o `pnpm test:api` já faz isso).

Migrações: `drizzle/`. Para o banco de teste, `pnpm test:migrate`; para o principal, `node node_modules/drizzle-kit/bin.cjs migrate` (usa o `.env`).

## Documentação

- `app/doc/MAPEAMENTO_SISTEMAS.md`: mapa do sistema, regras de negócio e riscos.
- `app/doc/specs/` e `app/doc/plans/`: desenho e plano da API v1.

## Produção (Vercel)

- Projeto `shm` na Vercel, publicado em https://shm-eta.vercel.app (deploy pelo CLI: `vercel deploy --prod`).
- Variáveis só no ambiente de produção: `DATABASE_URL`, `RESEND_API_KEY`, `MARKETING_EMAIL_FROM`, `APP_URL`, `CRON_SECRET`. `ADMIN_EMAILS` não é usado em produção: admin é quem tem `role = admin` no banco.
- Marketing: cron da Vercel em `vercel.json`, todo dia às 12:00 UTC (9h em Brasília), chamando `GET /api/marketing/executar` com o `CRON_SECRET`. O temporizador interno (`instrumentation.ts`) só roda fora da Vercel.
- `.vercelignore` impede o envio de `.env*` e `.data/`.

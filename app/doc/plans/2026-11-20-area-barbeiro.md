# Área do barbeiro fixa — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todo barbeiro passa a ter, sem liberação, Minha agenda (calendário da Agenda, com marcar/remarcar/cancelar), Clientes (só os que ele já atendeu) e Histórico (só os dele).

**Architecture:** A regra central (`app/_lib/access.ts`) deixa de ler `user.menus` e libera agenda, clientes e histórico para todo barbeiro com profissional; Início fica só admin. O menu do barbeiro vira fixo em `nav.ts`. A lista de clientes do barbeiro passa a exigir atendimento realizado; a ficha continua abrindo para qualquer reserva dele.

**Tech Stack:** Next.js 16, Drizzle/Postgres, `node:test` via `tsx`.

**Spec:** `app/doc/specs/2026-11-20-area-barbeiro-design.md`

## Global Constraints

- Menu do barbeiro, nesta ordem: **Minha agenda** (`/admin/agenda`), **Clientes** (`/admin/clientes`), **Histórico** (`/admin/historico`), **Meus dados** (`/conta`).
- "Já atendeu" = `isDone(r, now)` (passada, não cancelada, sem falta) com o profissional dele.
- Só admin continua igual (chat, marketing, serviços, configurações, CSV, senha/desativar/excluir cliente); barbeiro não troca e-mail/autorizações.
- Sem migração: `users.menus` fica no banco, sem uso.
- Admin com "Sou eu" mantém `/barbeiro` (lista do dia) sem mudança.

## Review Focus

1. **Barbeiro sem profissional** → nada abre e não pode haver laço de redirecionamento entre `/barbeiro` e `/admin/agenda`. Teste na Tarefa 1 (`canOpen` falso) e checagem na Tarefa 2 (curl).
2. **Cliente só com reserva futura com ele** → fora da lista de Clientes, mas a ficha abre. Teste na Tarefa 1.
3. **Cliente com falta ou cancelada com ele** → fora da lista. Teste na Tarefa 1.
4. **Barbeiro tentando o Início do painel (`/admin`)** → volta para a agenda dele. Checagem na Tarefa 2.
5. **Contas antigas com `menus` gravado** (ex.: `["inicio"]`) → ignorado; Início continua fechado. Teste na Tarefa 1.

---

### Task 1: Regra fixa e clientes "já atendidos"

**Files:**
- Modify: `app/_lib/access.ts` (`canOpen`, `staffLinks` removido), `app/_lib/customers.ts` (`getCustomers`, `getCustomer`)
- Test: `tests/access.test.ts`

**Interfaces:**
- Produces:
  - `canOpen(user, menu)`: admin → `true`; barbeiro com `professional` → `menu !== "inicio"`; resto → `false`.
  - `getCustomers(scope?: Scope)`: barbeiro → clientes com ao menos uma reserva dele com `isDone`. Números continuam contando só as reservas dele.
  - `getCustomer(id, scope?)`: barbeiro → cliente com **qualquer** reserva dele (inclusive futura/cancelada) ou `createdBy === scope.userId`; senão `null`.

- [ ] **Step 1: Ajustar os testes** em `tests/access.test.ts`:
  - "barbeiro abre agenda, clientes e histórico sem menus marcados; Início não": barbeiro com `menus: []` → `agenda/clientes/historico` true, `inicio` false; barbeiro com `menus: ["inicio"]` → `inicio` false.
  - Remover os testes de `staffLinks`; manter "barbeiro sem profissional não abre nada" e "cliente e visitante".
  - Buscas: com Heitor tendo reserva **passada** realizada de `cliente`, **futura** de `cliente2`(com Heitor), **passada com falta** e **cancelada**: `getCustomers(heitor)` só `cliente`; `getCustomer(cliente2, heitor)` não é `null`; criado por ele aparece em `getCustomer` mas não na lista.
- [ ] **Step 2:** `npx tsx --env-file=.env.test --test tests/access.test.ts` → falha nos novos.
- [ ] **Step 3:** Implementar. Reservas passadas nos testes: gravar direto com `updateDb` (o domínio não marca no passado para cliente).
- [ ] **Step 4:** passa; `npx tsc --noEmit` mostra os usos de `staffLinks` a remover na Tarefa 2 (resolver lá).
- [ ] **Step 5: Commit** — `feat: barbeiro com agenda, clientes atendidos e histórico por padrão`

### Task 2: Menu fixo e Minha agenda = Agenda

**Files:**
- Modify: `app/_components/nav.ts` (`navByArea.barbeiro`, remove `staffNav`), `app/_components/sidebar.tsx` (remove `staffMenus`), `app/_components/panel-frame.tsx`, `app/barbeiro/page.tsx`, `app/admin/agenda/page.tsx` (título)

**Interfaces:**
- Consumes: `canOpen` (Tarefa 1).
- Produces: `navByArea.barbeiro = [Minha agenda /admin/agenda, Clientes /admin/clientes, Histórico /admin/historico, Meus dados /conta]`.

- [ ] **Step 1:** `/barbeiro`: se `user.role === "barbeiro"` e `canOpen(user, "agenda")` → `redirect("/admin/agenda")`; admin "Sou eu" segue com a página atual.
- [ ] **Step 2:** Agenda com escopo de barbeiro: título "Minha agenda" (admin continua "Agenda").
- [ ] **Step 3:** `tsc`, `lint`, `pnpm test` limpos.
- [ ] **Step 4: Conferir (servidor 3100, curl com sessão do Jimmy, sem menus marcados):** menu com os 4 itens; `/barbeiro` → `/admin/agenda`; `/admin` → `/barbeiro` → `/admin/agenda` (sem laço); Clientes só com quem ele já atendeu; Agenda com "Novo horário". Barbeiro sem profissional (criar no banco de teste): `/barbeiro` não entra em laço.
- [ ] **Step 5: Commit** — `feat: menu fixo do barbeiro e Minha agenda no calendário`

### Task 3: Equipe só com o papel

**Files:**
- Modify: `app/_lib/domain/team.ts` (`setTeamMember` sem `menus`; `TeamMember` sem `menus`), `app/admin/configuracoes/team-card.tsx`, `app/_lib/settings-actions.ts`, `tests/team.test.ts`, `app/doc/PENDENCIAS.md`, `app/doc/MAPEAMENTO_SISTEMAS.md`

**Interfaces:**
- Produces: `setTeamMember(actorId, userId, input: { role: unknown })`.

- [ ] **Step 1:** Ajustar `tests/team.test.ts`: remover os testes de menus; "barbeiro que vira admin mantém o profissional"; `getTeam` sem `menus`; manter as travas (próprio acesso, sem profissional, papel inválido, não-admin).
- [ ] **Step 2:** falha (tipos/asserções). **Step 3:** implementar; cartão sem caixinhas, com o texto "Barbeiro vê a própria agenda, os clientes que já atendeu e o próprio histórico."
- [ ] **Step 4:** `pnpm test`, `tsc`, `lint` limpos.
- [ ] **Step 5:** Docs ("Onde paramos" e mapeamento). **Commit** — `feat: equipe só com papel; docs da área do barbeiro`
- [ ] **Step 6:** Com o dono: push na `main` (sem migração) e conferir o deploy.

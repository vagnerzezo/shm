# Permissões da equipe — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin define, em Configurações → Equipe, quem é admin e quais menus (Início, Agenda, Clientes, Histórico) cada barbeiro vê; o barbeiro abre essas telas filtradas para o profissional dele, com a regra valendo no servidor.

**Architecture:** Duas colunas novas em `users` (`menus`, `created_by`). Uma regra central pura em `app/_lib/access.ts` (pode abrir? de quais dados?) usada por guardas de página (`requireMenu`), por ações (`assertMenu`) e pelas buscas (`getAgenda`, `getCustomers`, `bookByAdmin`...) que passam a receber um escopo. As telas `/admin/...` são as mesmas para admin e barbeiro.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Drizzle + Postgres (Neon), `node:test` via `tsx`, Tailwind 4.

**Spec:** `app/doc/specs/2026-11-19-permissoes-equipe-design.md`

## Global Constraints

- Menus de barbeiro aceitos: exatamente `inicio`, `agenda`, `clientes`, `historico`. Qualquer outro valor é descartado ao ler e recusado (`validation`) ao gravar.
- Chat, Marketing, Serviços, Configurações, exportação CSV, definir senha, desativar e excluir cliente: **só admin**.
- Cliente fora do escopo do barbeiro → `not_found` / página 404 (nunca "sem permissão", para não confirmar que existe).
- "Cliente dele" = tem qualquer reserva com o profissional dele (inclusive cancelada) **ou** `createdBy` = id da conta dele.
- Ninguém altera o próprio papel; o último admin não deixa de ser admin; barbeiro precisa de profissional.
- Migração nova vai para o banco de produção **antes** do push (`node node_modules/drizzle-kit/bin.cjs migrate`); no teste, `pnpm test:migrate`.
- Mensagens ao usuário em português, no tom das existentes.

## Review Focus

1. **Barbeiro abrindo `/admin/clientes/<id>` de cliente de outro** → 404, e as ações `updateCustomer` com esse id → recusadas. Teste na Tarefa 3 (`getCustomer` com escopo) e na Tarefa 6 (`assertCustomerInScope`).
2. **Barbeiro remarcando/cancelando reserva de colega pelo id** (ação chamada direto) → `not_found`. Teste na Tarefa 5.
3. **Admin perde o admin enquanto está logado** (outro admin o rebaixa) → na próxima página ele já cai como barbeiro; menus vêm do banco a cada requisição (`findSessionUser`). Teste na Tarefa 1 (`toCustomer` lê `menus`) e Tarefa 4 (rebaixar).
4. **Barbeiro com menus, mas profissional removido/renomeado** → renomear leva junto (já existe); sem profissional, `canOpen` é falso. Teste na Tarefa 2.
5. **`menus` com lixo no banco** (`null`, valor desconhecido, não-lista) → tratado como vazio/filtrado. Teste na Tarefa 1.

---

### Task 1: Colunas `menus` e `created_by`, e `Customer.menus`

**Files:**
- Modify: `app/_lib/db-schema.ts` (tabela `users`), `app/_lib/db.ts` (tipo `User`), `app/_lib/roles.ts` (`Customer`, `toCustomer`)
- Create: `drizzle/0005_*.sql` (gerada)
- Test: `tests/access.test.ts` (novo)

**Interfaces:**
- Produces:
  - `users.menus: jsonb` (nullable), `users.createdBy: text` (nullable).
  - `User.menus?: string[]`, `User.createdBy?: string`.
  - `export const BARBER_MENUS = ["inicio", "agenda", "clientes", "historico"] as const; export type BarberMenu = (typeof BARBER_MENUS)[number];` em `app/_lib/roles.ts`.
  - `export function menusOf(raw: unknown): BarberMenu[]` (filtra, sem repetição, na ordem de `BARBER_MENUS`).
  - `Customer.menus: BarberMenu[]` — sempre presente; `[]` para admin e cliente.

- [ ] **Step 1: Testes que falham** — `tests/access.test.ts`:
  - `menusOf(["agenda","xyz","agenda","inicio"])` → `["inicio","agenda"]`; `menusOf(null)`, `menusOf("agenda")`, `menusOf(undefined)` → `[]`.
  - `toCustomer({ ...barbeiro, menus: ["clientes"] }).menus` → `["clientes"]`; admin com `menus: ["agenda"]` → `[]`; cliente → `[]`.
- [ ] **Step 2:** `pnpm test` → falha (`menusOf` não existe).
- [ ] **Step 3:** Colunas no schema (`menus: jsonb()`, `createdBy: text()`), campos no `User`, `BARBER_MENUS`/`menusOf`, `toCustomer` devolve `menus: roleOf(user) === "barbeiro" ? menusOf(user.menus) : []`. `toCustomer` passa a aceitar `menus` no `Pick`. `findSessionUser` já repassa a linha inteira; conferir que `menus` chega.
- [ ] **Step 4:** `node node_modules/drizzle-kit/bin.cjs generate --name team_permissions` → `drizzle/0005_team_permissions.sql` só com os dois `ADD COLUMN`. `pnpm test:migrate`.
- [ ] **Step 5:** `pnpm test`, `npx tsc --noEmit`, `pnpm lint` limpos.
- [ ] **Step 6: Commit** — `feat: colunas menus e created_by nas contas`

### Task 2: Regra central `access.ts`

**Files:**
- Create: `app/_lib/access.ts`
- Modify: `app/_lib/auth.ts` (guardas)
- Test: `tests/access.test.ts`

**Interfaces:**
- Consumes: `Customer.menus`, `BarberMenu` (Tarefa 1).
- Produces (em `app/_lib/access.ts`, sem dependência do Next):
  - `export type Scope = { all: true } | { all: false; professional: string; userId: string };`
  - `export function canOpen(user: Customer | null, menu: BarberMenu): boolean` — admin → `true`; barbeiro → `Boolean(user.professional) && user.menus.includes(menu)`; resto → `false`.
  - `export function scopeOf(user: Customer): Scope` — admin → `{ all: true }`; barbeiro → `{ all: false, professional, userId: id }`; lança `forbidden` para cliente ou barbeiro sem profissional.
  - `export function staffLinks(user: Customer): BarberMenu[]` — menus que aparecem para ele (admin: todos; barbeiro: `user.menus` se tiver profissional).
- Produces (em `app/_lib/auth.ts`):
  - `export async function requireMenu(menu: BarberMenu, next: string): Promise<{ user: Customer; scope: Scope }>` — sem login → login; sem `canOpen` → `redirect(homeOf(user))`.
  - `export async function assertMenu(menu: BarberMenu): Promise<{ user: Customer; scope: Scope }>` — para Server Actions; sem permissão lança `DomainError("forbidden", "Sem permissão.")`.

- [ ] **Step 1: Testes que falham** — `canOpen` para: admin sem menus (true em todos), barbeiro com `["agenda"]` (true só agenda), barbeiro com `["agenda"]` sem `professional` (false), cliente (false), `null` (false). `scopeOf` de admin, de barbeiro, e `rejects`/`throws` `forbidden` para cliente.
- [ ] **Step 2:** `pnpm test` → falha.
- [ ] **Step 3:** Implementar `access.ts` e as duas guardas em `auth.ts` (a guarda reutiliza `requireUser`).
- [ ] **Step 4:** `pnpm test` passa; tsc/lint limpos.
- [ ] **Step 5: Commit** — `feat: regra central de acesso da equipe`

### Task 3: Buscas com escopo (agenda, clientes)

**Files:**
- Modify: `app/_lib/reservations.ts` (`getAgenda`), `app/_lib/customers.ts` (`getCustomers`, `getCustomer`, nova `getCustomerPicklist`)
- Test: `tests/access.test.ts`

**Interfaces:**
- Consumes: `Scope` (Tarefa 2).
- Produces:
  - `getAgenda(from?, to?, { includeCancelled?: boolean; scope?: Scope })` — com escopo de barbeiro, só `r.professional === scope.professional`. Sem `scope` = todos (comportamento atual).
  - `getCustomers(scope?: Scope)` — barbeiro: clientes com alguma reserva (qualquer status) com `scope.professional` **ou** `createdBy === scope.userId`.
  - `getCustomer(id: string, scope?: Scope)` — `null` fora do escopo.
  - `getCustomerPicklist(): Promise<{ id: string; name: string; phone: string }[]>` — todos os clientes ativos, só esses três campos (para "Novo horário" do barbeiro, decisão 1 do dono).

- [ ] **Step 1: Testes que falham** (banco de teste, `resetTestDb`): reserva de `cliente` com Heitor e de `cliente2` com Jimmy; escopo Heitor:
  - `getAgenda(..., { scope })` só traz a do Heitor; sem escopo, as duas.
  - `getCustomers(scopeHeitor)` contém `cliente`, não contém `cliente2`; cliente com reserva **cancelada** com Heitor aparece; cliente com `createdBy = USERS.heitor.id` e sem reserva aparece.
  - `getCustomer(USERS.cliente2.id, scopeHeitor)` → `null`.
  - `getCustomerPicklist()` itens com exatamente as chaves `id`, `name`, `phone`, sem desativados.
- [ ] **Step 2:** falha.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `pnpm test` passa.
- [ ] **Step 5: Commit** — `feat: agenda e clientes filtrados por profissional`

### Task 4: Domínio da equipe (papel e menus)

**Files:**
- Create: `app/_lib/domain/team.ts`
- Test: `tests/team.test.ts`

**Interfaces:**
- Produces:
  - `export type TeamMember = { id: string; name: string; email: string; role: "admin" | "barbeiro"; professional: string | null; menus: BarberMenu[] };`
  - `export async function getTeam(): Promise<TeamMember[]>` — admins e barbeiros, admins primeiro, depois por nome.
  - `export async function setTeamMember(actorId: string, userId: string, input: { role: unknown; menus: unknown }): Promise<void>` — numa `updateDb`.

Regras (erros `DomainError`):
- `actorId` não é admin → `forbidden`.
- `userId === actorId` → `validation` "Você não pode mudar o seu próprio acesso." (campo `role`).
- alvo não é admin/barbeiro → `not_found`.
- `role` fora de `admin|barbeiro` → `validation` (campo `role`).
- rebaixar o último admin → `validation` "O estúdio precisa de pelo menos um admin."
- virar barbeiro sem `professional` → `validation` "Ligue a conta a um profissional antes." (campo `role`).
- `menus` não-lista ou com valor fora de `BARBER_MENUS` → `validation` (campo `menus`).
- grava `role` e, se barbeiro, `menus` (sem repetição, ordem de `BARBER_MENUS`); se admin, apaga `menus`. Mantém `professional`.

- [ ] **Step 1: Testes que falham** — um por regra acima, mais: barbeiro → admin mantém `professional`; admin(2) → barbeiro com `menus:["agenda"]` grava; depois `findSessionUser` de uma sessão do alvo traz `role: "barbeiro"` e `menus: ["agenda"]` (Review Focus 3).
- [ ] **Step 2:** falha. **Step 3:** implementar. **Step 4:** passa.
- [ ] **Step 5: Commit** — `feat: definir papel e menus da equipe`

### Task 5: Reservas com escopo (marcar, remarcar, cancelar, presença)

**Files:**
- Modify: `app/_lib/domain/bookings.ts` (`bookByAdmin`, `rescheduleByAdmin`), `app/_lib/reservations.ts` (`markCancelled`)
- Test: `tests/bookings.test.ts`

**Interfaces:**
- Consumes: `Scope`.
- Produces: ganham um último parâmetro `scope: Scope = { all: true }`:
  - `bookByAdmin(input, scope)` — barbeiro: serviço com profissional fixo diferente do dele → `validation` (campo `serviceId`) "Esse serviço é de outro profissional."; serviço sem fixo → a reserva fica com ele (horário livre para ele, senão `slot_unavailable`).
  - `rescheduleByAdmin(id, date, time, scope)` e `markCancelled(id, by, opts, scope)` — reserva de outro profissional → `not_found`.
  - Presença: **não muda o domínio** — `setAttendanceFor(actor, id, value)` já filtra por profissional quando `actor.role === "barbeiro"`. A ação `setAttendance` (Tarefa 6) passa `{ role: user.role, professional: user.professional }` em vez de `{ role: "admin" }`.

- [ ] **Step 1: Testes que falham** — escopo Heitor: marcar `corte-jimmy` → `validation`; marcar serviço sem fixo → `professional === "Heitor"`; remarcar e cancelar reserva do Jimmy → `not_found` (Review Focus 2); com `{ all: true }` tudo como hoje (os testes atuais continuam passando).
- [ ] **Step 2:** falha. **Step 3:** implementar. **Step 4:** `pnpm test` inteiro passa.
- [ ] **Step 5: Commit** — `feat: reservas do admin respeitam o escopo do barbeiro`

### Task 6: Telas e ações usando a regra

**Files:**
- Modify: `app/admin/page.tsx`, `app/admin/agenda/page.tsx`, `app/admin/agenda/nova/page.tsx`, `app/admin/clientes/page.tsx`, `app/admin/clientes/[id]/page.tsx`, `app/admin/clientes/novo/page.tsx`, `app/admin/historico/page.tsx`, `app/admin/layout.tsx`, `app/_components/panel-frame.tsx`, `app/_components/sidebar.tsx`, `app/_components/nav.ts`, `app/_lib/reservation-actions.ts`, `app/_lib/customer-actions.ts`
- Test: `tests/access.test.ts` (função pura de checagem de cliente)

**Interfaces:**
- Consumes: `requireMenu`, `assertMenu`, `staffLinks`, `getAgenda/getCustomers/getCustomer/getCustomerPicklist` com escopo, funções de reserva com escopo.
- Produces:
  - `nav.ts`: `export const staffNav: Record<BarberMenu, NavLink>` (Início `/admin`, Agenda `/admin/agenda`, Clientes `/admin/clientes`, Histórico `/admin/historico`).
  - `access.ts`: `export function assertCustomerInScope(customer: { id: string } | null): asserts customer` → `not_found` quando `null`.

Mapa de guardas:
| Lugar | Guarda | Escopo usado |
|---|---|---|
| `/admin` | `requireMenu("inicio")` | agenda filtrada; barbeiro não busca chat, falhas, nem fechamentos de outros profissionais |
| `/admin/agenda`, `/admin/agenda/nova` | `requireMenu("agenda")` | agenda filtrada; barbeiro: sem filtro de profissional, lista de clientes = `getCustomerPicklist()` |
| `/admin/clientes`, `/admin/clientes/novo`, `/admin/clientes/[id]` | `requireMenu("clientes")` | `getCustomers(scope)`; `[id]` fora do escopo → `notFound()`; barbeiro: sem cartão de acesso (senha/desativar/excluir) e sem exportar |
| `/admin/historico` | `requireMenu("historico")` | agenda filtrada; barbeiro: sem filtro de profissional e sem exportar |
| `createReservationByAdmin`, `rescheduleReservation`, `cancelReservationByAdmin`, `setAttendance` | `assertMenu("agenda")` | passa `scope` ao domínio |
| `updateCustomer`, `createCustomer` | `assertMenu("clientes")` | `updateCustomer`: `assertCustomerInScope(await getCustomer(id, scope))`; `createCustomer` grava `createdBy = user.id` |
| `setCustomerPassword`, `setCustomerActive`, `deleteCustomer`, exportações, chat, marketing, serviços, configurações | continuam **só admin** | — |

- Layout: `PanelFrame` decide a área pelo usuário (`admin` → menu de admin; `barbeiro` → `navByArea.barbeiro` + `staffNav` dos `staffLinks(user)`), em vez do `area="admin"` fixo de `app/admin/layout.tsx`.

- [ ] **Step 1: Teste que falha** — `assertCustomerInScope(null)` lança `not_found`.
- [ ] **Step 2:** Trocar guardas e escopos conforme o mapa; esconder os itens só-admin para barbeiro.
- [ ] **Step 3:** `pnpm test`, `npx tsc --noEmit`, `pnpm lint` limpos; `pnpm test:api` (coleção) continua passando.
- [ ] **Step 4: Navegador** (servidor de teste 3100; dar a `jimmy@shm.test` os menus `agenda` e `clientes` direto no banco de teste): Jimmy vê Minha agenda, Meus dados, Agenda, Clientes; Agenda só com horários do Jimmy; marcar para `cliente` (que nunca marcou com ele) funciona e ele passa a aparecer em Clientes; abrir `/admin/clientes/<id do cliente2 só com Heitor>` → 404; `/admin/historico` e `/admin/chat` → volta para `/barbeiro`.
- [ ] **Step 5: Commit** — `feat: telas do admin abertas ao barbeiro com permissão, filtradas`

### Task 7: Cartão Equipe em Configurações

**Files:**
- Create: `app/admin/configuracoes/team-card.tsx`
- Modify: `app/admin/configuracoes/page.tsx`, `app/_lib/settings-actions.ts` (nova ação)

**Interfaces:**
- Consumes: `getTeam`, `setTeamMember`, `BARBER_MENUS`.
- Produces: `export async function saveTeamMember(_prev: { error: string | null; saved?: boolean }, formData: FormData)` — campos `id`, `papel` (`admin|barbeiro`), `menus` (checkboxes repetidas `menus=agenda`...). Só admin.

Tela: uma linha por pessoa (nome, e-mail, profissional ou "sem profissional"); seletor Admin/Barbeiro; quando Barbeiro, caixinhas Início, Agenda, Clientes, Histórico; botão Salvar por linha com toast "Acesso salvo." ou o erro do domínio. A própria linha do admin logado aparece sem controles ("Você").

- [ ] **Step 1:** Implementar ação e cartão.
- [ ] **Step 2:** tsc/lint limpos.
- [ ] **Step 3: Navegador (3100, admin@shm.test):** dar Agenda ao Heitor, salvar, entrar como Heitor e ver o menu; tentar rebaixar a si mesmo (sem controles) e ver o erro ao rebaixar o último admin (criar a situação no banco de teste).
- [ ] **Step 4: Commit** — `feat: cartão Equipe em Configurações`

### Task 8: Documentação, produção

- [ ] **Step 1:** Atualizar `app/doc/PENDENCIAS.md` ("Onde paramos": permissões feitas) e `app/doc/MAPEAMENTO_SISTEMAS.md` se citar papéis.
- [ ] **Step 2:** Com o dono: migração `0005` no banco de produção, depois `git push origin main`, conferir o deploy.
- [ ] **Step 3: Commit** — `docs: permissões da equipe`

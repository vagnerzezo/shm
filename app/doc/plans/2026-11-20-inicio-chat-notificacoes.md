# Início novo, chat do barbeiro e notificações — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Início do admin centrado na agenda do dia; barbeiro conversa com os próprios clientes; sino de notificações por pessoa.

**Architecture:** Três partes, cada uma publicável sozinha. Parte 1 reaproveita `AgendaHeader`/`TimeGrid`/`DayPanel` no Início. Parte 2 abre `/admin/chat` ao barbeiro via a regra central (novo menu `chat`) e grava o autor da mensagem. Parte 3 cria a tabela `notifications` (gravada no domínio, na mesma transação) e `users.notifications_seen_at`; a leitura calcula quem recebe e junta itens calculados (mensagens de cliente, "Confirme quem veio"); o sino fica no `PanelHeader`, alimentado por um contexto preenchido no `PanelFrame`, com `AutoRefresh` a cada 30 s.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Drizzle/Postgres (Neon), `node:test` via `tsx`, Tailwind 4, lucide-react.

**Spec:** `app/doc/specs/2026-11-20-inicio-chat-notificacoes-design.md`

## Global Constraints

- Nunca avisar quem fez a ação (`actorId === user.id` não aparece).
- Barbeiro só vê avisos/mensagens/clientes do profissional dele (regra da ficha: reserva qualquer com ele ou `createdBy` dele).
- Abrir o sino marca tudo como visto (`notifications_seen_at = now`); lista com até 30 itens; mais de 30 dias some.
- Mensagem de cliente "não vista" = `from === "cliente"` e `createdAt > notifications_seen_at` (não usa `readAt`).
- Mensagem da equipe mostra o nome de quem escreveu ao cliente; sem autor → "Estúdio".
- Migração nova vai ao banco de produção **antes** do push da parte que a usa.
- Mensagens em português, no tom das existentes.

## Review Focus

1. **Barbeiro abrindo `/admin/chat?cliente=<id>` de cliente de outro profissional** → não abre a conversa nem consegue enviar. Teste na Tarefa 3 (`getConversations(scope)`/escopo do envio).
2. **Aviso de reserva feita pelo próprio barbeiro na agenda dele** → não aparece para ele (aparece para o admin). Teste na Tarefa 6.
3. **Conta nova sem `notifications_seen_at`** → vê só os últimos 30 dias, não "tudo desde sempre" como não visto de forma infinita. Teste na Tarefa 6.
4. **Remarcar/cancelar de reserva sem profissional fixo** → o aviso vai para quem atende aquela reserva (`professionalOf`). Teste na Tarefa 5.
5. **Falha de e-mail do sistema quando o Resend está desligado** → não gera aviso (não é falha). Teste na Tarefa 5.

---

## Parte 1 — Início do admin

### Task 1: Agenda de hoje no visual da Agenda

**Files:**
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `AgendaHeader({ view: "dia", date, today })`, `TimeGrid({ days: [date], today, reservations, rules, professionals })`, `DayPanel({ date, today, reservations, selected: null, now, times, professionals, admin })` (de `app/admin/agenda/*`), `getAvailabilityRules`, `scheduleTimes`.

- [ ] **Step 1:** No Início: remover o cartão **Mensagens** e o número **Mensagens não lidas** (e a busca de `getConversations`); manter Hoje, Faturado e Falhas de envio.
- [ ] **Step 2:** Trocar o cartão "Agenda de hoje" por um bloco na largura toda com `AgendaHeader` (dia de hoje) + `TimeGrid` + `DayPanel`, igual à visão Dia de `app/admin/agenda/page.tsx` (mesmo contêiner `rounded-xl border ... bg-white/85`). Os links do cabeçalho já levam para `/admin/agenda`. "Próximos dias", "Confirme quem veio" e "Dias fechados" ficam abaixo, numa grade de duas colunas.
- [ ] **Step 3:** `npx tsc --noEmit`, `pnpm lint` limpos; `curl` (servidor 3100, sessão admin) mostra a grade (`NowLine`/horários) e não mostra "Mensagens".
- [ ] **Step 4: Commit** — `feat: Início com a agenda do dia no visual da Agenda`

## Parte 2 — Chat do barbeiro

### Task 2: Autor da mensagem

**Files:**
- Modify: `app/_lib/db-schema.ts` (`messages.authorId: text()`), `app/_lib/db.ts` (`ChatMessage.authorId?: string`), `app/_lib/chat.ts` (`addMessage`), `app/_lib/api/serialize.ts` (`messageJson`), `app/_components/chat-panel.tsx`, `app/doc/api/openapi.yaml`
- Create: `drizzle/0006_*.sql` (gerada)
- Test: `tests/chat.test.ts` (novo)

**Interfaces:**
- Produces:
  - `addMessage(customerId, from, text, authorId?: string)` grava `authorId` quando `from !== "cliente"`.
  - `authorNameOf(m: ChatMessage, users: Pick<User, "id" | "name">[]): string | null` em `chat.ts` — primeiro nome do autor, ou `null` (tela mostra "Estúdio").
  - `messageJson(m, authorName?: string | null)` inclui `authorName` quando houver.

- [ ] **Step 1: Testes que falham** — `addMessage(cliente, "admin", "oi", USERS.heitor.id)` grava `authorId`; `authorNameOf` devolve `"Heitor"` para "Heitor Teste" e `null` sem autor; mensagem de cliente ignora `authorId`.
- [ ] **Step 2:** falha. **Step 3:** implementar; `node node_modules/drizzle-kit/bin.cjs generate --name message_author`; `pnpm test:migrate`. Na tela do cliente (`ChatPanel` com `me = "cliente"`), mensagens do estúdio mostram o nome do autor acima do balão (ou "Estúdio").
- [ ] **Step 4:** testes, `tsc`, `lint` limpos. **Step 5: Commit** — `feat: mensagens do estúdio guardam quem escreveu`

### Task 3: Chat aberto ao barbeiro, filtrado

**Files:**
- Modify: `app/_lib/roles.ts` (`BARBER_MENUS` ganha `"chat"`), `app/_lib/access.ts` (`canOpen` libera `chat` ao barbeiro), `app/_lib/chat.ts` (`getConversations(scope?)`), `app/_lib/actions.ts` (`sendMessage`, `markConversationReadAction`), `app/admin/chat/page.tsx`, `app/admin/chat/customer-list.tsx`, `app/_components/nav.ts`, `app/admin/agenda/day-panel.tsx`, `app/admin/historico/page.tsx`, `app/admin/clientes/[id]/page.tsx`
- Test: `tests/chat.test.ts`

**Interfaces:**
- Consumes: `Scope`, `getCustomer(id, scope)` (ficha).
- Produces:
  - `getConversations(scope?: Scope)` — barbeiro: só clientes da ficha dele.
  - `sendMessage(customerId, formData)`: admin ou barbeiro com `getCustomer(customerId, scope)` não nulo; grava `authorId = user.id`, `from = "admin"`.
  - Menu do barbeiro: Minha agenda, Clientes, Histórico, **Chat** (`/admin/chat`), Meus dados.

- [ ] **Step 1: Testes que falham** — `canOpen(barbeiro, "chat")` true; `getConversations(heitor)` traz cliente com reserva com Heitor e não traz cliente só do Jimmy (Review Focus 1).
- [ ] **Step 2:** falha. **Step 3:** implementar. A página `/admin/chat` usa `requireMenu("chat")`; cliente selecionado fora do escopo → tratado como nenhum selecionado; aba "Todos os clientes" usa `getCustomers(scope, "ficha")`. O badge de não lidas do menu (`PanelFrame`) passa a valer também para o barbeiro, com o escopo dele. Os links "Conversar" escondidos para barbeiro voltam a aparecer (`canOpen(user, "chat")`).
- [ ] **Step 4:** `pnpm test`, `tsc`, `lint`; servidor 3100: Jimmy vê só conversas dos clientes dele, responde e o cliente vê "Jimmy" na mensagem.
- [ ] **Step 5: Commit** — `feat: chat do barbeiro com os clientes dele`

## Parte 3 — Sino de notificações

### Task 4: Tabela e regra de quem recebe

**Files:**
- Modify: `app/_lib/db-schema.ts` (tabela `notifications`; `users.notificationsSeenAt: ts()`), `app/_lib/db.ts` (tipo `Notification`, `Db.notifications`, `User.notificationsSeenAt?`)
- Create: `app/_lib/notifications.ts`, `drizzle/0007_*.sql`
- Test: `tests/notifications.test.ts` (novo)

**Interfaces:**
- Produces:
  - `type NotificationKind = "reserva_marcada" | "reserva_remarcada" | "reserva_cancelada" | "dia_fechado" | "cliente_novo" | "falha_marketing" | "falha_email"`.
  - `type Notification = { id: string; kind: NotificationKind; at: string; actorId?: string; professional?: string; customerId?: string; reservationId?: string; date?: string; text: string }`.
  - `pushNotification(db: Db, n: Omit<Notification, "id" | "at">): void` — dentro de uma `updateDb`.
  - Colunas `customer_id`/`actor_id`/`reservation_id` **sem chave estrangeira** (o aviso sobrevive à exclusão do cliente); `purgeUser` não apaga notificações.
  - `isForUser(n: Notification, user: Customer): boolean` — nunca se `actorId === user.id`; admin: todos; barbeiro: `reserva_*`/`dia_fechado` com `professional` dele (`dia_fechado` também sem profissional), e nenhum dos só-admin (`cliente_novo`, `falha_*`).

- [ ] **Step 1: Testes que falham** — `isForUser` para cada linha da tabela do spec (admin, barbeiro dono, barbeiro outro, quem fez).
- [ ] **Step 2:** falha. **Step 3:** implementar; gerar migração `notifications`; `pnpm test:migrate`.
- [ ] **Step 4:** passa. **Step 5: Commit** — `feat: notificações gravadas e regra de quem recebe`

### Task 5: Gravar os acontecimentos

**Files:**
- Modify: `app/_lib/domain/bookings.ts` (`bookForCustomer`, `rescheduleForCustomer`, `cancelForCustomer`, `bookByAdmin`, `rescheduleByAdmin`), `app/_lib/reservations.ts` (`markCancelled`), `app/_lib/settings-actions.ts` (`addClosure`), `app/_lib/domain/account.ts` (`registerCustomer`; `deleteOwnAccount` grava um `reserva_cancelada` por reserva futura **antes** do `purgeUser`, que apaga as reservas, com `customerId` vazio e o nome do cliente no texto), `app/_lib/marketing.ts` (falha de envio), `app/_lib/email-templates/send.ts` (`deliver`)
- Test: `tests/notifications.test.ts`

**Interfaces:**
- Consumes: `pushNotification`.
- Produces: as funções de reserva ganham `actorId` onde ainda não têm quem age (`bookByAdmin`/`rescheduleByAdmin`/`markCancelled` recebem `actorId?: string`; as do cliente usam o `userId`). Texto: `"<cliente> marcou <serviço> · <dia> <hora>"`, `"... remarcou ... para ..."`, `"... cancelou ..."`, `"Agenda fechada: <motivo> · <período>"`, `"Novo cliente: <nome>"`, `"Falha no envio de marketing para <nome>"`, `"E-mail não enviado (<tipo>) para <nome>"`.

- [ ] **Step 1: Testes que falham** — cada acontecimento grava uma linha com `kind`, `professional` (via `professionalOf`, Review Focus 4), `customerId`, `actorId`; falha de e-mail com Resend desligado não grava (Review Focus 5); erro de validação não grava nada.
- [ ] **Step 2:** falha. **Step 3:** implementar na mesma transação de cada função. **Step 4:** `pnpm test` inteiro passa.
- [ ] **Step 5: Commit** — `feat: acontecimentos viram notificações`

### Task 6: Leitura do sino

**Files:**
- Modify: `app/_lib/notifications.ts`
- Test: `tests/notifications.test.ts`

**Interfaces:**
- Produces:
  - `type BellItem = { id: string; text: string; at: string; href: string; unseen: boolean }`.
  - `getBell(user: Customer): Promise<{ unseen: number; items: BellItem[] }>` — junta: `notifications` com `isForUser` e `at` nos últimos 30 dias; mensagens de cliente (escopo do chat) com `createdAt` nos últimos 30 dias; um item "Confirme quem veio: N horários" quando houver (escopo da agenda, semana até agora). Ordena por `at` decrescente, corta em 30. `unseen` = itens com `at > (notificationsSeenAt ?? início dos 30 dias)`.
  - `markBellSeen(userId: string): Promise<void>` — grava `notificationsSeenAt = now`.
  - `href`: reserva → `agendaHref("dia", date, reservationId)`; mensagem → `/admin/chat?cliente=<id>`; dia fechado → `/admin/agenda?visao=dia&data=<início>`; cliente novo / falha de e-mail → `/admin/clientes/<id>`; falha de marketing → `/admin/marketing/historico?status=falha`; confirme → `/admin/agenda`.

- [ ] **Step 1: Testes que falham** — barbeiro não vê aviso de reserva que ele mesmo fez (Review Focus 2); conta sem `notificationsSeenAt` só conta os últimos 30 dias (Review Focus 3); depois de `markBellSeen`, `unseen` = 0 e um aviso novo volta a contar 1; mensagem de cliente de outro profissional não entra para o barbeiro.
- [ ] **Step 2:** falha. **Step 3:** implementar. **Step 4:** passa. **Step 5: Commit** — `feat: leitura do sino por pessoa`

### Task 7: Sino na tela

**Files:**
- Create: `app/_components/notification-bell.tsx`
- Modify: `app/_components/panel-frame.tsx` (busca `getBell`, provê contexto, `AutoRefresh`), `app/_components/panel-header.tsx` (sino ao lado do usuário), `app/_lib/actions.ts` (`markBellSeenAction()`), `app/admin/page.tsx` (sai "Falhas de envio" do topo — já está no sino)

**Interfaces:**
- Consumes: `getBell`, `markBellSeen`.
- Produces: `BellProvider`/`useBell()` (contexto cliente com `{ unseen, items }`), `NotificationBell` (botão `aria-label="Notificações"`, número vermelho quando `unseen > 0`, painel com título "Notificações", itens com ponto nos não vistos, vazio "Nada novo por aqui."). Abrir chama `markBellSeenAction()` e zera o número na hora.

- [ ] **Step 1:** Implementar; `AutoRefresh` (30 s) entra no `PanelFrame` só para admin/barbeiro.
- [ ] **Step 2:** `tsc`, `lint`, `pnpm test`.
- [ ] **Step 3: Navegador (3100):** como admin, cliente marca pelo site → número 1 no sino em até 30 s; abrir → lista com o aviso e número some; clicar leva à reserva. Como Jimmy: aviso de reserva do Heitor não aparece; mensagem de cliente dele aparece e leva ao chat.
- [ ] **Step 4: Commit** — `feat: sino de notificações no painel`

### Task 8: Docs e produção (por parte)

- [ ] **Step 1:** `PENDENCIAS.md` ("Onde paramos") e `MAPEAMENTO_SISTEMAS.md`.
- [ ] **Step 2:** Com o dono, ao fim de cada parte: migrações da parte no banco de produção (Parte 2: `0006`; Parte 3: `0007`), merge na `main`, push, conferir o deploy.
- [ ] **Step 3: Commit** — `docs: início, chat do barbeiro e notificações`

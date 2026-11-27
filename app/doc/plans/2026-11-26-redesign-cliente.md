# Redesign da área do cliente — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a moldura e as telas do cliente logado pelo desenho novo (celular com tab bar, computador com sidebar de 248 px), sem mudar regras de agendamento.

**Architecture:** Uma moldura nova `ClientFrame` só para a área do cliente; admin e barbeiro seguem em `PanelFrame`. As telas reaproveitam a lógica atual (`getSlots`, `getSuggestedDays`, `parseItems`, ações) e trocam só a apresentação. Peças comuns do cliente ficam em `app/_components/client/`.

**Tech Stack:** Next.js (App Router, versão do projeto: ler `node_modules/next/dist/docs/` antes de usar API nova), React 19, Tailwind 4, `next/font/google`, testes com `node:test` via `pnpm test`.

**Spec:** `app/doc/specs/2026-11-26-redesign-cliente-design.md`

## Global Constraints

- Branch `feat/redesign-cliente` a partir de `main`. Não commitar `app/not-found.tsx` nem `scripts/criar-contas-teste.ts` (alterações do dono que não são deste trabalho).
- Cores: fundo `#f5f5f4`, texto `#121212`, secundário `#5c5c5a`, borda `#e7e5e4`, divisória `#f0efee`, contador `#dc2626`, cancelar `#b91c1c`.
- Títulos: Barlow Condensed 800, caixa alta, 38 px celular / 52 px computador (`lg`).
- Campos com 16 px em telas de toque (iPhone não dá zoom); alvos ≥ 44 px.
- Breakpoint celular × computador: `lg` (1024 px), o mesmo de hoje.
- Celular **sem** Observação na confirmação; computador com ela.
- Admin e barbeiro não mudam em nada visível. Barbeiro em `/conta` continua com `PanelFrame`.
- Textos em português, sem emoji; ícones de `app/_components/icons.tsx` (criar ícone novo lá se faltar).

## Review Focus

1. Barbeiro abrindo `/conta`: deve continuar com o menu dele em `PanelFrame`, não com a tab bar do cliente.
2. Nome do cliente longo ou serviço com nome longo (ex.: "Corte e barba promocional com Heitor"): nada transborda na tab bar, no cartão preto nem na faixa de dias; texto quebra ou corta com reticências.
3. Nenhum horário livre nos próximos dias: faixa de dias vazia mostra só "Outra data" e um texto dizendo para escolher no calendário; "Continuar" fica desabilitado.
4. Visitante sem conta na confirmação (vindo do fluxo deslogado): "Entrar para confirmar" continua levando ao login com os itens guardados.
5. iPhone com notch: tab bar e barras de ação respeitam `env(safe-area-inset-bottom)`, e o campo de mensagem não fica escondido atrás da tab bar nem do teclado.

Cada item tem verificação no passo de navegador da tarefa dona (Tasks 1, 2, 4, 5, 7).

---

### Task 1: Moldura do cliente

**Files:**
- Create: `app/_components/client/client-frame.tsx` (server), `app/_components/client/tab-bar.tsx` (client), `app/_components/client/client-sidebar.tsx` (client), `app/_components/client/client-top-bar.tsx`, `app/_components/client/ui.tsx`
- Modify: `app/(painel)/layout.tsx`, `app/page.tsx` (cliente logado usa `ClientFrame`), `app/_components/nav.ts` (ícone "Início" do cliente vira `HomeIcon`), `app/_components/toaster.tsx` (toasts acima da tab bar no celular)

**Interfaces:**
- Produces:
  - `ClientFrame({ children }: { children: ReactNode })` — lê usuário, estúdio e `getCustomerUnreadCount`; renderiza sidebar (lg+), barra de cima e tab bar (celular). Expõe a classe `font-display` via variável `--font-display` (Barlow Condensed 800) no elemento raiz.
  - `ClientTabBar({ unread }: { unread: number })` e `ClientSidebar({ unread, name }: { unread: number; name: string })`, ambos usando `navByArea.cliente` e `isActiveLink`.
  - Em `client/ui.tsx`: constantes `clientCard = "rounded-[18px] border border-[#e7e5e4] bg-white"`, `clientPrimary` (botão preto 52 px, raio 14 px), `clientSecondary` (contornado), e `ClientTitle({ title, kicker? }: { title: string; kicker?: string })` com o título em Barlow.
  - `ClientTabBar` usa `usePathname()` e se esconde onde `hidesTabs(pathname)` é verdadeiro (`/agendamento/horario`, `/agendamento/confirmacao`, `/reservas/*/remarcar`), porque essas telas têm barra de ação própria. `hidesTabs(pathname: string): boolean` fica em `app/_components/client/tabs.ts`.

- [ ] **Step 1: Teste de `hidesTabs`** em `tests/client-nav.test.ts`:
  ```ts
  assert.equal(hidesTabs("/agendamento"), false);
  assert.equal(hidesTabs("/agendamento/horario"), true);
  assert.equal(hidesTabs("/agendamento/confirmacao"), true);
  assert.equal(hidesTabs("/reservas/abc/remarcar"), true);
  assert.equal(hidesTabs("/reservas"), false);
  assert.equal(hidesTabs("/"), false);
  ```
  Coloque `hidesTabs` num arquivo puro `app/_components/client/tabs.ts` (sem `"use client"`) para o teste importar.
- [ ] **Step 2:** `pnpm test` → falha (módulo não existe).
- [ ] **Step 3:** Implementar `tabs.ts`, a moldura e os componentes acima, seguindo `CTabBar` e `CSidebar` do canvas. Raiz: `min-h-dvh bg-[#f5f5f4]`; celular com `padding-bottom` de 84 px + `env(safe-area-inset-bottom)` quando há tab bar; computador `lg:flex lg:h-screen`, conteúdo `lg:overflow-y-auto lg:px-12 lg:py-10`, `max-w-[1192px]`. Manter `InstallBanner`, `Toaster`, `FlashToast`. `(painel)/layout.tsx`: `user?.role === "barbeiro"` → `PanelFrame area="barbeiro"`, senão `ClientFrame`.
- [ ] **Step 4:** `pnpm test` e `pnpm exec tsc --noEmit` passam.
- [ ] **Step 5: Navegador** (memória "Como testar no navegador"; guardar o banco antes): como cliente, 390 px e 1440 px, as quatro abas navegam e a ativa aparece; contador de mensagens aparece; Sair da sidebar desloga. Como barbeiro, `/conta` com o menu antigo (Review Focus 1). Tab bar com `env(safe-area-inset-bottom)` no DevTools de iPhone (Review Focus 5).
- [ ] **Step 6: Commit** `feat: moldura nova da área do cliente`

### Task 2: Início

**Files:** Modify `app/_components/client-home.tsx`.

**Interfaces:** Consumes `ClientTitle`, `clientCard` (Task 1).

- [ ] **Step 1:** Reescrever conforme `Main.dc.html` (celular) e `DInicio.dc.html` (computador). Dados já existem (`upcoming`, `unread`, `lastMessage`). Computador: grade `lg:grid-cols-[1.5fr_1fr]` e, abaixo, "Suas próximas reservas" com até 5 linhas (`upcoming.slice(0, 5)`), cada uma `formatWeekday` curto + dia/mês, horário–fim, serviço, preço. Sem próximo horário: o cartão preto mostra "Você não tem horário marcado." e botão branco "Agendar". Rótulos com plural certo ("1 reserva marcada", "1 mensagem nova").
- [ ] **Step 2:** `tsc` passa; navegador em 390 e 1440 px com e sem reserva; nome e serviço longos não transbordam (Review Focus 2).
- [ ] **Step 3: Commit** `feat: início do cliente no layout novo`

### Task 3: Agendar · Serviço

**Files:**
- Create: `app/_components/client/booking-header.tsx` (`BookingHeader({ step, back }: { step: 0 | 1 | 2; back?: string })`: celular com "Passo N de 3 · Nome", progresso de 3 segmentos e X (passo 0, volta a `/`) ou seta voltar (`back`); computador com o stepper numerado de `DServico.dc.html`).
- Modify: `app/_lib/services.ts` (helper), `app/(painel)/agendamento/page.tsx`, `app/(painel)/agendamento/service-list.tsx`
- Test: `tests/catalog.test.ts`

**Interfaces:**
- Produces: `professionalColorOf(service: Service, professionals: Professional[]): ProfessionalColor | null` em `services.ts`; `PROFESSIONAL_DOT: Record<ProfessionalColor, string>` exportado de `app/_lib/services.ts` (o mapa `swatch` que hoje está em `professionals-card.tsx` muda para lá, e os dois lugares passam a usá-lo).
- `ServiceList` recebe `professionals: Professional[]` (página lê de `getCatalog()`).

- [ ] **Step 1: Teste** em `tests/catalog.test.ts`:
  ```ts
  const pros = [{ name: "Heitor", color: "blue" }, { name: "Jimmy", color: "violet" }];
  assert.equal(professionalColorOf({ ...svc, professional: "Jimmy" }, pros), "violet");
  assert.equal(professionalColorOf({ ...svc, professional: undefined }, pros), null);
  assert.equal(professionalColorOf({ ...svc, professional: "Saiu" }, pros), null);
  ```
- [ ] **Step 2:** `pnpm test` falha; implementar; passa.
- [ ] **Step 3:** Página e lista conforme `MServico`/`DServico`: celular lista única, linha inteira é `Link` (`withItems(...)` como hoje), `min-h-16`; computador grade de 3 cards. Busca com 16 px no celular (`text-base lg:text-sm`). Chips no celular, segmentado no computador, mesmas categorias de `categoriesOf`. Sem profissional: "Qualquer profissional" e ponto `bg-[#78716c]`. Vazio: "Nenhum serviço encontrado."
- [ ] **Step 4:** `tsc`; navegador nos dois tamanhos; filtro e busca funcionam; "Adicionar outro serviço" da confirmação mantém os itens.
- [ ] **Step 5: Commit** `feat: escolha de serviço no layout novo`

### Task 4: Agendar · Horário (e Remarcar)

**Files:** Modify `app/(painel)/agendamento/horario/page.tsx`, `time-picker.tsx`, `calendar.tsx`, `app/(painel)/reservas/[id]/remarcar/page.tsx`.

**Interfaces:**
- Consumes: `BookingHeader` (Task 3), `getSlots`, `getSuggestedDays`, `slotHref` (já existe no `time-picker`).
- `TimePicker` mantém as props de hoje.

- [ ] **Step 1:** Estado `date` começa em `suggested[0]?.date ?? ""`, `time` em `""`; trocar de dia limpa `time`. Botões de horário viram `<button aria-pressed>`; "Continuar" é `Link` para `slotHref(carry, service.id, date, time, reschedule)` e fica desabilitado (renderizar `<button disabled>`) sem `time`.
- [ ] **Step 2: Celular** (`MHorario`): cartão do serviço com "Trocar" (`withItems("/agendamento", carry)`; no remarcar mostra "Horário atual: …" e não tem "Trocar"); "Quando?"; faixa rolável horizontal dos `suggested` (dia curto, número, "N livres") + botão "Outra data" que abre o `<dialog>` atual com o `Calendar` (escolher dia fecha a janela e seleciona o dia; se não for um dos sugeridos, ele aparece primeiro na faixa); título "Sexta-feira, 27 de novembro · N livres"; grade 4 colunas; barra fixa embaixo com "Escolhido / Sex, 27 nov · 13:00" e "Continuar", com `pb-[calc(16px+env(safe-area-inset-bottom))]`. Sem sugeridos: texto "Nenhum horário livre nos próximos dias. Toque em Outra data." (Review Focus 3).
- [ ] **Step 3: Computador** (`DHorario`): título "Escolha o horário" com o cartão do serviço à direita; `Calendar` restilizado (sem borda nos dias, livres com `bg-[#f5f5f4] font-bold`, escolhido preto, fechados riscados) à esquerda em 380 px; à direita o dia, "N horários livres", grade 4 colunas e rodapé "Escolhido … – fim" + "Continuar". Remover o modo "Datas sugeridas"/`picking`.
- [ ] **Step 4:** Remarcar tem cabeçalho próprio "Remarcar horário" com seta para `/reservas` (sem passos); a tela de confirmação da troca (`confirm-reschedule.tsx`) só ganha `clientCard`/`clientPrimary`.
- [ ] **Step 5:** `tsc`; navegador: escolher dia sugerido, outra data, horário, Continuar leva à confirmação com o item certo; remarcar até o fim troca o horário; sem horário escolhido Continuar não age.
- [ ] **Step 6: Commit** `feat: escolha de horário no layout novo`

### Task 5: Agendar · Confirmação

**Files:** Modify `app/(painel)/agendamento/confirmacao/page.tsx`, `summary-form.tsx`.

- [ ] **Step 1:** Conforme `MConfirmar`/`DConfirmar`. O `<form>` envolve itens e resumo para a barra fixa do celular e o resumo do computador serem o mesmo botão de envio (um só `<button type="submit">`; no celular o resumo vira a barra fixa por CSS). Celular sem Observação (`hidden lg:block` no `label`, como hoje). Resumo do computador lista cada item (nome, preço) e o total. Remover item continua por link. Aviso de horários removidos (`dropped`) continua, no estilo novo. Visitante: "Entrar para confirmar" + texto atual (Review Focus 4).
- [ ] **Step 2:** `tsc`; navegador: confirmar uma reserva de teste como cliente (apagar depois), dois itens, remover um, visitante deslogado vê "Entrar para confirmar".
- [ ] **Step 3: Commit** `feat: confirmação no layout novo`

### Task 6: Minhas reservas

**Files:** Modify `app/(painel)/reservas/page.tsx`, `cancel-button.tsx`. Create `app/(painel)/reservas/created-notice.tsx` (client: aviso preto com X que fecha e tira `?nova` da URL com `router.replace("/reservas")`).

- [ ] **Step 1:** Abas por busca: `?ver=anteriores` mostra as anteriores; padrão próximas. Abas como `Link` com `aria-current`. "Próximas (N)". Cartões conforme `MReservas`/`DReservas`; botões "Remarcar" (contornado, 38/40 px) e "Cancelar" (`text-[#b91c1c]`) só nas próximas; janela de cancelar mantém o texto e ganha botões no estilo novo. Vazio das próximas: texto + "Agendar agora"; vazio das anteriores: "Nenhuma reserva anterior." Observação do cliente (`note`) e "Você não compareceu" continuam.
- [ ] **Step 2:** `tsc`; navegador: aviso aparece após confirmar e fecha; abas; cancelar uma reserva de teste.
- [ ] **Step 3: Commit** `feat: minhas reservas no layout novo`

### Task 7: Mensagens e Meus dados

**Files:** Modify `app/(painel)/mensagens/page.tsx`, `app/_components/chat-panel.tsx`, `app/(painel)/conta/page.tsx`.

**Interfaces:** `ChatPanel` ganha `variant?: "panel" | "client"` (padrão `"panel"`, o admin não muda). `"client"`: sem borda/raio no celular, cabeçalho branco de 64 px, fundo `#f5f5f4` (computador `#fafaf9`), campo arredondado 44 px com 16 px de fonte, botão redondo preto; no computador botão "Enviar" com texto.

- [ ] **Step 1:** Mensagens: no celular a página ocupa a altura entre a barra de cima e a tab bar (`h-[calc(100dvh-56px-84px-env(safe-area-inset-bottom))]`), sem título de página; computador com título e grade `lg:grid-cols-[1fr_300px]`, à direita "Seus próximos horários" (até 3 de `getReservations`, `isPast` fora) e "Ver reservas"; sem horários: "Nenhum horário marcado." + link Agendar.
- [ ] **Step 2:** Meus dados: `ClientTitle "Meus dados"` e formulários atuais em `max-w-xl`; o cliente continua com "Sair da conta" aqui (é o único Sair no celular). Barbeiro sem mudança.
- [ ] **Step 3:** `tsc`; navegador: enviar mensagem de teste (apagar depois), campo visível com o teclado no iPhone simulado (Review Focus 5); `/admin/chat` igual a antes.
- [ ] **Step 4: Commit** `feat: mensagens e meus dados no layout novo`

### Task 8: Fechamento

- [ ] **Step 1:** Procurar sobras: `grep -rn "PanelHeader" "app/(painel)" app/_components/client-home.tsx` só pode achar `/conta` do barbeiro (se usado). Apagar `Stepper` de `panel-header.tsx` se nada mais o usa.
- [ ] **Step 2:** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` passam.
- [ ] **Step 3:** Restaurar o banco de teste e conferir que não sobrou reserva/mensagem de teste.
- [ ] **Step 4:** `app/doc/PENDENCIAS.md`, seção "Onde paramos": item do dia com o que mudou e "próximo: painel no celular".
- [ ] **Step 5: Commit** `docs: redesign da área do cliente em Onde paramos`

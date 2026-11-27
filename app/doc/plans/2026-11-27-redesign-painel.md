# Redesign do painel (admin e barbeiro) — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar o painel de admin e barbeiro para o visual novo (celular com tab bar e "Mais", computador com sidebar de 248 px agrupada), tela a tela, sem mudar regras nem ações.

**Architecture:** `PanelFrame` é reescrito por dentro (mesmo nome e props, para não mexer nos layouts). As peças comuns de `app/_components/ui.tsx` ganham o visual novo, o que já muda as telas sem desenho próprio. As telas com desenho mudam uma a uma. A lógica de quais itens vão na tab bar e nos grupos da sidebar fica numa função pura testada.

**Tech Stack:** Next.js do projeto (ler `node_modules/next/dist/docs/` antes de API nova), React 19, Tailwind 4, `@base-ui/react` (Drawer, já usado), testes `node:test` via `pnpm test`.

**Spec:** `app/doc/specs/2026-11-27-redesign-painel-design.md`

## Global Constraints

- Branch `feat/redesign-cliente` (continua nele; tudo fica local até as três partes estarem prontas). Não commitar `app/not-found.tsx` nem `scripts/criar-contas-teste.ts`.
- Cores, fontes e tamanhos: os mesmos da área do cliente (`app/_components/client/ui.tsx`: `displayFont`, `displayClass`, `clientCard`…). Reaproveitar, não duplicar.
- Breakpoint celular × computador: `lg`.
- Nada de mudar ação do servidor, permissão (`canOpen`, `scopeOf`) ou consulta.
- Barbeiro sem profissional: só Meus dados, como hoje.
- Teste no navegador com as contas de teste (`.data/contas-teste.txt`), sem gravar no banco (não enviar formulários que gravam). Ver memória "Como testar no navegador".

## Review Focus

1. Barbeiro (com e sem profissional) e admin ligado a profissional ("Minha agenda"): itens certos na tab bar, no "Mais" e na sidebar.
2. Telas sem desenho (ficha do cliente, novo cliente, nova reserva, perfil, templates de marketing): nada quebrado ou ilegível depois da troca de `ui.tsx`.
3. Folha "Mais" e folha da reserva: fecham no arraste, no X e no fundo; foco volta; não ficam atrás da tab bar.
4. Tabelas do computador (Clientes, Histórico) com nomes longos e muitas linhas: rolam dentro do cartão, sem estourar a largura.
5. Sino e contadores continuam atualizando (30 s) e aparecem no celular e no computador.

---

### Task 1: Peças comuns no visual novo

**Files:** Modify `app/_components/ui.tsx`, `app/_components/filter-panel.tsx`.

- [ ] **Step 1:** `card` → `rounded-[18px] border border-[#e7e5e4] bg-white`; `fieldClass` → `h-11 rounded-xl border-[#e7e5e4] bg-white text-base lg:text-sm` (manter os estados); `primaryButton`/`secondaryButton`/`dangerButton` com raio 12 px, cores do cliente (`#b91c1c` no perigoso); `PageTitle` com `displayClass` (38/48 px) e descrição `#5c5c5a`; `Stat` no formato do desenho (rótulo 13 px, número 28 px); `EmptyState` com borda tracejada `#d6d3d1`. `FilterPanel`: botão do celular igual à busca do desenho.
- [ ] **Step 2:** `pnpm exec tsc --noEmit` e `pnpm lint`.
- [ ] **Step 3:** Navegador (admin, 390 e 1440 px): ficha do cliente, novo cliente, nova reserva, perfil, templates — legíveis, sem quebra (Review Focus 2). Telas do cliente continuam iguais (usam `client/ui.tsx`; Meus dados usa `FormError`/`account-forms`).
- [ ] **Step 4: Commit** `feat: peças comuns do painel no visual novo`

### Task 2: Moldura do painel

**Files:**
- Create: `app/_components/staff/nav.ts` (puro), `app/_components/staff/tab-bar.tsx`, `app/_components/staff/more-sheet.tsx`, `app/_components/staff/sidebar.tsx`, `app/_components/staff/top-bar.tsx`
- Modify: `app/_components/panel-frame.tsx` (reescrito por dentro), `app/_components/panel-header.tsx`, `app/_components/notification-bell.tsx` (estilo do botão: redondo sem borda no celular, quadrado 44 px com borda no computador)
- Delete: `app/_components/sidebar.tsx` quando nada mais usar
- Test: `tests/staff-nav.test.ts`

**Interfaces:**
- Produces, em `staff/nav.ts`:
  - `type StaffLink = { href: string; label: string; icon: string }` (`icon` = nome do componente em `icons.tsx`, para o arquivo ser puro).
  - `staffMenu(area: "admin" | "barbeiro", opts: { myAgenda: boolean; accountOnly: boolean }): { tabs: StaffLink[]; more: StaffLink[]; groups: { title: string | null; links: StaffLink[] }[] }`.
- Admin: `tabs` = Início, Agenda, Clientes, Chat; `more` = [Minha agenda?], Histórico, Marketing, Serviços, Configurações; `groups` = Operação [Início, Agenda, Minha agenda?, Clientes, Histórico, Chat] e Gestão [Marketing, Serviços, Configurações]. Barbeiro: `tabs` = os 5 de `navByArea.barbeiro`, `more` vazio, um grupo sem título. `accountOnly`: `tabs` = só Meus dados.

- [ ] **Step 1: Testes** em `tests/staff-nav.test.ts`: admin sem/com Minha agenda (tabs e more), barbeiro (5 tabs, more vazio), barbeiro sem profissional (só `/conta`), grupos do admin com títulos "Operação"/"Gestão".
- [ ] **Step 2:** `npx tsx --test tests/staff-nav.test.ts` → falha.
- [ ] **Step 3:** Implementar `staff/nav.ts`; testes passam.
- [ ] **Step 4:** Componentes conforme o canvas (tab bar igual à do cliente + "Mais" que abre a folha `Drawer` de baixo; sidebar agrupada com ativo preto; barra de cima com sino e Meus dados). `PanelFrame`: fundo `#f5f5f4`, sem a foto; mesmo cálculo de `bell`, `badges`, `AutoRefresh`, `InstallBanner`, `Toaster`, `FlashToast`. Raiz com `displayFont.variable`. `PanelHeader`: título à esquerda, `actions?: ReactNode` à direita, sino só no computador.
- [ ] **Step 5:** Navegador: admin, barbeiro (`heitor@shm.test`) e admin com "Sou eu" se houver; "Mais" abre/fecha (arraste, fundo, item); Sair no "Mais" e na sidebar; contadores (Review Focus 1, 3, 5).
- [ ] **Step 6: Commit** `feat: moldura nova do painel`

### Task 3: Início do admin

**Files:** Modify `app/admin/page.tsx` (e o que ele usa da agenda só se preciso para o cartão "Agenda de hoje").

- [ ] **Step 1:** Celular conforme `Main.dc.html`; computador conforme `DInicio.dc.html`. "Conversas recentes" usa as conversas já lidas pelo chat (`getConversations` ou equivalente do `/admin/chat`; ler antes). Números iguais aos de hoje (Hoje, Faturado na semana); "Próximo horário" e "Próximos 6 dias" a partir das reservas já carregadas.
- [ ] **Step 2:** `tsc`; navegador nos dois tamanhos, com e sem horários hoje.
- [ ] **Step 3: Commit** `feat: início do admin no layout novo`

### Task 4: Agenda e folha da reserva

**Files:** Modify `app/admin/agenda/page.tsx`, `agenda-header.tsx`, `time-grid.tsx`, `month-view.tsx`, `day-panel.tsx`, `reservation-actions.tsx`; `app/barbeiro/page.tsx` se usar as mesmas peças.

- [ ] **Step 1:** Ler as cinco peças e `app/barbeiro/page.tsx`.
- [ ] **Step 2:** Cabeçalho: celular conforme `Agenda.dc.html` (mês, "Hoje", Dia/Semana/Mês, faixa da semana); computador conforme `DAgenda.dc.html` (‹ Hoje ›, intervalo, Dia/Semana/Mês, "Nova reserva", legenda no título). Grade com linhas `#f0efee`, dia fechado cinza, cartões de reserva com a cor clara do profissional.
- [ ] **Step 3:** Reserva aberta no celular como folha de baixo (`Drawer`), conforme `Reserva.dc.html`, com Ligar (`tel:` do cadastro) e Ver cliente; no computador o painel lateral atual ganha o visual novo.
- [ ] **Step 4:** "Nova reserva" flutuante no celular.
- [ ] **Step 5:** `tsc`; navegador: dia/semana/mês, trocar semana, abrir reserva (folha) sem cancelar nem remarcar; barbeiro em Minha agenda.
- [ ] **Step 6: Commit** `feat: agenda do painel no layout novo`

### Task 5: Clientes

**Files:** Modify `app/admin/clientes/page.tsx`, `customer-row-menu.tsx`.

- [ ] **Step 1:** Celular conforme `Clientes.dc.html` (lista em cartão, "Novo cliente" flutuante); computador conforme `DClientes.dc.html` (tabela, chips com os filtros que a tela já tem, ordem, Exportar CSV se já existir, menu ⋯ atual). Tabela rola dentro do cartão (Review Focus 4).
- [ ] **Step 2:** `tsc`; navegador: busca, filtros, ordem, menu ⋯ (sem excluir).
- [ ] **Step 3: Commit** `feat: clientes no layout novo`

### Task 6: Histórico

**Files:** Modify `app/admin/historico/page.tsx`.

- [ ] **Step 1:** Celular conforme `Historico.dc.html`; computador conforme `DHistorico.dc.html` (5 números, barra de busca + profissional + situação, tabela). Mesmos filtros e cálculos de hoje.
- [ ] **Step 2:** `tsc`; navegador como admin e barbeiro.
- [ ] **Step 3: Commit** `feat: histórico no layout novo`

### Task 7: Chat

**Files:** Modify `app/admin/chat/page.tsx`, `customer-list.tsx`. O `ChatPanel` do admin passa a usar `variant="client"` (mesmo visual do cliente); `me="admin"` continua decidindo o lado das bolhas.

- [ ] **Step 1:** Computador conforme `DChat.dc.html` (lista com busca e abas, vazio à direita); celular: lista em tela cheia e conversa em tela cheia com voltar.
- [ ] **Step 2:** `tsc`; navegador: abrir conversa, trocar abas (sem enviar).
- [ ] **Step 3: Commit** `feat: chat do painel no layout novo`

### Task 8: Marketing

**Files:** Modify `app/admin/marketing/layout.tsx`, `tabs.tsx`, `page.tsx`, `channel-settings.tsx`, `ui.tsx`.

- [ ] **Step 1:** Abas no estilo segmentado (rolam no celular). Visão geral conforme `Marketing.dc.html` / `DMarketing.dc.html`, com os dados que a página já calcula; interruptor no lugar da caixa de marcar onde houver.
- [ ] **Step 2:** `tsc`; navegador nas cinco abas (sem salvar).
- [ ] **Step 3: Commit** `feat: marketing no layout novo`

### Task 9: Serviços

**Files:** Modify `app/admin/servicos/page.tsx`, `service-form.tsx`.

- [ ] **Step 1:** Conforme `DServicos.dc.html`: grupos por categoria, linha com nome, duração, profissional (ponto), preço, "Editar"; aviso no rodapé. Celular: mesma lista empilhada.
- [ ] **Step 2:** `tsc`; navegador: abrir "Editar" sem salvar.
- [ ] **Step 3: Commit** `feat: serviços no layout novo`

### Task 10: Configurações

**Files:** Modify `app/admin/configuracoes/page.tsx` e os cartões dela (`schedule-form`, `closure-form`, `professionals-card`, `team-card`, `studio-form`).
- Test: `tests/staff-nav.test.ts` ganha `settingsSection(param: string | undefined): SectionId` (padrão "agenda"; valor desconhecido → "agenda").

- [ ] **Step 1: Teste** de `settingsSection` (`undefined`, `"profissionais"`, `"xyz"`); falha; implementar em `staff/nav.ts`; passa.
- [ ] **Step 2:** Página mostra só a seção de `?secao=`; navegação à esquerda no computador, abas roláveis no celular. Seções: Agenda (funcionamento + fechar dias), Profissionais, Equipe e permissões, Dados do estúdio, E-mails do sistema (link para Marketing → Templates, onde já estão). Profissionais no celular conforme `Configuracoes.dc.html` ("Sou eu" como interruptor).
- [ ] **Step 3:** `tsc`; navegador em cada seção (sem salvar).
- [ ] **Step 4: Commit** `feat: configurações por seção no layout novo`

### Task 11: Login no computador

**Files:** Modify `app/_components/auth-shell.tsx` (e `app/login/mobile-auth.tsx` só no que for do computador).

- [ ] **Step 1:** Conforme `Main.dc.html` do canvas desktop. Celular sem mudança.
- [ ] **Step 2:** `tsc`; navegador: entrar, criar conta, esqueci a senha (só navegar).
- [ ] **Step 3: Commit** `feat: login no computador no layout novo`

### Task 12: Fechamento

- [ ] **Step 1:** Varredura no navegador das telas sem desenho (Review Focus 2) como admin e barbeiro, nos dois tamanhos; corrigir o que destoar.
- [ ] **Step 2:** Apagar sobras (`sidebar.tsx` antigo, classes sem uso). `pnpm test`, `tsc`, `lint`.
- [ ] **Step 3:** `app/doc/PENDENCIAS.md`: o que mudou, o que falta conferir no aparelho.
- [ ] **Step 4: Commit** `docs: redesign do painel em Onde paramos`

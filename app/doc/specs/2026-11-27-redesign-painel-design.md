# Redesign do painel (admin e barbeiro)

Desenhos: canvases "SHM — Redesign mobile" (https://claude.ai/artifact/CTqkdAPhxhPc9Nbj2yUpLV) e
"SHM — Redesign desktop" (https://claude.ai/artifact/3nWyD7Auevae6WzCyn2S1a).
Partes 2 e 3 do redesign, feitas juntas porque mexem nos mesmos arquivos. A parte 1 (área do
cliente, `app/doc/specs/2026-11-26-redesign-cliente-design.md`) já criou a identidade e as peças
em `app/_components/client/`.

Combinado com o dono em 2026-11-27: **as três partes ficam prontas no local antes de publicar.**

## Escopo

Todas as telas de `/admin/*` e `/barbeiro`, para admin e barbeiro, mais Meus dados do barbeiro
(`/conta`) e o login no computador. Regras, permissões e ações do servidor não mudam.

## Identidade

A mesma da área do cliente: fundo `#f5f5f4`, sem a foto desfocada; cartões brancos com borda
`#e7e5e4`, raio 18–20 px; texto `#121212` / `#5c5c5a`; títulos em Barlow Condensed 800 caixa
alta (38 px celular, 48 px computador); contador `#dc2626`; ações perigosas `#b91c1c`; ponto
colorido do profissional (cor de Configurações). Campos com 16 px no toque; alvos ≥ 44 px.

## Moldura (`StaffFrame`, substitui `PanelFrame`)

**Celular (< lg):**
- Barra de cima de 56 px: logo, sino (com contador) e Meus dados.
- Tab bar embaixo, 5 itens.
  - Admin: Início, Agenda, Clientes, Chat (contador), **Mais**. "Mais" abre uma folha
    (bottom sheet) com nome, e-mail e papel, "Meus dados", atalhos em cartões (Minha agenda,
    se ligado a um profissional; Histórico; Marketing; Serviços; Configurações) e **Sair** em vermelho.
  - Barbeiro: os 5 itens do menu dele (Minha agenda, Clientes, Histórico, Chat, Meus dados),
    sem "Mais"; Sair fica em Meus dados.
- Ação principal da tela em botão flutuante acima da tab bar (Agenda: "Nova reserva";
  Clientes: "Novo cliente").

**Computador (lg+):**
- Sidebar branca de 248 px; itens em lista; ativo em preto.
  - Admin: grupos "Operação" (Início, Agenda, Minha agenda se houver, Clientes, Histórico,
    Chat) e "Gestão" (Marketing, Serviços, Configurações).
  - Barbeiro: um grupo com o menu dele.
- Rodapé da sidebar: iniciais, nome, "Meus dados" e botão Sair.
- Conteúdo com padding 32×40 px. Sino no alto do conteúdo, ao lado das ações da página,
  na mesma linha do título.

Barbeiro sem profissional continua vendo só Meus dados. A faixa "Instale o app" continua.
O sino e os contadores seguem atualizando a cada 30 s.

## Peças comuns

`app/_components/ui.tsx` passa a ter o visual novo (cartão, botões, campos, título da página),
e assim as telas sem desenho próprio (ficha do cliente, novo cliente, nova reserva, perfil,
templates, e-mails, mensagens e histórico de marketing) mudam junto. `PageTitle` usa Barlow.
`PanelHeader` passa a ser título + ações à direita + sino (só no computador; no celular o sino
está na barra de cima).

## Telas com desenho

**Início (admin):**
- Celular: data e "Boa noite, Nome"; bloco preto com Hoje e Faturado na semana; botões
  "Nova reserva" e "Novo cliente"; Próximo horário; Próximos dias em grade de 3 colunas.
- Computador: faixa de 4 números (Hoje, Faturado na semana, Próximo horário, Próximos 6 dias);
  "Agenda de hoje" (vazia: "Agenda livre hoje" com "Ver amanhã" e "Marcar horário") com
  Próximos dias embaixo; à direita "Próximo atendimento" e "Conversas recentes".

**Agenda:**
- Celular: cabeçalho branco com mês, profissional/semana, "Hoje", seletor Dia/Semana/Mês e
  faixa da semana com setas; título do dia com "N reservas"; legenda das cores; grade de horas
  em cartão; "Nova reserva" flutuante.
- Computador: título e legenda; barra com ‹ Hoje ›, intervalo e "Semana N · N reservas",
  Dia/Semana/Mês e "Nova reserva"; grade da semana com colunas fechadas em cinza.
- **Reserva aberta no celular** vira folha de baixo: situação, serviço, preço; data, horário,
  profissional; cliente com atalhos Conversar, Ligar (`tel:`) e Ver cliente; Cancelar (vermelho)
  e Remarcar.

**Clientes:**
- Celular: 4 números compactos; busca com botão de filtro; linha "Todos · ordem"; lista com
  iniciais, nome, telefone · desde, visitas e próximo horário; "Novo cliente" flutuante.
- Computador: "Exportar CSV" e "Novo cliente" no título; 4 números; barra única com busca,
  filtros em chips e ordem; tabela (Cliente, Contato, Visitas, Última visita, Próximo horário,
  menu ⋯).

**Histórico:**
- Celular: bloco Faturado + 4 números; busca com filtro; lista com data, cliente, situação,
  horário · serviço e valor.
- Computador: 5 números; busca + profissional + situação numa barra; tabela.

**Chat (computador):** lista à esquerda com busca e abas "Conversas (N)" / "Todos os clientes";
vazio à direita com "Escolha uma conversa".

**Marketing (visão geral):**
- Abas Visão geral, Templates, E-mails, Mensagens e Histórico.
- Celular: 4 números e um cartão por canal com interruptor.
- Computador: linha "Execução automática" com "Executar agora"; 4 números; cartão por canal
  (automações, template padrão, clientes que autorizaram); Falhas recentes; Próximos envios.

**Serviços (computador):** grupos por categoria; linha com nome, duração, ponto e profissional,
preço e "Editar"; aviso sobre desativar e preço no rodapé.

**Configurações:**
- Navegação por seção (Agenda, Profissionais, Equipe e permissões, Dados do estúdio,
  E-mails do sistema), com `?secao=` na URL; no computador fica à esquerda, no celular em abas.
- Profissionais no celular: cartão por profissional com acessos ao app (Nova senha, Remover
  acesso), "Sou eu" como interruptor, "+ Criar acesso" e "Adicionar profissional".

**Login no computador:** coluna de 560 px com logo, "Entrar" em Barlow, campos de 52 px, botão
preto, "Criar conta" contornado e rodapé com o estúdio; à direita a foto em preto e branco com
"BEM-VINDO / Seu acesso começa aqui".

# Redesign da área do cliente

Desenho: canvas "SHM — Área do cliente" (https://claude.ai/artifact/M1eGNjH6Wjk5EcKt1ZpvyC), páginas Mobile e Desktop.
Primeira de três partes do redesign (depois: painel no celular e painel no computador).

## Escopo

Telas do cliente logado: Início (`/`), Agendar (`/agendamento`, `/agendamento/horario`,
`/agendamento/confirmacao`), Remarcar (`/reservas/[id]/remarcar`), Minhas reservas
(`/reservas`), Mensagens (`/mensagens`) e Meus dados (`/conta`, sem desenho próprio:
só entra na moldura nova).

Fora do escopo: admin e barbeiro. Eles continuam com a moldura atual (`PanelFrame`),
inclusive o barbeiro em `/conta`. Login, boas-vindas e visitante sem conta não mudam.

## Identidade

- Fundo `#f5f5f4`, sem a foto desfocada. Cartões brancos com borda `#e7e5e4`, raio 16–24 px.
- Texto `#121212`; secundário `#5c5c5a`; divisórias internas `#f0efee`.
- Inter no corpo; títulos de página em Barlow Condensed 800, caixa alta
  (38 px no celular, 52 px no computador), a mesma fonte do login.
- Contador vermelho `#dc2626`; "Cancelar" em `#b91c1c`.
- Ponto colorido do profissional (cor cadastrada em Configurações); serviço sem
  profissional fixo mostra "Qualquer profissional" com ponto cinza `#78716c`.

## Moldura

**Celular (< lg):**
- Barra de cima de 56 px: logo (92 px) à esquerda, ícone "Meus dados" (44 px) à direita.
- Tab bar fixa embaixo (84 px com a área segura): Início, Agendar, Reservas, Mensagens
  (contador de não lidas). Ativa com pílula `rgba(0,0,0,0.08)`.
- Nos passos 2 e 3 do agendamento e no remarcar a tab bar dá lugar à barra de ação fixa.
- Conteúdo a 16 px da borda; `env(safe-area-inset-*)` em cima e embaixo.
- Toasts ficam acima da tab bar.

**Computador (lg+):**
- Sidebar branca de 248 px: logo (128 px), botão preto "Novo agendamento", itens em lista
  (Início, Agendar, Reservas, Mensagens com contador), rodapé com iniciais, nome,
  "Meus dados" e botão Sair.
- Conteúdo com padding 40×48 px, largura máxima 1192 px.

A faixa "Instale o app do estúdio" continua no alto, só no celular.

## Telas

**Início:** data e "Boa noite, Nome"; cartão preto "Próximo horário" (dia/mês, serviço,
horário–fim · duração, preço · pagamento no dia, botões Remarcar e Ver reservas);
sem horário: texto + Agendar. Linha "Agendar novo horário" (celular). Bloco único com
"N reservas marcadas" e "N mensagens novas". Cartão da última mensagem com contador.
Computador: cartão preto e coluna direita (números + última mensagem com "Responder →"),
e embaixo "Suas próximas reservas" em linhas, com "+ Agendar outro horário".

**Agendar · 1 Serviço:** celular com "Passo 1 de 3 · Serviço", barra de progresso de 3
segmentos e X para sair (volta a `/`). Busca, chips de categoria, lista compacta em que a
linha inteira é o link (nome; ponto + profissional · duração; preço; seta).
Computador: stepper numerado, título com filtro segmentado e busca na mesma linha,
grade de 3 cards clicáveis.

**Agendar · 2 Horário:** cartão do serviço com "Trocar". Celular: "Quando?", faixa de dias
sugeridos (dia da semana, número, "N livres") e botão "Outra data" que abre o calendário
na janela atual; título do dia com "· N livres"; grade de 4 colunas. Tocar num horário
o seleciona; a barra de baixo mostra "Escolhido" e "Continuar". Computador: calendário à
esquerda (380 px) e horários do dia à direita, com "Escolhido" e "Continuar" no rodapé
do cartão. Ao abrir, o primeiro dia com horário já vem escolhido.

**Agendar · 3 Confirmação:** cartão de cada item (data, serviço, horário, profissional ·
duração, preço, X para remover) e "Adicionar outro serviço"; pagamento "Pagar no dia
(presencial)". Celular: barra fixa com "Total · pago no estúdio", "Confirmar reserva" e
"Confirmando como Nome"; **sem Observação** (decisão de 2026-11-25, mantida).
Computador: Observação embaixo dos itens e Resumo fixo à direita (400 px) com cada item,
total e botão. Visitante sem conta: "Entrar para confirmar" no lugar do botão.

**Remarcar:** mesmo seletor de horário, com o horário atual no cartão do serviço; o
"Continuar" leva à confirmação da troca que já existe.

**Minhas reservas:** aviso preto "Reserva confirmada! Te esperamos no estúdio." que fecha
no X; abas "Próximas (N)" e "Anteriores"; cartões com data, serviço, preço, horário ·
profissional, pagamento no dia; botões "Remarcar" (contornado) e "Cancelar" (vermelho)
só nas próximas. Falta continua com "Você não compareceu" e preço riscado.

**Mensagens:** celular em tela cheia: cabeçalho branco com logo, nome do estúdio e
"Respondemos assim que possível"; bolhas; campo arredondado preso acima da tab bar.
Computador: conversa à esquerda e "Seus próximos horários" à direita (300 px).

**Meus dados:** formulários atuais dentro da moldura nova, título no estilo novo.

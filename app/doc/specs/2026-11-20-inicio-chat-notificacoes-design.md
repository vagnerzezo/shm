# Início novo, chat do barbeiro e notificações — desenho

**Data:** 2026-11-20 · **Situação:** rascunho para aprovação · **Atualiza:** `2026-11-20-area-barbeiro-design.md` (chat deixa de ser só admin)

## Por quê

O dono quer ver num só lugar (o sino) tudo o que pede atenção — marcações, mensagens, falhas — em vez de cartões espalhados no Início, e quer que cada barbeiro converse com os próprios clientes e seja avisado do que é dele. O Início vira a agenda do dia em destaque.

## Três partes, nesta ordem (cada uma vai para produção sozinha)

### Parte 1 — Início do admin
- Sai o cartão **Mensagens** (as mensagens chegam pelo sino).
- **Agenda de hoje** ocupa a largura toda, no visual da Agenda (visão Dia): cabeçalho com data, setas e "Hoje", botão **Nova reserva**, grade de horários com a linha da hora atual (`TimeGrid`) e, ao lado, a lista "N RESERVAS" (`DayPanel`). As setas levam para a Agenda no dia escolhido.
- Ficam: os números do topo (Hoje, Faturado, Falhas de envio). "Mensagens não lidas" sai do topo (vai para o sino). "Confirme quem veio" e "Dias fechados chegando" continuam abaixo da agenda.
- Barbeiro não tem Início (inalterado).

### Parte 2 — Chat do barbeiro (decidido: conversa única do estúdio)
- O barbeiro ganha o menu **Chat**, com as conversas dos clientes que têm ou tiveram horário com ele ou que ele cadastrou (mesma regra da ficha do cliente).
- Ele responde na mesma conversa; a mensagem guarda **quem escreveu** (`messages.author_id`, nova coluna). O cliente vê o **nome** de quem respondeu (ex.: "Heitor"); mensagens antigas e do admin continuam "Estúdio" quando não houver autor.
- "Lido/não lido" continua **um por conversa** (se o Heitor leu, deixa de contar para o admin).
- A API v1 (`GET /messages`) passa a devolver `authorName` (opcional) nas mensagens do estúdio.

### Parte 3 — Sino de notificações (decidido: 1A + 2A)
- Ícone de sino ao lado do ícone de usuário, em todas as telas do painel (admin e barbeiro), com número vermelho de **não vistos**.
- Clicar abre a lista (mais recentes primeiro, até 30); **abrir marca tudo como visto** (`users.notifications_seen_at`). Cada item leva ao lugar dele.
- Atualiza a cada página aberta e a cada 30 s com a página parada (mesmo `auto-refresh` do chat).
- Itens com mais de 30 dias somem.

**Avisos e quem recebe** (nunca quem fez a ação):

| Aviso | Admin | Barbeiro | Leva para |
|---|---|---|---|
| Cliente marcou / remarcou / cancelou (inclui cancelamentos por exclusão de conta) | todos | os do profissional dele | a reserva na Agenda |
| Equipe marcou / remarcou / cancelou um horário | — | os dele, feitos por outra pessoa | a reserva na Agenda |
| Nova mensagem de cliente | todas | clientes dele | a conversa no Chat |
| Dia fechado na agenda dele | — | fechamentos do profissional dele (ou do estúdio todo) | Minha agenda no dia |
| Confirme quem veio (horários passados sem veio/faltou) | todos | os dele | a Agenda / Início |
| Novo cliente cadastrado pelo site | ✓ | — | ficha do cliente |
| Falha no envio de marketing | ✓ | — | Marketing → histórico de envios |
| Falha num e-mail do sistema | ✓ | — | ficha do cliente |

**Como guardar (1A):** tabela `notifications` com um registro por acontecimento: `id`, `kind`, `at`, `actorId` (quem fez, pode ser nulo), `professional` (pode ser nulo), `customerId` (pode ser nulo), `reservationId`/`date`/`time` quando houver, `text` (já pronto para a tela). Quem recebe é calculado na leitura pela regra acima. **Mensagens de cliente** e **Confirme quem veio** não são gravados aqui: vêm das tabelas que já existem (`messages` sem `readAt`; reservas passadas sem presença), como itens calculados — "Confirme quem veio" vira um item só por pessoa, com a contagem.

## Fora do escopo
- Notificação para clientes (eles já recebem e-mail e chat).
- Push no celular, som, e-mail de aviso para a equipe.
- Tempo real (o atraso de até 30 s é aceito).
- Marcar avisos um a um como lidos.

## Anti-objetivos
- Barbeiro ver aviso de reserva, mensagem ou cliente de outro profissional.
- A pessoa ser avisada do que ela mesma fez.
- O sino deixar as telas lentas (a contagem tem que ser uma consulta leve).

## Caminhos considerados
- **Guardar:** (A) um registro por acontecimento + "visto até" por pessoa — **escolhido**: simples, um barbeiro novo já vê o histórico dele; (B) cópia por pessoa com lido item a item — mais trabalho, sem pedido para isso.
- **Atualizar:** (A) a cada página + 30 s — **escolhido**, já existe; (B) tempo real — precisaria de serviço extra, ganho irrelevante aqui.
- **Chat:** (A) conversa única do estúdio com o nome de quem respondeu — **escolhido pelo dono**; (B) uma conversa por profissional — mexeria no cliente, na API e no app.

## Decisões de quem escreveu (o dono pode mudar)
- Abrir o sino marca tudo como visto (não item a item).
- Lista com até 30 itens; mais de 30 dias some.
- "Confirme quem veio" conta horários **desta semana** até agora (mesmo critério do cartão atual do Início).
- O chat do barbeiro reaproveita a tela `/admin/chat`, filtrada pela regra central (`requireMenu("chat")`, novo menu `chat` liberado para barbeiro).
- Falha de e-mail do sistema passa a ser gravada como aviso no `catch` de `deliver` (`email-templates/send.ts`).
- Migrações: `messages.author_id`, `users.notifications_seen_at`, tabela `notifications` (uma migração por parte que precisar).
- Os avisos de reserva são gravados no domínio (`bookForCustomer`, `rescheduleForCustomer`, `cancelForCustomer`, `bookByAdmin`, `rescheduleByAdmin`, `markCancelled`), na mesma transação, para valer igual no site e na API.
- Mensagem de cliente conta como "não vista" pelo horário (`createdAt` depois do `notifications_seen_at` da pessoa), não pelo `readAt` da conversa — abrir o sino zera o número mesmo sem abrir a conversa; a conversa continua "não lida" no Chat até alguém abri-la.
- No Chat do barbeiro, a aba "Todos os clientes" mostra só os clientes dele (para começar uma conversa).
- Na Parte 1, "Mensagens não lidas" sai dos números do topo; "Falhas de envio" fica (até a Parte 3 existir).

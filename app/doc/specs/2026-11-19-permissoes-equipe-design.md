# Permissões da equipe — desenho

**Data:** 2026-11-19 · **Situação:** rascunho para aprovação

## Por quê

O dono quer decidir, pessoa por pessoa, o que cada membro da equipe faz no painel. Alguns barbeiros devem ter mais acesso que outros (ex.: ver a própria agenda em calendário e marcar horário para quem liga), sem ver os dados dos colegas nem mexer no estúdio todo.

## Objetivos

- Em **Configurações → Equipe**, o admin vê cada conta da equipe e define:
  - o papel: **admin** ou **barbeiro**;
  - para barbeiro, quais **menus extras** ele vê: **Início**, **Agenda**, **Clientes**, **Histórico**.
- **Admin** vê tudo, de todo mundo (como hoje).
- **Barbeiro**, em cada menu liberado, só vê e mexe no que é **dele** (ligado ao profissional da conta):

| Menu | O barbeiro vê / faz |
|---|---|
| Início | Resumo do dia só dele: horários de hoje, próximos dias, presenças a confirmar, faturamento da semana dele |
| Agenda | Calendário (dia/semana/mês) só com os horários dele; marca, remarca e cancela só para ele; marca presença |
| Clientes | Só clientes que já marcaram com ele (qualquer reserva com ele, inclusive cancelada) |
| Histórico | Só os atendimentos dele |

- Sempre continua com **Minha agenda** e **Meus dados**, como hoje.
- A permissão vale **no servidor**: abrir o endereço na mão, chamar a ação ou exportar sem permissão é recusado.

## Fora do escopo (agora)

- **Cliente** não muda.
- **Chat, Marketing, Serviços, Configurações** e a exportação CSV continuam **só admin**. O chat do barbeiro será pensado depois (hoje a conversa é do cliente com o estúdio, sem dono).
- Permissões na API v1 (o app ainda não existe; as rotas de barbeiro continuam como estão).

## Anti-objetivos

- Barbeiro ver nome, telefone ou histórico de cliente que nunca marcou com ele.
- Esconder o menu e deixar a tela aberta pelo endereço.
- O estúdio ficar sem nenhum admin.

## Caminhos considerados

- **A) Menus marcados por pessoa** — **escolhido.** Caixinhas por barbeiro, guardadas na conta; uma regra central decide "pode abrir? de quais dados?". Cobre o pedido (decidir menu por menu) e deixa pronto o terreno para o chat do barbeiro.
- **B) Perfis prontos** ("Barbeiro", "Barbeiro + Agenda"...) — mais simples, mas cada combinação nova vira código; vai contra decidir menu por menu.
- **C) Só "virar admin"** — rápido, mas sem acesso parcial nem dados filtrados.

## Como fica (decisões)

### Dados
- Nova coluna em `users`: `menus` (lista de textos, padrão vazio). Só vale para `barbeiro`; admin ignora. Migração `0005`.
- Valores aceitos: `inicio`, `agenda`, `clientes`, `historico`.

### Regra central (`app/_lib/access.ts`)
- `canOpen(user, menu)`: admin → sempre; barbeiro → se `menu` está em `menus` e a conta tem profissional; cliente → nunca.
- `scopeOf(user)`: admin → todos; barbeiro → `{ professional }`.
- `requireMenu(menu, next)` para as páginas (troca o `requireAdmin` de Início, Agenda, Agenda/nova, Clientes, Cliente, Histórico) e `assertMenu(menu)` para as ações.
- As buscas (`getAgenda`, `getCustomers`, cliente por id) recebem o escopo e filtram. Cliente fora do escopo dá **404** (não confirma que existe).

### Telas
- As páginas continuam em `/admin/...`; o barbeiro com permissão abre as mesmas, já filtradas.
- Menu lateral do barbeiro: Minha agenda, Meus dados + os menus liberados. Admin: igual a hoje.
- Itens que o barbeiro não usa somem da tela (ex.: filtro de profissional na Agenda e no Histórico, botões de exportar, cartões de chat e de falhas de marketing no Início).
- **Configurações → Equipe** (novo cartão, só admin): lista admins e barbeiros com papel e caixinhas. Salvar recarrega a sessão da pessoa na próxima requisição (o papel é lido do banco a cada página).

### Regras de segurança
- Não dá para tirar o papel de admin do **último admin**, nem o seu próprio (evita trancar o estúdio para fora).
- Barbeiro sem profissional ligado não recebe menus (não há "dados dele").
- Virar admin mantém o profissional ligado (ele continua com "Minha agenda", como o "Sou eu" de hoje). Voltar de admin para barbeiro exige um profissional.

### Decidido com o dono (2026-11-19)
1. **Marcar para quem nunca cortou com ele:** na **Agenda → Novo horário**, o barbeiro escolhe entre **todos** os clientes cadastrados (busca mostra só nome e telefone; o histórico e a página do cliente continuam só para os clientes dele). A reserva criada é sempre com ele, e a partir dela a pessoa passa a ser cliente dele.
2. **Em Clientes (só os dele), o barbeiro pode:** ver, editar dados (nome, telefone, e-mail, observação) e **criar cliente**. **Definir senha, desativar e excluir** ficam só com o admin, porque mexem na conta da pessoa e não só no atendimento. Cliente criado por ele aparece na lista dele (critério: reserva com ele **ou** criado por ele — guardar `createdBy` no cliente).

### Decisões de quem escreveu (o dono pode mudar)
- Barbeiro usa as mesmas telas `/admin/...`, filtradas.
- Ninguém tira o próprio admin; o último admin não deixa de ser admin.
- "Cliente dele" = qualquer reserva com ele (inclusive cancelada) ou criado por ele.
- Cliente fora do escopo → 404.
- Exportação CSV só admin.
- Início do barbeiro: sem chat e sem falhas de marketing; faturamento só dele.
- Na Agenda, o barbeiro só marca serviços que ele atende (com profissional fixo = ele, ou sem profissional fixo, ficando com ele).

## Deixado para quem constrói

- Nome exato do componente do cartão Equipe e textos de ajuda.
- Ordem das migrações e dos testes, desde que a regra central tenha testes de domínio para cada menu e para a recusa no servidor.

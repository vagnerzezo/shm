# API v1 do SHM (site + app de celular) — desenho

Data: 2026-11-11. Situação: aguardando aprovação.

Legenda: **[decidido]** veio do Vagner; **[escolha minha]** foi definido por mim e pode ser trocado.

## 1. Para quê

O estúdio vai ter um app de celular usado por **clientes** e por **barbeiros**. O app precisa de uma API HTTP com login por token. O site continua funcionando como hoje. As duas portas (site e app) têm que aplicar exatamente as mesmas regras de agenda.

Este trabalho entrega a API e o que falta por baixo dela. **O app em si não faz parte.**

## 2. O que foi decidido

- **[decidido]** A API serve o próprio site e um app de celular próprio. Sem parceiros nem automações.
- **[decidido]** O app é usado pelo cliente e pelos barbeiros.
- **[decidido]** O barbeiro vê a própria agenda e marca "compareceu" ou "faltou". Só isso.
- **[decidido]** O barbeiro não marca, não remarca, não cancela, não vê a agenda do colega, nem faturamento, clientes, chat ou marketing.
- **[decidido]** Cada conta de barbeiro é ligada a um profissional do cadastro e é criada pelo admin.
- **[decidido]** Quem é admin e também atende usa uma conta só.
- **[decidido]** O cliente faz no app o mesmo que faz no site: agendar, ver, remarcar e cancelar reservas, mensagens e dados da conta.
- **[decidido]** Banco Postgres (Neon), hospedagem na Vercel, canal "mensagem" = chat interno, sem pagamento online.

## 3. Objetivos

1. API `/api/v1` em JSON cobrindo tudo o que o cliente e o barbeiro fazem.
2. Login por token para o app, convivendo com o cookie do site.
3. Novo perfil **barbeiro**.
4. **Marcação sem corrida**: duas pessoas não conseguem pegar o mesmo horário, nem pelo site nem pelo app.
5. Uma regra só: as telas do site e as rotas da API chamam as mesmas funções.
6. Contrato escrito (OpenAPI) e testes que rodam contra a API.

## 4. Fora do escopo

- O app de celular.
- API das funções do admin (clientes, histórico, serviços, configurações, marketing, chat do estúdio). O admin continua só no site.
- Notificações push e chat em tempo real (o app consulta de tempos em tempos, como o site).
- WhatsApp/SMS, pagamento, calendário externo.
- Profissional com id próprio. Ele continua identificado pelo nome, como no resto do sistema.
- Reescrever todas as leituras do banco (ver 9.3).
- CORS para sites de terceiros.

## 5. O que não pode acontecer

- Regras diferentes entre site e app.
- O barbeiro enxergar algo além da própria agenda.
- A API revelar se um e-mail tem conta no login ou no "esqueci a senha". (No cadastro ela avisa que o e-mail já está em uso, como o site faz hoje; esconder isso exigiria confirmação por e-mail, que está fora do escopo.)
- Quebrar as sessões de quem já está logado no site.
- Testes da API gravando no banco principal.

## 6. Perfis

| Perfil | Como é definido | Pode |
|---|---|---|
| cliente | padrão | tudo de cliente |
| barbeiro | `role = "barbeiro"` + `professional` | só a agenda do `professional` e o comparecimento |
| admin | `role = "admin"` ou e-mail em `ADMIN_EMAILS` | painel do site; se tiver `professional`, também as rotas de barbeiro |

- **[escolha minha]** Novo campo `users.professional` (nome do profissional). Renomear um profissional leva junto esse campo, como já acontece com serviços e fechamentos. Um profissional com conta ligada não pode ser removido.
- **[escolha minha]** O admin cria o acesso do barbeiro em Serviços > Profissionais: e-mail e senha provisória. Na mesma tela dá para ligar a própria conta de admin a um profissional.
- **[escolha minha]** O barbeiro ganha no site uma tela única, `/barbeiro` ("Minha agenda"), com os mesmos dados da API. Motivo: o app ainda não existe, e sem essa tela a conta não serviria para nada nem daria para testar no navegador. No site, barbeiro não agenda como cliente (para isso usa outra conta).
- O barbeiro vê de cada horário: serviço, data, hora, duração, nome e telefone do cliente, observação e situação. **[escolha minha]** Não vê o preço.
- Comparecimento: só em horários que já passaram, não cancelados, e do próprio profissional (mesma regra do admin hoje).

## 7. Login e segurança

- `POST /auth/login` devolve um token. O app envia `Authorization: Bearer <token>`. O site continua com o cookie. As duas formas usam a mesma tabela de sessões.
- **[escolha minha]** O token passa a ser guardado como hash (SHA-256), não mais em texto puro (era um achado do mapeamento). Uma migração converte as sessões existentes, então ninguém é deslogado.
- **[escolha minha]** Sessão de 30 dias que se renova com o uso (quando faltam menos de 15 dias, volta para 30). Assim o app não pede senha todo mês.
- **[escolha minha]** Limite de tentativas no login: 10 erros por e-mail em 15 minutos, depois `429`. Vale para site e app.
- Conta desativada perde o acesso na hora, como hoje.
- Trocar ou redefinir a senha encerra as outras sessões (já é assim na redefinição).

## 8. Contrato

Base `/api/v1`, JSON, datas `AAAA-MM-DD`, horas `HH:MM`, instantes em ISO 8601. **[escolha minha]** Caminhos e campos em inglês (iguais aos nomes do código); mensagens em português.

Erro, sempre no mesmo formato:

```json
{ "error": { "code": "slot_unavailable", "message": "Esse horário não está mais disponível.", "fields": { "time": "..." } } }
```

Códigos HTTP: `400` validação, `401` sem login, `403` sem permissão, `404`, `409` conflito de horário, `429` limite, `500`.

| Rota | Quem | O que faz |
|---|---|---|
| `POST /auth/register` | público | cria conta de cliente e devolve token |
| `POST /auth/login` | público | devolve token e dados do usuário |
| `POST /auth/logout` | logado | encerra a sessão atual |
| `POST /auth/password/forgot` | público | envia o link por e-mail (resposta sempre igual) |
| `POST /auth/password/reset` | público (código) | troca a senha |
| `GET /me` | logado | dados, perfil e, se houver, `professional` |
| `PATCH /me` | logado | nome, telefone, e-mail, autorizações |
| `POST /me/password` | logado | troca a senha (pede a atual) |
| `DELETE /me` | cliente | exclusão da conta (LGPD; pede a senha) |
| `GET /studio` | público | nome, endereço, telefone, redes |
| `GET /services` | público | serviços ativos, por categoria |
| `GET /availability?serviceId&from&to` | público | horários livres por dia (até 31 dias). Com `rescheduleOf=<id>`, ignora a própria reserva |
| `GET /reservations?scope=upcoming\|past` | cliente | reservas do cliente |
| `POST /reservations` | cliente | marca um ou mais itens (`serviceId`, `date`, `time`) + observação. Tudo ou nada |
| `PATCH /reservations/{id}` | cliente (dono) | remarca (`date`, `time`) |
| `POST /reservations/{id}/cancel` | cliente (dono) | cancela reserva futura |
| `GET /messages?after=<id>` | cliente | conversa com o estúdio + não lidas |
| `POST /messages` | cliente | envia mensagem |
| `POST /messages/read` | cliente | marca como lidas |
| `GET /barber/agenda?from&to` | barbeiro | horários do próprio profissional (até 31 dias) |
| `PUT /barber/reservations/{id}/attendance` | barbeiro | `compareceu`, `faltou` ou limpar |

Efeitos iguais aos do site: e-mails de boas-vindas, confirmação e cancelamento; mensagem no chat ao remarcar.

- **[escolha minha]** Sem chave de idempotência em `POST /reservations`. Se o app repetir o envio, a segunda tentativa recebe `409`, porque o cliente já ocupa aquele horário. Não duplica.
- O contrato fica em um arquivo OpenAPI no repositório, escrito antes do código de cada grupo de rotas.

## 9. Por baixo da API

### 9.1 Uma regra só

Hoje validação, gravação e redirecionamento estão misturados nas Server Actions. Para os domínios desta API (conta, reservas, mensagens, comparecimento), a regra vai para funções em `app/_lib/` que recebem dados simples e devolvem resultado ou erro com código. A Server Action e a rota HTTP viram cascas finas em volta da mesma função. As actions do admin fora desses domínios ficam como estão.

### 9.2 Marcação sem corrida

A conferência do horário e a gravação passam a acontecer **dentro da mesma transação** (o `updateDb` já tem trava entre servidores). Vale para: marcar e remarcar pelo cliente, marcar e remarcar pelo admin. Quem perder a corrida recebe "horário não está mais disponível".

### 9.3 Leituras

- **[escolha minha]** Só a consulta que roda em toda requisição (sessão + usuário) vira consulta direta ao banco. O restante continua lendo pelo `readDb`.
- Isso é menos do que eu tinha dito ("consultas sob medida no passo 3"). Motivo: com o volume de um estúdio, ler tudo custa pouco, e reescrever dezenas de leituras agora aumentaria o risco sem ganho visível. Fica registrado como trabalho futuro, quando o volume pedir.

### 9.4 Testes

- **[escolha minha]** Uma coleção Postman no repositório, rodada pelo Postman CLI contra o servidor local, cobrindo cada rota: caminho feliz, validação, permissão (cliente tentando rota de barbeiro e vice-versa, barbeiro tentando horário do colega) e a corrida de marcação.
- **[escolha minha]** Os testes rodam contra um **branch do Neon** separado (`teste`), nunca contra o banco principal. E-mails de teste vão para `delivered@resend.dev`.
- Além disso, as telas alteradas do site (login, agendar, remarcar, cancelar, `/barbeiro`, Profissionais) são testadas no navegador, como de costume.

## 10. Ordem de entrega

Cada etapa termina funcionando e testada, com commit próprio.

1. Base: formato de erro, login por token, hash das sessões, limite de tentativas, `GET /me`.
2. Regra única + marcação sem corrida (site continua igual por fora).
3. Rotas do cliente: catálogo, disponibilidade, reservas, conta, mensagens.
4. Perfil barbeiro: campo, criação pelo admin, rotas `/barber`, tela `/barbeiro`.
5. Contrato OpenAPI final, coleção de testes completa e atualização do `MAPEAMENTO_SISTEMAS.md`.

## 11. Fica para quem implementa

- Nomes de arquivos e organização das funções dentro de `app/_lib/`.
- Biblioteca de validação (ou validação manual, como hoje).
- Formato exato de cada resposta, desde que siga a seção 8 e fique no OpenAPI.
- Como o Next 16 trata rotas e cabeçalhos: ler `node_modules/next/dist/docs/` antes de escrever (regra do `AGENTS.md`).

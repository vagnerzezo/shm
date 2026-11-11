# Diagnóstico técnico: APIs, integrações e lacunas

**Projeto:** Studio Heitor Macks (SHM)  
**Data da análise:** 2026-11-05  
**Escopo:** diagnóstico e planejamento. Nenhuma API ou funcionalidade foi implementada nesta análise.

## 1. Resumo executivo

O projeto é uma aplicação monolítica Next.js 16 com React 19, TypeScript e App Router. A interface de clientes e o painel administrativo estão no mesmo deploy e usam Server Actions para mutações. O armazenamento atual é um arquivo `.data/db.json`, adequado apenas para desenvolvimento ou uma instância Node única; o próprio código registra que não serve para serverless (`app/_lib/db.ts:5-6`).

Existe somente um endpoint HTTP explícito:

- `POST /api/marketing/executar`, protegido por `CRON_SECRET`, para executar o motor de marketing (`app/api/marketing/executar/route.ts:1-15`).

O restante dos fluxos é interno ao Next.js:

- autenticação, cadastro, perfil e sessão por Server Actions;
- cálculo de disponibilidade e confirmação/cancelamento de reservas por Server Actions;
- chat interno salvo no JSON;
- administração de clientes, agenda, histórico e configurações por Server Actions e leituras server-side;
- marketing com regras, templates, histórico e envio de e-mail via Resend.

Portanto, não há necessidade imediata de criar endpoints REST para a própria UI atual. A necessidade de APIs surge principalmente em três cenários: substituir o banco local por uma persistência de produção, integrar canais/pagamentos externos e disponibilizar o sistema para aplicações externas, automações ou tempo real.

## 2. Arquitetura atual

### 2.1 Camadas e módulos

| Camada | Localização | Responsabilidade |
|---|---|---|
| Rotas públicas | `app/page.tsx`, `app/login`, `app/(painel)/agendamento` | Landing page, login/cadastro e fluxo de agendamento |
| Área do cliente | `app/(painel)/conta`, `app/(painel)/reservas` | Perfil, consentimentos, reservas futuras e histórico |
| Painel admin | `app/admin/*` | Agenda, clientes, histórico, chat, marketing e configurações |
| Autenticação | `app/_lib/auth.ts`, `app/_lib/actions.ts` | Hash scrypt, sessão em cookie HttpOnly, login/cadastro/logout e autorização |
| Domínio de agenda | `app/_lib/availability.ts`, `booking.ts`, `reservations.ts`, `schedule.ts` | Regras de horário, conflitos, fechamentos e reservas |
| Dados de serviços | `app/_lib/services.ts` | Catálogo fixo de serviços, profissionais, duração e preço |
| Clientes | `app/_lib/customers.ts`, `customer-actions.ts`, `profile.ts` | Listagem, métricas, edição, senha e ativação |
| Chat | `app/_lib/chat.ts`, `app/admin/chat/*` | Conversas internas admin-cliente, com atualização periódica |
| Marketing | `app/_lib/marketing.ts`, `marketing-actions.ts`, `marketing-template.ts` | Templates, regras, consentimento, fila, envio e histórico |
| Persistência | `app/_lib/db.ts`, `.data/db.json` | Leitura/escrita de todas as entidades em arquivo JSON |
| Inicialização | `instrumentation.ts`, `marketing-scheduler.ts` | Scheduler Node para execução periódica do marketing |

### 2.2 Entidades persistidas

O tipo `Db` contém usuários, sessões, reservas, mensagens, templates, regras de envio, disparos, configurações de marketing, agenda e fechamentos (`app/_lib/db.ts:136-147`). As entidades mais relevantes para futuras APIs são:

- `User`: dados pessoais, senha hash, papel, consentimentos e desativação (`app/_lib/db.ts:10-25`);
- `StoredReservation`: cliente, serviço, data, hora e observação (`app/_lib/db.ts:118-125`);
- `Template`, `SendRule` e `Dispatch`: automação de marketing (`app/_lib/db.ts:57-110`);
- `ChatMessage`: mensagens internas entre admin e cliente (`app/_lib/db.ts:127-134`);
- `ScheduleSettings` e `Closure`: regras de disponibilidade (`app/_lib/db.ts:27-51`).

### 2.3 Fluxos implementados

#### Cadastro e autenticação

O cadastro valida perfil e senha, grava o usuário, cria sessão e redireciona; o login verifica o hash, bloqueia contas desativadas e também cria sessão (`app/_lib/actions.ts:26-62`). A sessão usa cookie HttpOnly, `sameSite=lax`, expiração de 30 dias e token aleatório (`app/_lib/auth.ts:50-73`). `requireUser` e `requireAdmin` protegem as páginas (`app/_lib/auth.ts:104-115`).

#### Agendamento

1. O cliente escolhe um serviço.
2. O sistema calcula horários determinísticos a partir de funcionamento, fechamentos, antecedência, reservas ocupadas e duração do serviço (`app/_lib/availability.ts:103-124`).
3. O carrinho trafega na URL como parâmetros `item`.
4. Ao confirmar, o servidor revalida todos os horários antes de gravar, evitando confiar no navegador (`app/_lib/actions.ts:64-87`).
5. O cliente pode cancelar apenas reservas futuras e pertencentes à sua conta (`app/_lib/actions.ts:90-98`).

#### Operação administrativa

- Agenda com visões dia/semana/mês e consulta de reservas (`app/admin/agenda/page.tsx:17-52`);
- clientes com busca, filtros, ordenação, métricas e detalhe (`app/admin/clientes/page.tsx:70-130`);
- histórico de reservas com filtros, paginação e faturamento calculado (`app/admin/historico/page.tsx:37-90`);
- configurações de horários e fechamentos, sempre com autorização administrativa (`app/_lib/settings-actions.ts:22-97`);
- chat com mensagens persistidas e atualização automática no cliente (`app/admin/chat/page.tsx:17-47`, `app/_lib/chat.ts:10-50`).

#### Marketing

O motor agenda disparos por cliente/regra/última visita, respeita canal ligado, consentimento, template ativo, evita duplicidade e registra estados `pendente`, `enviando`, `enviado`, `falha` e `cancelado` (`app/_lib/marketing.ts:145-290`). E-mail usa Resend diretamente com `RESEND_API_KEY` e `MARKETING_EMAIL_FROM` (`app/_lib/marketing.ts:35`, `app/_lib/marketing.ts:80-116`). Mensagem atualmente é apenas uma mensagem interna no chat (`app/_lib/marketing.ts:116-124`).

O scheduler roda dentro do processo Node e há fallback para cron externo (`app/_lib/marketing-scheduler.ts:1-18`, `instrumentation.ts:1-6`).

## 3. Integrações existentes e reaproveitamento

### 3.1 Resend

**Já integrado e reutilizável.** O envio de e-mail está centralizado no módulo de marketing, com:

- autenticação por variável de ambiente;
- assunto, texto e HTML;
- rodapé de comunicação;
- timeout de 15 segundos;
- chave de idempotência para disparos automáticos.

O envio manual de teste de template também reutiliza essa camada. Não criar outro cliente HTTP de e-mail.

### 3.2 Cron externo

**Já suportado.** `POST /api/marketing/executar` é apropriado para Vercel Cron, GitHub Actions, cron de infraestrutura ou outro scheduler, desde que o segredo seja enviado corretamente. A resposta atual é o `RunResult` com totais de agendamento, cancelamento, sucesso e falha (`app/api/marketing/executar/route.ts:5-15`).

### 3.3 Sessão e autorização

**Já existente para a UI web, não é uma API pública pronta.** A autorização está acoplada a cookies e Server Actions. Para consumo por mobile, parceiros ou integrações externas será necessário acrescentar autenticação baseada em token/OAuth ou uma camada de sessão para API; não reutilizar diretamente redirects de `requireUser`/`requireAdmin`.

### 3.4 Componentes que devem ser reaproveitados

- regras de disponibilidade em `availability.ts`;
- revalidação de reservas em `confirmBooking`;
- funções de domínio de reservas em `reservations.ts`;
- autorização por papel em `auth.ts`;
- motor de marketing em `marketing.ts`;
- validações de perfil em `profile.ts`.

Uma API futura deve chamar serviços de domínio compartilhados, não duplicar as regras dentro de route handlers.

## 4. Necessidades de APIs e lacunas

### 4.1 Persistência de produção — prioridade alta

O maior gap estrutural é o armazenamento em arquivo. `readDb` trata qualquer erro de leitura como banco vazio (`app/_lib/db.ts:165-170`), e a fila de escrita é apenas em memória do processo (`app/_lib/db.ts:173-185`). Isso traz riscos de:

- perda aparente de dados quando o arquivo não está disponível;
- incompatibilidade com múltiplas instâncias/serverless;
- corrida entre processos diferentes;
- ausência de índices, transações, constraints e consultas eficientes;
- exposição de senha hash, sessão e dados pessoais no mesmo arquivo operacional.

Antes de abrir uma API pública, migrar o domínio para PostgreSQL/Supabase/Neon ou serviço equivalente, com migrações, índices e transações. A API pode ser a camada HTTP sobre essa persistência, mas não deve mascarar o problema do JSON.

### 4.2 Catálogo de serviços — prioridade média

Serviços, preços, profissionais e durações são constantes em código (`app/_lib/services.ts:1-23`). Não existe CRUD de serviços nem versionamento de preço. Para operação real, o catálogo precisa ser administrável e a reserva deve guardar um snapshot do preço/nome ou referenciar uma tabela histórica.

### 4.3 Reservas concorrentes — prioridade alta

O fluxo revalida disponibilidade, mas o armazenamento atual não oferece constraint transacional entre duas requisições simultâneas. Em banco de produção será necessária uma operação atômica de criação que garanta ausência de sobreposição para o profissional/estúdio.

Também faltam APIs de alteração/remarcação e cancelamento administrativo; hoje há confirmação do cliente e cancelamento do próprio cliente, mas não um contrato de operação para recepção.

### 4.4 Pagamento — prioridade média/alta, conforme escopo comercial

A tela apresenta somente “Pagar no dia (presencial)” e o valor é calculado no front/server; não há gateway, cobrança, webhook, estorno ou status financeiro (`app/(painel)/agendamento/confirmacao/summary-form.tsx:20-74`). Se pagamento online for requisito, será necessária integração com Stripe, Mercado Pago, Asaas ou equivalente.

### 4.5 Mensageria externa — prioridade média

O canal `mensagem` não chama WhatsApp/SMS; `deliver` grava no chat interno (`app/_lib/marketing.ts:116-124`). Para comunicação externa será necessário provedor oficial, opt-in, templates aprovados quando aplicável, webhooks de entrega/leitura e tratamento de opt-out. O chat interno pode continuar existindo como histórico operacional, mas não substitui a entrega externa.

### 4.6 Chat em tempo real — prioridade baixa/média

O admin usa `AutoRefresh`, e as mensagens são lidas do JSON. Não há endpoint de consulta pública nem WebSocket/SSE. Se o chat precisar ser em tempo real ou acessível pelo cliente, será necessário API de mensagens e mecanismo de atualização (SSE, WebSocket, serviço realtime ou polling HTTP).

### 4.7 Recuperação de senha e verificação de contato — prioridade alta para produção

Não há fluxo de “esqueci minha senha”, confirmação de e-mail, confirmação de telefone ou rotação/revogação geral de sessões. A senha pode ser redefinida somente pelo admin (`app/_lib/customer-actions.ts:38-60`). Isso requer e-mail transacional/token de uso único e expiração, aproveitando a integração Resend.

### 4.8 Observabilidade e auditoria — prioridade média

Falhas de marketing são registradas no domínio, mas não há trilha de auditoria para alterações administrativas, métricas, tracing ou alertas. Uma API pública deve ter request ID, logs estruturados, rate limiting, métricas de erro/latência e auditoria de ações sensíveis.

## 5. APIs existentes

| Método | Endpoint | Estado | Responsabilidade | Autenticação |
|---|---|---|---|---|
| POST | `/api/marketing/executar` | Implementado | Executar o ciclo de marketing e devolver contadores | Header `Authorization` comparado com `CRON_SECRET` |

### Server Actions existentes que não são APIs REST públicas

As seguintes operações já existem, mas estão acopladas ao mecanismo de formulário/React Server Functions:

- autenticação: `signUp`, `signIn`, `signOut` (`app/_lib/actions.ts:26-62`);
- reservas: `confirmBooking`, `cancelReservation` (`app/_lib/actions.ts:64-98`);
- chat: `sendMessage` (`app/_lib/actions.ts:119-133`);
- cliente: `updateCustomer`, `setCustomerPassword`, `setCustomerActive` (`app/_lib/customer-actions.ts:16-78`);
- configurações: `addClosure`, `deleteClosure`, `saveSchedule` (`app/_lib/settings-actions.ts:22-97`);
- marketing: templates, regras, execução manual e retry (`app/_lib/marketing-actions.ts:1-250`).

Não duplicar esses fluxos em endpoints apenas para a UI atual. Criar endpoints quando houver consumidor externo, necessidade de integração ou benefício operacional claro.

## 6. APIs novas propostas

Os contratos abaixo são uma proposta de fronteira HTTP. Os nomes podem ser ajustados na fase de desenho OpenAPI.

### 6.1 API de autenticação e conta — prioridade alta

| Método | Endpoint | Objetivo |
|---|---|---|
| POST | `/api/v1/auth/register` | Criar conta de cliente |
| POST | `/api/v1/auth/login` | Autenticar e emitir sessão/token |
| POST | `/api/v1/auth/logout` | Revogar a sessão atual |
| GET | `/api/v1/me` | Retornar o usuário autenticado sem dados sensíveis |
| PATCH | `/api/v1/me` | Atualizar nome, telefone e consentimentos |
| POST | `/api/v1/auth/password-reset/request` | Solicitar link/código de recuperação |
| POST | `/api/v1/auth/password-reset/confirm` | Definir nova senha com token de uso único |

**Entrada principal:** nome, telefone, e-mail, senha, consentimentos; no reset, e-mail e token.  
**Resposta esperada:** `{ "data": { "user": { "id", "name", "email", "phone", "role", "consent" }, "session": { "expiresAt" } }, "error": null }`.  
**Auth:** cadastro/reset podem ser públicos com rate limit; `me`, logout e alteração exigem sessão. Admin deve ter escopos separados. Nunca retornar `passwordHash`, tokens ou sessões.

### 6.2 Disponibilidade e catálogo — prioridade alta

| Método | Endpoint | Objetivo |
|---|---|---|
| GET | `/api/v1/services` | Listar serviços ativos, profissionais, duração e preço |
| GET | `/api/v1/availability?serviceId=...&from=...&to=...` | Retornar horários disponíveis |
| GET | `/api/v1/schedule` | Consultar funcionamento e fechamentos aplicáveis |

**Entrada:** `serviceId`, intervalo ISO `from/to`, opcionalmente profissional. Validar formato, janela máxima e escopo.  
**Resposta:** `{ "data": { "service": {...}, "days": [{ "date": "YYYY-MM-DD", "times": ["HH:MM"] }] }, "error": null }`.  
**Auth:** disponibilidade pública para clientes; configurações completas e dados de fechamentos podem exigir admin.  
**Dependência:** catálogo persistente e serviço de disponibilidade transacional. Deve reutilizar `getSlots`, `getAvailabilityRules` e as regras de fuso `America/Sao_Paulo`.

### 6.3 Reservas — prioridade alta

| Método | Endpoint | Objetivo |
|---|---|---|
| GET | `/api/v1/me/reservations` | Listar reservas do cliente autenticado |
| POST | `/api/v1/reservations` | Criar uma ou mais reservas após revalidação atômica |
| GET | `/api/v1/reservations/{id}` | Consultar uma reserva autorizada |
| PATCH | `/api/v1/reservations/{id}` | Remarcar ou alterar observação, se a política permitir |
| DELETE | `/api/v1/reservations/{id}` | Cancelar reserva futura |
| GET | `/api/v1/admin/reservations?from=...&to=...` | Consultar agenda administrativa |
| PATCH | `/api/v1/admin/reservations/{id}` | Alterar/cancelar uma reserva como admin |

**Entrada de criação:** `{ "items": [{ "serviceId": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "note": "..." }], "paymentMethod": "onsite" }`.  
**Resposta:** `{ "data": { "reservations": [{ "id", "service", "date", "time", "status", "priceCents" }] }, "error": null }`.  
**Erros importantes:** `409 SLOT_UNAVAILABLE`, `422 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`.  
**Auth:** criação/listagem/alteração do próprio cliente; rotas admin exigem papel admin.  
**Dependências:** `/services`, `/availability`, banco com transação/constraint e, se existir, `/payments`.

### 6.4 Clientes e operação administrativa — prioridade alta

| Método | Endpoint | Objetivo |
|---|---|---|
| GET | `/api/v1/admin/customers` | Busca, filtros, ordenação e paginação de clientes |
| GET | `/api/v1/admin/customers/{id}` | Detalhe, métricas e reservas do cliente |
| PATCH | `/api/v1/admin/customers/{id}` | Editar dados e observações |
| PATCH | `/api/v1/admin/customers/{id}/status` | Ativar/desativar conta |
| POST | `/api/v1/admin/customers/{id}/password-reset` | Forçar redefinição de senha |
| GET | `/api/v1/admin/history` | Histórico paginado e métricas por filtros |

**Entrada:** filtros equivalentes aos atuais (`q`, `filtro`, `ordem`, `page`, `pageSize`, datas, cliente, profissional, situação).  
**Resposta:** `{ "data": { "items": [...], "pagination": { "page", "pageSize", "total", "pages" }, "summary": {...} }, "error": null }`.  
**Auth:** admin obrigatório; escopo de cliente impede acesso a credenciais e dados internos indevidos.  
**Dependência:** migração do processamento em memória de `getCustomers`/`filterHistory` para consultas indexadas.

### 6.5 Marketing — prioridade média

| Método | Endpoint | Objetivo |
|---|---|---|
| GET | `/api/v1/admin/marketing/templates` | Listar templates |
| POST | `/api/v1/admin/marketing/templates` | Criar template |
| PATCH | `/api/v1/admin/marketing/templates/{id}` | Editar/ativar/template padrão |
| DELETE | `/api/v1/admin/marketing/templates/{id}` | Remover template |
| GET | `/api/v1/admin/marketing/rules` | Listar regras |
| POST | `/api/v1/admin/marketing/rules` | Criar regra |
| PATCH | `/api/v1/admin/marketing/rules/{id}` | Alterar/pausar regra |
| DELETE | `/api/v1/admin/marketing/rules/{id}` | Excluir regra |
| POST | `/api/v1/admin/marketing/templates/{id}/test` | Enviar teste para um e-mail |
| GET | `/api/v1/admin/marketing/dispatches` | Consultar histórico/filtros |
| POST | `/api/v1/admin/marketing/dispatches/{id}/retry` | Reprocessar falha |
| POST | `/api/v1/admin/marketing/run` | Executar ciclo manualmente |

**Entrada de template:** `{ "name", "channel", "subject", "body", "active", "isDefault" }`.  
**Entrada de teste:** `{ "email": "destino@exemplo.com" }`.  
**Resposta:** recurso criado/alterado ou `{ "data": { "result": { "scheduled", "cancelled", "sent", "failed" } }, "error": null }`.  
**Auth:** admin. O endpoint de teste deve exigir template existente, validar e-mail e impor rate limit.  
**Reuso:** chamar `saveTemplate`, `runMarketing`, `retryDispatch` e o cliente Resend já existente, centralizando a regra de consentimento no motor.

### 6.6 Mensagens e chat — prioridade média

| Método | Endpoint | Objetivo |
|---|---|---|
| GET | `/api/v1/me/messages` | Listar conversa do cliente autenticado |
| POST | `/api/v1/me/messages` | Enviar mensagem do cliente |
| GET | `/api/v1/admin/conversations` | Listar conversas |
| GET | `/api/v1/admin/conversations/{customerId}/messages` | Ler conversa |
| POST | `/api/v1/admin/conversations/{customerId}/messages` | Responder cliente |
| POST | `/api/v1/webhooks/messaging` | Receber mensagens/status de provedor externo |

**Entrada:** `{ "text": "..." }`; webhook deve receber assinatura, evento, mensagem externa e ID idempotente.  
**Resposta:** `{ "data": { "message": { "id", "customerId", "from", "text", "createdAt" } }, "error": null }`.  
**Auth:** cliente somente na própria conversa; admin nas conversas de clientes; webhook por assinatura secreta.  
**Dependência:** decidir se é chat interno, WhatsApp, SMS ou combinação. Sem essa decisão não se deve escolher o provedor.

### 6.7 Pagamentos — prioridade média/alta se houver cobrança online

| Método | Endpoint | Objetivo |
|---|---|---|
| POST | `/api/v1/payments/checkout` | Criar cobrança para reserva |
| GET | `/api/v1/payments/{id}` | Consultar status |
| POST | `/api/v1/webhooks/payments` | Receber confirmação, falha, estorno ou chargeback |
| POST | `/api/v1/admin/payments/{id}/refund` | Solicitar estorno autorizado |

**Entrada:** reserva(s), valor calculado no servidor, método e dados mínimos do cliente.  
**Resposta:** `{ "data": { "paymentId", "status", "checkoutUrl", "amountCents", "currency" }, "error": null }`.  
**Auth:** checkout exige usuário dono da reserva; consulta/estorno exigem escopo apropriado; webhook usa assinatura do gateway.  
**Regra:** nunca aceitar o valor enviado pelo cliente como fonte de verdade. O servidor deve calcular o valor a partir do serviço/preço vigente e usar idempotência.

### 6.8 Configurações administrativas — prioridade baixa/média

| Método | Endpoint | Objetivo |
|---|---|---|
| GET | `/api/v1/admin/settings/schedule` | Consultar funcionamento |
| PUT | `/api/v1/admin/settings/schedule` | Atualizar funcionamento |
| GET | `/api/v1/admin/closures` | Listar fechamentos |
| POST | `/api/v1/admin/closures` | Criar fechamento |
| DELETE | `/api/v1/admin/closures/{id}` | Reabrir período |

**Entrada:** `openWeekdays`, `openTime`, `lastStartTime`, `stepMinutes`, `maxDaysAhead`, `minNoticeHours`; fechamento com início, fim, profissional e motivo.  
**Resposta:** recurso normalizado e lista de conflitos existentes.  
**Auth:** admin.  
**Dependência:** transação com reserva e política explícita para reservas já existentes; hoje o sistema apenas alerta e não cancela (`app/admin/configuracoes/page.tsx:47-69`).

## 7. Dependências entre APIs

```text
Auth / Me
  └── Clientes e permissões
        ├── Catálogo de serviços
        │     └── Disponibilidade
        │           └── Reservas
        │                 ├── Pagamentos (opcional)
        │                 └── Marketing/Comunicações
        ├── Agenda e histórico
        └── Chat / Mensageria

Configurações de agenda ──┘
Marketing ── Resend
Mensageria ── provedor externo + webhooks (futuro)
Pagamentos ── gateway + webhooks (futuro)
```

Ordem técnica recomendada:

1. Persistência, migrações e camada de domínio transacional.
2. Autenticação/API session e contratos de erro.
3. Catálogo e disponibilidade.
4. Reservas com garantia de concorrência.
5. Clientes, agenda e histórico administrativos.
6. Integração de pagamento, se necessária.
7. Mensageria externa e webhooks.
8. Exposição completa do marketing e integrações secundárias.

## 8. Priorização

### Alta

1. Migrar o JSON para banco de produção e adicionar constraints/índices.
2. Garantir reserva atômica e impedir sobreposição entre requisições concorrentes.
3. Criar autenticação de API, recuperação de senha e verificação de contato.
4. Criar catálogo persistente, disponibilidade e reservas versionadas.
5. Criar endpoints administrativos de clientes, reservas e agenda se houver consumo externo.
6. Formalizar webhooks e idempotência para qualquer provedor externo.

### Média

1. Pagamento online e seus webhooks, caso o negócio deixe de ser somente presencial.
2. Integração de WhatsApp/SMS para o canal `mensagem`.
3. APIs de marketing para operação externa, templates, teste e retry.
4. Chat via API e atualização em tempo real.
5. Auditoria, métricas, logs estruturados e alertas.
6. CRUD de serviços e profissionais.

### Baixa

1. API pública para relatórios e exportações.
2. Integração com calendário externo (Google/Outlook).
3. Recursos avançados de campanha, segmentação, clique e abertura.
4. API pública de consulta anônima além de disponibilidade.

## 9. Riscos e recomendações

### Segurança

- Manter autorização dentro de cada Server Action e route handler; a documentação do Next recomenda tratar cada Server Action como entrada não confiável.
- Adotar rate limiting para login, cadastro, reset de senha, envio de teste e webhooks.
- Usar tokens de API com escopo, expiração e rotação; não expor o cookie interno como contrato de integração.
- Redigir logs para não registrar senha, tokens, conteúdo sensível ou credenciais.
- Implementar CORS restritivo, validação de payload e limites de paginação.
- Usar assinatura e janela anti-replay nos webhooks.

### Consistência e concorrência

- Trocar o arquivo JSON por banco com transações.
- Criar uma constraint/regra de exclusão para intervalos de reserva por profissional/estúdio.
- Usar idempotency keys em criação de reserva, pagamento, envio e webhooks.
- Persistir estados de integração e tentativas, em vez de depender somente de um `running` em memória.

### Marketing e consentimento

- Preservar a checagem de consentimento por canal já aplicada no motor (`app/_lib/marketing.ts:235-245`).
- Separar envio de teste de comunicação de marketing real e registrar auditoria do admin.
- Para WhatsApp, respeitar templates aprovados, opt-out e status de entrega.
- Para Resend, considerar webhook de bounce, complaint e delivery; atualmente o projeto somente envia e registra o resultado da chamada.

### Operação

- O scheduler interno pode executar mais de uma vez em múltiplas instâncias; em produção, preferir um worker/cron único com lock distribuído.
- O fallback de leitura para banco vazio pode esconder falha de disco; em produção deve falhar de forma explícita e alertar.
- O histórico atual é calculado em memória e percorre todas as reservas; usar paginação e consultas indexadas antes de crescer.
- Preços e serviços fixos em código impedem operação sem deploy e podem gerar divergência histórica.
- A documentação atual ainda é o README padrão do Next; adicionar contrato OpenAPI, runbook de variáveis de ambiente e política de webhooks.

## 10. Conclusão

O produto já possui boa cobertura funcional para um protótipo operacional: autenticação, agendamento, agenda, clientes, chat, configurações e marketing estão implementados internamente. A lacuna principal não é “falta de endpoint para cada tela”, e sim a ausência de uma base de produção e de contratos externos estáveis.

O próximo marco técnico deve ser a migração do domínio para persistência transacional e a extração de serviços compartilhados para que Server Actions e APIs futuras usem a mesma regra. Depois disso, implementar primeiro autenticação/disponibilidade/reservas, e somente então pagamentos, mensageria externa e exposição administrativa. Isso reduz duplicidade e evita criar APIs sobre regras atualmente dependentes de arquivo local, constantes em código ou estado em memória.

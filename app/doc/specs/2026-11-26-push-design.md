# Avisos no celular (PWA parte B) — desenho

Data: 2026-11-26. Situação: aprovado pelo Vagner na conversa; revisado por um leitor de construção; aguardando a leitura do documento.

Legenda: **[decidido]** veio do Vagner; **[escolha minha]** foi definido por mim e pode ser trocado.

## 1. Para quê

**[decidido]** O barbeiro precisa **saber na hora quando marcam horário** na agenda dele, sem ter de abrir o painel e olhar o sino. O site já é um PWA instalável (parte A, `app/doc/specs/2026-11-26-pwa-design.md`); esta parte manda avisos para o celular (Web Push).

## 2. Objetivos

1. **[decidido]** Vão para o celular: **reserva marcada, remarcada e cancelada** (opção "A" da conversa). Os demais avisos do sino (mensagem, dia fechado, "Confirme quem veio", cliente novo, falhas) continuam só no sino.
2. Quem recebe segue **a mesma regra do sino** (`isForUser` em `app/_lib/notifications.ts`): barbeiro só o do profissional dele; admin tudo; ninguém o que ele mesmo fez. Remarcação que troca de profissional avisa os dois (já são dois avisos no sino).
3. **[escolha minha]** Cada pessoa liga os avisos **no próprio aparelho**; quem não liga não recebe. Admin também pode ligar.
4. O aviso abre a tela certa ao ser tocado.

## 3. Fora do escopo / não-objetivos

- Cliente não recebe nada (chat e lembrete de reserva ficam para outra vez; lembrete depende do cron, que no plano Hobby roda 1 vez por dia).
- Funcionamento sem internet (o service worker não guarda páginas).
- Serviço de terceiros (OneSignal, Firebase).
- Avisos pela API v1 / app de loja.

## 4. O que não pode acontecer (anti-objetivos)

- Um aparelho continuar recebendo a agenda de alguém depois que essa pessoa **saiu da conta** nele (celular emprestado, trocado, conta desativada).
- Falha no envio do aviso **desfazer ou travar** a marcação, ou deixar a resposta da tela lenta.
- Barbeiro receber aviso de agenda que não é dele; alguém receber aviso do que ele mesmo fez.
- Cliente ver o cartão de avisos ou conseguir se inscrever.
- Mostrar dados do cliente na tela bloqueada além do que o sino já mostra (nome do cliente, serviço, dia e hora).

## 5. Abordagens consideradas

- **Web Push direto, com a biblioteca `web-push` e chaves VAPID** (guia do Next: `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`). Grátis, sem empresa de fora, padrão da web. **[decidido]** Escolhida.
- **Serviço de terceiros (OneSignal/Firebase):** painel e estatísticas, mas conta e SDK de fora, dados dos inscritos com eles, limites do plano grátis. Descartado: peso sem ganho para poucos barbeiros.

## 6. Como funciona

### 6.1 Ligar e desligar (tela)

**[decidido]** Cartão **"Avisos no celular"** em **Meus dados** (`/conta`, barbeiro) e em **Perfil** (`/admin/perfil`, admin). Cliente não vê.

Texto: título "Avisos no celular"; "Receba na hora as marcações, remarcações e cancelamentos da sua agenda." Estados:

| Situação | O cartão mostra |
|---|---|
| Aparelho pode receber, ainda não ligado | botão **"Ativar neste aparelho"** (pede a permissão do navegador) |
| Já ligado neste aparelho | "Avisos ligados neste aparelho." + botão **"Desativar"** |
| iPhone/iPad fora do app instalado | "Para receber avisos no iPhone, instale o app primeiro." + o caminho Compartilhar → "Adicionar à Tela de Início" |
| Permissão negada | "Os avisos estão bloqueados neste aparelho. Libere nas configurações do navegador ou do celular." |
| Navegador sem suporte a Web Push | "Este navegador não recebe avisos." |

- **[decidido]** Computador também pode ligar (Chrome/Edge recebem).
- **[escolha minha]** "Ligado neste aparelho" é o que o navegador diz (inscrição existente no service worker) **e** o servidor ainda tê-la para esta sessão; se o servidor perdeu (ex.: saiu e entrou de novo), o cartão volta a "Ativar".

### 6.2 O aviso

- Título por tipo: **"Nova marcação"**, **"Remarcação"**, **"Cancelamento"**. Corpo: o mesmo texto do sino (`pushReservationNotice`), ex.: "Ana marcou Corte · 27/11 10:00".
- Ícone: `/icons/icon-192.png` (parte A).
- Tocar abre o mesmo endereço que o sino usa para o aviso (agenda no dia). Se já houver uma janela do app aberta, ela é focada e levada para esse endereço; sem login, o site já manda para o login.
- **[escolha minha]** Avisos da mesma reserva se substituem no aparelho (mesma `tag`), para não empilhar marcou/remarcou/cancelou do mesmo horário.

### 6.3 Quem recebe e quando

- O envio acontece **depois** que a gravação da reserva terminou (fora da transação de `updateDb`) e **sem atrasar a resposta** — **[escolha minha]** com `after()` do Next (roda depois da resposta, também na Vercel).
- **[escolha minha]** Uma ação gera no máximo **um envio por pessoa e reserva** (a remarcação que troca de profissional cria dois avisos no sino, mas o admin recebe um só no celular).
- Destinatários: para cada aviso de reserva criado na ação, as inscrições de usuários **ativos** para quem `isForUser(aviso, usuário)` é verdadeiro, lido no momento do envio (barbeiro rebaixado ou desativado deixa de receber na hora).
- Vale para **toda origem** da reserva: site do cliente, painel da equipe e API v1 — todas passam por `pushReservationNotice`.

### 6.4 Inscrições (banco)

- Tabela nova **`push_subscriptions`** (migração **`0008`**): uma linha por aparelho inscrito — endpoint (único), chaves `p256dh` e `auth`, usuário, data de criação e **a sessão em que foi feita**.
- **[escolha minha]** A inscrição pertence à **sessão** (FK para `sessions.token`, que guarda o hash, com `ON DELETE CASCADE`): "Sair" (`revokeSession`), troca de senha e desativação (`revokeUserSessions`) apagam a inscrição junto. Isso cumpre o anti-objetivo do aparelho emprestado.
- **[escolha minha]** Sessão vencida não é apagada na hora (só quando a pessoa entra de novo): por isso o envio só usa inscrições cuja sessão tem `expiresAt` no futuro.
- Mesmo endpoint inscrito de novo (outra pessoa no mesmo aparelho, ou nova sessão) substitui a linha anterior.
- A tabela é lida e gravada **com consultas diretas**, fora do `readDb`/`updateDb` (diferente de `sessions`, que está dentro). Assim o `ON DELETE CASCADE` age sem brigar com o `save` do `updateDb`.
- Envio que volta **404 ou 410** (aparelho desinstalou/expirou) apaga a inscrição. Outros erros só vão para o log; não repetem.
- LGPD: excluir o usuário apaga as inscrições (cascata pelo usuário e pela sessão).

### 6.5 Service worker

- Arquivo `public/sw.js`, registrado só quando a pessoa usa o cartão (e verificado ao abrir o cartão). Faz só duas coisas: mostrar o aviso (`push`) e abrir/focar a tela (`notificationclick`). **Sem cache** e sem interceptar requisições.
- Cabeçalhos conforme o guia do Next (`Content-Type` JS, `Cache-Control: no-cache`, CSP restrita) em `next.config`.

### 6.6 Chaves

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`, geradas uma vez; `VAPID_SUBJECT` = `mailto:` do e-mail do estúdio. Em `.env` (local), `.env.test` (teste) e na Vercel (produção). Colocar na Vercel é com o dono ou com a autorização dele.
- Sem as chaves configuradas: o cartão diz que os avisos não estão disponíveis e nada é enviado (sem erro).

## 7. Testes

- Domínio (`node:test`, banco de teste): quem recebe cada tipo (barbeiro dono, outro barbeiro, admin, autor da ação, desativado, cliente), remarcação com troca de profissional, só os três tipos de reserva, inscrição apagada ao sair/trocar senha, 404/410 apaga, falha do envio não afeta a reserva. O envio real é trocado por um falso nos testes.
- Navegador (servidor de teste): cartão nos estados possíveis; ativar no Chrome do computador e receber um aviso de verdade ao marcar como cliente.
- Aparelho real (dono): iPhone com o app instalado e Android.

## 8. Deixado para quem constrói

- Formato exato das funções e onde guardar a fila de avisos da ação até o `after()`.
- Detalhes do visual do cartão, seguindo `app/_components/ui.tsx`.
- Como trocar o envio real por um falso nos testes.

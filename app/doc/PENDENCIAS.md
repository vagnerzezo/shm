# Pendências — Studio Heitor Macks (SHM)

**Atualizado em:** 2026-11-25.
**Estado atual:** site em produção em https://shm-eta.vercel.app (deploy automático a cada push na `main`), banco no projeto Neon `shm` com as migrações até a `0007`. Último commit: `6a27aa9` (Início, chat do barbeiro e sino), já em produção.

Ordem: primeiro o que afeta a segurança da produção, depois o que melhora o produto.

## Onde paramos (2026-11-26)

**Feito em 2026-11-19:**
- 1.1 Admin real em produção (conta pessoal do dono); contas `@shm.test` apagadas da produção.
- 1.3 Limite de cadastros por IP (10/hora), migração `0004`.
- 1.4 Backups do Neon conferidos: snapshot `base-2026-11-19-admin-real` e restauração testada (ver "Como restaurar").
- 1.6 E-mails de boas-vindas e redefinição de senha conferidos em produção.
- Seção 2, itens 1, 2, 6, 7 e o "+55" do 8; o corte do chat da seção 4.
- Celular: boas-vindas do login em `/`, painel com animação, Esqueci/Criar nova senha no mesmo layout (`MobileSheet`); botão de olho em todos os campos de senha.

**Feito em 2026-11-20** (desenhos e planos em `app/doc/specs/` e `app/doc/plans/`):
- **Área do barbeiro** (`2026-11-20-area-barbeiro`): todo barbeiro tem, fixo, Minha agenda (calendário com marcar/remarcar/cancelar), Clientes (só os que já atendeu; a ficha abre para qualquer horário com ele), Histórico (só os dele) e Meus dados. Configurações → Equipe só com Admin/Barbeiro. Barbeiro não troca e-mail nem autorizações do cliente. Barbeiro sem profissional vai para Meus dados.
- **Início do admin** (`2026-11-20-inicio-chat-notificacoes`, parte 1): números (Hoje, Faturado) e a agenda do dia no visual da Agenda.
- **Chat do barbeiro** (parte 2, migração `0006`): menu Chat com os clientes dele, na conversa única do estúdio; o cliente vê o nome de quem respondeu.
- **Sino de notificações** (parte 3, migração `0007`): ao lado do ícone de usuário, para admin e barbeiro; marcações, remarcações, cancelamentos, mensagens, dia fechado, "Confirme quem veio", cliente novo e falhas de envio. Abrir marca tudo como visto; avisos com mais de 30 dias são apagados.
- Ícone de usuário do barbeiro leva a Meus dados (`/conta`).

**Feito em 2026-11-23:**
- Snapshot do Neon trocado (`base-2026-11-23-sino-chat`) e a seção 3 conferida no navegador.
- Seção 4: Descadastrar no layout de celular; barbeiro salva Meus dados sem telefone; admin define nova senha do barbeiro; e-mails de marketing com o rodapé do estúdio.
- Seção 2 inteira: limite de login também em paralelo; login com o mesmo tempo com ou sem conta; `Authorization` não-Bearer não derruba o cookie; API recusa cookie vindo de outro site; foto do login conferida.
- Pontos menores: login/cadastro não perdem o que foi digitado; sino não marca como visto aviso que não apareceu, leva os avisos ao renomear profissional, mostra a remarcação do cliente uma vez, junta falhas de marketing num aviso e passa o foco para a lista; cancelamento do barbeiro registrado como barbeiro; barbeiro sem profissional vê só Meus dados; 404 do painel leva direto ao início de cada um.

**Feito em 2026-11-25** (lista de ajustes do dono, em `Analise.md`):
- Seção 2 enviada e no ar.
- Celular do cliente: menu e ícone de usuário juntos à direita; card de serviço mais baixo (tempo em cima do preço); sem "+ Fila de espera" (não fazia nada); escolher o dia abre calendário e horários numa janela; confirmação sem Observação; cards de Minhas reservas e da confirmação não quebram mais.
- Login no computador com botões em pílula como no celular; Início do admin sem "Confirme quem veio" (continua no sino) e com Próximos dias na largura toda; Desativar e Excluir lado a lado no detalhe do cliente.
- Profissionais saíram de Serviços e foram para Configurações; linha de serviço no celular arrumada.
- E-mails do sistema com textos editáveis (Marketing → Templates → E-mails do sistema): assunto, título, texto, botão e observações, com marcadores; link, card da reserva e rodapé continuam automáticos; "Voltar ao texto original". Guardado em `settings` (chave `systemEmails`), sem migração.
- Sino: decidido com o dono que **admin vê o que outro admin fez** (menos o que ele mesmo fez), que já era o comportamento; ficou um teste para isso. Admin excluir cliente agora avisa os horários futuros cancelados (como quando o próprio cliente exclui a conta).
- Código: saiu o campo `menus` de `Customer` e o `menusOf` (sem uso desde a área do barbeiro). A coluna `users.menus` continua no banco, sem uso; a resposta de login/cadastro da API não traz mais `menus`.
- Horários de 15 em 15 min: não reproduziu (em produção o intervalo já é 45 min). Em 2026-11-26 o dono confirmou que não aparece mais: resolvido.

**Feito em 2026-11-26** (branch `feat/pwa`; desenho `app/doc/specs/2026-11-26-pwa-design.md`, plano `app/doc/plans/2026-11-26-pwa.md`):
- Decidido com o dono: o "app de celular" é um **PWA** (o próprio site instalável), não app de loja. Parte A (instalar) feita; parte B (notificações no celular) fica para depois.
- Manifesto (`app/manifest.ts`): nome "Studio Heitor Macks", embaixo do ícone **"SHM"**, abre em `/` em tela cheia, preto `#121212`. Ícones gerados por `node scripts/gerar-icones-app.mjs` (logo branco sobre preto) em `public/icons/` e `app/apple-icon.png`.
- Faixa "Instale o app do estúdio" no alto das áreas logadas, só no celular: no Android, botão "Instalar"; no iPhone, o caminho Compartilhar → "Adicionar à Tela de Início". "Agora não" esconde naquele aparelho; some quando já está instalado. Não aparece no login nem no computador.
- `pnpm test` com 213 de 213 (inclui `tests/pwa.test.ts`). Sem migração. (Depois da parte B: 244 de 244.)
- Como instalar à mão: **Android/Chrome** → menu ⋮ → "Instalar app"; **iPhone/Safari** → Compartilhar → "Adicionar à Tela de Início" (no navegador do Instagram/Facebook não dá: abrir no Safari).

**Avisos no celular (PWA parte B), 2026-11-26** (branch `feat/push`; desenho `app/doc/specs/2026-11-26-push-design.md`, plano `app/doc/plans/2026-11-26-push.md`):
- Barbeiro (e admin que ligar) recebe no aparelho, na hora, reserva **marcada, remarcada e cancelada** da agenda dele, com a regra do sino. Cartão "Avisos no celular" em **Meus dados** (barbeiro) e **Perfil** (admin); cliente não vê. No iPhone só com o app instalado (iOS 16.4+).
- Tabela `push_subscriptions` (migração `0008`), presa à sessão: sair, trocar senha, ser desativado ou excluído apaga. Envio com `web-push` depois da resposta (`after()`), urgência alta; 404/410 apaga a inscrição. Service worker `public/sw.js` (sem cache).
- Chaves: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto do dono) no `.env`; as de teste no `.env.test`. **Faltam na Vercel.**
- Conferido no navegador por partes (o Chrome automatizado recusa a inscrição real): cartão, gravação, envio cifrado pelo servidor, aviso mostrado pelo service worker, sair/entrar, permissão negada, iPhone fora do app. **Falta:** aviso de verdade num celular.
- Pontos menores da revisão **feitos em 2026-11-26** (branch `fix/pontos-menores`): envio agendado com `after()` direto no `updateDb`; tempo limite de 10 s; só endereços de serviços de push conhecidos (Google, Mozilla, Microsoft, Apple); `clients.claim()` e abrir janela nova se não der para navegar; service worker instalado só ao "Ativar"; envio lê só as colunas de usuários; "Verificando…" no cartão. Faixa de instalar: toque duplo não gera erro; "Agora não" vale até recarregar mesmo sem armazenamento. App instalado não trava mais em pé.
- Ficaram de lado de propósito: ícones um pouco borrados (precisa de um logo maior ou em vetor do dono); marcou-e-cancelou em seguida pode deixar o aviso errado no celular (raro; precisaria de fila com ordem).

**Pontos menores que sobraram** (os feitos estão nos resumos acima):
- Sino: o número pode atrasar até 30 s ao trocar de página (é o intervalo da atualização automática). Deixado assim de propósito: corrigir pediria recarregar a moldura a cada troca de página (o dobro de consultas).
- Barbeiro: admin de `ADMIN_EMAILS` não é rebaixado de verdade (hoje `ADMIN_EMAILS` não está ligado na Vercel). Só importa se a 1.2 voltar.

**Próximos passos, em ordem:**
1. **Pelo painel (dono do projeto):** criar o acesso de barbeiro do Heitor com o e-mail real (Configurações → Profissionais; saiu de Serviços em 2026-11-25). Com ele criado: marcar e cancelar uma reserva (fecha o teste de e-mail da 1.6) e conferir o sino e o chat do lado dele. Se precisar, "Nova senha" ao lado do acesso define outra senha provisória.
2. **Pontos menores que sobraram** (acima): os dois que restam ficaram de lado de propósito.
3. **Por último, 1.5 — domínio próprio** (combinado deixar para o fim); decidir junto o remetente dos e-mails (hoje `vagnerzezo.com.br`).

Em 2026-11-26 o dono pediu para deixar o acesso do Heitor (passo 1) e o domínio (passo 3) por último. O PWA (acima) entrou antes deles; falta enviar o branch `feat/pwa` (juntar na `main` e `git push origin main`) e instalar num celular de verdade para conferir.

Estado no fim de 2026-11-25:
- **No ar na Vercel:** tudo até `5c7ab2b` (enviado em 2026-11-26, inclui `3ebd612`: admin excluir cliente avisa os horários cancelados; sai o campo `menus`). Deploy conferido (Ready, `shm-eta.vercel.app` respondendo).
- `pnpm test` com 201 de 201 (inclui `tests/email-texts.test.ts`); coleção da API (`pnpm test:api`) com 117 pedidos e 238 verificações, sem falhas (rodada depois de tirar `menus`).
- Nenhuma migração nova depois da `0007`; o snapshot do Neon `base-2026-11-23-sino-chat` já tem tudo do banco (os textos editados dos e-mails entram em `settings`, chave `systemEmails`).
- Fora do git: `Analise.md` (lista de ajustes do dono, toda feita em 2026-11-25, menos os horários de 15 min, que não reproduziram) e uma mudança solta em `app/not-found.tsx` (só um espaço no fim; não é nossa, não foi commitada).

**Lembretes:**
- Testes: `pnpm test` leva uns 13 minutos (banco de teste no Neon); não rodar junto com o servidor de teste (mesmo banco).
- Migração nova vai **antes** do push: `node node_modules/drizzle-kit/bin.cjs migrate` (usa o `.env`, banco de produção); no teste, `pnpm test:migrate`.
- `git push` sozinho falha ("multiple upstream branches"); usar `git push origin main` ou corrigir com `git config --unset-all branch.main.merge && git config branch.main.merge refs/heads/main`.
- Neon Free: só 6 horas de restauração e 1 snapshot manual; antes de mudança grande, trocar o snapshot (ver "Como restaurar").

---

## 1. Antes de divulgar o site (segurança da produção)

| # | O que fazer | Por quê |
|---|---|---|
| 1.1 | ~~Criar a conta de admin e apagar as contas de teste~~ **Feito (2026-11-19):** admin é a conta pessoal do dono do projeto; `cliente@`, `admin@` e `heitor@shm.test` apagadas da produção. **Falta:** criar pelo painel o acesso de barbeiro do Heitor com o e-mail real | O `.data/contas-teste.txt` local ficou obsoleto |
| 1.2 | Se um dia voltar a usar `ADMIN_EMAILS`, criar antes a conta de cada e-mail da lista | Quem se cadastrar com um e-mail da lista que ainda não tem conta vira admin. Por isso `ADMIN_EMAILS` não está configurado na Vercel |
| 1.3 | ~~Limitar tentativas também no **cadastro**~~ **Feito (2026-11-19):** até 10 cadastros por hora por IP, contando os recusados por e-mail em uso (tabela `signup_attempts`, migração `0004`) | Igual ao login, a contagem fica fora de trava (ver 2.3) |
| 1.4 | ~~Conferir os **backups do Neon**~~ **Feito (2026-11-19):** plano Free = volta até **6 horas** no tempo, 1 snapshot manual, sem backup agendado. Snapshot `base-2026-11-19-admin-real` criado e restauração testada num branch separado (apagado depois). Ver "Como restaurar" abaixo. **Trocado em 2026-11-23** por `base-2026-11-23-sino-chat` | Antes de mudanças grandes, apagar o snapshot antigo e criar outro (o Free só guarda 1). Backup recorrente (Launch ou `pg_dump` próprio) fica para quando houver clientes de verdade |
| 1.5 | **Domínio próprio** (ex.: `agenda.studioheitormacks.com.br`) na Vercel e trocar o `APP_URL` | Os links dos e-mails usam o `APP_URL`; hoje é `shm-eta.vercel.app` |
| 1.6 | ~~Mandar um **e-mail de teste** em produção~~ **Boas-vindas e redefinição de senha conferidos (2026-11-19):** chegaram na caixa de entrada do Hotmail, com imagens; o link de redefinição abre o formulário em produção (e um pedido novo invalida o link anterior, como esperado). Domínio `vagnerzezo.com.br` verificado no Resend (DKIM e SPF ok, DMARC `p=none`); imagens em `/img/email/` respondem 200. **Falta:** confirmação/cancelamento de reserva (testar depois de criar o acesso do Heitor) | O remetente é `vagnerzezo.com.br`, não um domínio do estúdio; rever junto com a 1.5 |

### Como restaurar o banco de produção

Projeto Neon **`shm`** (`long-lake-61916363`), branch `production`.

- **Algo apagado há menos de 6 horas:** `neon branches restore production production@<horário RFC 3339> --project-id long-lake-61916363` (ou no console: Branches → production → Restore). Dá para criar antes um branch no horário para conferir.
- **Voltar ao snapshot:** `neon snapshots restore base-2026-11-23-sino-chat --project-id long-lake-61916363 --name conferir` cria um branch separado para olhar; só `neon snapshots finalize <branch>` troca a produção por ele.
- **Novo snapshot** (o Free guarda 1): `neon snapshots delete <id>` e depois `neon snapshots create --project-id long-lake-61916363 --branch production --name <nome>`.

## 2. Itens adiados da revisão final (menores)

Detalhes na seção "Andamento" de `app/doc/plans/2026-11-11-api-v1.md`.

1. ~~Observação de reserva com mais de 300 caracteres é cortada sem aviso~~ **Feito (2026-11-19).** Agora é `400` no campo `note`; `\r\n` do formulário conta como 1 caractere.
2. ~~`PATCH /me` com só uma das autorizações zera a outra; tipo errado não dá 400~~ **Feito (2026-11-19).** Só as chaves enviadas mudam; tipo errado é `400` no campo `consent`.
3. ~~Limite de login burlável com várias tentativas ao mesmo tempo~~ **Feito (2026-11-23):** a tentativa é gravada antes de conferir a senha e entra na contagem.
4. ~~O tempo de resposta do login revela se o e-mail tem conta~~ **Feito (2026-11-23):** sem conta, a senha é conferida contra um hash de mentira (mesmo tempo).
5. ~~Um cabeçalho `Authorization` que não é `Bearer` faz o site ignorar o cookie~~ **Feito (2026-11-23):** só `Bearer` tem prioridade; outro tipo é ignorado e vale o cookie.
6. ~~Remarcar e o aviso no chat em transações separadas~~ **Feito (2026-11-19).** O aviso é gravado dentro de `rescheduleForCustomer`.
7. ~~"Remover profissional" mostra sucesso com outro admin ligado~~ **Feito (2026-11-19).** A tela mostra "Ligado a outro admin" e, se o domínio recusar, o erro aparece (o `ConfirmButton` aceita `{ error }`).
8. ~~A foto do login do celular também é baixada no computador~~ **Conferido (2026-11-23):** todas as telas usam a mesma foto com os mesmos tamanhos; o navegador baixa uma vez só. ~~"+55" digitado no telefone dá erro~~ **Feito (2026-11-19):** o DDI 55 na frente de 12 ou 13 dígitos é removido.
9. ~~As rotas da API aceitam o cookie do site sem checar `Origin`~~ **Feito (2026-11-23):** pedido que muda dados, com cookie e `Origin` de outro site, recebe 403 (app com Bearer e clientes sem `Origin` passam).

## 3. ~~Não conferido no navegador~~ Conferido no navegador (2026-11-23, servidor de teste)

- ~~Mensagem de conta desativada no login~~ ok: "Sua conta está desativada. Fale com o estúdio." (detalhe: o campo de e-mail fica vazio depois do erro).
- ~~Remarcar uma reserva pelo admin~~ ok: horário muda na Agenda, aviso "Reserva remarcada." e gravado no banco.
- ~~Mensagem de senha errada ao excluir a conta~~ ok: "Senha incorreta." e a conta continua ativa.
- ~~"Compareceu/Faltou" do admin na Agenda~~ ok: troca nos dois sentidos (Faltou ↔ Realizado) e grava no banco.

## 4. Produto e telas

- ~~Outras telas fora do painel no celular~~ **Feito (2026-11-19):** Esqueci minha senha e Criar nova senha usam o `MobileSheet` (mesmo layout de Entrar/Criar conta). **Descadastrar também (2026-11-23).**
- ~~**Barbeiro em "Meus dados"** precisa informar telefone~~ **Feito (2026-11-23):** para barbeiro o telefone é opcional (se informado, é conferido). De quebra, Meus dados e o perfil do admin recarregam ao salvar; antes o formulário voltava a mostrar os valores antigos.
- ~~**O admin não redefine a senha do barbeiro**~~ **Feito (2026-11-23):** "Nova senha" em Configurações → Profissionais (antes em Serviços), ao lado do acesso; encerra as sessões dele.
- ~~**Chat do site** corta mensagens acima de 2000 caracteres sem avisar~~ **Feito (2026-11-19):** o site usa a mesma regra da API e mostra o erro.
- ~~**E-mails de marketing** com rodapé simples~~ **Feito (2026-11-23):** mesmo rodapé dos e-mails do sistema, com "Deixar de receber" na última linha. O corpo continua o texto do template, sem a moldura com logo.
- **App de celular:** virou PWA (2026-11-26, parte A: instalar). **Parte B feita em 2026-11-26** para a equipe (marcação/remarcação/cancelamento). **Para depois:** avisos para o cliente (chat, lembrete de reserva; lembrete depende do cron, 1 vez por dia no Hobby). A API v1 continua pronta (`app/doc/api/openapi.yaml`) caso um app de loja volte a ser assunto.

## 5. Evolução da API e do banco (do mapeamento, seção 9)

- **Profissional como entidade com id** (hoje a chave é o nome; renomear mexe em várias tabelas).
- Trocar o `readDb` (que lê o banco inteiro) por **consultas sob medida** na agenda e nos horários livres, antes de o volume crescer. Medido em 2026-11-26: a produção tem 6 usuários e 4 reservas, cerca de 6 KB, e o `readDb` leva uns 26 ms (do computador local até São Paulo). Ainda não compensa; rever quando passar de alguns milhares de reservas.
- **CORS**, **limite de requisições geral** e **chave de idempotência** em `POST /reservations`, se o app precisar.
- Integrações futuras: WhatsApp como canal de mensagem e pagamento online (fora do escopo atual).

## 6. Vercel

- **Plano Hobby:** o cron do marketing roda 1 vez por dia (9h de Brasília). No Pro dá para voltar a cada 15 minutos (`vercel.json`).
- **Node:** a Vercel usa 26.x, e a máquina local usa 22. Fixar a mesma versão se aparecer diferença.
- **Deploys de preview** não têm variáveis de ambiente (de propósito, para não tocar no banco real); páginas que usam o banco dão erro neles.

## 7. Limpeza local

- Neon: a **produção é o projeto `shm`** (`long-lake-61916363`, São Paulo) e os testes ficam no **`shm-test`**. O antigo `shm-app` já não aparece na conta (conferido em 2026-11-19).
- ~~Branches locais antigos já incorporados na `main`~~ **Apagados em 2026-11-26.**
- Rodar o `pnpm dev` **sem `sudo`**.

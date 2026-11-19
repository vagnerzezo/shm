# Pendências — Studio Heitor Macks (SHM)

**Atualizado em:** 2026-11-19 (noite).
**Estado atual:** API v1 concluída e revisada, site em produção em https://shm-eta.vercel.app (deploy automático a cada push na `main`), banco no projeto Neon `shm`. Último commit de código: `494c6a6` (telas de conta no celular e mostrar senha), já em produção.

Ordem: primeiro o que afeta a segurança da produção, depois o que melhora o produto.

## Onde paramos (2026-11-19)

**Feito neste dia:**
- 1.1 Admin real em produção (conta pessoal do dono); contas `@shm.test` apagadas da produção.
- 1.3 Limite de cadastros por IP (10/hora), migração `0004_signup_attempts` aplicada em produção.
- 1.4 Backups do Neon conferidos: snapshot `base-2026-11-19-admin-real` e restauração testada (ver "Como restaurar").
- 1.6 E-mails de boas-vindas e redefinição de senha conferidos em produção (caixa de entrada do Hotmail).
- Seção 2, itens 1, 2, 6, 7 e o "+55" do 8; e o corte do chat da seção 4.
- Celular: visitante em `/` vê a boas-vindas do login; painel branco sobe com animação (`auth-sheet-in` em `globals.css`); Esqueci/Criar nova senha no mesmo layout (`MobileSheet`).
- Botão de olho (mostrar/ocultar) em todos os campos de senha (`app/_components/password-input.tsx`).

**Em andamento — permissões da equipe** (branch `feat/permissoes-equipe`, ainda **não** está na `main` nem em produção):
- Desenho aprovado: `app/doc/specs/2026-11-19-permissoes-equipe-design.md`. Plano: `app/doc/plans/2026-11-19-permissoes-equipe.md` (8 tarefas, execução no próprio chat).
- **Feito (tarefas 1 a 4):** colunas `menus` e `created_by` (migração `0005`, aplicada **só no banco de teste**); regra central `app/_lib/access.ts` (`canOpen`, `scopeOf`, `requireMenu`, `assertMenu`); agenda e clientes filtrados por profissional; `app/_lib/domain/team.ts` (`getTeam`, `setTeamMember`).
- **Falta:** tarefa 5 (marcar/remarcar/cancelar respeitando o escopo), 6 (telas e ações usando a regra, menu do barbeiro), 7 (cartão Equipe em Configurações), 8 (docs e produção) e a revisão final.
- Para retomar: `git checkout feat/permissoes-equipe` e seguir o plano a partir da tarefa 5. O registro do andamento fica em `.superpowers/sdd/2026-11-19-permissoes-equipe/progress.md` (local, fora do git).
- Lembrete: a migração `0005` vai para o banco de produção **antes** do merge/push na `main`.

**Próximos passos, em ordem:**
1. **Pelo painel (dono do projeto):** criar o acesso de barbeiro do Heitor com o e-mail real; com ele criado, marcar e cancelar uma reserva para fechar o teste de e-mail da 1.6.
2. **Seção 3:** conferir no navegador (servidor de teste, porta 3100) as 4 telas cobertas só por teste automático.
3. **Seção 4:** visual novo no celular para Descadastrar; barbeiro salvar "Meus dados" sem telefone; admin redefinir a senha do barbeiro; rodapé novo nos e-mails de marketing.
4. **Seção 2, o que sobrou** (risco baixo): itens 3, 4, 5, 9 e a foto do login no computador (8).
5. **Por último, 1.5 — domínio próprio** (combinado deixar para o fim); decidir junto o remetente dos e-mails (hoje `vagnerzezo.com.br`).

**Lembretes:**
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
| 1.4 | ~~Conferir os **backups do Neon**~~ **Feito (2026-11-19):** plano Free = volta até **6 horas** no tempo, 1 snapshot manual, sem backup agendado. Snapshot `base-2026-11-19-admin-real` criado e restauração testada num branch separado (apagado depois). Ver "Como restaurar" abaixo | Antes de mudanças grandes, apagar o snapshot antigo e criar outro (o Free só guarda 1). Backup recorrente (Launch ou `pg_dump` próprio) fica para quando houver clientes de verdade |
| 1.5 | **Domínio próprio** (ex.: `agenda.studioheitormacks.com.br`) na Vercel e trocar o `APP_URL` | Os links dos e-mails usam o `APP_URL`; hoje é `shm-eta.vercel.app` |
| 1.6 | ~~Mandar um **e-mail de teste** em produção~~ **Boas-vindas e redefinição de senha conferidos (2026-11-19):** chegaram na caixa de entrada do Hotmail, com imagens; o link de redefinição abre o formulário em produção (e um pedido novo invalida o link anterior, como esperado). Domínio `vagnerzezo.com.br` verificado no Resend (DKIM e SPF ok, DMARC `p=none`); imagens em `/img/email/` respondem 200. **Falta:** confirmação/cancelamento de reserva (testar depois de criar o acesso do Heitor) | O remetente é `vagnerzezo.com.br`, não um domínio do estúdio; rever junto com a 1.5 |

### Como restaurar o banco de produção

Projeto Neon **`shm`** (`long-lake-61916363`), branch `production`.

- **Algo apagado há menos de 6 horas:** `neon branches restore production production@<horário RFC 3339> --project-id long-lake-61916363` (ou no console: Branches → production → Restore). Dá para criar antes um branch no horário para conferir.
- **Voltar ao snapshot:** `neon snapshots restore base-2026-11-19-admin-real --project-id long-lake-61916363 --name conferir` cria um branch separado para olhar; só `neon snapshots finalize <branch>` troca a produção por ele.
- **Novo snapshot** (o Free guarda 1): `neon snapshots delete <id>` e depois `neon snapshots create --project-id long-lake-61916363 --branch production --name <nome>`.

## 2. Itens adiados da revisão final (menores)

Detalhes na seção "Andamento" de `app/doc/plans/2026-11-11-api-v1.md`.

1. ~~Observação de reserva com mais de 300 caracteres é cortada sem aviso~~ **Feito (2026-11-19).** Agora é `400` no campo `note`; `\r\n` do formulário conta como 1 caractere.
2. ~~`PATCH /me` com só uma das autorizações zera a outra; tipo errado não dá 400~~ **Feito (2026-11-19).** Só as chaves enviadas mudam; tipo errado é `400` no campo `consent`.
3. Limite de login burlável com várias tentativas ao mesmo tempo (conta e grava fora de trava).
4. O tempo de resposta do login revela se o e-mail tem conta (já era assim antes da API).
5. Um cabeçalho `Authorization` que não é `Bearer` faz o site ignorar o cookie (a pessoa aparece deslogada).
6. ~~Remarcar e o aviso no chat em transações separadas~~ **Feito (2026-11-19).** O aviso é gravado dentro de `rescheduleForCustomer`.
7. ~~"Remover profissional" mostra sucesso com outro admin ligado~~ **Feito (2026-11-19).** A tela mostra "Ligado a outro admin" e, se o domínio recusar, o erro aparece (o `ConfirmButton` aceita `{ error }`).
8. A foto do login do celular também é baixada no computador. ~~"+55" digitado no telefone dá erro~~ **Feito (2026-11-19):** o DDI 55 na frente de 12 ou 13 dígitos é removido.
9. As rotas da API aceitam o cookie do site sem checar `Content-Type`/`Origin` (o `SameSite=Lax` já protege).

## 3. Não conferido no navegador (só por teste automático)

- Mensagem de conta desativada no login.
- Remarcar uma reserva pelo admin.
- Mensagem de senha errada ao excluir a conta.
- "Compareceu/Faltou" do admin na Agenda, que agora usa a mesma regra da API.

## 4. Produto e telas

- ~~Outras telas fora do painel no celular~~ **Feito (2026-11-19):** Esqueci minha senha e Criar nova senha usam o `MobileSheet` (mesmo layout de Entrar/Criar conta). **Falta:** Descadastrar.
- **Barbeiro em "Meus dados":** a conta nasce sem telefone, então ele precisa informar um para salvar.
- **O admin não redefine a senha do barbeiro** (só a de clientes). Hoje o barbeiro usa "Esqueci minha senha", ou o admin recria o acesso.
- ~~**Chat do site** corta mensagens acima de 2000 caracteres sem avisar~~ **Feito (2026-11-19):** o site usa a mesma regra da API e mostra o erro.
- **E-mails de marketing** ainda usam o rodapé simples antigo.
- **App de celular:** a API está pronta (`app/doc/api/openapi.yaml`), mas o app em si não começou.

## 5. Evolução da API e do banco (do mapeamento, seção 9)

- **Profissional como entidade com id** (hoje a chave é o nome; renomear mexe em várias tabelas).
- Trocar o `readDb` (que lê o banco inteiro) por **consultas sob medida** na agenda e nos horários livres, antes de o volume crescer.
- **CORS**, **limite de requisições geral** e **chave de idempotência** em `POST /reservations`, se o app precisar.
- Integrações futuras: WhatsApp como canal de mensagem e pagamento online (fora do escopo atual).

## 6. Vercel

- **Plano Hobby:** o cron do marketing roda 1 vez por dia (9h de Brasília). No Pro dá para voltar a cada 15 minutos (`vercel.json`).
- **Node:** a Vercel usa 26.x, e a máquina local usa 22. Fixar a mesma versão se aparecer diferença.
- **Deploys de preview** não têm variáveis de ambiente (de propósito, para não tocar no banco real); páginas que usam o banco dão erro neles.

## 7. Limpeza local

- Neon: a **produção é o projeto `shm`** (`long-lake-61916363`, São Paulo) e os testes ficam no **`shm-test`**. O antigo `shm-app` já não aparece na conta (conferido em 2026-11-19).
- Branches locais antigos já incorporados na `main`: `feat/postgres`, `feat/regras-agenda`, `feat/inicio-cliente`, `docs/mapeamento-sistemas`.
- Rodar o `pnpm dev` **sem `sudo`**.

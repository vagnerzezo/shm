# Pendências — Studio Heitor Macks (SHM)

**Atualizado em:** 2026-11-18, depois da API v1 e do primeiro deploy na Vercel.
**Estado atual:** API v1 concluída e revisada, site em produção em https://shm-eta.vercel.app (deploy automático a cada push na `main`), banco novo no Neon.

Ordem: primeiro o que afeta a segurança da produção, depois o que melhora o produto.

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

1. Observação de reserva com mais de 300 caracteres é cortada sem aviso (a API responde 201).
2. `PATCH /me` com só uma das autorizações (`consent`) zera a outra; `consent` de tipo errado não dá 400.
3. Limite de login burlável com várias tentativas ao mesmo tempo (conta e grava fora de trava).
4. O tempo de resposta do login revela se o e-mail tem conta (já era assim antes da API).
5. Um cabeçalho `Authorization` que não é `Bearer` faz o site ignorar o cookie (a pessoa aparece deslogada).
6. Remarcar e o aviso no chat são gravados em transações separadas.
7. "Remover profissional" mostra sucesso quando outro admin está ligado a ele ("Sou eu") e nada foi removido.
8. A foto do login do celular também é baixada no computador; "+55" digitado no telefone dá erro.
9. As rotas da API aceitam o cookie do site sem checar `Content-Type`/`Origin` (o `SameSite=Lax` já protege).

## 3. Não conferido no navegador (só por teste automático)

- Mensagem de conta desativada no login.
- Remarcar uma reserva pelo admin.
- Mensagem de senha errada ao excluir a conta.
- "Compareceu/Faltou" do admin na Agenda, que agora usa a mesma regra da API.

## 4. Produto e telas

- **Outras telas fora do painel no celular** (Esqueci minha senha, Redefinir senha, Descadastrar) ainda têm o visual antigo; o login já tem o novo.
- **Barbeiro em "Meus dados":** a conta nasce sem telefone, então ele precisa informar um para salvar.
- **O admin não redefine a senha do barbeiro** (só a de clientes). Hoje o barbeiro usa "Esqueci minha senha", ou o admin recria o acesso.
- **Chat do site** corta mensagens acima de 2000 caracteres sem avisar (a API recusa com 400).
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

# Área do barbeiro fixa — desenho curto

**Data:** 2026-11-20 · **Situação:** aprovado pelo dono · **Substitui em parte:** `2026-11-19-permissoes-equipe-design.md` (menus por caixinha)

## Por quê

O dono quer que todo barbeiro já trabalhe com a própria agenda completa, os próprios clientes e o próprio histórico, sem precisar liberar nada pessoa por pessoa.

## Decidido com o dono

- **Menu do barbeiro, fixo para todos:** Minha agenda, Clientes, Histórico, Meus dados.
- **Minha agenda** = o calendário da Agenda (dia/semana/mês), só com os horários dele; ele **marca, remarca, cancela** e marca presença.
- **Clientes (lista):** só quem ele **já atendeu** — pelo menos uma reserva com ele já realizada (passada, não cancelada, sem falta).
- **Histórico:** só os atendimentos dele (como hoje).

## Propostas aprovadas junto

- A **ficha** do cliente (`/admin/clientes/<id>`) continua abrindo para quem tem **qualquer** reserva com ele (inclusive futura), para o "Ver cliente" da agenda funcionar. Cadastrados por ele também abrem (`created_by`).
- **Início** do painel sai do barbeiro (a Minha agenda é a tela inicial dele).
- **Configurações → Equipe** fica só com Admin/Barbeiro; as caixinhas de menus saem. A coluna `users.menus` fica no banco, sem uso.

## Continua como está

- Só admin: Chat, Marketing, Serviços, Configurações, exportar CSV, definir senha/desativar/excluir cliente.
- Barbeiro não troca e-mail nem autorizações do cliente.
- "Novo horário": busca entre todos os clientes (nome e telefone), reserva sempre com ele.

## Caminhos considerados

- **Reaproveitar as telas `/admin/...` já filtradas (escolhido):** as peças existem desde as permissões da equipe; muda só quem tem acesso.
- **Telas próprias em `/barbeiro` copiando o visual:** duplicaria código e as duas versões divergiriam.

## Como fica

- `canOpen(barbeiro com profissional, m)` → `true` para `agenda`, `clientes`, `historico`; `false` para `inicio`. Não lê mais `user.menus`.
- `/barbeiro` redireciona para `/admin/agenda`; "Minha agenda" no menu do barbeiro aponta para `/admin/agenda` (rótulo "Minha agenda"); o login do barbeiro cai lá (`homeOf`).
- `/barbeiro` só redireciona **barbeiro**. Admin ligado a um profissional ("Sou eu") continua com a "Minha agenda" de hoje (lista do dia só com os horários dele), sem mudança.
- `getCustomers(scope)` com escopo de barbeiro: só clientes com reserva dele **realizada** (`isDone`, sem falta). `getCustomer(id, scope)` (ficha): qualquer reserva com ele ou `createdBy` dele.
- `setTeamMember`: deixa de aceitar/gravar `menus`; o cartão Equipe some com as caixinhas.

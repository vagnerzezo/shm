import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { readDb, updateDb } from "../app/_lib/db";
import {
  authenticate,
  changeOwnPassword,
  deleteOwnAccount,
  MAX_SIGNUPS_PER_IP,
  registerCustomer,
  resetPasswordWithToken,
  updateOwnProfile,
} from "../app/_lib/domain/account";
import { createSessionToken, findSessionUser } from "../app/_lib/sessions";
import { resetTestDb } from "../scripts/test-reset";
import { PASSWORD, rejectsWith, USERS } from "./fixtures";

describe("authenticate", () => {
  before(resetTestDb);

  test("senha certa devolve o usuário", async () => {
    assert.equal((await authenticate(USERS.cliente.email, PASSWORD)).id, USERS.cliente.id);
  });

  test("e-mail com espaços e maiúsculas funciona", async () => {
    assert.equal((await authenticate("  CLIENTE@shm.test ", PASSWORD)).id, USERS.cliente.id);
  });

  test("senha errada e e-mail inexistente dão o mesmo erro", async () => {
    const wrong = await authenticate(USERS.cliente.email, "errada").catch((e) => e);
    const missing = await authenticate("ninguem@shm.test", "errada").catch((e) => e);
    assert.ok(rejectsWith("invalid_credentials")(wrong));
    assert.ok(rejectsWith("invalid_credentials")(missing));
    assert.equal(wrong.message, missing.message);
  });

  test("acerto zera a contagem de erros", async () => {
    for (let i = 0; i < 9; i++) await authenticate(USERS.jimmy.email, "errada").catch(() => {});
    await authenticate(USERS.jimmy.email, PASSWORD);
    for (let i = 0; i < 9; i++) await authenticate(USERS.jimmy.email, "errada").catch(() => {});
    assert.equal((await authenticate(USERS.jimmy.email, PASSWORD)).id, USERS.jimmy.id);
  });

  test("depois de 10 erros, bloqueia até com a senha certa", async () => {
    for (let i = 0; i < 10; i++) {
      await assert.rejects(authenticate(USERS.cliente2.email, "errada"), rejectsWith("invalid_credentials"));
    }
    await assert.rejects(authenticate(USERS.cliente2.email, PASSWORD), rejectsWith("rate_limited"));
    // O bloqueio é por e-mail: outra conta continua entrando.
    assert.equal((await authenticate(USERS.cliente.email, PASSWORD)).id, USERS.cliente.id);
  });
});

describe("conta", () => {
  before(resetTestDb);

  const IP = "203.0.113.1";
  const novo = { name: "Novo Cliente", phone: "(51) 98888-7777", email: " Novo@shm.test ", consent: { email: true, mensagem: false } };

  test("cadastro normaliza e-mail e telefone", async () => {
    const user = await registerCustomer(novo, "senha-boa-1", IP);
    assert.equal(user.email, "novo@shm.test");
    assert.equal(user.phone, "51988887777");
    assert.deepEqual(user.consent, { email: true, mensagem: false });
    assert.equal((await authenticate("novo@shm.test", "senha-boa-1")).id, user.id);
  });

  test("cadastro com e-mail repetido é recusado", async () => {
    await assert.rejects(registerCustomer({ ...novo, email: USERS.cliente.email }, "senha-boa-1", IP), rejectsWith("email_taken"));
  });

  test("cadastro com senha curta aponta o campo password", async () => {
    await assert.rejects(registerCustomer({ ...novo, email: "outro@shm.test" }, "1234567", IP), rejectsWith("validation", "password"));
  });

  test("cadastro com dados ruins aponta o campo", async () => {
    await assert.rejects(registerCustomer({ ...novo, name: "A", email: "a@shm.test" }, "senha-boa-1", IP), rejectsWith("validation", "name"));
    await assert.rejects(registerCustomer({ ...novo, phone: "123", email: "a@shm.test" }, "senha-boa-1", IP), rejectsWith("validation", "phone"));
    await assert.rejects(registerCustomer({ ...novo, email: "sem-arroba" }, "senha-boa-1", IP), rejectsWith("validation", "email"));
    await assert.rejects(registerCustomer({ ...novo, name: 123, email: "a@shm.test" }, "senha-boa-1", IP), rejectsWith("validation", "name"));
  });

  test("atualizar perfil troca só o que foi enviado", async () => {
    await updateOwnProfile(USERS.cliente.id, { name: "Cliente Renomeado" });
    const user = (await readDb()).users.find((u) => u.id === USERS.cliente.id)!;
    assert.equal(user.name, "Cliente Renomeado");
    assert.equal(user.email, USERS.cliente.email);
    assert.equal(user.phone, USERS.cliente.phone);
  });

  test("atualizar perfil com e-mail de outra conta é recusado", async () => {
    await assert.rejects(updateOwnProfile(USERS.cliente.id, { email: USERS.cliente2.email }), rejectsWith("email_taken"));
  });

  test("trocar senha exige a atual e uma nova diferente", async () => {
    await assert.rejects(changeOwnPassword(USERS.cliente.id, "errada", "nova-senha-1", null), rejectsWith("validation", "current"));
    await assert.rejects(changeOwnPassword(USERS.cliente.id, PASSWORD, PASSWORD, null), rejectsWith("validation", "password"));
    await assert.rejects(changeOwnPassword(USERS.cliente.id, PASSWORD, "curta", null), rejectsWith("validation", "password"));
  });

  test("trocar senha encerra as outras sessões e mantém a atual", async () => {
    const keep = await createSessionToken(USERS.cliente.id);
    const other = await createSessionToken(USERS.cliente.id);
    await changeOwnPassword(USERS.cliente.id, PASSWORD, "nova-senha-1", keep.token);
    assert.ok(await findSessionUser(keep.token));
    assert.equal(await findSessionUser(other.token), null);
    assert.equal((await authenticate(USERS.cliente.email, "nova-senha-1")).id, USERS.cliente.id);
  });

  test("admin não exclui a própria conta por aqui", async () => {
    await assert.rejects(deleteOwnAccount(USERS.admin.id, PASSWORD), rejectsWith("forbidden"));
  });

  test("excluir conta pede a senha certa", async () => {
    await assert.rejects(deleteOwnAccount(USERS.cliente2.id, "errada"), rejectsWith("validation", "password"));
  });

  test("excluir conta apaga o cliente, as reservas e as mensagens dele", async () => {
    const id = USERS.cliente2.id;
    await updateDb((db) => {
      db.reservations.push({ id: "r-del", userId: id, serviceId: "corte-heitor", date: "2026-12-01", time: "10:00" });
      db.messages.push({ id: "m-del", customerId: id, from: "cliente", text: "oi", createdAt: new Date().toISOString() });
    });
    const session = await createSessionToken(id);
    await deleteOwnAccount(id, PASSWORD);
    const db = await readDb();
    assert.ok(!db.users.some((u) => u.id === id));
    assert.ok(!db.reservations.some((r) => r.userId === id));
    assert.ok(!db.messages.some((m) => m.customerId === id));
    assert.equal(await findSessionUser(session.token), null);
  });

  test("redefinir senha com código inválido é recusado", async () => {
    await assert.rejects(resetPasswordWithToken("codigo-que-nao-existe", "nova-senha-2"), rejectsWith("validation", "token"));
  });
});

describe("limite de cadastros", () => {
  before(resetTestDb);

  const dados = (n: number) => ({ name: "Pessoa Teste", phone: "(51) 97777-6666", email: `limite${n}@shm.test` });

  test("depois de 10 cadastros do mesmo IP em 1 hora, o 11º é recusado", async () => {
    const ip = "198.51.100.7";
    for (let i = 0; i < MAX_SIGNUPS_PER_IP; i++) await registerCustomer(dados(i), "senha-boa-1", ip);
    await assert.rejects(registerCustomer(dados(99), "senha-boa-1", ip), rejectsWith("rate_limited"));
    assert.ok(!(await readDb()).users.some((u) => u.email === "limite99@shm.test"));
    // O limite é por IP: outro endereço continua cadastrando.
    await registerCustomer(dados(100), "senha-boa-1", "198.51.100.8");
  });

  test("e-mail repetido conta no limite (evita descobrir quais e-mails têm conta)", async () => {
    const ip = "198.51.100.9";
    for (let i = 0; i < MAX_SIGNUPS_PER_IP; i++) {
      await assert.rejects(registerCustomer({ ...dados(0), email: USERS.cliente.email }, "senha-boa-1", ip), rejectsWith("email_taken"));
    }
    await assert.rejects(registerCustomer(dados(200), "senha-boa-1", ip), rejectsWith("rate_limited"));
  });

  test("dados inválidos não contam no limite", async () => {
    const ip = "198.51.100.10";
    for (let i = 0; i < MAX_SIGNUPS_PER_IP + 2; i++) {
      await assert.rejects(registerCustomer({ ...dados(0), phone: "123" }, "senha-boa-1", ip), rejectsWith("validation", "phone"));
    }
    await registerCustomer(dados(300), "senha-boa-1", ip);
  });
});

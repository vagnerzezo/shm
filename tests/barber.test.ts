import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { getCustomers } from "../app/_lib/customers";
import { readDb } from "../app/_lib/db";
import { authenticate } from "../app/_lib/domain/account";
import {
  createBarberAccess,
  linkAdminToProfessional,
  removeBarberAccess,
  removeProfessional,
  saveProfessional,
} from "../app/_lib/domain/barber";
import { bookForCustomer } from "../app/_lib/domain/bookings";
import { homeOf, roleOf, toCustomer } from "../app/_lib/roles";
import { createSessionToken, findSessionUser } from "../app/_lib/sessions";
import { resetTestDb } from "../scripts/test-reset";
import { rejectsWith, USERS } from "./fixtures";

const userById = async (id: string) => (await readDb()).users.find((u) => u.id === id);
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const NEW = { professional: "Heitor", name: "Heitor Novo", email: "heitor.novo@shm.test", password: "senha-provisoria" };

describe("perfil barbeiro", () => {
  beforeEach(resetTestDb);

  test("test:reset deixa Heitor e Jimmy como barbeiros e o admin sem profissional", async () => {
    const heitor = await userById(USERS.heitor.id);
    const admin = await userById(USERS.admin.id);
    assert.equal(roleOf(heitor!), "barbeiro");
    assert.equal(heitor!.professional, "Heitor");
    assert.equal((await userById(USERS.jimmy.id))!.professional, "Jimmy");
    assert.equal(roleOf(admin!), "admin");
    assert.equal(admin!.professional, undefined);
  });

  test("roleOf e homeOf", () => {
    assert.equal(roleOf({ email: "a@b.c", role: "barbeiro" }), "barbeiro");
    assert.equal(roleOf({ email: "a@b.c" }), "cliente");
    assert.equal(roleOf({ email: "a@b.c", role: "admin" }), "admin");
    assert.equal(homeOf({ email: "a@b.c", role: "barbeiro" }), "/barbeiro");
    assert.equal(homeOf({ email: "a@b.c" }), "/reservas");
  });

  test("sessão do barbeiro traz o profissional", async () => {
    const { token } = await createSessionToken(USERS.heitor.id);
    const me = await findSessionUser(token);
    assert.equal(me?.role, "barbeiro");
    assert.equal(me?.professional, "Heitor");
  });

  test("criar acesso para profissional inexistente é recusado", async () => {
    await assert.rejects(createBarberAccess({ ...NEW, professional: "Ninguém" }), rejectsWith("validation"));
  });

  test("e-mail repetido é recusado", async () => {
    await assert.rejects(createBarberAccess({ ...NEW, email: USERS.cliente.email.toUpperCase() }), rejectsWith("email_taken"));
  });

  test("senha fora de 8–100 é recusada", async () => {
    await assert.rejects(createBarberAccess({ ...NEW, password: "1234567" }), rejectsWith("validation", "password"));
  });

  test("conta criada é barbeiro do profissional, entra com a senha e tem telefone vazio", async () => {
    const id = await createBarberAccess(NEW);
    const user = await userById(id);
    assert.equal(roleOf(user!), "barbeiro");
    assert.equal(user!.professional, "Heitor");
    assert.equal(user!.phone, "");
    assert.equal(toCustomer(user!).professional, "Heitor");
    assert.equal((await authenticate(NEW.email, NEW.password)).id, id);
  });

  test("barbeiro não aparece na lista de clientes", async () => {
    const ids = (await getCustomers()).map((c) => c.id);
    assert.ok(ids.includes(USERS.cliente.id));
    assert.ok(!ids.includes(USERS.heitor.id));
    assert.ok(!ids.includes(USERS.admin.id));
  });

  test("barbeiro não marca horário como cliente", async () => {
    await assert.rejects(
      bookForCustomer(USERS.heitor.id, [{ serviceId: "corte-jimmy", date: day(7), time: "10:00" }]),
      rejectsWith("forbidden"),
    );
  });

  test("renomear o profissional leva a conta junto", async () => {
    await saveProfessional({ original: "Jimmy", name: "Jimmy Silva", color: "violet" });
    assert.equal((await userById(USERS.jimmy.id))!.professional, "Jimmy Silva");
  });

  test("profissional com conta ligada não é removido", async () => {
    await saveProfessional({ name: "Novato", color: "rose" });
    await createBarberAccess({ ...NEW, professional: "Novato" });
    await assert.rejects(removeProfessional("Novato"), rejectsWith("validation"));
    assert.ok((await readDb()).professionals!.some((p) => p.name === "Novato"));
  });

  test("profissional sem conta, serviços nem horários é removido", async () => {
    await saveProfessional({ name: "Novato", color: "rose" });
    await removeProfessional("Novato");
    assert.ok(!(await readDb()).professionals!.some((p) => p.name === "Novato"));
  });

  test("remover acesso apaga a conta e as sessões", async () => {
    const { token } = await createSessionToken(USERS.heitor.id);
    await removeBarberAccess(USERS.heitor.id);
    assert.equal(await userById(USERS.heitor.id), undefined);
    assert.equal(await findSessionUser(token), null);
  });

  test("remover acesso de conta de cliente é recusado", async () => {
    await assert.rejects(removeBarberAccess(USERS.cliente.id), rejectsWith("forbidden"));
    assert.ok(await userById(USERS.cliente.id));
  });

  test("admin ligado a um profissional continua admin; desligar limpa o campo", async () => {
    await linkAdminToProfessional(USERS.admin.id, "Heitor");
    const linked = await userById(USERS.admin.id);
    assert.equal(roleOf(linked!), "admin");
    assert.equal(linked!.professional, "Heitor");
    await linkAdminToProfessional(USERS.admin.id, null);
    assert.equal((await userById(USERS.admin.id))!.professional, undefined);
  });

  test("ligar admin a profissional inexistente ou ligar um cliente é recusado", async () => {
    await assert.rejects(linkAdminToProfessional(USERS.admin.id, "Ninguém"), rejectsWith("validation"));
    await assert.rejects(linkAdminToProfessional(USERS.cliente.id, "Heitor"), rejectsWith("forbidden"));
  });
});


import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { canOpen, closuresFor, profileForScope, scopeOf, type Scope } from "../app/_lib/access";
import { addDays, nowInStudio } from "../app/_lib/availability";
import { getCustomer, getCustomerPicklist, getCustomers } from "../app/_lib/customers";
import { updateDb } from "../app/_lib/db";
import { bookForCustomer, cancelForCustomer } from "../app/_lib/domain/bookings";
import { getAgenda } from "../app/_lib/reservations";
import { resetTestDb } from "../scripts/test-reset";
import { BARBER_MENUS, toCustomer } from "../app/_lib/roles";
import { rejectsWith, USERS } from "./fixtures";

const base = { id: "u1", name: "Pessoa", phone: "51900000000", email: "p@shm.test", consent: undefined };

const admin = toCustomer({ ...base, id: "a1", role: "admin" });
const barber = toCustomer({ ...base, id: "b1", role: "barbeiro", professional: "Heitor" });
const barberNoPro = toCustomer({ ...base, id: "b2", role: "barbeiro" });
const client = toCustomer({ ...base, id: "c1" });

describe("regra central", () => {
  test("admin abre todos os menus", () => {
    for (const m of BARBER_MENUS) assert.equal(canOpen(admin, m), true);
  });

  test("barbeiro abre agenda, clientes e histórico; Início não", () => {
    const plain = toCustomer({ ...base, id: "b3", role: "barbeiro", professional: "Jimmy" });
    for (const m of ["agenda", "clientes", "historico"] as const) assert.equal(canOpen(plain, m), true);
    assert.equal(canOpen(plain, "inicio"), false);
  });

  test("barbeiro sem profissional não abre nada", () => {
    for (const m of BARBER_MENUS) assert.equal(canOpen(barberNoPro, m), false);
  });

  test("cliente e visitante não abrem nada", () => {
    assert.equal(canOpen(client, "agenda"), false);
    assert.equal(canOpen(null, "agenda"), false);
  });

  test("escopo: admin vê todos; barbeiro, o profissional e a própria conta", () => {
    assert.deepEqual(scopeOf(admin), { all: true });
    assert.deepEqual(scopeOf(barber), { all: false, professional: "Heitor", userId: "b1" });
  });

  test("escopo de cliente ou barbeiro sem profissional é recusado", () => {
    assert.throws(() => scopeOf(client), rejectsWith("forbidden"));
    assert.throws(() => scopeOf(barberNoPro), rejectsWith("forbidden"));
  });
});

describe("buscas com escopo", () => {
  const day = addDays(nowInStudio().date, 10);
  const heitor: Scope = { all: false, professional: "Heitor", userId: USERS.heitor.id };

  before(async () => {
    await resetTestDb();
    await bookForCustomer(USERS.cliente.id, [{ serviceId: "corte-heitor", date: day, time: "10:00" }]);
    await bookForCustomer(USERS.cliente2.id, [{ serviceId: "corte-jimmy", date: day, time: "10:00" }]);
    const [cancelled] = await bookForCustomer(USERS.cliente3.id, [{ serviceId: "corte-heitor", date: day, time: "15:00" }]);
    await cancelForCustomer(USERS.cliente3.id, cancelled);
    const past = addDays(nowInStudio().date, -3);
    await updateDb((db) => {
      db.users.push(
        { id: "criado-heitor", name: "Criado Pelo Heitor", phone: "51900000099", email: "criado@shm.test", passwordHash: "x", createdAt: new Date().toISOString(), createdBy: USERS.heitor.id },
        { id: "so-futuro", name: "Só Futuro", phone: "51900000098", email: "futuro@shm.test", passwordHash: "x", createdAt: new Date().toISOString() },
      );
      db.reservations.push(
        // Atendido pelo Heitor.
        { id: "passada-ok", userId: USERS.cliente.id, serviceId: "corte-heitor", professional: "Heitor", date: past, time: "10:00" },
        // Faltou com o Heitor: não conta como atendido.
        { id: "passada-falta", userId: USERS.cliente3.id, serviceId: "corte-heitor", professional: "Heitor", date: past, time: "11:00", attendance: "faltou" },
        // Só horário futuro com o Heitor.
        { id: "futura", userId: "so-futuro", serviceId: "corte-heitor", professional: "Heitor", date: day, time: "16:00" },
      );
    });
  });

  test("agenda com escopo traz só as do profissional; sem escopo, todas", async () => {
    assert.deepEqual((await getAgenda(day, day, { scope: heitor })).map((r) => r.professional), ["Heitor", "Heitor"]);
    assert.equal((await getAgenda(day, day)).length, 3);
  });

  test("lista de clientes do barbeiro: só quem ele já atendeu", async () => {
    assert.deepEqual((await getCustomers(heitor)).map((c) => c.id), [USERS.cliente.id]);
  });

  test("ficha abre para qualquer horário com ele (futuro, cancelado, falta) ou criado por ele", async () => {
    for (const id of ["so-futuro", USERS.cliente3.id, "criado-heitor"]) assert.ok(await getCustomer(id, heitor), id);
  });

  test("cliente de outro profissional fica fora do escopo", async () => {
    assert.equal(await getCustomer(USERS.cliente2.id, heitor), null);
    assert.ok(await getCustomer(USERS.cliente2.id));
  });

  test("números do cliente no escopo contam só as reservas com ele", async () => {
    await bookForCustomer(USERS.cliente.id, [{ serviceId: "corte-jimmy", date: day, time: "09:00" }]);
    const mine = await getCustomer(USERS.cliente.id, heitor);
    assert.equal(mine!.nextBooking!.serviceName, "Corte com Heitor");
    const all = await getCustomer(USERS.cliente.id);
    assert.equal(all!.nextBooking!.serviceName, "Corte com Jimmy");
  });

  test("lista para marcar traz todos os clientes ativos, só id, nome e telefone", async () => {
    await updateDb((db) => {
      db.users.find((u) => u.id === USERS.cliente3.id)!.disabledAt = new Date().toISOString();
    });
    const list = await getCustomerPicklist();
    assert.ok(list.some((c) => c.id === USERS.cliente2.id));
    assert.ok(!list.some((c) => c.id === USERS.cliente3.id));
    for (const c of list) assert.deepEqual(Object.keys(c).sort(), ["id", "name", "phone"]);
  });
});

describe("correções da revisão final", () => {
  const heitorScope: Scope = { all: false, professional: "Heitor", userId: "test-heitor" };
  const stored = { email: "dono@shm.test", consent: { email: true, mensagem: false } };
  const submitted = { name: "Nome Novo", phone: "51911112222", email: "barbeiro@shm.test", consent: { email: false, mensagem: true } };

  test("barbeiro não troca e-mail nem autorizações do cliente (evita tomar a conta)", () => {
    const kept = profileForScope(submitted, stored, heitorScope);
    assert.deepEqual(kept, { ...submitted, email: "dono@shm.test", consent: { email: true, mensagem: false } });
  });

  test("admin troca tudo", () => {
    assert.deepEqual(profileForScope(submitted, stored, { all: true }), submitted);
  });

  test("barbeiro só vê fechamentos do estúdio todo e os dele", () => {
    const closures = [
      { id: "1", start: "2026-12-01", end: "2026-12-01", reason: "Feriado" },
      { id: "2", start: "2026-12-02", end: "2026-12-02", reason: "Consulta", professional: "Jimmy" },
      { id: "3", start: "2026-12-03", end: "2026-12-03", reason: "Folga", professional: "Heitor" },
    ];
    assert.deepEqual(closuresFor(closures, heitorScope).map((c) => c.id), ["1", "3"]);
    assert.equal(closuresFor(closures, { all: true }).length, 3);
  });
});

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { canOpen, scopeOf, staffLinks, type Scope } from "../app/_lib/access";
import { addDays, nowInStudio } from "../app/_lib/availability";
import { getCustomer, getCustomerPicklist, getCustomers } from "../app/_lib/customers";
import { updateDb } from "../app/_lib/db";
import { bookForCustomer, cancelForCustomer } from "../app/_lib/domain/bookings";
import { getAgenda } from "../app/_lib/reservations";
import { resetTestDb } from "../scripts/test-reset";
import { BARBER_MENUS, menusOf, toCustomer } from "../app/_lib/roles";
import { rejectsWith, USERS } from "./fixtures";

const base = { id: "u1", name: "Pessoa", phone: "51900000000", email: "p@shm.test", consent: undefined };

describe("menus da equipe", () => {
  test("menusOf filtra, tira repetidos e segue a ordem fixa", () => {
    assert.deepEqual(menusOf(["agenda", "xyz", "agenda", "inicio"]), ["inicio", "agenda"]);
  });

  test("menusOf com lixo devolve vazio", () => {
    assert.deepEqual(menusOf(null), []);
    assert.deepEqual(menusOf("agenda"), []);
    assert.deepEqual(menusOf(undefined), []);
  });

  test("toCustomer traz os menus só para barbeiro", () => {
    const barber = toCustomer({ ...base, role: "barbeiro", professional: "Heitor", menus: ["clientes"] });
    assert.deepEqual(barber.menus, ["clientes"]);
    assert.deepEqual(toCustomer({ ...base, role: "admin", menus: ["agenda"] }).menus, []);
    assert.deepEqual(toCustomer({ ...base, menus: ["agenda"] }).menus, []);
  });
});

const admin = toCustomer({ ...base, id: "a1", role: "admin" });
const barber = toCustomer({ ...base, id: "b1", role: "barbeiro", professional: "Heitor", menus: ["agenda"] });
const barberNoPro = toCustomer({ ...base, id: "b2", role: "barbeiro", menus: ["agenda"] });
const client = toCustomer({ ...base, id: "c1" });

describe("regra central", () => {
  test("admin abre todos os menus, mesmo sem menus marcados", () => {
    for (const m of BARBER_MENUS) assert.equal(canOpen(admin, m), true);
  });

  test("barbeiro abre só os menus marcados", () => {
    assert.equal(canOpen(barber, "agenda"), true);
    assert.equal(canOpen(barber, "clientes"), false);
    assert.equal(canOpen(barber, "inicio"), false);
  });

  test("barbeiro sem profissional não abre nada", () => {
    assert.equal(canOpen(barberNoPro, "agenda"), false);
    assert.deepEqual(staffLinks(barberNoPro), []);
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

  test("links: admin todos; barbeiro os dele", () => {
    assert.deepEqual(staffLinks(admin), [...BARBER_MENUS]);
    assert.deepEqual(staffLinks(barber), ["agenda"]);
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
    await updateDb((db) => {
      db.users.push({ id: "criado-heitor", name: "Criado Pelo Heitor", phone: "51900000099", email: "criado@shm.test", passwordHash: "x", createdAt: new Date().toISOString(), createdBy: USERS.heitor.id });
    });
  });

  test("agenda com escopo traz só as do profissional; sem escopo, todas", async () => {
    assert.deepEqual((await getAgenda(day, day, { scope: heitor })).map((r) => r.professional), ["Heitor"]);
    assert.equal((await getAgenda(day, day)).length, 2);
  });

  test("clientes do barbeiro: reserva com ele (inclusive cancelada) ou criado por ele", async () => {
    const ids = (await getCustomers(heitor)).map((c) => c.id).sort();
    assert.deepEqual(ids, [USERS.cliente.id, USERS.cliente3.id, "criado-heitor"].sort());
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

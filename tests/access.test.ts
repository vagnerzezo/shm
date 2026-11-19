import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { canOpen, scopeOf, staffLinks } from "../app/_lib/access";
import { BARBER_MENUS, menusOf, toCustomer } from "../app/_lib/roles";
import { rejectsWith } from "./fixtures";

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

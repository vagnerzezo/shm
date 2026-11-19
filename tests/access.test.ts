import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { menusOf, toCustomer } from "../app/_lib/roles";

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

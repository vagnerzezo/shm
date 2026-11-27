import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { hidesTabs, hidesTopBar } from "../app/_components/client/tabs";

// Moldura do cliente no celular. Não usa o banco.

describe("tab bar do cliente", () => {
  test("some nas telas com barra de ação própria", () => {
    assert.equal(hidesTabs("/agendamento/horario"), true);
    assert.equal(hidesTabs("/agendamento/confirmacao"), true);
    assert.equal(hidesTabs("/reservas/abc/remarcar"), true);
  });

  test("aparece nas outras telas", () => {
    assert.equal(hidesTabs("/agendamento"), false);
    assert.equal(hidesTabs("/reservas"), false);
    assert.equal(hidesTabs("/mensagens"), false);
    assert.equal(hidesTabs("/conta"), false);
    assert.equal(hidesTabs("/"), false);
  });
});

describe("barra de cima do cliente", () => {
  test("some no agendamento, no remarcar e em Mensagens (têm cabeçalho próprio)", () => {
    assert.equal(hidesTopBar("/agendamento"), true);
    assert.equal(hidesTopBar("/agendamento/horario"), true);
    assert.equal(hidesTopBar("/reservas/abc/remarcar"), true);
    assert.equal(hidesTopBar("/mensagens"), true);
  });

  test("aparece no Início, em Reservas e em Meus dados", () => {
    assert.equal(hidesTopBar("/"), false);
    assert.equal(hidesTopBar("/reservas"), false);
    assert.equal(hidesTopBar("/conta"), false);
  });
});

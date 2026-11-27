import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { hidesTabs, hidesTopBar, visitorLoginHref } from "../app/_components/client/tabs";
import { DEFAULT_SERVICES, professionalColorOf, type Professional } from "../app/_lib/services";

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

describe("cor do profissional no serviço", () => {
  const pros: Professional[] = [
    { name: "Heitor", color: "blue" },
    { name: "Jimmy", color: "violet" },
  ];
  const svc = DEFAULT_SERVICES[0];

  test("usa a cor cadastrada do profissional do serviço", () => {
    assert.equal(professionalColorOf({ ...svc, professional: "Jimmy" }, pros), "violet");
  });

  test("sem profissional fixo ou profissional que saiu: sem cor", () => {
    assert.equal(professionalColorOf({ ...svc, professional: undefined }, pros), null);
    assert.equal(professionalColorOf({ ...svc, professional: "Saiu" }, pros), null);
  });
});

describe("Entrar do visitante na sidebar", () => {
  test("volta para a mesma tela, com os serviços escolhidos", () => {
    assert.equal(
      visitorLoginHref("/agendamento/confirmacao", "item=barba-heitor_2026-12-04_10%3A00"),
      "/login?next=%2Fagendamento%2Fconfirmacao%3Fitem%3Dbarba-heitor_2026-12-04_10%253A00",
    );
  });

  test("sem busca, só o caminho", () => {
    assert.equal(visitorLoginHref("/agendamento", ""), "/login?next=%2Fagendamento");
  });
});

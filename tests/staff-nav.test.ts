import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { staffMenu } from "../app/_components/staff/nav";

// Menu do painel (admin e barbeiro). Não usa o banco.

const hrefs = (links: { href: string }[]) => links.map((l) => l.href);

describe("menu do admin", () => {
  test("tab bar com 4 atalhos; o resto vai para Mais", () => {
    const m = staffMenu("admin", { myAgenda: false, accountOnly: false });
    assert.deepEqual(hrefs(m.tabs), ["/admin", "/admin/agenda", "/admin/clientes", "/admin/chat"]);
    assert.deepEqual(hrefs(m.more), ["/admin/historico", "/admin/marketing", "/admin/servicos", "/admin/configuracoes"]);
  });

  test("ligado a um profissional: Minha agenda entra no Mais e na Operação", () => {
    const m = staffMenu("admin", { myAgenda: true, accountOnly: false });
    assert.equal(m.more[0].href, "/barbeiro");
    assert.deepEqual(hrefs(m.groups[0].links), [
      "/admin",
      "/admin/agenda",
      "/barbeiro",
      "/admin/clientes",
      "/admin/historico",
      "/admin/chat",
    ]);
  });

  test("sidebar em dois grupos: Operação e Gestão", () => {
    const m = staffMenu("admin", { myAgenda: false, accountOnly: false });
    assert.deepEqual(
      m.groups.map((g) => g.title),
      ["Operação", "Gestão"],
    );
    assert.deepEqual(hrefs(m.groups[1].links), ["/admin/marketing", "/admin/servicos", "/admin/configuracoes"]);
  });
});

describe("menu do barbeiro", () => {
  test("os 5 itens dele na tab bar, sem Mais", () => {
    const m = staffMenu("barbeiro", { myAgenda: false, accountOnly: false });
    assert.deepEqual(hrefs(m.tabs), ["/admin/agenda", "/admin/clientes", "/admin/historico", "/admin/chat", "/conta"]);
    assert.deepEqual(m.more, []);
    assert.equal(m.groups.length, 1);
    assert.equal(m.groups[0].title, null);
  });

  test("sem profissional: só Meus dados", () => {
    const m = staffMenu("barbeiro", { myAgenda: false, accountOnly: true });
    assert.deepEqual(hrefs(m.tabs), ["/conta"]);
    assert.deepEqual(hrefs(m.groups[0].links), ["/conta"]);
  });
});

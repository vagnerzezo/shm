import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { readDb, updateDb } from "../app/_lib/db";
import { getTeam, setTeamMember } from "../app/_lib/domain/team";
import { createSessionToken, findSessionUser } from "../app/_lib/sessions";
import { resetTestDb } from "../scripts/test-reset";
import { rejectsWith, USERS } from "./fixtures";

const userById = async (id: string) => (await readDb()).users.find((u) => u.id === id)!;
const { admin, heitor, jimmy, cliente } = USERS;

describe("equipe", () => {
  beforeEach(async () => {
    await resetTestDb();
    // Segundo admin, que também atende como Jimmy não (sem profissional).
    await updateDb((db) => {
      db.users.push({ id: "admin-2", name: "Outro Admin", phone: "", email: "admin2@shm.test", passwordHash: "x", createdAt: "2026-01-01T12:00:00.000Z", role: "admin" });
    });
  });

  test("lista admins primeiro e depois barbeiros, sem clientes", async () => {
    const team = await getTeam();
    assert.deepEqual(team.map((m) => m.role), ["admin", "admin", "barbeiro", "barbeiro"]);
    assert.ok(!team.some((m) => m.id === cliente.id));
    assert.deepEqual(team.find((m) => m.id === heitor.id), { id: heitor.id, name: heitor.name, email: heitor.email, role: "barbeiro", professional: "Heitor", menus: [] });
  });

  test("libera menus para um barbeiro, sem repetição e na ordem fixa", async () => {
    await setTeamMember(admin.id, heitor.id, { role: "barbeiro", menus: ["historico", "agenda", "agenda"] });
    assert.deepEqual((await userById(heitor.id)).menus, ["agenda", "historico"]);
  });

  test("quem não é admin não muda a equipe", async () => {
    await assert.rejects(setTeamMember(heitor.id, jimmy.id, { role: "admin", menus: [] }), rejectsWith("forbidden"));
  });

  test("ninguém muda o próprio acesso", async () => {
    await assert.rejects(setTeamMember(admin.id, admin.id, { role: "barbeiro", menus: [] }), rejectsWith("validation", "role"));
  });

  test("cliente não entra na equipe por aqui", async () => {
    await assert.rejects(setTeamMember(admin.id, cliente.id, { role: "barbeiro", menus: [] }), rejectsWith("not_found"));
  });

  test("papel e menus inválidos são recusados", async () => {
    await assert.rejects(setTeamMember(admin.id, heitor.id, { role: "dono", menus: [] }), rejectsWith("validation", "role"));
    await assert.rejects(setTeamMember(admin.id, heitor.id, { role: "barbeiro", menus: ["chat"] }), rejectsWith("validation", "menus"));
    await assert.rejects(setTeamMember(admin.id, heitor.id, { role: "barbeiro", menus: "agenda" }), rejectsWith("validation", "menus"));
  });

  test("barbeiro que vira admin mantém o profissional e perde os menus", async () => {
    await setTeamMember(admin.id, heitor.id, { role: "barbeiro", menus: ["agenda"] });
    await setTeamMember(admin.id, heitor.id, { role: "admin", menus: ["agenda"] });
    const u = await userById(heitor.id);
    assert.deepEqual([u.role, u.professional, u.menus], ["admin", "Heitor", undefined]);
  });

  test("admin sem profissional não vira barbeiro", async () => {
    await assert.rejects(setTeamMember(admin.id, "admin-2", { role: "barbeiro", menus: [] }), rejectsWith("validation", "role"));
  });

  test("admin rebaixado já entra como barbeiro na próxima página", async () => {
    await updateDb((db) => {
      db.users.find((u) => u.id === "admin-2")!.professional = "Jimmy";
    });
    const { token } = await createSessionToken("admin-2");
    await setTeamMember(admin.id, "admin-2", { role: "barbeiro", menus: ["agenda"] });
    const session = await findSessionUser(token);
    assert.deepEqual([session!.role, session!.menus], ["barbeiro", ["agenda"]]);
  });
});

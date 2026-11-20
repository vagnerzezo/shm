import { readDb, updateDb } from "../db";
import { DomainError } from "../errors";
import { roleOf } from "../roles";

// Equipe: quem é admin e quem é barbeiro (Configurações → Equipe). Só admin
// muda. Todo barbeiro vê a própria agenda, os clientes que já atendeu e o
// próprio histórico (ver `canOpen`).

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "barbeiro";
  professional: string | null;
};

const invalid = (message: string, field: string) => new DomainError("validation", message, { [field]: message });

/** Admins primeiro, depois barbeiros; dentro de cada grupo, por nome. */
export async function getTeam(): Promise<TeamMember[]> {
  const order = { admin: 0, barbeiro: 1 } as const;
  return (await readDb()).users
    .flatMap((u) => {
      const role = roleOf(u);
      if (role === "cliente") return [];
      return [{ id: u.id, name: u.name, email: u.email, role, professional: u.professional ?? null }];
    })
    .sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * Define o papel. Ninguém muda o próprio acesso, o estúdio não fica sem admin
 * e barbeiro precisa de profissional.
 */
export async function setTeamMember(actorId: string, userId: string, input: { role: unknown }): Promise<void> {
  const { role } = input;
  if (role !== "admin" && role !== "barbeiro") throw invalid("Escolha admin ou barbeiro.", "role");

  await updateDb((db) => {
    const actor = db.users.find((u) => u.id === actorId);
    if (!actor || roleOf(actor) !== "admin") throw new DomainError("forbidden", "Só admin muda a equipe.");
    if (userId === actorId) throw invalid("Você não pode mudar o seu próprio acesso.", "role");
    const target = db.users.find((u) => u.id === userId);
    if (!target || roleOf(target) === "cliente") throw new DomainError("not_found", "Pessoa da equipe não encontrada.");

    if (role === "barbeiro") {
      if (!target.professional) throw invalid("Ligue a conta a um profissional antes.", "role");
      // Defensivo: quem age é admin e não é o alvo, então sempre sobra um.
      if (!db.users.some((u) => u.id !== userId && roleOf(u) === "admin")) {
        throw invalid("O estúdio precisa de pelo menos um admin.", "role");
      }
      target.role = "barbeiro";
      return;
    }
    target.role = "admin";
  });
}

import { readDb, updateDb } from "../db";
import { DomainError } from "../errors";
import { BARBER_MENUS, menusOf, roleOf, type BarberMenu } from "../roles";

// Equipe: quem é admin e quais menus extras cada barbeiro vê
// (Configurações → Equipe). Só admin muda.

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "barbeiro";
  professional: string | null;
  menus: BarberMenu[];
};

const invalid = (message: string, field: string) => new DomainError("validation", message, { [field]: message });

/** Admins primeiro, depois barbeiros; dentro de cada grupo, por nome. */
export async function getTeam(): Promise<TeamMember[]> {
  const order = { admin: 0, barbeiro: 1 } as const;
  return (await readDb()).users
    .flatMap((u) => {
      const role = roleOf(u);
      if (role === "cliente") return [];
      return [{ id: u.id, name: u.name, email: u.email, role, professional: u.professional ?? null, menus: role === "barbeiro" ? menusOf(u.menus) : [] }];
    })
    .sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * Define o papel e, para barbeiro, os menus liberados. Ninguém muda o próprio
 * acesso, o estúdio não fica sem admin e barbeiro precisa de profissional.
 */
export async function setTeamMember(actorId: string, userId: string, input: { role: unknown; menus: unknown }): Promise<void> {
  const { role, menus } = input;
  if (role !== "admin" && role !== "barbeiro") throw invalid("Escolha admin ou barbeiro.", "role");
  if (role === "barbeiro" && (!Array.isArray(menus) || menus.some((m) => !BARBER_MENUS.includes(m)))) {
    throw invalid("Escolha menus da lista.", "menus");
  }

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
      target.menus = menusOf(menus);
      return;
    }
    target.role = "admin";
    delete target.menus;
  });
}

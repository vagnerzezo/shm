import { nowInStudio } from "../availability";
import { catalogOf, ensureCatalog } from "../catalog";
import { purgeUser, updateDb, type Attendance, type ProfessionalColor, type Role, type User } from "../db";
import { DomainError } from "../errors";
import { normalize } from "../format";
import { hashPassword } from "../passwords";
import { roleOf } from "../roles";
import { getAgenda, isCancelled, isPast, professionalOf, type AgendaReservation } from "../reservations";
import { findService, PROFESSIONAL_COLORS } from "../services";
import { assertPassword, normalizeEmail } from "./account";

// Profissionais do cadastro e as contas ligadas a eles: o acesso do barbeiro
// (criado pelo admin) e o admin que também atende.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invalid = (message: string, field?: string) =>
  new DomainError("validation", message, field ? { [field]: message } : undefined);
const notAllowed = () => new DomainError("forbidden", "Essa conta não é de barbeiro.");

/** Cria a conta do barbeiro ligada a um profissional. Telefone fica vazio. Devolve o id. */
export async function createBarberAccess(input: {
  professional: string;
  name: string;
  email: string;
  password: string;
}): Promise<string> {
  const name = String(input.name ?? "").trim();
  const email = normalizeEmail(input.email);
  if (name.length < 2 || name.length > 80) throw invalid("Informe o nome (2 a 80 caracteres).", "name");
  if (email.length > 120 || !EMAIL_RE.test(email)) throw invalid("Informe um e-mail válido.", "email");
  assertPassword(input.password);
  const passwordHash = await hashPassword(input.password);
  return updateDb((db) => {
    if (!catalogOf(db).professionals.some((p) => p.name === input.professional)) {
      throw invalid("Profissional não encontrado.", "professional");
    }
    if (db.users.some((u) => u.email === email)) {
      const message = "Já existe uma conta com esse e-mail.";
      throw new DomainError("email_taken", message, { email: message });
    }
    const user: User = {
      id: crypto.randomUUID(),
      name,
      phone: "",
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
      role: "barbeiro",
      professional: input.professional,
    };
    db.users.push(user);
    return user.id;
  });
}

/** Liga (ou desliga, com `null`) a conta de um admin a um profissional. */
export async function linkAdminToProfessional(adminId: string, professional: string | null): Promise<void> {
  await updateDb((db) => {
    const admin = db.users.find((u) => u.id === adminId);
    if (!admin || roleOf(admin) !== "admin") throw new DomainError("forbidden", "Só a conta de admin pode ser ligada assim.");
    if (professional === null) {
      delete admin.professional;
      return;
    }
    if (!catalogOf(db).professionals.some((p) => p.name === professional)) {
      throw invalid("Profissional não encontrado.", "professional");
    }
    admin.professional = professional;
  });
}

/** Apaga a conta do barbeiro e as sessões dela. Só vale para contas `barbeiro`. */
export async function removeBarberAccess(userId: string): Promise<void> {
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user || roleOf(user) !== "barbeiro") throw notAllowed();
    purgeUser(db, userId);
  });
}

/**
 * Adiciona ou altera um profissional. Renomear leva junto os serviços, os
 * períodos fechados, as reservas e as contas ligadas a ele.
 */
export async function saveProfessional(input: { original?: string; name: string; color: ProfessionalColor }): Promise<void> {
  const name = String(input.name ?? "").trim();
  const original = input.original || undefined;
  if (name.length < 2 || name.length > 40) throw invalid("Dê um nome de 2 a 40 caracteres.", "name");
  if (!PROFESSIONAL_COLORS.some((c) => c.id === input.color)) throw invalid("Escolha uma cor.", "color");
  await updateDb((db) => {
    const { services, professionals } = ensureCatalog(db);
    if (professionals.some((p) => p.name !== original && normalize(p.name) === normalize(name))) {
      throw invalid("Já existe um profissional com esse nome.", "name");
    }
    if (!original) {
      professionals.push({ name, color: input.color });
      return;
    }
    const current = professionals.find((p) => p.name === original);
    if (!current) throw new DomainError("not_found", "Profissional não encontrado.");
    current.name = name;
    current.color = input.color;
    if (original === name) return;
    for (const s of services) if (s.professional === original) s.professional = name;
    for (const c of db.closures) if (c.professional === original) c.professional = name;
    for (const r of db.reservations) if (r.professional === original) r.professional = name;
    for (const u of db.users) if (u.professional === original) u.professional = name;
  });
}

/** Remove o profissional. Recusa se tiver serviços, horários futuros ou conta ligada. */
export async function removeProfessional(name: string): Promise<void> {
  await updateDb((db) => {
    const { services, professionals } = ensureCatalog(db);
    if (services.some((s) => s.professional === name)) throw invalid("Mova ou exclua os serviços dele antes.");
    const today = nowInStudio().date;
    if (db.reservations.some((r) => r.professional === name && !r.cancelledAt && r.date >= today)) {
      throw invalid("Remarque ou cancele os horários dele antes.");
    }
    if (db.users.some((u) => u.professional === name)) throw invalid("Remova o acesso ligado a ele antes.");
    db.professionals = professionals.filter((p) => p.name !== name);
  });
}

/** Horários do profissional entre `from` e `to` (inclusive), sem os cancelados, em ordem. */
export async function getBarberAgenda(professional: string, from: string, to: string): Promise<AgendaReservation[]> {
  return (await getAgenda(from, to)).filter((r) => r.service.professional === professional);
}

const ATTENDANCE: (Attendance | null)[] = ["compareceu", "faltou", null];

/**
 * Compareceu / faltou (ou `null` para desfazer). O admin marca qualquer
 * reserva; o barbeiro só as do próprio profissional (as outras dão
 * `not_found`, sem confirmar que existem). Só depois do horário.
 */
export async function setAttendanceFor(
  actor: { role: Role; professional?: string },
  id: string,
  attendance: Attendance | null,
): Promise<void> {
  if (!ATTENDANCE.includes(attendance)) {
    throw invalid("Use compareceu, faltou ou null.", "attendance");
  }
  await updateDb((db) => {
    const r = db.reservations.find((x) => x.id === id);
    const mine = (res: typeof r) => {
      if (!res) return false;
      if (actor.role === "admin") return true;
      const service = findService(catalogOf(db).services, res.serviceId);
      return Boolean(actor.professional) && professionalOf(res, service) === actor.professional;
    };
    if (!r || !mine(r)) throw new DomainError("not_found", "Reserva não encontrada.");
    if (isCancelled(r)) throw invalid("Essa reserva foi cancelada.");
    // Só depois do horário dá para saber se o cliente veio.
    if (!isPast(r, nowInStudio())) throw invalid("Só dá para marcar depois do horário.");
    if (attendance) r.attendance = attendance;
    else delete r.attendance;
  });
}

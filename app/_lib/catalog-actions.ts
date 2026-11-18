"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { ensureCatalog } from "./catalog";
import { updateDb, type ProfessionalColor } from "./db";
import {
  createBarberAccess,
  linkAdminToProfessional,
  removeBarberAccess,
  removeProfessional,
  saveProfessional as saveProfessionalData,
} from "./domain/barber";
import { messageOf } from "./errors";
import { normalize } from "./format";
import { withNotice } from "./notices";

export type CatalogFormState = { error: string | null; saved?: boolean };

const PATH = "/admin/servicos";
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function assertAdmin() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/login?next=%2Fadmin%2Fservicos");
  return user;
}

/** "R$ 70,50" / "70.5" / "70" -> 7050. */
function parsePrice(raw: string) {
  const clean = raw.replace(/[^\d,.]/g, "");
  // Sem nenhum dígito (vazio, "abc") é inválido, não zero.
  if (!/\d/.test(clean)) return NaN;
  const value = clean.includes(",") ? Number(clean.replace(/\./g, "").replace(",", ".")) : Number(clean);
  return Number.isFinite(value) ? Math.round(value * 100) : NaN;
}

function slugify(name: string) {
  return normalize(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "servico";
}

export async function saveService(_prev: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  await assertAdmin();
  const id = text(formData, "id");
  const name = text(formData, "nome");
  const category = text(formData, "categoria");
  const professional = text(formData, "profissional");
  const durationMinutes = Number(text(formData, "duracao"));
  const priceCents = parsePrice(text(formData, "preco"));
  const active = formData.get("ativo") === "on";

  if (name.length < 2 || name.length > 80) return { error: "Dê um nome de 2 a 80 caracteres." };
  if (category.length < 2 || category.length > 40) return { error: "Informe a categoria (até 40 caracteres)." };
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480 || durationMinutes % 5 !== 0) {
    return { error: "A duração precisa ser de 5 a 480 minutos, em múltiplos de 5." };
  }
  if (!Number.isFinite(priceCents) || priceCents < 0 || priceCents > 10_000_00) {
    return { error: "Informe um preço válido (ex.: 70,00)." };
  }

  const error = await updateDb((db) => {
    const { services, professionals } = ensureCatalog(db);
    if (professional && !professionals.some((p) => p.name === professional)) return "Profissional não encontrado.";
    if (services.some((s) => s.id !== id && normalize(s.name) === normalize(name))) {
      return "Já existe um serviço com esse nome.";
    }
    const data = {
      name,
      category,
      professional: professional || undefined,
      durationMinutes,
      priceCents,
      active,
    };
    if (id) {
      const current = services.find((s) => s.id === id);
      if (!current) return "Serviço não encontrado.";
      // Reservas antigas guardam o preço de antes, para o histórico não mudar.
      if (current.priceCents !== priceCents) {
        for (const r of db.reservations) {
          if (r.serviceId === id && r.priceCents === undefined) r.priceCents = current.priceCents;
        }
      }
      Object.assign(current, data);
      if (!data.professional) delete current.professional;
    } else {
      let newId = slugify(name);
      while (services.some((s) => s.id === newId)) newId = `${slugify(name)}-${crypto.randomUUID().slice(0, 4)}`;
      services.push({ id: newId, ...data });
    }
    return null;
  });
  if (error) return { error };
  redirect(withNotice(PATH, "servico-salvo"));
}

/** Liga ou desliga o serviço no agendamento. */
export async function toggleService(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  await updateDb((db) => {
    const service = ensureCatalog(db).services.find((s) => s.id === id);
    if (service) service.active = service.active === false;
  });
  refresh();
}

/** Remove de vez só se nenhuma reserva usa o serviço; senão apenas desativa (o histórico depende dele). */
export async function deleteService(formData: FormData) {
  await assertAdmin();
  const id = text(formData, "id");
  await updateDb((db) => {
    const { services } = ensureCatalog(db);
    if (db.reservations.some((r) => r.serviceId === id)) {
      const service = services.find((s) => s.id === id);
      if (service) service.active = false;
      return;
    }
    db.services = services.filter((s) => s.id !== id);
  });
  refresh();
}

export async function saveProfessional(_prev: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  await assertAdmin();
  try {
    await saveProfessionalData({
      original: text(formData, "original"),
      name: text(formData, "nome"),
      color: text(formData, "cor") as ProfessionalColor,
    });
  } catch (error) {
    return { error: messageOf(error) };
  }
  refresh();
  return { error: null, saved: true };
}

/** Com serviços, horários futuros ou conta ligada, a tela nem oferece a exclusão; o domínio garante. */
export async function deleteProfessional(formData: FormData) {
  await assertAdmin();
  await removeProfessional(text(formData, "nome")).catch(messageOf);
  refresh();
}

/** Admin cria o acesso do barbeiro (e-mail e senha provisória) para um profissional. */
export async function createBarberAccessAction(_prev: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  await assertAdmin();
  try {
    await createBarberAccess({
      professional: text(formData, "profissional"),
      name: text(formData, "nome"),
      email: text(formData, "email"),
      password: String(formData.get("senha") ?? ""),
    });
  } catch (error) {
    return { error: messageOf(error) };
  }
  refresh();
  return { error: null, saved: true };
}

/** "Sou eu" / "Não sou eu": liga ou desliga a conta do admin logado a um profissional. */
export async function linkOwnAccountAction(formData: FormData) {
  const admin = await assertAdmin();
  await linkAdminToProfessional(admin.id, text(formData, "profissional") || null);
  refresh();
}

export async function removeBarberAccessAction(formData: FormData) {
  await assertAdmin();
  await removeBarberAccess(text(formData, "id"));
  refresh();
}

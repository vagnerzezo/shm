"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { nowInStudio } from "./availability";
import { catalogOf } from "./catalog";
import { updateDb, type ProfessionalColor } from "./db";
import { normalize } from "./format";
import { withNotice } from "./notices";
import { PROFESSIONAL_COLORS } from "./services";

export type CatalogFormState = { error: string | null; saved?: boolean };

const PATH = "/admin/servicos";
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function assertAdmin() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/login?next=%2Fadmin%2Fservicos");
}

/** Copia o catálogo padrão para o banco na primeira alteração. */
function ensureCatalog(db: Parameters<Parameters<typeof updateDb>[0]>[0]) {
  const { services, professionals } = catalogOf(db);
  db.services ??= services.map((s) => ({ ...s }));
  db.professionals ??= professionals.map((p) => ({ ...p }));
  return { services: db.services, professionals: db.professionals };
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
  const original = text(formData, "original");
  const name = text(formData, "nome");
  const color = text(formData, "cor") as ProfessionalColor;

  if (name.length < 2 || name.length > 40) return { error: "Dê um nome de 2 a 40 caracteres." };
  if (!PROFESSIONAL_COLORS.some((c) => c.id === color)) return { error: "Escolha uma cor." };

  const error = await updateDb((db) => {
    const { services, professionals } = ensureCatalog(db);
    if (professionals.some((p) => p.name !== original && normalize(p.name) === normalize(name))) {
      return "Já existe um profissional com esse nome.";
    }
    if (original) {
      const current = professionals.find((p) => p.name === original);
      if (!current) return "Profissional não encontrado.";
      current.name = name;
      current.color = color;
      // Renomear leva junto os serviços e os períodos fechados dele.
      if (original !== name) {
        for (const s of services) if (s.professional === original) s.professional = name;
        for (const c of db.closures) if (c.professional === original) c.professional = name;
        for (const r of db.reservations) if (r.professional === original) r.professional = name;
      }
    } else {
      professionals.push({ name, color });
    }
    return null;
  });
  if (error) return { error };
  refresh();
  return { error: null, saved: true };
}

export async function deleteProfessional(formData: FormData) {
  await assertAdmin();
  const name = text(formData, "nome");
  await updateDb((db) => {
    const { services, professionals } = ensureCatalog(db);
    // Com serviços ligados, a tela nem oferece a exclusão; aqui é só a garantia.
    if (services.some((s) => s.professional === name)) return;
    // Nem com atendimentos futuros atribuídos a ele (serviços sem profissional fixo).
    const today = nowInStudio().date;
    if (db.reservations.some((r) => r.professional === name && !r.cancelledAt && r.date >= today)) return;
    db.professionals = professionals.filter((p) => p.name !== name);
  });
  refresh();
}

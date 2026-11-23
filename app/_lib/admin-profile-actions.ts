"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { updateDb } from "./db";
import { readProfile } from "./profile";

export type AdminProfileState = { error: string | null; saved: boolean };

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/login?next=%2Fadmin%2Fperfil");
  return user;
}

/** Nome, telefone e e-mail do admin. As autorizações de marketing não se aplicam a ele. */
export async function updateAdminProfile(_prev: AdminProfileState, formData: FormData): Promise<AdminProfileState> {
  const admin = await requireAdminUser();
  const profile = readProfile(formData);
  if ("error" in profile) return { error: profile.error, saved: false };

  const ok = await updateDb((db) => {
    if (db.users.some((u) => u.email === profile.email && u.id !== admin.id)) return false;
    const current = db.users.find((u) => u.id === admin.id);
    if (current) Object.assign(current, { name: profile.name, phone: profile.phone, email: profile.email });
    return true;
  });
  if (!ok) return { error: "Esse e-mail já está em uso em outra conta.", saved: false };
  // O formulário volta aos valores da página depois de salvar; sem recarregar, mostraria os antigos.
  refresh();
  return { error: null, saved: true };
}

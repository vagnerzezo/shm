"use server";

import { redirect } from "next/navigation";
import { createSession, getCurrentUser, hashPassword, verifyPassword } from "./auth";
import { readDb, updateDb } from "./db";
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
  return { error: null, saved: true };
}

/** Troca a própria senha. Encerra as outras sessões e mantém esta aberta. */
export async function changeAdminPassword(_prev: AdminProfileState, formData: FormData): Promise<AdminProfileState> {
  const admin = await requireAdminUser();
  const current = String(formData.get("atual") ?? "");
  const password = String(formData.get("senha") ?? "");
  const confirm = String(formData.get("confirmacao") ?? "");

  const user = (await readDb()).users.find((u) => u.id === admin.id);
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { error: "A senha atual está incorreta.", saved: false };
  }
  if (password.length < 8 || password.length > 100) {
    return { error: "A nova senha precisa ter de 8 a 100 caracteres.", saved: false };
  }
  if (password !== confirm) return { error: "As duas senhas novas não são iguais.", saved: false };
  if (password === current) return { error: "A nova senha precisa ser diferente da atual.", saved: false };

  const passwordHash = await hashPassword(password);
  await updateDb((db) => {
    const u = db.users.find((u) => u.id === admin.id);
    if (u) u.passwordHash = passwordHash;
    db.sessions = db.sessions.filter((s) => s.userId !== admin.id);
  });
  await createSession(admin.id);
  return { error: null, saved: true };
}

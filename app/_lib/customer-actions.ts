"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, hashPassword, roleOf } from "./auth";
import { updateDb } from "./db";
import { withNotice } from "./notices";
import { readProfile } from "./profile";

export type CustomerFormState = { error: string | null; saved: boolean };

async function assertAdmin() {
  const admin = await getCurrentUser();
  if (admin?.role !== "admin") redirect("/login?next=%2Fadmin%2Fclientes");
}

/** Admin altera os dados de um cliente. A senha tem ação própria. */
export async function updateCustomer(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  const profile = readProfile(formData);
  if ("error" in profile) return { error: profile.error.replace("seu nome", "o nome"), saved: false };
  const adminNote = String(formData.get("observacao") ?? "").trim();
  if (adminNote.length > 1000) return { error: "As observações podem ter até 1000 caracteres.", saved: false };

  const error = await updateDb((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user || roleOf(user) !== "cliente") return "Cliente não encontrado.";
    if (db.users.some((u) => u.email === profile.email && u.id !== id)) return "Esse e-mail já está em uso em outra conta.";
    Object.assign(user, profile, { adminNote: adminNote || undefined });
    return null;
  });
  if (error) return { error, saved: false };
  refresh();
  return { error: null, saved: true };
}

/** Define uma nova senha e encerra as sessões abertas do cliente. */
export async function setCustomerPassword(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("senha") ?? "");
  const confirm = String(formData.get("confirmacao") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres.", saved: false };
  if (password.length > 100) return { error: "A senha pode ter até 100 caracteres.", saved: false };
  if (password !== confirm) return { error: "As duas senhas não são iguais.", saved: false };

  const passwordHash = await hashPassword(password);
  const error = await updateDb((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user || roleOf(user) !== "cliente") return "Cliente não encontrado.";
    user.passwordHash = passwordHash;
    db.sessions = db.sessions.filter((s) => s.userId !== id);
    return null;
  });
  if (error) return { error, saved: false };
  return { error: null, saved: true };
}

/** Desativa (encerra as sessões) ou reativa a conta. Reservas e histórico ficam como estão. */
export async function setCustomerActive(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("ativo") === "true";
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user || roleOf(user) !== "cliente") return;
    if (active) {
      delete user.disabledAt;
    } else {
      user.disabledAt = new Date().toISOString();
      db.sessions = db.sessions.filter((s) => s.userId !== id);
    }
  });
  refresh();
}

export type CreateCustomerState = { error: string | null };

/** Admin cadastra um cliente (ex.: quem marcou por telefone). A senha é passada ao cliente depois. */
export async function createCustomer(_prev: CreateCustomerState, formData: FormData): Promise<CreateCustomerState> {
  await assertAdmin();
  const profile = readProfile(formData);
  if ("error" in profile) return { error: profile.error.replace("seu nome", "o nome") };
  const password = String(formData.get("senha") ?? "");
  if (password.length < 8 || password.length > 100) return { error: "A senha precisa ter de 8 a 100 caracteres." };
  const adminNote = String(formData.get("observacao") ?? "").trim().slice(0, 1000);

  const passwordHash = await hashPassword(password);
  const id = await updateDb((db) => {
    if (db.users.some((u) => u.email === profile.email)) return null;
    const id = crypto.randomUUID();
    db.users.push({
      id,
      ...profile,
      passwordHash,
      adminNote: adminNote || undefined,
      createdAt: new Date().toISOString(),
    });
    return id;
  });
  if (!id) return { error: "Já existe uma conta com esse e-mail." };
  // Volta para onde o cadastro foi pedido (ex.: nova reserva) ou para a ficha do cliente.
  const next = String(formData.get("voltar") ?? "");
  if (next === "reserva") redirect(withNotice(`/admin/agenda/nova?cliente=${id}`, "cliente-criado"));
  redirect(withNotice(`/admin/clientes/${id}`, "cliente-criado"));
}

/**
 * Exclui o cliente e tudo ligado a ele (reservas, conversa, envios de marketing).
 * Para pedidos de exclusão de dados (LGPD). Não tem volta.
 */
export async function deleteCustomer(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const confirmation = String(formData.get("confirmacao") ?? "").trim().toUpperCase();
  if (confirmation !== "EXCLUIR") return;
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user || roleOf(user) !== "cliente") return;
    db.users = db.users.filter((u) => u.id !== id);
    db.sessions = db.sessions.filter((s) => s.userId !== id);
    db.reservations = db.reservations.filter((r) => r.userId !== id);
    db.messages = db.messages.filter((m) => m.customerId !== id);
    db.dispatches = db.dispatches.filter((d) => d.customerId !== id);
  });
  redirect(withNotice("/admin/clientes", "cliente-excluido"));
}

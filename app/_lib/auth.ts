import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readDb, updateDb, type Consent, type Role, type User } from "./db";

const scryptAsync = promisify(scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;

const SESSION_COOKIE = "shm_sessao";
const SESSION_DAYS = 30;

/** Dados do cliente que podem ir para a tela (sem senha). */
export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  consent: Consent;
};

/** E-mails em `ADMIN_EMAILS` (separados por vírgula) também entram como admin. */
export function roleOf(user: Pick<User, "email" | "role">): Role {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return user.role === "admin" || admins.includes(user.email) ? "admin" : "cliente";
}

/** Para onde cada perfil vai quando não há um `next`. */
export function homeOf(user: Pick<User, "email" | "role">) {
  return roleOf(user) === "admin" ? "/admin" : "/reservas";
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

/** Só em Server Actions: grava a sessão e o cookie. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await updateDb((db) => {
    db.sessions = db.sessions.filter((s) => s.expiresAt > Date.now());
    db.sessions.push({ token, userId, expiresAt });
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/** Só em Server Actions. */
export async function deleteSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await updateDb((db) => void (db.sessions = db.sessions.filter((s) => s.token !== token)));
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<Customer | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await readDb();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  const user = session && db.users.find((u) => u.id === session.userId);
  // Conta desativada perde o acesso mesmo com sessão aberta.
  if (!user || user.disabledAt) return null;
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: roleOf(user),
    consent: user.consent ?? { email: false, mensagem: false },
  };
});

/** Aceita só caminhos internos, para o `next` não virar redirecionamento aberto. */
export function safeNext(next: unknown, fallback = "/reservas") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : fallback;
}

export function loginHref(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** Para páginas que exigem login: volta para `next` depois de entrar. */
export async function requireUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(loginHref(next));
  return user;
}

/** Para páginas do painel admin: cliente logado volta para a área dele. */
export async function requireAdmin(next: string) {
  const user = await requireUser(next);
  if (user.role !== "admin") redirect("/reservas");
  return user;
}

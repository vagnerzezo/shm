import type { Consent, Role, User } from "./db";

// Perfis e o usuário "público" (sem senha). Sem dependência do Next, para
// servir também a scripts e testes.

/** Dados do usuário logado que podem ir para a tela ou para a API. */
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

export function toCustomer(user: Pick<User, "id" | "name" | "phone" | "email" | "role" | "consent">): Customer {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: roleOf(user),
    consent: user.consent ?? { email: false, mensagem: false },
  };
}

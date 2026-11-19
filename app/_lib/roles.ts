import type { Consent, Role, User } from "./db";

// Perfis e o usuário "público" (sem senha). Sem dependência do Next, para
// servir também a scripts e testes.

/** Menus que o admin pode liberar para um barbeiro, nesta ordem. */
export const BARBER_MENUS = ["inicio", "agenda", "clientes", "historico"] as const;
export type BarberMenu = (typeof BARBER_MENUS)[number];

/** Menus válidos de um valor qualquer (do banco ou de um formulário): sem repetição, na ordem de `BARBER_MENUS`. */
export function menusOf(raw: unknown): BarberMenu[] {
  if (!Array.isArray(raw)) return [];
  return BARBER_MENUS.filter((m) => raw.includes(m));
}

/** Dados do usuário logado que podem ir para a tela ou para a API. */
export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  consent: Consent;
  /** Profissional ligado (barbeiro, ou admin que também atende). */
  professional?: string;
  /** Menus extras liberados (só barbeiro; `[]` para admin e cliente). */
  menus: BarberMenu[];
};

/** E-mails em `ADMIN_EMAILS` (separados por vírgula) também entram como admin. */
export function roleOf(user: Pick<User, "email" | "role">): Role {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (user.role === "admin" || admins.includes(user.email)) return "admin";
  return user.role === "barbeiro" ? "barbeiro" : "cliente";
}

const HOME: Record<Role, string> = { admin: "/admin", barbeiro: "/barbeiro", cliente: "/reservas" };

/** Para onde cada perfil vai quando não há um `next`. */
export function homeOf(user: Pick<User, "email" | "role">) {
  return HOME[roleOf(user)];
}

export function toCustomer(
  user: Pick<User, "id" | "name" | "phone" | "email" | "role" | "consent" | "professional"> & { menus?: unknown },
): Customer {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: roleOf(user),
    consent: user.consent ?? { email: false, mensagem: false },
    ...(user.professional && { professional: user.professional }),
    menus: roleOf(user) === "barbeiro" ? menusOf(user.menus) : [],
  };
}

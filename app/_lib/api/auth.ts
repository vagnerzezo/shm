import { getCurrentUser } from "../auth";
import type { Role } from "../db";
import { DomainError } from "../errors";
import type { Customer } from "../roles";

/** Usuário da requisição (token Bearer ou cookie). Com `roles`, exige um desses perfis. */
export async function requireAuth(roles?: Role[]): Promise<Customer> {
  const user = await getCurrentUser();
  if (!user) throw new DomainError("unauthenticated", "Entre na sua conta para continuar.");
  if (roles && !roles.includes(user.role)) {
    throw new DomainError("forbidden", "Sua conta não tem permissão para isso.");
  }
  return user;
}

import { DomainError } from "./errors";
import { BARBER_MENUS, type BarberMenu, type Customer } from "./roles";

// Regra central de acesso da equipe: quem abre cada menu do painel e de quais
// dados. Admin vê tudo; barbeiro só os menus liberados, filtrados pelo
// profissional dele. Sem dependência do Next, para servir a testes e ações.

/** De quais dados: todos (admin) ou só os do profissional e da conta do barbeiro. */
export type Scope = { all: true } | { all: false; professional: string; userId: string };

/** A pessoa pode abrir este menu do painel? */
export function canOpen(user: Customer | null, menu: BarberMenu): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.role === "barbeiro" && Boolean(user.professional) && user.menus.includes(menu);
}

/** Escopo dos dados de quem já pode abrir algum menu. Cliente ou barbeiro sem profissional: `forbidden`. */
export function scopeOf(user: Customer): Scope {
  if (user.role === "admin") return { all: true };
  if (user.role === "barbeiro" && user.professional) {
    return { all: false, professional: user.professional, userId: user.id };
  }
  throw new DomainError("forbidden", "Sem permissão.");
}

/** Menus do painel que aparecem para a pessoa (admin: todos). */
export function staffLinks(user: Customer): BarberMenu[] {
  return BARBER_MENUS.filter((m) => canOpen(user, m));
}

/** Para buscas que devolvem `null` fora do escopo: vira `not_found`, sem confirmar que existe. */
export function assertCustomerInScope<T>(customer: T | null): asserts customer is T {
  if (!customer) throw new DomainError("not_found", "Cliente não encontrado.");
}

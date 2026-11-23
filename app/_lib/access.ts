import { DomainError } from "./errors";
import type { BarberMenu, Customer } from "./roles";

// Regra central de acesso da equipe: quem abre cada menu do painel e de quais
// dados. Admin vê tudo; barbeiro com profissional abre os menus fixos da área
// dele (agenda, clientes, histórico, chat), só com os dados do profissional.
// Sem dependência do Next, para servir a testes e ações.

/** De quais dados: todos (admin) ou só os do profissional e da conta do barbeiro. */
export type Scope = { all: true } | { all: false; professional: string; userId: string };

/**
 * A pessoa pode abrir este menu do painel? Todo barbeiro com profissional tem
 * a própria agenda, os clientes e o histórico; o Início do painel é só do admin.
 */
export function canOpen(user: Customer | null, menu: BarberMenu): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.role === "barbeiro" && Boolean(user.professional) && menu !== "inicio";
}

/** Escopo dos dados de quem já pode abrir algum menu. Cliente ou barbeiro sem profissional: `forbidden`. */
export function scopeOf(user: Customer): Scope {
  if (user.role === "admin") return { all: true };
  if (user.role === "barbeiro" && user.professional) {
    return { all: false, professional: user.professional, userId: user.id };
  }
  throw new DomainError("forbidden", "Sem permissão.");
}

/**
 * Dados de cliente que a pessoa pode gravar. Barbeiro mantém o e-mail e as
 * autorizações já gravados: trocar o e-mail permitiria tomar a conta pelo
 * "esqueci minha senha", e as autorizações são escolha do cliente.
 */
export function profileForScope<P extends { email: string; consent: unknown }>(
  submitted: P,
  stored: { email: string; consent: P["consent"] },
  scope: Scope,
): P {
  if (scope.all) return submitted;
  return { ...submitted, email: stored.email, consent: stored.consent };
}

/** Dias fechados que a pessoa vê: admin, todos; barbeiro, os do estúdio todo e os dele. */
export function closuresFor<C extends { professional?: string }>(closures: C[], scope: Scope): C[] {
  return scope.all ? closures : closures.filter((c) => !c.professional || c.professional === scope.professional);
}

import type { StudioInfo } from "../db";
import type { Customer } from "../roles";
import type { Service } from "../services";

// Formato público (JSON da API) dos objetos internos.

export function studioJson(studio: StudioInfo) {
  return {
    name: studio.name,
    address: studio.address,
    phone: studio.phone,
    ...(studio.email && { email: studio.email }),
    ...(studio.social && { social: studio.social }),
  };
}

export function userJson(user: Customer) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    consent: user.consent,
  };
}

/** Resposta de login e de cadastro. */
export function sessionJson(session: { token: string; expiresAt: number }, user: Customer) {
  return { token: session.token, expiresAt: session.expiresAt, user: userJson(user) };
}

export function serviceJson(service: Service) {
  return {
    id: service.id,
    name: service.name,
    durationMinutes: service.durationMinutes,
    priceCents: service.priceCents,
    professional: service.professional ?? null,
  };
}

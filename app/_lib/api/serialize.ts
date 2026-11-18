import { toMinutes, toTime } from "../availability";
import type { StudioInfo } from "../db";
import { statusOf, type Reservation } from "../reservations";
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

/** Reserva do cliente. `status`: agendado, realizado ou faltou (as canceladas não saem pela API). */
export function reservationJson(r: Reservation, now: { date: string; minutes: number }) {
  return {
    id: r.id,
    date: r.date,
    time: r.time,
    endTime: toTime(toMinutes(r.time) + r.service.durationMinutes),
    status: statusOf(r, now),
    ...(r.note && { note: r.note }),
    service: serviceJson(r.service),
  };
}

import { toMinutes, toTime } from "../availability";
import type { ChatMessage, StudioInfo } from "../db";
import { statusOf, type AgendaReservation, type Reservation } from "../reservations";
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
    ...(user.professional && { professional: user.professional }),
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

export function messageJson(m: ChatMessage & { authorName?: string }) {
  return {
    id: m.id,
    from: m.from,
    text: m.text,
    createdAt: m.createdAt,
    ...(m.readAt && { readAt: m.readAt }),
    ...(m.authorName && { authorName: m.authorName }),
  };
}

/** Horário visto pelo barbeiro: sem preço e sem o e-mail do cliente. */
export function barberReservationJson(r: AgendaReservation, now: { date: string; minutes: number }) {
  return {
    id: r.id,
    date: r.date,
    time: r.time,
    endTime: toTime(toMinutes(r.time) + r.service.durationMinutes),
    status: statusOf(r, now),
    attendance: r.attendance ?? null,
    ...(r.note && { note: r.note }),
    service: { id: r.service.id, name: r.service.name, durationMinutes: r.service.durationMinutes },
    customer: { name: r.customer.name, phone: r.customer.phone },
  };
}

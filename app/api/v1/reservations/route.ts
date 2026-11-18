import { after } from "next/server";
import { requireAuth } from "@/app/_lib/api/auth";
import { created, handle, readBody } from "@/app/_lib/api/http";
import { queryParam } from "@/app/_lib/api/params";
import { reservationJson } from "@/app/_lib/api/serialize";
import { nowInStudio } from "@/app/_lib/availability";
import { bookForCustomer, type BookingInput } from "@/app/_lib/domain/bookings";
import { sendBookingConfirmedEmail } from "@/app/_lib/email-templates/send";
import { DomainError } from "@/app/_lib/errors";
import { getReservations, isPast } from "@/app/_lib/reservations";

// Próximas em ordem cronológica; passadas da mais recente para a mais antiga.
export const GET = handle(async (request) => {
  const me = await requireAuth(["cliente"]);
  const scope = queryParam(new URL(request.url), "scope") ?? "upcoming";
  if (scope !== "upcoming" && scope !== "past") {
    const message = "Use scope=upcoming ou scope=past.";
    throw new DomainError("validation", message, { scope: message });
  }
  const now = nowInStudio();
  const all = await getReservations(me.id);
  const list = scope === "past" ? all.filter((r) => isPast(r, now)).reverse() : all.filter((r) => !isPast(r, now));
  return { reservations: list.map((r) => reservationJson(r, now)) };
});

// Tudo ou nada. Repetir o mesmo pedido dá 409 (o cliente já ocupa o horário).
export const POST = handle(async (request) => {
  const me = await requireAuth(["cliente"]);
  const body = await readBody(request);
  const ids = await bookForCustomer(me.id, body.items as BookingInput[], body.note);
  after(() => sendBookingConfirmedEmail(me.id, ids));
  const now = nowInStudio();
  const byId = new Map((await getReservations(me.id)).map((r) => [r.id, r]));
  return created({ reservations: ids.flatMap((id) => (byId.has(id) ? [reservationJson(byId.get(id)!, now)] : [])) });
});

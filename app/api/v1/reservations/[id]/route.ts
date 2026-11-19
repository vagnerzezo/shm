import { requireAuth } from "@/app/_lib/api/auth";
import { handle, readBody } from "@/app/_lib/api/http";
import { reservationJson } from "@/app/_lib/api/serialize";
import { nowInStudio } from "@/app/_lib/availability";
import { rescheduleForCustomer } from "@/app/_lib/domain/bookings";
import { DomainError } from "@/app/_lib/errors";
import { getReservations } from "@/app/_lib/reservations";

type Ctx = { params: Promise<{ id: string }> };

// Remarca e avisa o estúdio pelo chat (na mesma transação), como no site.
export const PATCH = handle(async (request, { params }: Ctx) => {
  const me = await requireAuth(["cliente"]);
  const { id } = await params;
  const { date, time } = await readBody(request);
  await rescheduleForCustomer(me.id, id, date, time);
  const reservation = (await getReservations(me.id)).find((r) => r.id === id);
  if (!reservation) throw new DomainError("not_found", "Reserva não encontrada.");
  return { reservation: reservationJson(reservation, nowInStudio()) };
});

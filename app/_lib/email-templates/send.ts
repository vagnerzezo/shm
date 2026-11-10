import { catalogOf } from "../catalog";
import { appUrl, emailProviderReady, sendEmail } from "../email";
import { readDb, type StoredReservation } from "../db";
import { findService, type Service } from "../services";
import { studioOf } from "../studio";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  passwordResetEmail,
  welcomeEmail,
  type BookingInfo,
  type BuiltEmail,
} from "./templates";

// Envio dos e-mails do sistema. São avisos transacionais: não dependem da
// autorização de marketing. Uma falha aqui só vai para o log; nunca derruba a
// ação do cliente (cadastro, reserva, cancelamento).

async function deliver(to: string, email: BuiltEmail, idempotencyKey: string, kind: string) {
  if (!emailProviderReady()) {
    console.info(`[e-mail:${kind}] Resend não configurado; nada enviado para ${to}.`);
    return;
  }
  try {
    await sendEmail({
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.attachments,
      idempotencyKey,
    });
  } catch (error) {
    console.error(`[e-mail:${kind}] Falha ao enviar para ${to}:`, error);
  }
}

export function toBookingInfo(r: Pick<StoredReservation, "date" | "time" | "priceCents">, service: Service): BookingInfo {
  return {
    serviceName: service.name,
    date: r.date,
    time: r.time,
    durationMinutes: service.durationMinutes,
    professional: service.professional,
    // Preço combinado na reserva; reservas antigas usam o do catálogo.
    priceCents: r.priceCents ?? service.priceCents,
  };
}

export async function sendWelcomeEmail(userId: string) {
  const db = await readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  const email = welcomeEmail({ name: user.name, email: user.email, accessUrl: `${appUrl()}/reservas` }, studioOf(db));
  await deliver(user.email, email, `boas-vindas:${user.id}`, "boas-vindas");
}

/** Um e-mail para todas as reservas criadas juntas (o carrinho pode ter vários serviços). */
export async function sendBookingConfirmedEmail(userId: string, reservationIds: string[]) {
  const db = await readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user || reservationIds.length === 0) return;
  const { services } = catalogOf(db);
  const bookings = db.reservations
    .filter((r) => reservationIds.includes(r.id) && r.userId === userId)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .flatMap((r) => {
      const service = findService(services, r.serviceId);
      return service ? [toBookingInfo(r, service)] : [];
    });
  if (bookings.length === 0) return;
  const email = bookingConfirmedEmail(
    { name: user.name, bookings, reservationsUrl: `${appUrl()}/reservas` },
    studioOf(db),
  );
  await deliver(user.email, email, `agendamento:${[...reservationIds].sort().join(",")}`, "agendamento");
}

/** A reserva já foi apagada do banco quando isto roda: quem chama passa os dados dela. */
export async function sendBookingCancelledEmail(
  userId: string,
  reservation: Pick<StoredReservation, "id" | "serviceId" | "date" | "time" | "priceCents">,
  options: { byStudio: boolean; reason?: string },
) {
  const db = await readDb();
  const user = db.users.find((u) => u.id === userId);
  const service = findService(catalogOf(db).services, reservation.serviceId);
  if (!user || !service) return;
  const email = bookingCancelledEmail(
    {
      name: user.name,
      booking: toBookingInfo(reservation, service),
      byStudio: options.byStudio,
      reason: options.reason,
      bookUrl: `${appUrl()}/agendamento`,
    },
    studioOf(db),
  );
  await deliver(user.email, email, `cancelamento:${reservation.id}`, "cancelamento");
}

export async function sendPasswordResetEmail(
  user: { name: string; email: string },
  resetUrl: string,
  validMinutes: number,
  idempotencyKey: string,
) {
  const studio = studioOf(await readDb());
  await deliver(user.email, passwordResetEmail({ name: user.name, resetUrl, validMinutes }, studio), idempotencyKey, "senha");
}

import { addDays, nowInStudio } from "../availability";
import { getBookableServices } from "../catalog";
import { appUrl } from "../email";
import type { StudioInfo } from "../db";
import type { ImageMode } from "./layout";
import { toBookingInfo } from "./send";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  passwordResetEmail,
  welcomeEmail,
  type BuiltEmail,
} from "./templates";

// Prévia e envio de teste dos e-mails do sistema (tela do admin). Usa o nome e
// o e-mail de quem está vendo e um serviço real do catálogo; só a data é
// inventada (amanhã às 10:00).

export const EMAIL_KINDS = {
  "boas-vindas": "Boas-vindas",
  agendamento: "Agendamento realizado",
  cancelamento: "Agendamento cancelado",
  senha: "Redefinição de senha",
} as const;

export type EmailKind = keyof typeof EMAIL_KINDS;

export const isEmailKind = (v: unknown): v is EmailKind => typeof v === "string" && v in EMAIL_KINDS;

export async function buildSample(
  kind: EmailKind,
  viewer: { name: string; email: string },
  studio: StudioInfo,
  mode?: ImageMode,
): Promise<BuiltEmail> {
  const [service] = await getBookableServices();
  const date = addDays(nowInStudio().date, 1);
  const booking = service
    ? toBookingInfo({ date, time: "10:00" }, service)
    : { serviceName: "Serviço", date, time: "10:00", durationMinutes: 60, priceCents: 0 };

  switch (kind) {
    case "boas-vindas":
      return welcomeEmail({ ...viewer, accessUrl: `${appUrl()}/reservas` }, studio, mode);
    case "agendamento":
      return bookingConfirmedEmail({ name: viewer.name, bookings: [booking], reservationsUrl: `${appUrl()}/reservas` }, studio, mode);
    case "cancelamento":
      return bookingCancelledEmail(
        { name: viewer.name, booking, byStudio: true, reason: "imprevisto na agenda do profissional", bookUrl: `${appUrl()}/agendamento` },
        studio,
        mode,
      );
    case "senha":
      return passwordResetEmail({ name: viewer.name, resetUrl: `${appUrl()}/esqueci-senha`, validMinutes: 60 }, studio, mode);
  }
}

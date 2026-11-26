import { formatLongDate, formatWeekday } from "../availability";
import { endTime } from "../booking";
import type { StudioInfo } from "../db";
import { formatDuration, formatPrice } from "../services";
import { renderEmail, type EmailCard, type ImageMode, type RenderedEmail } from "./layout";
import { emailTexts, fillVars, linesOf, paragraphsOf, type EmailTexts } from "./texts";

// Os quatro e-mails do sistema. Cada função recebe só dados reais (nome,
// serviço, data, links) e devolve assunto, HTML, texto puro e imagens. O texto
// vem de `texts.ts`: o original ou o que o admin editou (`custom`).

export type BuiltEmail = RenderedEmail & { subject: string };

export type BookingInfo = {
  serviceName: string;
  /** AAAA-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  durationMinutes: number;
  professional?: string;
  priceCents: number;
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

function bookingCard(b: BookingInfo, cancelled = false): EmailCard {
  return {
    title: b.serviceName,
    muted: cancelled,
    tag: cancelled ? "Cancelado" : undefined,
    rows: [
      { label: "Data", value: `${formatWeekday(b.date)}, ${formatLongDate(b.date)}` },
      { label: "Horário", value: `${b.time} às ${endTime(b.time, b.durationMinutes)} (${formatDuration(b.durationMinutes)})` },
      ...(b.professional ? [{ label: "Profissional", value: b.professional }] : []),
      { label: "Valor", value: `${formatPrice(b.priceCents)} · pagamento no dia` },
    ],
  };
}

/** Textos do admin (ou originais) com os marcadores trocados. */
function textsWith(base: EmailTexts, vars: Record<string, string>) {
  const fill = (t: string) => fillVars(t, vars);
  return {
    subject: fill(base.assunto),
    title: fill(base.titulo),
    paragraphs: paragraphsOf(fill(base.texto)),
    studioParagraphs: paragraphsOf(fill(base.textoEstudio)),
    button: fill(base.botao),
    notes: linesOf(fill(base.observacoes)),
  };
}

const bookingVars = (b: BookingInfo) => ({ servico: b.serviceName, data: formatLongDate(b.date), hora: b.time });

export function welcomeEmail(
  data: { name: string; email: string; accessUrl: string },
  studio: StudioInfo,
  mode?: ImageMode,
  custom?: Partial<EmailTexts>,
): BuiltEmail {
  const first = firstName(data.name);
  const t = textsWith(emailTexts("boas-vindas", custom), { nome: first, estudio: studio.name, email: data.email });
  return {
    subject: t.subject,
    ...renderEmail(
      {
        preheader: `Sua conta foi criada, ${first}. Já dá para marcar seu horário.`,
        icon: "user-check",
        title: t.title,
        paragraphs: t.paragraphs,
        cards: [{ rows: [{ label: "Seu login", value: data.email }] }],
        cta: t.button ? { label: t.button, url: data.accessUrl } : undefined,
        notes: t.notes,
      },
      studio,
      mode,
    ),
  };
}

export function bookingConfirmedEmail(
  data: { name: string; bookings: BookingInfo[]; reservationsUrl: string },
  studio: StudioInfo,
  mode?: ImageMode,
  custom?: Partial<EmailTexts>,
): BuiltEmail {
  const first = firstName(data.name);
  const many = data.bookings.length > 1;
  const [b] = data.bookings;
  const t = textsWith(emailTexts("agendamento", custom), { nome: first, estudio: studio.name, ...bookingVars(b) });
  return {
    // Vários serviços de uma vez: assunto, título e texto no plural, automáticos.
    subject: many ? `${data.bookings.length} horários confirmados no ${studio.name}` : t.subject,
    ...renderEmail(
      {
        preheader: many
          ? `${data.bookings.length} horários marcados. Confira os detalhes.`
          : `${b.serviceName} em ${formatLongDate(b.date)} às ${b.time}.`,
        icon: "calendar-check",
        title: many ? "Agendamentos confirmados" : t.title,
        paragraphs: many ? [`Olá, ${first}! Seus horários estão marcados. Confira os detalhes:`] : t.paragraphs,
        cards: data.bookings.map((x) => bookingCard(x)),
        cta: t.button ? { label: t.button, url: data.reservationsUrl } : undefined,
        notes: t.notes,
      },
      studio,
      mode,
    ),
  };
}

export function bookingCancelledEmail(
  data: { name: string; booking: BookingInfo; byStudio: boolean; reason?: string; bookUrl: string },
  studio: StudioInfo,
  mode?: ImageMode,
  custom?: Partial<EmailTexts>,
): BuiltEmail {
  const first = firstName(data.name);
  const { booking: b } = data;
  const t = textsWith(emailTexts("cancelamento", custom), { nome: first, estudio: studio.name, ...bookingVars(b) });
  return {
    subject: t.subject,
    ...renderEmail(
      {
        preheader: `${b.serviceName} em ${formatLongDate(b.date)} às ${b.time} foi cancelado.`,
        icon: "calendar-x",
        title: t.title,
        paragraphs: [
          ...(data.byStudio ? t.studioParagraphs : t.paragraphs),
          ...(data.reason ? [`Motivo: ${data.reason}`] : []),
        ],
        cards: [bookingCard(b, true)],
        notes: t.notes,
        cta: t.button ? { label: t.button, url: data.bookUrl } : undefined,
      },
      studio,
      mode,
    ),
  };
}

export function passwordResetEmail(
  data: { name: string; resetUrl: string; validMinutes: number },
  studio: StudioInfo,
  mode?: ImageMode,
  custom?: Partial<EmailTexts>,
): BuiltEmail {
  const first = firstName(data.name);
  const validity = data.validMinutes >= 60 ? `${data.validMinutes / 60} hora${data.validMinutes > 60 ? "s" : ""}` : `${data.validMinutes} minutos`;
  const t = textsWith(emailTexts("senha", custom), { nome: first, estudio: studio.name, validade: validity });
  return {
    subject: t.subject,
    ...renderEmail(
      {
        preheader: `Use o link para criar uma nova senha. Ele vale por ${validity}.`,
        icon: "lock",
        title: t.title,
        paragraphs: t.paragraphs,
        // O link de redefinir é obrigatório: sem texto no botão, usa o original.
        cta: { label: t.button || "Redefinir minha senha", url: data.resetUrl },
        notes: t.notes,
      },
      studio,
      mode,
    ),
  };
}

import { formatLongDate, formatWeekday } from "../availability";
import { endTime } from "../booking";
import type { StudioInfo } from "../db";
import { formatDuration, formatPrice } from "../services";
import { renderEmail, type EmailCard, type ImageMode, type RenderedEmail } from "./layout";

// Os quatro e-mails do sistema. Cada função recebe só dados reais (nome,
// serviço, data, links) e devolve assunto, HTML, texto puro e imagens.

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

export function welcomeEmail(
  data: { name: string; email: string; accessUrl: string },
  studio: StudioInfo,
  mode?: ImageMode,
): BuiltEmail {
  const first = firstName(data.name);
  return {
    subject: `Boas-vindas ao ${studio.name}`,
    ...renderEmail(
      {
        preheader: `Sua conta foi criada, ${first}. Já dá para marcar seu horário.`,
        icon: "user-check",
        title: `Boas-vindas, ${first}!`,
        paragraphs: [
          `Obrigado por se cadastrar no ${studio.name}. Sua conta foi criada com sucesso e já está pronta para usar.`,
          "Pelo site você marca e remarca seus horários, acompanha suas reservas e conversa com o estúdio.",
        ],
        cards: [{ rows: [{ label: "Seu login", value: data.email }] }],
        cta: { label: "Acessar minha conta", url: data.accessUrl },
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
): BuiltEmail {
  const first = firstName(data.name);
  const many = data.bookings.length > 1;
  const [b] = data.bookings;
  return {
    subject: many
      ? `${data.bookings.length} horários confirmados no ${studio.name}`
      : `Horário confirmado: ${b.serviceName}, ${formatLongDate(b.date)} às ${b.time}`,
    ...renderEmail(
      {
        preheader: many
          ? `${data.bookings.length} horários marcados. Confira os detalhes.`
          : `${b.serviceName} em ${formatLongDate(b.date)} às ${b.time}.`,
        icon: "calendar-check",
        title: many ? "Agendamentos confirmados" : "Agendamento confirmado",
        paragraphs: [
          `Olá, ${first}! ${many ? "Seus horários estão marcados" : "Seu horário está marcado"}. Confira os detalhes:`,
        ],
        cards: data.bookings.map((x) => bookingCard(x)),
        cta: { label: "Ver meus agendamentos", url: data.reservationsUrl },
        notes: ["Precisa mudar? Você pode remarcar ou cancelar pelo site, em Minhas reservas."],
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
): BuiltEmail {
  const first = firstName(data.name);
  const { booking: b } = data;
  return {
    subject: `Agendamento cancelado: ${b.serviceName}, ${formatLongDate(b.date)}`,
    ...renderEmail(
      {
        preheader: `${b.serviceName} em ${formatLongDate(b.date)} às ${b.time} foi cancelado.`,
        icon: "calendar-x",
        title: "Agendamento cancelado",
        paragraphs: [
          data.byStudio
            ? `Olá, ${first}. Precisamos cancelar o seu horário abaixo. Pedimos desculpas pelo transtorno.`
            : `Olá, ${first}. Confirmamos o cancelamento do seu horário abaixo.`,
          ...(data.reason ? [`Motivo: ${data.reason}`] : []),
        ],
        cards: [bookingCard(b, true)],
        notes: [
          "Quer marcar outro dia? É só escolher um novo horário no site. Vai ser um prazer receber você.",
        ],
        cta: { label: "Agendar novamente", url: data.bookUrl },
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
): BuiltEmail {
  const first = firstName(data.name);
  const validity = data.validMinutes >= 60 ? `${data.validMinutes / 60} hora${data.validMinutes > 60 ? "s" : ""}` : `${data.validMinutes} minutos`;
  return {
    subject: `Redefinir sua senha — ${studio.name}`,
    ...renderEmail(
      {
        preheader: `Use o link para criar uma nova senha. Ele vale por ${validity}.`,
        icon: "lock",
        title: "Redefinição de senha",
        paragraphs: [
          `Olá, ${first}. Recebemos um pedido para redefinir a senha da sua conta.`,
          "Clique no botão abaixo e escolha uma nova senha. Ao salvar, você entra automaticamente e sai dos outros aparelhos.",
        ],
        cta: { label: "Redefinir minha senha", url: data.resetUrl },
        notes: [
          `Por segurança, o link vale por ${validity} e só pode ser usado uma vez.`,
          "Não foi você? Pode ignorar este e-mail: sua senha continua a mesma.",
        ],
      },
      studio,
      mode,
    ),
  };
}

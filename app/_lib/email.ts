// Envio de e-mail pelo Resend, usado pelo marketing e pelos e-mails da conta
// (como a redefinição de senha).

export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function emailProviderReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MARKETING_EMAIL_FROM);
}

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Se a mesma requisição for repetida com a mesma chave, o Resend não envia de novo. */
  idempotencyKey: string;
  headers?: Record<string, string>;
};

export async function sendEmail({ to, subject, text, html, idempotencyKey, headers }: OutgoingEmail) {
  if (!emailProviderReady()) {
    throw new Error("Provedor de e-mail não configurado (RESEND_API_KEY e MARKETING_EMAIL_FROM).");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.MARKETING_EMAIL_FROM,
      to: [to],
      subject,
      text,
      html,
      ...(headers && { headers }),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Resend respondeu ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
}

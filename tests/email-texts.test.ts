import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { StudioInfo } from "../app/_lib/db";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  passwordResetEmail,
  welcomeEmail,
  type BookingInfo,
} from "../app/_lib/email-templates/templates";
import { DEFAULT_EMAIL_TEXTS, validateEmailTexts } from "../app/_lib/email-templates/texts";

// Textos editáveis dos e-mails do sistema. Não usa o banco.

const studio: StudioInfo = { name: "Studio Teste", address: [], phone: "" };
const booking: BookingInfo = {
  serviceName: "Corte",
  date: "2026-11-28",
  time: "09:00",
  durationMinutes: 45,
  priceCents: 7000,
};

describe("e-mails do sistema com texto original", () => {
  test("ficam iguais aos de antes da edição", () => {
    assert.equal(welcomeEmail({ name: "Ana Souza", email: "a@x.test", accessUrl: "https://x/r" }, studio).subject, "Boas-vindas ao Studio Teste");
    const confirmed = bookingConfirmedEmail({ name: "Ana", bookings: [booking], reservationsUrl: "https://x/r" }, studio);
    assert.equal(confirmed.subject, "Horário confirmado: Corte, 28 de novembro de 2026 às 09:00");
    assert.match(confirmed.text, /Olá, Ana! Seu horário está marcado\./);
    const reset = passwordResetEmail({ name: "Ana", resetUrl: "https://x/nova-senha", validMinutes: 60 }, studio);
    assert.match(reset.text, /o link vale por 1 hora/);
  });
});

describe("e-mails do sistema com texto editado", () => {
  test("usa o texto do admin com os marcadores trocados", () => {
    const email = welcomeEmail({ name: "Ana Souza", email: "a@x.test", accessUrl: "https://x/r" }, studio, undefined, {
      assunto: "Oi {nome}, bem-vinda ao {estudio}",
      texto: "Primeiro parágrafo.\n\nSegundo, com {email}.",
      botao: "Entrar",
    });
    assert.equal(email.subject, "Oi Ana, bem-vinda ao Studio Teste");
    assert.match(email.html, /<p[^>]*>Primeiro parágrafo\.<\/p>/);
    assert.match(email.html, /<p[^>]*>Segundo, com a@x\.test\.<\/p>/);
    assert.match(email.html, />Entrar<\/a>/);
    // O link continua sendo o do sistema.
    assert.match(email.html, /href="https:\/\/x\/r"/);
  });

  test("HTML digitado pelo admin aparece como texto, não como código", () => {
    const email = welcomeEmail({ name: "Ana", email: "a@x.test", accessUrl: "https://x/r" }, studio, undefined, {
      texto: '<a href="https://golpe.test">clique</a>',
    });
    assert.doesNotMatch(email.html, /href="https:\/\/golpe\.test"/);
    assert.match(email.html, /&#60;a href=/);
  });

  test("redefinir senha sempre tem o link, mesmo com o botão vazio", () => {
    const email = passwordResetEmail({ name: "Ana", resetUrl: "https://x/nova-senha?t=1", validMinutes: 60 }, studio, undefined, {
      botao: "",
    });
    assert.match(email.html, /href="https:\/\/x\/nova-senha\?t=1"/);
  });

  test("cancelamento usa o texto certo para quem cancelou e mantém o motivo", () => {
    const custom = { texto: "Você cancelou {servico}.", textoEstudio: "Nós cancelamos {servico} de {data}." };
    const byClient = bookingCancelledEmail({ name: "Ana", booking, byStudio: false, bookUrl: "https://x/a" }, studio, undefined, custom);
    assert.match(byClient.text, /Você cancelou Corte\./);
    const byStudio = bookingCancelledEmail(
      { name: "Ana", booking, byStudio: true, reason: "férias", bookUrl: "https://x/a" },
      studio,
      undefined,
      custom,
    );
    assert.match(byStudio.text, /Nós cancelamos Corte de 28 de novembro de 2026\./);
    assert.match(byStudio.text, /Motivo: férias/);
  });

  test("vários horários de uma vez: assunto e título no plural, observação editada vale", () => {
    const email = bookingConfirmedEmail(
      { name: "Ana", bookings: [booking, { ...booking, time: "10:00" }], reservationsUrl: "https://x/r" },
      studio,
      undefined,
      { assunto: "Confirmado: {servico}", observacoes: "Chegue 5 minutos antes." },
    );
    assert.equal(email.subject, "2 horários confirmados no Studio Teste");
    assert.match(email.text, /Chegue 5 minutos antes\./);
  });
});

describe("validação dos textos", () => {
  const input = { ...DEFAULT_EMAIL_TEXTS.senha };

  test("igual ao original não guarda nada", () => {
    assert.deepEqual(validateEmailTexts("senha", input), { texts: {} });
  });

  test("guarda só o que mudou, sem espaços nas pontas", () => {
    assert.deepEqual(validateEmailTexts("senha", { ...input, titulo: "  Nova senha  " }), { texts: { titulo: "Nova senha" } });
  });

  test("recusa marcador que não existe no e-mail", () => {
    const result = validateEmailTexts("senha", { ...input, texto: "Olá {nome}, seu {servico}" });
    assert.ok("error" in result);
    assert.equal(result.field, "texto");
    assert.match(result.error, /\{servico\} não existe/);
  });

  test("recusa campo obrigatório vazio", () => {
    const result = validateEmailTexts("senha", { ...input, botao: "   " });
    assert.ok("error" in result);
    assert.equal(result.field, "botao");
  });

  test("recusa texto longo demais", () => {
    const result = validateEmailTexts("boas-vindas", { ...DEFAULT_EMAIL_TEXTS["boas-vindas"], assunto: "x".repeat(151) });
    assert.ok("error" in result);
    assert.equal(result.field, "assunto");
  });
});

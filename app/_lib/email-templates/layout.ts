import { readFileSync } from "node:fs";
import path from "node:path";
import { appUrl } from "../email";
import { escapeHtml } from "../email-html";
import type { SocialNetwork, StudioInfo } from "../db";
import { formatPhone } from "../format";

// Moldura comum dos e-mails do sistema: logo, cartão com o conteúdo, botão e
// rodapé do estúdio. Feita com tabelas e estilos inline, que é o que Gmail,
// Outlook e Apple Mail entendem. As cores e medidas seguem o painel:
// tinta #121212, cartões brancos com borda clara e cantos arredondados.

const INK = "#121212";
const TEXT = "#444444";
const MUTED = "#7a7a7a";
const LINE = "#e6e6e6";
const SOFT = "#f5f5f5";
const PAGE = "#e9e9e9";
const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type BadgeIcon = "user-check" | "calendar-check" | "calendar-x" | "lock";

export type EmailCard = {
  /** Ex.: nome do serviço. */
  title?: string;
  rows: { label: string; value: string }[];
  /** Cartão de algo que não vale mais (ex.: horário cancelado): texto mais apagado. */
  muted?: boolean;
  /** Etiqueta ao lado do título (ex.: "Cancelado"). */
  tag?: string;
};

export type EmailContent = {
  /** Texto curto que os apps de e-mail mostram ao lado do assunto. */
  preheader: string;
  icon: BadgeIcon;
  title: string;
  paragraphs: string[];
  cards?: EmailCard[];
  cta?: { label: string; url: string };
  /** Observações menores, abaixo do botão. */
  notes?: string[];
};

export type Attachment = { filename: string; content: string; content_id: string };

export type RenderedEmail = { html: string; text: string; attachments: Attachment[] };

/**
 * Como as imagens chegam ao e-mail:
 * - "url": endereço público do site (precisa de APP_URL com https);
 * - "cid": embutidas como anexo (funciona com o site fora do ar ou em localhost);
 * - "data": embutidas no HTML, só para a prévia no navegador.
 */
export type ImageMode = "url" | "cid" | "data";

export function defaultImageMode(): ImageMode {
  return appUrl().startsWith("https://") ? "url" : "cid";
}

function imageSource(mode: ImageMode) {
  const attachments: Attachment[] = [];
  const src = (publicPath: string) => {
    // Logo próprio por variável de ambiente, se o estúdio quiser outro arquivo.
    if (publicPath === "img/email/logo.png" && process.env.EMAIL_LOGO_URL) return process.env.EMAIL_LOGO_URL;
    if (mode === "url") return `${appUrl()}/${publicPath}`;
    const content = readFileSync(path.join(process.cwd(), "public", publicPath)).toString("base64");
    if (mode === "data") return `data:image/png;base64,${content}`;
    const filename = path.basename(publicPath);
    const id = `shm-${filename.replace(/\.png$/, "")}`;
    if (!attachments.some((a) => a.content_id === id)) attachments.push({ filename, content, content_id: id });
    return `cid:${id}`;
  };
  return { src, attachments };
}

const SOCIAL_LABEL: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

const esc = escapeHtml;

function cardHtml(card: EmailCard) {
  const color = card.muted ? MUTED : INK;
  const rows = card.rows
    .map(
      (row, i) => `
            <tr>
              <td style="padding:${i === 0 ? 0 : 12}px 0 0;font-family:${FONT};">
                <div style="font-size:11px;line-height:16px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${MUTED};">${esc(row.label)}</div>
                <div style="font-size:15px;line-height:22px;font-weight:600;color:${color};">${esc(row.value)}</div>
              </td>
            </tr>`,
    )
    .join("");
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;background:${SOFT};border:1px solid ${LINE};border-radius:12px;">
          <tr>
            <td style="padding:18px 20px;">
              ${card.title ? `<div style="font-family:${FONT};font-size:17px;line-height:24px;font-weight:700;color:${color};margin:0 0 12px;">${esc(card.title)}${card.tag ? ` <span style="display:inline-block;margin-left:6px;padding:2px 10px;border-radius:999px;background:#fdecec;color:#b42318;font-size:12px;line-height:18px;font-weight:600;vertical-align:2px;">${esc(card.tag)}</span>` : ""}</div>` : ""}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}
              </table>
            </td>
          </tr>
        </table>`;
}

function buttonHtml(cta: NonNullable<EmailContent["cta"]>) {
  return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:8px 0 4px;">
          <tr>
            <td align="center" bgcolor="${INK}" style="border-radius:8px;">
              <a href="${esc(cta.url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(cta.label)}</a>
            </td>
          </tr>
        </table>`;
}

function footerHtml(studio: StudioInfo, src: (p: string) => string) {
  const contact = [
    studio.phone ? esc(formatPhone(studio.phone)) : "",
    studio.email ? `<a href="mailto:${esc(studio.email)}" style="color:${TEXT};text-decoration:underline;">${esc(studio.email)}</a>` : "",
  ].filter(Boolean);
  const networks = (Object.keys(SOCIAL_LABEL) as SocialNetwork[]).filter((n) => studio.social?.[n]);
  const icons = networks
    .map(
      (n) => `<td style="padding:0 6px;"><a href="${esc(studio.social![n]!)}" target="_blank" title="${SOCIAL_LABEL[n]}"><img src="${src(`img/email/${n}.png`)}" width="32" height="32" alt="${SOCIAL_LABEL[n]}" style="display:block;border:0;width:32px;height:32px;"></a></td>`,
    )
    .join("");

  return `
    <tr>
      <td align="center" class="px" style="padding:28px 40px 8px;font-family:${FONT};font-size:13px;line-height:20px;color:${TEXT};">
        <div style="font-weight:700;color:${INK};">${esc(studio.name)}</div>
        ${studio.address.map((l) => `<div>${esc(l)}</div>`).join("")}
        ${contact.length ? `<div style="margin-top:4px;">${contact.join(" &nbsp;·&nbsp; ")}</div>` : ""}
      </td>
    </tr>
    ${
      icons
        ? `<tr><td align="center" style="padding:14px 0 4px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${icons}</tr></table></td></tr>`
        : ""
    }
    <tr>
      <td align="center" class="px" style="padding:16px 40px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">
        Este é um e-mail automático. Por favor, não responda a esta mensagem.
      </td>
    </tr>`;
}

export function renderEmail(content: EmailContent, studio: StudioInfo, mode: ImageMode = defaultImageMode()): RenderedEmail {
  const { src, attachments } = imageSource(mode);
  const paragraphs = content.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${TEXT};">${esc(p)}</p>`)
    .join("");
  const notes = (content.notes ?? [])
    .map((n) => `<p style="margin:12px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${esc(n)}</p>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${esc(content.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; }
    img { -ms-interpolation-mode: bicubic; }
    a { color: ${INK}; }
    @media (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .title { font-size: 22px !important; line-height: 30px !important; }
      .btn, .btn td { width: 100% !important; }
      .btn a { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${PAGE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAGE};">${esc(content.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE};">
    <tr>
      <td align="center" style="padding:32px 12px 40px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <tr>
            <td style="background:#ffffff;border:1px solid ${LINE};border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:36px 40px 32px;border-bottom:1px solid ${LINE};">
                    <img src="${src("img/email/logo.png")}" width="184" height="40" alt="${esc(studio.name)}" style="display:block;border:0;width:184px;height:auto;">
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:36px 40px 40px;">
                    <img src="${src(`img/email/${content.icon}.png`)}" width="48" height="48" alt="" style="display:block;border:0;width:48px;height:48px;margin:0 0 20px;">
                    <h1 class="title" style="margin:0 0 16px;font-family:${FONT};font-size:26px;line-height:34px;font-weight:700;letter-spacing:-0.4px;color:${INK};">${esc(content.title)}</h1>
                    ${paragraphs}
                    ${(content.cards ?? []).map(cardHtml).join("")}
                    ${content.cta ? `<div style="height:12px;line-height:12px;">&nbsp;</div>${buttonHtml(content.cta)}` : ""}
                    ${notes}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${footerHtml(studio, src)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text: renderText(content, studio), attachments };
}

/** Versão em texto puro (alguns apps e filtros de spam leem esta). */
function renderText(content: EmailContent, studio: StudioInfo) {
  const cards = (content.cards ?? []).map((card) =>
    [card.title, ...card.rows.map((r) => `${r.label}: ${r.value}`)].filter(Boolean).join("\n"),
  );
  const social = (Object.keys(SOCIAL_LABEL) as SocialNetwork[])
    .filter((n) => studio.social?.[n])
    .map((n) => `${SOCIAL_LABEL[n]}: ${studio.social![n]}`);
  return [
    content.title,
    "",
    ...content.paragraphs.flatMap((p) => [p, ""]),
    ...cards.flatMap((c) => [c, ""]),
    ...(content.cta ? [`${content.cta.label}: ${content.cta.url}`, ""] : []),
    ...(content.notes ?? []).flatMap((n) => [n, ""]),
    "—",
    studio.name,
    ...studio.address,
    ...[studio.phone ? formatPhone(studio.phone) : "", studio.email ?? ""].filter(Boolean),
    ...social,
    "",
    "Este é um e-mail automático. Por favor, não responda a esta mensagem.",
  ].join("\n");
}

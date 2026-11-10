// HTML do conteúdo dos templates de e-mail. Sem dependências de servidor: o
// editor, a prévia e o envio usam as mesmas regras.
//
// O conteúdo é salvo como HTML filtrado por lista de permissões. Templates
// antigos, em texto puro, continuam valendo: viram parágrafos com <br>.

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}


/** Texto puro → HTML: linha em branco separa parágrafos, quebra simples vira <br>. */
export function textToHtml(text: string) {
  return text
    .split(/\r?\n\s*\r?\n/)
    .filter((block) => block.trim())
    .map((block) => `<p>${escapeHtml(block.trim()).replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

const ALLOWED_TAGS = new Set([
  "p", "br", "div", "span", "strong", "b", "em", "i", "u", "s", "strike",
  "h1", "h2", "h3", "ul", "ol", "li", "a", "img", "blockquote", "hr",
]);
/** Texto com alguma tag HTML conhecida (texto antigo pode ter "<" solto). */
export function isHtml(text: string) {
  return /<\/?(p|br|div|span|strong|b|em|i|u|s|strike|h[1-6]|ul|ol|li|a|img|blockquote|hr)\b[^>]*>/i.test(text);
}

const VOID_TAGS = new Set(["br", "img", "hr"]);
/** Removidas junto com o conteúdo. */
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template|textarea|select|head|title)\b[\s\S]*?<\/\1\s*>/gi;
const ALIGN = new Set(["left", "center", "right", "justify"]);
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\{\{\s*[a-z_]+\s*\}\})/i;
const SAFE_SRC = /^(https?:\/\/|\/api\/marketing\/imagens\/)/i;

const TAG_RE = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTR_RE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function filterStyle(style: string, tag: string) {
  const out: string[] = [];
  for (const decl of style.split(";")) {
    const [rawProp, ...rest] = decl.split(":");
    const prop = rawProp?.trim().toLowerCase();
    const value = rest.join(":").trim().toLowerCase();
    if (prop === "text-align" && ALIGN.has(value)) out.push(`text-align:${value}`);
    if (tag === "img" && (prop === "width" || prop === "max-width") && /^\d{1,4}(px|%)$/.test(value)) {
      out.push(`${prop}:${value}`);
    }
  }
  return out.join(";");
}

function cleanAttrs(tag: string, raw: string) {
  const out: string[] = [];
  for (const m of raw.matchAll(ATTR_RE)) {
    const name = m[1].toLowerCase();
    const value = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    const put = (v: string) => out.push(`${name}="${v.replace(/"/g, "&quot;").replace(/</g, "&lt;")}"`);
    if (name === "style") {
      const style = filterStyle(value, tag);
      if (style) put(style);
    } else if (name === "align" && ALIGN.has(value.toLowerCase())) {
      put(value.toLowerCase());
    } else if (tag === "a" && name === "href" && SAFE_HREF.test(value)) {
      put(value);
    } else if (tag === "img" && name === "src" && SAFE_SRC.test(value)) {
      put(value);
    } else if (tag === "img" && name === "alt") {
      put(value);
    } else if (tag === "img" && (name === "width" || name === "height") && /^\d{1,4}$/.test(value)) {
      put(value);
    }
  }
  // Imagem sem endereço permitido (ex.: data: colado) é descartada.
  if (tag === "img" && !out.some((a) => a.startsWith("src="))) return null;
  if (tag === "a") out.push('target="_blank"', 'rel="noopener"');
  return out.length ? ` ${out.join(" ")}` : "";
}

/** Mantém só tags e atributos permitidos; o resto do texto é escapado. */
export function sanitizeHtml(html: string) {
  const source = html.replace(DROP_WITH_CONTENT, "");
  let out = "";
  let last = 0;
  const escapeText = (t: string) => t.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const m of source.matchAll(TAG_RE)) {
    out += escapeText(source.slice(last, m.index));
    last = m.index + m[0].length;
    if (!m[2]) continue; // comentário
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue;
    if (closing) {
      if (!VOID_TAGS.has(tag)) out += `</${tag}>`;
      continue;
    }
    const attrs = cleanAttrs(tag, m[3] ?? "");
    if (attrs === null) continue;
    out += `<${tag}${attrs}>`;
  }
  return out + escapeText(source.slice(last));
}

/** Conteúdo salvo (HTML ou texto antigo) → HTML seguro para editar/exibir. */
export function contentToHtml(body: string) {
  return isHtml(body) ? sanitizeHtml(body) : textToHtml(body);
}

const VARIABLE_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Como `renderTemplate`, mas escapa os valores (o conteúdo é HTML). */
export function renderHtmlTemplate(html: string, values: Record<string, string>) {
  return html.replace(VARIABLE_RE, (match, key: string) => (key in values ? escapeHtml(values[key]) : match));
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text: string) {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Versão em texto puro (corpo alternativo do e-mail, listas, histórico). */
export function htmlToText(html: string) {
  if (!isHtml(html)) return html;
  const text = html
    .replace(DROP_WITH_CONTENT, "")
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) => {
      const inner = label.replace(/<[^>]*>/g, "").trim();
      return inner && inner !== href ? `${inner} (${href})` : href;
    })
    .replace(/<img\b[^>]*alt="([^"]+)"[^>]*>/gi, "[$1]")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<(p|div|h[1-6]|blockquote|ul|ol)\b[^>]*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|blockquote|ul|ol)>/gi, "\n\n")
    .replace(/<hr\b[^>]*>/gi, "\n—\n")
    .replace(/<[^>]*>/g, "");
  return decodeEntities(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** HTML final do e-mail: imagens com endereço absoluto e largura fluida. */
export function emailReadyHtml(html: string, baseUrl: string) {
  return html.replace(/<img\b([^>]*)>/gi, (_, attrs: string) => {
    let a = attrs.replace(/src="(\/[^"]*)"/i, (_m, src: string) => `src="${baseUrl}${src}"`);
    const extra = "max-width:100%;height:auto;border:0";
    a = /style="/i.test(a) ? a.replace(/style="([^"]*)"/i, (_m, s: string) => `style="${s};${extra}"`) : `${a} style="${extra}"`;
    return `<img${a}>`;
  });
}

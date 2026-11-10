// Gera os ícones PNG usados nos e-mails (clientes de e-mail não mostram SVG).
// Saída: public/img/email/*.png (ícones em 3x, nítidos em telas retina) e o
// logo recortado.
//
// Uso: node scripts/gerar-icones-email.mjs

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public", "img", "email");
const INK = "#121212";

// Traços no padrão dos ícones do app (24x24, linha 2, pontas arredondadas).
const line = (d) =>
  `<g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;

// Ícones de destaque: círculo escuro com o desenho em branco, 48px na tela.
const badges = {
  "user-check": line('<circle cx="9.5" cy="8" r="3.5"/><path d="M3 20c0-3.6 2.9-6 6.5-6 1.6 0 3 .5 4.1 1.3M15.5 18l2 2 4-4"/>'),
  "calendar-check": line(
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M9 15.5l2 2 4-4"/>',
  ),
  "calendar-x": line(
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M10 13.5l4 4M14 13.5l-4 4"/>',
  ),
  lock: line('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2"/>'),
};

// Redes sociais: círculo escuro, 32px na tela. Desenhos próprios e simplificados.
const social = {
  instagram: line('<rect x="5" y="5" width="14" height="14" rx="4"/><circle cx="12" cy="12" r="3.2"/>') +
    '<circle cx="16.2" cy="7.8" r="1.1" fill="#fff"/>',
  facebook:
    '<path fill="#fff" d="M13.2 20v-6.4h2.2l.4-2.6h-2.6V9.4c0-.8.3-1.3 1.4-1.3h1.3V5.8c-.3 0-1-.1-1.9-.1-2 0-3.3 1.2-3.3 3.4V11H8.5v2.6h2.2V20z"/>',
  linkedin:
    '<rect x="6" y="10" width="2.6" height="8" fill="#fff"/><circle cx="7.3" cy="7.3" r="1.5" fill="#fff"/>' +
    '<path fill="#fff" d="M10.6 10h2.5v1.1c.4-.7 1.3-1.3 2.6-1.3 2.4 0 2.9 1.5 2.9 3.6V18H16v-4c0-1-.1-2.1-1.3-2.1s-1.5.9-1.5 2V18h-2.6z"/>',
};

function svg(inner, size) {
  // O desenho de 24 unidades fica centralizado com folga dentro do círculo.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="12" fill="${INK}"/>
  <g transform="translate(4.8 4.8) scale(0.6)">${inner}</g>
</svg>`;
}

fs.mkdirSync(OUT, { recursive: true });

// Logo sem a margem transparente do arquivo original (o desenho ocupa só o meio).
await sharp(path.join(process.cwd(), "public", "img", "logo.png")).trim().png().toFile(path.join(OUT, "logo.png"));
console.log("public/img/email/logo.png");
const jobs = [
  ...Object.entries(badges).map(([name, inner]) => [name, inner, 48 * 3]),
  ...Object.entries(social).map(([name, inner]) => [name, inner, 32 * 3]),
];
for (const [name, inner, size] of jobs) {
  await sharp(Buffer.from(svg(inner, size))).png().toFile(path.join(OUT, `${name}.png`));
  console.log(`public/img/email/${name}.png`);
}

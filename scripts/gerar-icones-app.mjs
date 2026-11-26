// Gera os ícones do app instalável (PWA): logo branco sobre fundo escuro.
// Saída: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png e
// app/apple-icon.png (180px, o Next liga o <link rel="apple-touch-icon">).
//
// Uso: node scripts/gerar-icones-app.mjs

import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const LOGO = path.join(ROOT, "public", "img", "logo.png");
const INK = "#121212";

// Logo em branco, mantendo só a transparência do original. O `trim` tira a
// margem vazia do arquivo, para o logo ocupar a largura pedida.
async function whiteLogo(width) {
  const trimmed = await sharp(LOGO).trim().toBuffer();
  const alpha = await sharp(trimmed).resize({ width }).ensureAlpha().extractChannel("alpha").toBuffer();
  const { height } = await sharp(alpha).metadata();
  return sharp({ create: { width, height, channels: 3, background: "#ffffff" } })
    .joinChannel(alpha)
    .png()
    .toBuffer();
}

// `share` = largura do logo em relação ao ícone (o maskable precisa de margem).
async function icon(size, share, out) {
  const logo = await whiteLogo(Math.round(size * share));
  await sharp({ create: { width: size, height: size, channels: 3, background: INK } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(ROOT, out));
  console.log(out);
}

await icon(192, 0.78, "public/icons/icon-192.png");
await icon(512, 0.78, "public/icons/icon-512.png");
await icon(512, 0.66, "public/icons/icon-maskable-512.png");
await icon(180, 0.78, "app/apple-icon.png");

import { promises as fs } from "node:fs";
import path from "node:path";

// Imagens dos templates de e-mail, guardadas no disco ao lado do banco JSON.
// Ficam públicas em /api/marketing/imagens/<arquivo> (o e-mail precisa abrir sem login).

export const IMAGE_DIR = path.join(process.cwd(), ".data", "uploads", "marketing");
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_NAME_RE = /^[0-9a-f-]{36}\.(png|jpg|gif|webp)$/;

export const IMAGE_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
} as const;

type Ext = keyof typeof IMAGE_TYPES;

/** Tipo real pelo conteúdo do arquivo (não confia na extensão enviada). */
export function sniffImage(bytes: Uint8Array): Ext | null {
  const at = (i: number, ...v: number[]) => v.every((b, j) => bytes[i + j] === b);
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return "png";
  if (at(0, 0xff, 0xd8, 0xff)) return "jpg";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "gif";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "webp";
  return null;
}

export async function saveImage(bytes: Uint8Array, ext: Ext) {
  const name = `${crypto.randomUUID()}.${ext}`;
  await fs.mkdir(IMAGE_DIR, { recursive: true });
  await fs.writeFile(path.join(IMAGE_DIR, name), bytes);
  return `/api/marketing/imagens/${name}`;
}

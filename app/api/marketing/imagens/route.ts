import { getCurrentUser } from "@/app/_lib/auth";
import { MAX_IMAGE_BYTES, saveImage, sniffImage } from "@/app/_lib/marketing-images";

// Upload de imagem do editor de templates (só admin).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return Response.json({ error: "Não autorizado." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("imagem");
  if (!(file instanceof File)) return Response.json({ error: "Envie uma imagem." }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "A imagem pode ter até 5 MB." }, { status: 413 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniffImage(bytes);
  if (!ext) return Response.json({ error: "Use PNG, JPG, GIF ou WebP." }, { status: 415 });

  return Response.json({ url: await saveImage(bytes, ext) });
}

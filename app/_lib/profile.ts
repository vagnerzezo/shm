import type { Consent } from "./db";

// Validação dos dados do cliente, usada no cadastro, em "Meus dados" e pelo admin.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Profile = { name: string; phone: string; email: string; consent: Consent };

export function readProfile(formData: FormData): Profile | { error: string } {
  const name = String(formData.get("nome") ?? "").trim();
  const phone = String(formData.get("telefone") ?? "").replace(/\D/g, "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (name.length < 2) return { error: "Informe seu nome." };
  if (phone.length < 10 || phone.length > 11) {
    return { error: "Informe um WhatsApp válido, com DDD." };
  }
  if (email.length > 120 || !EMAIL_RE.test(email)) return { error: "Informe um e-mail válido." };
  const consent = {
    email: formData.get("aceita_email") === "on",
    mensagem: formData.get("aceita_mensagem") === "on",
  };
  return { name, phone, email, consent };
}

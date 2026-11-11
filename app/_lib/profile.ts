import type { Consent } from "./db";
import { DomainError } from "./errors";

// Validação dos dados do cliente, usada no cadastro, em "Meus dados", pelo admin e pela API.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Profile = { name: string; phone: string; email: string; consent: Consent };
export type ProfileInput = { name?: unknown; phone?: unknown; email?: unknown; consent?: unknown };

const invalid = (field: string, message: string) => new DomainError("validation", message, { [field]: message });

/** Valida e normaliza. Lança `validation` apontando o campo. */
export function parseProfile(input: ProfileInput): Profile {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.replace(/\D/g, "") : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (name.length < 2) throw invalid("name", "Informe seu nome.");
  if (phone.length < 10 || phone.length > 11) throw invalid("phone", "Informe um WhatsApp válido, com DDD.");
  if (email.length > 120 || !EMAIL_RE.test(email)) throw invalid("email", "Informe um e-mail válido.");
  const consent = (input.consent && typeof input.consent === "object" ? input.consent : {}) as Record<string, unknown>;
  return { name, phone, email, consent: { email: consent.email === true, mensagem: consent.mensagem === true } };
}

/** Lê os campos do formulário do site. */
export function profileInputOf(formData: FormData): ProfileInput {
  return {
    name: String(formData.get("nome") ?? ""),
    phone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    consent: {
      email: formData.get("aceita_email") === "on",
      mensagem: formData.get("aceita_mensagem") === "on",
    },
  };
}

export function readProfile(formData: FormData): Profile | { error: string } {
  try {
    return parseProfile(profileInputOf(formData));
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message };
    throw error;
  }
}

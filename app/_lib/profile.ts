import type { Consent } from "./db";
import { DomainError } from "./errors";

// Validação dos dados do cliente, usada no cadastro, em "Meus dados", pelo admin e pela API.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Profile = { name: string; phone: string; email: string; consent: Consent };
export type ProfileInput = { name?: unknown; phone?: unknown; email?: unknown; consent?: unknown };

const invalid = (field: string, message: string) => new DomainError("validation", message, { [field]: message });

/** Só dígitos, sem o DDI 55 quando ele vem na frente de um número com DDD (12 ou 13 dígitos). */
function phoneDigits(raw: unknown): string {
  const digits = typeof raw === "string" ? raw.replace(/\D/g, "") : "";
  return (digits.length === 12 || digits.length === 13) && digits.startsWith("55") ? digits.slice(2) : digits;
}

/**
 * Autorizações de contato. Sem `consent`, valem as de `base` (ou nenhuma); com
 * ele, só as chaves enviadas mudam. Tipo errado é erro no campo `consent`.
 */
export function parseConsent(raw: unknown, base: Consent = { email: false, mensagem: false }): Consent {
  if (raw === undefined) return { ...base };
  const message = "Autorizações inválidas.";
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw invalid("consent", message);
  const consent = raw as Record<string, unknown>;
  for (const key of ["email", "mensagem"] as const) {
    if (consent[key] !== undefined && typeof consent[key] !== "boolean") throw invalid("consent", message);
  }
  return {
    email: typeof consent.email === "boolean" ? consent.email : base.email,
    mensagem: typeof consent.mensagem === "boolean" ? consent.mensagem : base.mensagem,
  };
}

/**
 * Valida e normaliza. Lança `validation` apontando o campo. `baseConsent` completa um `consent` parcial.
 * Com `phoneOptional` (barbeiro, cuja conta nasce sem telefone), o telefone vazio é aceito.
 */
export function parseProfile(input: ProfileInput, baseConsent?: Consent, { phoneOptional = false } = {}): Profile {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phone = phoneDigits(input.phone);
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (name.length < 2) throw invalid("name", "Informe seu nome.");
  if ((phone || !phoneOptional) && (phone.length < 10 || phone.length > 11)) throw invalid("phone", "Informe um WhatsApp válido, com DDD.");
  if (email.length > 120 || !EMAIL_RE.test(email)) throw invalid("email", "Informe um e-mail válido.");
  return { name, phone, email, consent: parseConsent(input.consent, baseConsent) };
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

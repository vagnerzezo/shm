// Erros de regra de negócio, com um código estável para a API e uma mensagem
// em português para mostrar à pessoa.

export type ErrorCode =
  | "validation"
  | "unauthenticated"
  | "invalid_credentials"
  | "forbidden"
  | "account_disabled"
  | "not_found"
  | "email_taken"
  | "slot_unavailable"
  | "rate_limited";

export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    /** Mensagem por campo, quando o erro é de um campo específico. */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

/** Para Server Actions: devolve a mensagem do erro de regra; outros erros seguem adiante. */
export function messageOf(error: unknown): string {
  if (error instanceof DomainError) return error.message;
  throw error;
}

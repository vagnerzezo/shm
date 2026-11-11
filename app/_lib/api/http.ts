import { DomainError, type ErrorCode } from "../errors";

// Casca comum das rotas /api/v1: resposta em JSON e erro sempre no mesmo formato.

const STATUS: Record<ErrorCode, number> = {
  validation: 400,
  unauthenticated: 401,
  invalid_credentials: 401,
  forbidden: 403,
  account_disabled: 403,
  not_found: 404,
  email_taken: 409,
  slot_unavailable: 409,
  rate_limited: 429,
};

function errorResponse(status: number, code: string, message: string, fields?: Record<string, string>) {
  return Response.json({ error: { code, message, ...(fields && { fields }) } }, { status });
}

/**
 * Envolve uma rota: o que ela devolver vira 200 em JSON (ou a própria
 * `Response`), `DomainError` vira o erro com o status do código e qualquer
 * outra falha vira 500 sem detalhes.
 */
export function handle<C>(fn: (request: Request, ctx: C) => Promise<unknown>) {
  return async (request: Request, ctx: C): Promise<Response> => {
    try {
      const result = await fn(request, ctx);
      return result instanceof Response ? result : Response.json(result);
    } catch (error) {
      if (error instanceof DomainError) return errorResponse(STATUS[error.code], error.code, error.message, error.fields);
      console.error("[api] erro inesperado:", error);
      return errorResponse(500, "internal", "Algo deu errado. Tente de novo em instantes.");
    }
  };
}

/** Corpo da requisição como objeto JSON. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new DomainError("validation", "Corpo inválido. Envie um objeto JSON.");
  }
  return body as Record<string, unknown>;
}

export const created = (data: unknown) => Response.json(data, { status: 201 });
export const noContent = () => new Response(null, { status: 204 });

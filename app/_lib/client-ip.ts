/**
 * IP de quem fez o pedido. Na Vercel, `x-real-ip` e `x-forwarded-for` são
 * preenchidos pela própria plataforma (o valor enviado pelo cliente é
 * descartado). Sem nenhum dos dois, todos caem na mesma chave.
 */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "desconhecido";
}

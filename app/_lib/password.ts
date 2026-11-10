// Sem caracteres que se confundem (0/O, 1/l/I), para ditar ao cliente sem erro.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Senha aleatória gerada no navegador. */
export function generatePassword(length = 10) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join("");
}

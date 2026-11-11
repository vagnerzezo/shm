-- O banco passa a guardar só o hash (SHA-256) do token de sessão.
-- Converte as sessões abertas, para ninguém ser deslogado.
update sessions set token = encode(sha256(convert_to(token, 'UTF8')), 'hex');

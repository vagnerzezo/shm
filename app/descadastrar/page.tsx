import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, authButton } from "../_components/auth-shell";
import { CheckIcon } from "../_components/icons";
import { unsubscribe } from "../_lib/account-actions";
import { findByUnsubscribeToken } from "../_lib/unsubscribe";

export const metadata: Metadata = {
  title: "Deixar de receber e-mails | Studio Heitor Macks",
  // O código do link não deve vazar para outros sites nem ir para buscadores.
  referrer: "no-referrer",
  robots: { index: false },
};

const box = "mt-6 rounded-xl border border-black/10 bg-white/85 p-5 text-sm text-black";

export default async function DescadastrarPage(props: PageProps<"/descadastrar">) {
  const { t, feito } = await props.searchParams;
  const token = typeof t === "string" ? t : "";
  const info = await findByUnsubscribeToken(token);

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight text-black">E-mails do estúdio</h1>

      {!info ? (
        <div role="alert" className={box}>
          <p className="font-semibold">Link inválido.</p>
          <p className="mt-2 text-black/70">
            Ele pode ter sido copiado pela metade ou a conta não existe mais. Você também pode
            desligar os e-mails em <strong>Meus dados</strong>, depois de entrar.
          </p>
          <Link href="/conta" className="mt-4 inline-block font-semibold underline underline-offset-4 hover:text-black/70">
            Ir para Meus dados
          </Link>
        </div>
      ) : feito === "1" || !info.subscribed ? (
        <div role="status" className={box}>
          <p className="flex items-center gap-2 font-semibold">
            <span className="grid size-6 place-items-center rounded-full bg-[#121212] text-white">
              <CheckIcon className="size-3.5" strokeWidth={3} />
            </span>
            Pronto, você não vai mais receber e-mails promocionais.
          </p>
          <p className="mt-2 text-black/70">
            Endereço {info.maskedEmail}. Avisos sobre suas reservas continuam chegando. Mudou de ideia?
            Ligue de novo em <strong>Meus dados</strong>.
          </p>
          <Link href="/conta" className="mt-4 inline-block font-semibold underline underline-offset-4 hover:text-black/70">
            Ir para Meus dados
          </Link>
        </div>
      ) : (
        <form action={unsubscribe} className="mt-6">
          <input type="hidden" name="t" value={token} />
          <p className="text-sm text-black/70">
            Deixar de receber e-mails promocionais em <strong className="text-black">{info.maskedEmail}</strong>?
            Avisos sobre suas reservas continuam chegando.
          </p>
          <button type="submit" className={authButton}>
            Deixar de receber
          </button>
        </form>
      )}
    </AuthShell>
  );
}

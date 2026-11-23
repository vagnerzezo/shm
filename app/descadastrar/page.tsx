import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../_components/auth-shell";
import { CheckIcon } from "../_components/icons";
import { unsubscribe } from "../_lib/account-actions";
import { findByUnsubscribeToken } from "../_lib/unsubscribe";
import { authFormStyles, type Variant } from "../login/auth-form-styles";
import { MobileSheet } from "../login/mobile-auth";

export const metadata: Metadata = {
  title: "Deixar de receber e-mails | Studio Heitor Macks",
  // O código do link não deve vazar para outros sites nem ir para buscadores.
  referrer: "no-referrer",
  robots: { index: false },
};

const box = {
  desktop: "mt-6 rounded-xl border border-black/10 bg-white/85 p-5 text-sm text-black",
  mobile: "rounded-[14px] border border-black/10 bg-[#f5f5f5] p-5 text-sm text-black",
} satisfies Record<Variant, string>;

const link = "mt-4 inline-block font-semibold underline underline-offset-4 hover:text-black/70";

type Info = Awaited<ReturnType<typeof findByUnsubscribeToken>>;

/** O conteúdo da página; no celular (`mobile`), com os campos e o botão do login do celular. */
function Content({ info, token, done, variant }: { info: Info; token: string; done: boolean; variant: Variant }) {
  if (!info) {
    return (
      <div role="alert" className={box[variant]}>
        <p className="font-semibold">Link inválido.</p>
        <p className="mt-2 text-black/70">
          Ele pode ter sido copiado pela metade ou a conta não existe mais. Você também pode
          desligar os e-mails em <strong>Meus dados</strong>, depois de entrar.
        </p>
        <Link href="/conta" className={link}>
          Ir para Meus dados
        </Link>
      </div>
    );
  }

  if (done || !info.subscribed) {
    return (
      <div role="status" className={box[variant]}>
        <p className="flex items-center gap-2 font-semibold">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#121212] text-white">
            <CheckIcon className="size-3.5" strokeWidth={3} />
          </span>
          Pronto, você não vai mais receber e-mails promocionais.
        </p>
        <p className="mt-2 text-black/70">
          Endereço {info.maskedEmail}. Avisos sobre suas reservas continuam chegando. Mudou de ideia?
          Ligue de novo em <strong>Meus dados</strong>.
        </p>
        <Link href="/conta" className={link}>
          Ir para Meus dados
        </Link>
      </div>
    );
  }

  return (
    <form action={unsubscribe} className={variant === "mobile" ? "flex flex-col gap-3.5" : "mt-6"}>
      <input type="hidden" name="t" value={token} />
      <p className={variant === "mobile" ? "text-sm text-[#555]" : "text-sm text-black/70"}>
        Deixar de receber e-mails promocionais em <strong className="text-black">{info.maskedEmail}</strong>?
        Avisos sobre suas reservas continuam chegando.
      </p>
      <button type="submit" className={authFormStyles[variant].button}>
        Deixar de receber
      </button>
    </form>
  );
}

export default async function DescadastrarPage(props: PageProps<"/descadastrar">) {
  const { t, feito } = await props.searchParams;
  const token = typeof t === "string" ? t : "";
  const info = await findByUnsubscribeToken(token);
  const done = feito === "1";
  const title = "E-mails do estúdio";

  return (
    <>
      <div className="sm:hidden">
        <MobileSheet backHref="/" title={title}>
          <Content info={info} token={token} done={done} variant="mobile" />
        </MobileSheet>
      </div>
      <div className="hidden sm:contents">
        <AuthShell>
          <h1 className="text-2xl font-bold tracking-tight text-black">{title}</h1>
          <Content info={info} token={token} done={done} variant="desktop" />
        </AuthShell>
      </div>
    </>
  );
}

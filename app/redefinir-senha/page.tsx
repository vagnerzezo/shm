import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, authTitle } from "../_components/auth-shell";
import { findValidReset } from "../_lib/password-reset";
import { MobileSheet } from "../login/mobile-auth";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Criar nova senha | Studio Heitor Macks",
};

export default async function RedefinirSenhaPage(props: PageProps<"/redefinir-senha">) {
  const { token } = await props.searchParams;
  const code = typeof token === "string" ? token : "";
  const reset = await findValidReset(code);

  const invalid = (mobile: boolean) => (
    <div
      role="alert"
      className={`${mobile ? "rounded-[14px] bg-[#f5f5f5]" : "mt-6 rounded-xl bg-white/85"} border border-black/10 p-5 text-sm text-black`}
    >
      <p className="font-semibold">Este link não vale mais.</p>
      <p className="mt-2 text-black/70">
        Ele pode ter expirado (vale por 1 hora), já ter sido usado ou ter sido substituído por um
        pedido mais novo.
      </p>
      <Link
        href="/esqueci-senha"
        className="mt-4 inline-block font-semibold underline underline-offset-4 hover:text-black/70"
      >
        Pedir um novo link
      </Link>
    </div>
  );
  const account = reset && (
    <>
      Conta <strong className="text-black">{reset.email}</strong>. Ao salvar, você entra automaticamente e sai
      dos outros aparelhos.
    </>
  );

  return (
    <>
      <div className="sm:hidden">
        <MobileSheet backHref="/login?modo=entrar" title="Criar nova senha" subtitle={account || undefined}>
          {reset ? <ResetForm token={code} email={reset.email} variant="mobile" /> : invalid(true)}
        </MobileSheet>
      </div>
      <div className="hidden sm:contents">
        <AuthShell backHref="/login" backLabel="Voltar para o login">
          <h1 className={authTitle}>Criar nova senha</h1>
          {reset ? (
            <>
              <p className="mt-1 text-sm text-black/70">{account}</p>
              <ResetForm token={code} email={reset.email} />
            </>
          ) : (
            invalid(false)
          )}
        </AuthShell>
      </div>
    </>
  );
}

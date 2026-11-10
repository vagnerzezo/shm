import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../_components/auth-shell";
import { findValidReset } from "../_lib/password-reset";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Criar nova senha | Studio Heitor Macks",
};

export default async function RedefinirSenhaPage(props: PageProps<"/redefinir-senha">) {
  const { token } = await props.searchParams;
  const code = typeof token === "string" ? token : "";
  const reset = await findValidReset(code);

  return (
    <AuthShell backHref="/login" backLabel="Voltar para o login">
      <h1 className="text-2xl font-bold tracking-tight text-black">Criar nova senha</h1>
      {reset ? (
        <>
          <p className="mt-1 text-sm text-black/70">
            Conta <strong className="text-black">{reset.email}</strong>. Ao salvar, você entra
            automaticamente e sai dos outros aparelhos.
          </p>
          <ResetForm token={code} email={reset.email} />
        </>
      ) : (
        <div role="alert" className="mt-6 rounded-xl border border-black/10 bg-white/85 p-5 text-sm text-black">
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
      )}
    </AuthShell>
  );
}

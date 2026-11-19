import type { Metadata } from "next";
import { AuthShell } from "../_components/auth-shell";
import { MobileSheet } from "../login/mobile-auth";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Esqueci minha senha | Studio Heitor Macks",
};

export default function EsqueciSenhaPage() {
  const subtitle = "Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.";
  return (
    <>
      <div className="sm:hidden">
        <MobileSheet backHref="/login?modo=entrar" title="Esqueci minha senha" subtitle={subtitle}>
          <ForgotForm variant="mobile" />
        </MobileSheet>
      </div>
      <div className="hidden sm:contents">
        <AuthShell backHref="/login" backLabel="Voltar para o login">
          <h1 className="text-2xl font-bold tracking-tight text-black">Esqueci minha senha</h1>
          <p className="mt-1 text-sm text-black/70">{subtitle}</p>
          <ForgotForm />
        </AuthShell>
      </div>
    </>
  );
}

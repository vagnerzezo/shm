import type { Metadata } from "next";
import { AuthShell, authTitle } from "../_components/auth-shell";
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
          <h1 className={authTitle}>Esqueci minha senha</h1>
          <p className="mt-2 text-base text-[#5c5c5a]">{subtitle}</p>
          <ForgotForm />
        </AuthShell>
      </div>
    </>
  );
}

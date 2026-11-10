import type { Metadata } from "next";
import { AuthShell } from "../_components/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Esqueci minha senha | Studio Heitor Macks",
};

export default function EsqueciSenhaPage() {
  return (
    <AuthShell backHref="/login" backLabel="Voltar para o login">
      <h1 className="text-2xl font-bold tracking-tight text-black">Esqueci minha senha</h1>
      <p className="mt-1 text-sm text-black/70">
        Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
      </p>
      <ForgotForm />
    </AuthShell>
  );
}

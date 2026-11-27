import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FlashToast } from "./_components/flash-toast";
import { Toaster } from "./_components/toaster";
import { ClientHome } from "./_components/client-home";
import { AuthShell } from "./_components/auth-shell";
import { ClientFrame } from "./_components/client/client-frame";
import { getCurrentUser, keepBarberOut } from "./_lib/auth";
import { DesktopAuthForm, MobileAuth } from "./login/mobile-auth";

export default async function Home() {
  const user = await getCurrentUser();
  // O admin tem o Início próprio no painel, com o resumo do dia.
  if (user?.role === "admin") redirect("/admin");
  keepBarberOut(user);
  // Cliente logado: Início dentro do painel, com o mesmo menu das outras telas.
  if (user) {
    return (
      <ClientFrame>
        <ClientHome customer={user} />
      </ClientFrame>
    );
  }

  return (
    <>
      {/* No celular, o visitante cai na boas-vindas do login; "Entrar" e "Criar conta" seguem para /login. */}
      <div className="sm:hidden">
        <MobileAuth mode={null} href={(m) => (m ? `/login?modo=${m}` : "/")} next="" />
      </div>
      {/* No computador, o visitante já vê o login. */}
      <div className="hidden sm:contents">
        <AuthShell backHref={null}>
          <DesktopAuthForm mode="entrar" href={(m) => (m ? `/login?modo=${m}` : "/")} next="" />
        </AuthShell>
      </div>
      {/* Avisos que chegam aqui por redirecionamento (ex.: conta excluída). */}
      <Toaster />
      <Suspense>
        <FlashToast />
      </Suspense>
    </>
  );
}

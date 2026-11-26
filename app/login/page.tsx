import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "../_components/auth-shell";
import { getCurrentUser, homeOf, safeNext } from "../_lib/auth";
import { DesktopAuthForm, MobileAuth } from "./mobile-auth";

export const metadata: Metadata = {
  title: "Entrar | Studio Heitor Macks",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, modo } = await props.searchParams;
  // Sem `next`, quem entra vai para a área do seu perfil (admin ou cliente).
  const target = safeNext(next, "");
  const user = await getCurrentUser();
  if (user) redirect(target || homeOf(user));

  const signUp = modo === "cadastro";
  const query = (m: string | null) =>
    [m && `modo=${m}`, target && `next=${encodeURIComponent(target)}`]
      .filter(Boolean)
      .join("&");
  const tabHref = (m: string | null) =>
    `/login${query(m) ? `?${query(m)}` : ""}`;
  // No celular, sem `modo` abre a boas-vindas; no computador, já o "Entrar".
  const mobileMode = modo === "cadastro" || modo === "entrar" ? modo : null;

  return (
    <>
      <div className="sm:hidden">
        <MobileAuth mode={mobileMode} href={tabHref} next={target} />
      </div>
      <div className="hidden sm:contents">
        {/* Sem "Voltar": a página inicial também é o login. */}
        <AuthShell backHref={null}>
          <DesktopAuthForm mode={signUp ? "cadastro" : "entrar"} href={tabHref} next={target} />
        </AuthShell>
      </div>
    </>
  );
}

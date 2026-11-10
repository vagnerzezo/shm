import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "../_components/auth-shell";
import { getCurrentUser, homeOf, safeNext } from "../_lib/auth";
import { LoginForm } from "./login-form";

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
  const tabHref = (m: string) =>
    `/login?modo=${m}${target ? `&next=${encodeURIComponent(target)}` : ""}`;
  const tabClass = (active: boolean) =>
    `flex h-11 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition ${
      active ? "bg-[#121212] text-white" : "text-black hover:bg-black/5"
    }`;

  return (
    <AuthShell>
      <nav className="flex gap-1 rounded-xl border border-black/15 bg-white/70 p-1" aria-label="Entrar ou criar conta">
        <Link href={tabHref("entrar")} aria-current={!signUp ? "page" : undefined} className={tabClass(!signUp)}>
          Entrar
        </Link>
        <Link href={tabHref("cadastro")} aria-current={signUp ? "page" : undefined} className={tabClass(signUp)}>
          Criar conta
        </Link>
      </nav>

      {/* `key` recria o formulário ao trocar de aba, limpando erros antigos. */}
      <LoginForm key={signUp ? "cadastro" : "entrar"} mode={signUp ? "cadastro" : "entrar"} next={target} />
      {!signUp && (
        <p className="mt-5 text-center">
          <Link
            href="/esqueci-senha"
            className="text-sm font-semibold text-black underline underline-offset-4 hover:text-black/70"
          >
            Esqueci minha senha
          </Link>
        </p>
      )}
    </AuthShell>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "../_components/icons";
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
    <main className="relative flex min-h-screen w-full bg-black p-4 sm:p-6">
      <Image
        src="/img/bg-login.jpg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="object-cover object-[70%_center]"
      />

      <section className="relative z-10 flex w-full flex-col items-center gap-8 overflow-y-auto rounded-2xl border border-black/20 bg-white/40 px-8 py-10 backdrop-blur-xl sm:max-w-[470px] sm:px-9">
        <Link
          href="/"
          className="flex items-center gap-1.5 self-start text-sm font-semibold text-black hover:text-black/70"
        >
          <ArrowLeftIcon className="size-4" />
          Voltar
        </Link>

        <Image
          src="/img/logo.png"
          alt="SHM Studio Heitor Macks"
          width={300}
          height={200}
          preload
          className="h-auto w-full max-w-[260px]"
        />

        <div className="w-full">
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
        </div>
      </section>
    </main>
  );
}

import { Barlow_Condensed } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeftIcon } from "../_components/icons";
import { LoginForm } from "./login-form";

// Login no celular (abaixo de `sm`): boas-vindas com foto em tela cheia e,
// em "Entrar" e "Criar conta", foto no topo com o formulário num painel branco.

const display = Barlow_Condensed({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display" });

const displayClass = "font-[family-name:var(--font-display)] font-extrabold uppercase";
const focusRing = "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-black";

/** Logo em branco sobre a foto. */
function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/img/logo.png"
      alt="SHM Studio Heitor Macks"
      width={300}
      height={200}
      preload
      className={`h-auto invert ${className ?? ""}`}
    />
  );
}

export function MobileAuth({
  mode,
  href,
  next,
}: {
  /** `null`: boas-vindas. */
  mode: "entrar" | "cadastro" | null;
  /** Endereço de cada tela, mantendo o `next`. */
  href: (mode: "entrar" | "cadastro" | null) => string;
  next: string;
}) {
  return (
    <div className={`${display.variable} relative min-h-dvh w-full bg-[#0d0d0d] text-[#111]`}>
      {mode === null ? <Welcome href={href} /> : <FormScreen mode={mode} href={href} next={next} />}
    </div>
  );
}

function Welcome({ href }: { href: (mode: "entrar" | "cadastro" | null) => string }) {
  const button = `flex h-14 items-center justify-center rounded-full text-base font-semibold ${focusRing}`;
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <Image src="/img/bg-login.jpg" alt="" fill preload sizes="100vw" className="object-cover object-[72%_0%]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_28%,rgba(0,0,0,0.78)_66%,#000_100%)]"
      />

      <header className="relative px-6 pt-[max(3rem,env(safe-area-inset-top))]">
        <Logo className="w-28" />
      </header>

      <div className="relative mt-auto flex flex-col gap-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <section className="flex flex-col gap-3 px-3">
          <p className="text-[13px] font-medium tracking-[0.14em] text-[#e6e6e6] uppercase">Bem-vindo</p>
          <h1 className={`${displayClass} text-[52px] leading-[0.95] text-white`}>
            Seu acesso
            <br />
            começa aqui
          </h1>
        </section>

        <nav aria-label="Entrar ou criar conta" className="flex flex-col gap-3 rounded-[34px] bg-white px-5 pt-7 pb-6">
          <Link href={href("entrar")} className={`${button} bg-[#111] text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)]`}>
            Entrar
          </Link>
          <Link href={href("cadastro")} className={`${button} border-[1.5px] border-[#cfcfcf] bg-white text-[#111]`}>
            Criar conta
          </Link>
        </nav>
      </div>
    </main>
  );
}

function FormScreen({
  mode,
  href,
  next,
}: {
  mode: "entrar" | "cadastro";
  href: (mode: "entrar" | "cadastro" | null) => string;
  next: string;
}) {
  const signUp = mode === "cadastro";
  const other = signUp ? "entrar" : "cadastro";
  return (
    <main className="relative flex min-h-dvh flex-col">
      {/* A foto ocupa o que o painel não usa: o painel tem só a altura do formulário, preso embaixo. */}
      <div className="absolute inset-0 overflow-hidden">
        <Image src="/img/bg-login.jpg" alt="" fill preload sizes="100vw" className="object-cover object-[72%_12%]" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[220px] bg-[linear-gradient(180deg,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0)_100%)]" />
      </div>

      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-[max(3rem,env(safe-area-inset-top))]">
        <Link
          href={href(null)}
          aria-label="Voltar"
          className={`flex size-11 items-center justify-center rounded-full bg-white/92 ${focusRing}`}
        >
          <ChevronLeftIcon className="size-5" />
        </Link>
        <Logo className="w-20" />
        <div className="size-11" aria-hidden="true" />
      </header>

      <div className="min-h-[10.5rem] flex-1" aria-hidden="true" />
      <section className="relative flex flex-col gap-3.5 rounded-t-[34px] bg-white px-6 pt-7 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="mb-1 flex flex-col gap-1.5">
          <h1 className={`${displayClass} text-4xl leading-none`}>{signUp ? "Criar conta" : "Entrar"}</h1>
          <p className="text-sm text-[#555]">{signUp ? "Preencha seus dados para começar." : "Que bom ver você de novo."}</p>
        </div>

        {/* `key` recria o formulário ao trocar Entrar/Criar conta, limpando erros e o "mostrar senha". */}
        <LoginForm key={mode} mode={mode} next={next} variant="mobile" />

        {!signUp && (
          <p className="text-center">
            <Link href="/esqueci-senha" className="text-sm font-semibold text-[#111] underline underline-offset-4">
              Esqueci minha senha
            </Link>
          </p>
        )}
        <p className="mt-0.5 text-center text-sm text-[#555]">
          {signUp ? "Já tem uma conta? " : "Ainda não tem conta? "}
          <Link href={href(other)} className="font-semibold text-[#111] underline-offset-4 hover:underline">
            {signUp ? "Entrar" : "Criar conta"}
          </Link>
        </p>
      </section>
    </main>
  );
}

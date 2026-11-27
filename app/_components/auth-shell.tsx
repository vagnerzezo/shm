import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getStudio } from "../_lib/studio";
import { displayClass, displayFont } from "./client/ui";
import { ArrowLeftIcon } from "./icons";

/**
 * Moldura das telas fora do painel no computador: login, senha e descadastro.
 * Coluna de 560 px à esquerda; à direita, a foto em preto e branco (some abaixo de `lg`).
 */
export async function AuthShell({
  children,
  backHref = "/",
  backLabel = "Voltar",
}: {
  children: ReactNode;
  /** `null`: sem "Voltar" (o login já é a página inicial). */
  backHref?: string | null;
  backLabel?: string;
}) {
  const studio = await getStudio();

  return (
    <main className={`${displayFont.variable} flex min-h-dvh w-full bg-white text-[#121212]`}>
      <section className="mx-auto flex w-full max-w-[560px] flex-col px-10 py-12 lg:mx-0 lg:shrink-0 lg:px-20">
        <div className="flex items-center justify-between gap-4">
          <Image
            src="/img/logo.png"
            alt="SHM Studio Heitor Macks"
            width={300}
            height={200}
            preload
            className="-ml-[23px] h-auto w-[140px]"
          />
          {backHref !== null && (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#5c5c5a] hover:text-[#121212]"
            >
              <ArrowLeftIcon className="size-4" />
              {backLabel}
            </Link>
          )}
        </div>

        <div className="my-auto w-full py-10">{children}</div>

        <p className="text-[13px] text-[#6b6b69]">{studio.name}</p>
      </section>

      <section aria-hidden="true" className="sticky top-3 my-3 mr-3 hidden h-[calc(100dvh-24px)] flex-1 self-start overflow-hidden rounded-[24px] bg-black lg:block">
        <Image
          src="/img/bg-login.jpg"
          alt=""
          fill
          preload
          sizes="(min-width: 1024px) calc(100vw - 572px), 0px"
          className="object-cover object-[60%_20%] grayscale"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0)_45%)]" />
        <div className="absolute bottom-14 left-14 text-white">
          <p className="text-[13px] font-semibold tracking-[3px] text-white/80">BEM-VINDO</p>
          <p className={`${displayClass} mt-2 text-[72px] leading-[0.92]`}>
            Seu acesso
            <br />
            começa aqui
          </p>
        </div>
      </section>
    </main>
  );
}

/** Campo das telas de conta no computador (mesmo do login). */
export const authInput =
  "mt-2 h-[52px] w-full rounded-[14px] border border-[#e7e5e4] bg-[#fafaf9] px-4 text-base text-[#121212] placeholder:text-[#78716c] focus:border-[#121212] focus:bg-white focus:outline-none";

export const authButton =
  "mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-[#121212] text-base font-bold text-white transition hover:bg-black/85 disabled:cursor-wait disabled:opacity-70";

/** Título das telas de conta no computador (Esqueci a senha, Nova senha, Descadastrar). */
export const authTitle = `${displayClass} text-5xl leading-[0.95] text-[#121212]`;

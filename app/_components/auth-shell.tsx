import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "./icons";

/** Moldura das telas fora do painel: login, senha e descadastro. */
export function AuthShell({
  children,
  backHref = "/",
  backLabel = "Voltar",
}: {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
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
          href={backHref}
          className="flex items-center gap-1.5 self-start text-sm font-semibold text-black hover:text-black/70"
        >
          <ArrowLeftIcon className="size-4" />
          {backLabel}
        </Link>

        <Image
          src="/img/logo.png"
          alt="SHM Studio Heitor Macks"
          width={300}
          height={200}
          preload
          className="h-auto w-full max-w-[260px]"
        />

        <div className="w-full">{children}</div>
      </section>
    </main>
  );
}

export const authInput =
  "mt-2 h-12 w-full rounded-lg border border-black/20 bg-white px-4 text-sm text-black placeholder:text-black/50 focus:border-black focus:outline-none";

export const authButton =
  "mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#121212] font-semibold text-white transition hover:bg-black/80 disabled:cursor-wait disabled:opacity-70";

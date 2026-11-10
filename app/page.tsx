import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { FlashToast } from "./_components/flash-toast";
import { Toaster } from "./_components/toaster";
import { CalendarGridIcon, ChatIcon, HistoryIcon, UserIcon } from "./_components/icons";
import { navByArea } from "./_components/nav";
import { getCurrentUser } from "./_lib/auth";
import { getCustomerUnreadCount } from "./_lib/chat";

const buttonClass =
  "flex h-[72px] w-full items-center justify-center gap-3 rounded-xl border border-black bg-white text-lg font-semibold text-black transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

export default async function Home() {
  const user = await getCurrentUser();
  const unread = user?.role === "cliente" ? await getCustomerUnreadCount(user.id) : 0;

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

      <section className="relative z-10 flex w-full flex-col items-center justify-between gap-10 rounded-2xl border border-black/20 bg-white/40 px-8 py-12 backdrop-blur-xl sm:max-w-[470px] sm:px-9">
        <Image
          src="/img/logo.png"
          alt="SHM Studio Heitor Macks"
          width={300}
          height={200}
          preload
          className="mt-4 h-auto w-full max-w-[390px] sm:mt-10"
        />

        <nav className="flex w-full flex-col gap-7">
          {user?.role === "admin" ? (
            // Admin vê o menu do painel dele, sem as opções do cliente.
            navByArea.admin
              .filter((l) => l.href !== "/")
              .map(({ href, label, Icon }) => (
                <Link key={href} href={href} className={buttonClass}>
                  <Icon className="size-6" />
                  {label}
                </Link>
              ))
          ) : (
            <>
              <Link href="/agendamento" className={buttonClass}>
                <HistoryIcon className="size-6" />
                Novo agendamento
              </Link>
              <Link href="/reservas" className={buttonClass}>
                <CalendarGridIcon className="size-6" />
                Minhas reservas
              </Link>
              {user && (
                <Link href="/mensagens" className={buttonClass}>
                  <ChatIcon className="size-6" />
                  Mensagens
                  {unread > 0 && (
                    <span
                      aria-label={`${unread} não ${unread === 1 ? "lida" : "lidas"}`}
                      className="min-w-6 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-xs font-bold text-white"
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
              )}
            </>
          )}
          <Link
            href={user ? "/conta" : "/login"}
            className="flex items-center justify-center gap-2 text-base font-semibold text-black underline underline-offset-4 hover:text-black/70"
          >
            <UserIcon className="size-5" />
            {user ? `Olá, ${user.name.split(" ")[0]} · Meus dados` : "Entrar ou criar conta"}
          </Link>
        </nav>

        <address className="text-center text-lg font-semibold not-italic leading-snug text-black">
          R. João XXIII, 32 Sala 1601
          <br />
          São José, São Leopoldo
          <br />
          RS, 93040-090, Brasil
        </address>
      </section>
      {/* Avisos que chegam aqui por redirecionamento (ex.: conta excluída). */}
      <Toaster />
      <Suspense>
        <FlashToast />
      </Suspense>
    </main>
  );
}

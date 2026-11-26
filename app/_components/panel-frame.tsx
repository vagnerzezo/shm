import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import { scopeOf } from "@/app/_lib/access";
import { getCurrentUser } from "@/app/_lib/auth";
import { getCustomerUnreadCount, getUnreadCount } from "@/app/_lib/chat";
import { getBell } from "@/app/_lib/notifications";
import { readDb } from "@/app/_lib/db";
import { studioOf } from "@/app/_lib/studio";
import { FlashToast } from "./flash-toast";
import { InstallBanner } from "./install-banner";
import type { Area } from "./nav";
import { Sidebar } from "./sidebar";
import { Toaster } from "./toaster";
import { AutoRefresh } from "./auto-refresh";
import { PanelProvider } from "./notification-bell";

// Moldura com a sidebar, compartilhada pela área do cliente e pela do admin.
export async function PanelFrame({ area: requested, children }: { area: Area; children: ReactNode }) {
  // Uma leitura do banco por tela: estúdio, contadores e sino usam a mesma.
  const db = await readDb();
  const studio = studioOf(db);
  const user = await getCurrentUser();
  // Barbeiro abre telas de /admin (filtradas para ele), mas com o menu dele.
  const area: Area = requested === "admin" && user?.role === "barbeiro" ? "barbeiro" : requested;
  // Contador do Chat: a equipe vê as mensagens de clientes (barbeiro: dos clientes dele); o cliente, as do estúdio.
  const staff = user && (user.role === "admin" || (user.role === "barbeiro" && user.professional));
  // Sino de notificações só para a equipe.
  const bell = staff ? await getBell(user, db) : null;
  const profileHref = user?.role === "admin" ? "/admin/perfil" : "/conta";
  const badges: Record<string, number> =
    staff && (area === "admin" || area === "barbeiro")
      ? { "/admin/chat": await getUnreadCount(scopeOf(user), db) }
      : area === "cliente" && user
        ? { "/mensagens": await getCustomerUnreadCount(user.id, db) }
        : {};

  return (
    <main className="relative flex min-h-screen w-full flex-col gap-4 overflow-clip bg-[#d9d9d9] p-4 lg:h-screen lg:flex-row lg:gap-6 lg:p-6">
      <Image
        src="/img/bg-login.jpg"
        alt=""
        fill
        sizes="100vw"
        className="scale-110 object-cover opacity-70 blur-2xl"
      />

      <Sidebar
        area={area}
        address={studio.address}
        studioName={studio.name}
        badges={badges}
        myAgenda={user?.role === "admin" && Boolean(user.professional)}
        accountOnly={area === "barbeiro" && user?.role === "barbeiro" && !user.professional}
        profileHref={profileHref}
      />

      <section className="relative z-10 flex min-h-0 flex-1 flex-col rounded-2xl border border-black/15 bg-white/55 px-5 pb-4 pt-6 backdrop-blur-xl sm:px-8 lg:px-12 lg:pt-10">
        {/* Convite para instalar o app (só no celular, se ainda não instalou). */}
        <InstallBanner />
        <PanelProvider value={{ bell, profileHref }}>
          {children}
        </PanelProvider>
      </section>
      {/* Equipe: sino e contadores se atualizam a cada 30 s com a tela parada. */}
      {staff && <AutoRefresh intervalMs={30_000} />}

      <Toaster />
      <Suspense>
        <FlashToast />
      </Suspense>
    </main>
  );
}

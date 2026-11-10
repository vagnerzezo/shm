import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import { getCurrentUser } from "@/app/_lib/auth";
import { getCustomerUnreadCount, getUnreadCount } from "@/app/_lib/chat";
import { getStudio } from "@/app/_lib/studio";
import { FlashToast } from "./flash-toast";
import type { Area } from "./nav";
import { Sidebar } from "./sidebar";
import { Toaster } from "./toaster";

// Moldura com a sidebar, compartilhada pela área do cliente e pela do admin.
export async function PanelFrame({ area, children }: { area: Area; children: ReactNode }) {
  const studio = await getStudio();
  // Contador do menu: o admin vê as mensagens de clientes; o cliente, as do estúdio.
  const user = area === "cliente" ? await getCurrentUser() : null;
  const badges: Record<string, number> =
    area === "admin"
      ? { "/admin/chat": await getUnreadCount() }
      : user
        ? { "/mensagens": await getCustomerUnreadCount(user.id) }
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

      <Sidebar area={area} address={studio.address} studioName={studio.name} badges={badges} />

      <section className="relative z-10 flex min-h-0 flex-1 flex-col rounded-2xl border border-black/15 bg-white/55 px-5 pb-4 pt-6 backdrop-blur-xl sm:px-8 lg:px-12 lg:pt-10">
        {children}
      </section>

      <Toaster />
      <Suspense>
        <FlashToast />
      </Suspense>
    </main>
  );
}

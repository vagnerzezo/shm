import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { card, PageTitle, secondaryButton } from "@/app/_components/ui";
import { signOut } from "@/app/_lib/actions";
import { homeOf, requireUser } from "@/app/_lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Minha agenda | Studio Heitor Macks",
};

// Provisória: a agenda do barbeiro entra na Tarefa 11 do plano da API v1.
export default async function BarbeiroPage() {
  const user = await requireUser("/barbeiro");
  // Barbeiro, ou admin que também atende.
  if (!user.professional || (user.role !== "barbeiro" && user.role !== "admin")) redirect(homeOf(user));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-4 py-10">
      <PageTitle title="Minha agenda" description={`${user.name} · ${user.professional}`} />
      <section className={cn(card, "p-5 text-sm text-black/70")}>
        Seus horários vão aparecer aqui em breve. Por enquanto, a agenda fica com o estúdio.
      </section>
      <form action={signOut}>
        <button type="submit" className={cn(secondaryButton, "h-10")}>
          Sair
        </button>
      </form>
    </main>
  );
}

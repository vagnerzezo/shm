import type { Metadata } from "next";
import { PanelHeader } from "@/app/_components/panel-header";
import { signOut } from "@/app/_lib/actions";
import { requireUser } from "@/app/_lib/auth";
import { formatPhone } from "@/app/_lib/format";
import { CustomerForm } from "./customer-form";

export const metadata: Metadata = {
  title: "Meus dados | Studio Heitor Macks",
};

export default async function ContaPage() {
  const customer = await requireUser("/conta");

  return (
    <>
      <PanelHeader>
        <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">Meus dados</h1>
        <p className="mt-1 text-sm text-black/70">Usados para identificar suas reservas.</p>
      </PanelHeader>

      <div className="mt-7 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        <CustomerForm
          name={customer.name}
          phone={formatPhone(customer.phone)}
          email={customer.email}
          consent={customer.consent}
        />
        <form action={signOut} className="mt-6 max-w-xl">
          <button
            type="submit"
            className="text-sm font-semibold text-black underline underline-offset-4 hover:text-black/60"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </>
  );
}

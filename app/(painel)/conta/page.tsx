import type { Metadata } from "next";
import { DeleteAccountForm, PasswordForm } from "@/app/_components/account-forms";
import { ClientTitle } from "@/app/_components/client/ui";
import { PanelHeader } from "@/app/_components/panel-header";
import { PageTitle } from "@/app/_components/ui";
import { signOut } from "@/app/_lib/actions";
import { requireUser } from "@/app/_lib/auth";
import { formatPhone } from "@/app/_lib/format";
import { PushCard } from "@/app/_components/push-card";
import { pushEnabled } from "@/app/_lib/push/dispatch";
import { CustomerForm } from "./customer-form";

export const metadata: Metadata = {
  title: "Meus dados | Studio Heitor Macks",
};

export default async function ContaPage() {
  const customer = await requireUser("/conta");
  // O barbeiro usa a moldura do painel; o cliente, a da área do cliente.
  const barber = customer.role === "barbeiro";

  return (
    <>
      {barber ? (
        <PanelHeader>
          <PageTitle title="Meus dados" description="Usados para identificar suas reservas." />
        </PanelHeader>
      ) : (
        <ClientTitle title="Meus dados" description="Usados para identificar suas reservas." />
      )}

      <div className={barber ? "mt-7 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]" : "mt-5 lg:mt-7"}>
        <CustomerForm
          name={customer.name}
          phone={formatPhone(customer.phone)}
          email={customer.email}
          consent={customer.consent}
          {...(customer.role === "barbeiro" && { returnHref: "/barbeiro", returnLabel: "Minha agenda", phoneOptional: true })}
        />
        <div className="mt-5 flex max-w-xl flex-col gap-5">
          {customer.role === "barbeiro" && (
            <PushCard publicKey={pushEnabled() ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY! : null} />
          )}
          <PasswordForm />
          {customer.role === "cliente" && <DeleteAccountForm />}
        </div>
        <form action={signOut} className="mt-6 mb-2 max-w-xl">
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

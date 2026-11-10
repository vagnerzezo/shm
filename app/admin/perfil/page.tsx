import type { Metadata } from "next";
import { PanelHeader } from "@/app/_components/panel-header";
import { PageTitle, scrollArea } from "@/app/_components/ui";
import { requireAdmin } from "@/app/_lib/auth";
import { formatPhone } from "@/app/_lib/format";
import { AdminProfileForm, PasswordForm } from "./profile-forms";

export const metadata: Metadata = {
  title: "Perfil | Studio Heitor Macks",
};

export default async function AdminProfilePage() {
  const admin = await requireAdmin("/admin/perfil");

  return (
    <>
      <PanelHeader>
        <PageTitle title="Meu perfil" description="Seus dados de acesso e contato." />
      </PanelHeader>

      <div className={`mt-7 ${scrollArea}`}>
        <div className="flex max-w-2xl flex-col gap-5 pb-1">
          <AdminProfileForm name={admin.name} phone={formatPhone(admin.phone)} email={admin.email} />
          <PasswordForm />
        </div>
      </div>
    </>
  );
}

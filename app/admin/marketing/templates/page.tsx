import Link from "next/link";
import { ConfirmButton } from "@/app/_components/confirm-button";
import { PlusIcon } from "@/app/_components/icons";
import type { Channel, Template } from "@/app/_lib/db";
import { channelOf, getMarketingData } from "@/app/_lib/marketing";
import { deleteTemplate, setDefaultTemplate, toggleTemplate } from "@/app/_lib/marketing-actions";
import { htmlToText } from "@/app/_lib/email-html";
import { channelLabel } from "@/app/_lib/marketing-template";
import { cn } from "@/lib/utils";
import { Badge, card, linkButton, primaryButton } from "../ui";
import { TemplateForm } from "./template-form";
import { TemplateTestButton } from "./template-test-button";
import { requireAdmin } from "@/app/_lib/auth";
import { isEmailKind } from "@/app/_lib/email-templates/preview";
import { SystemEmailList, SystemEmailPreview } from "./system-emails";

function TemplateCard({ template, usedBy }: { template: Template; usedBy: number }) {
  const t = template;
  return (
    <li className={cn(card, "flex flex-col gap-3 p-4", !t.active && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-semibold text-black">{t.name}</h3>
        {t.isDefault && <Badge tone="dark">Padrão</Badge>}
        <Badge tone={t.active ? "outline" : "muted"}>{t.active ? "Ativo" : "Inativo"}</Badge>
      </div>
      {t.subject && <p className="text-sm font-semibold text-black/80">Assunto: {t.subject}</p>}
      <p className="line-clamp-3 text-sm whitespace-pre-wrap text-black/70">{htmlToText(t.body)}</p>
      <p className="text-xs text-black/50">
        {usedBy === 0 ? "Não usado por regras" : `Usado por ${usedBy} ${usedBy === 1 ? "regra" : "regras"}`}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/10 pt-3">
        <Link href={`/admin/marketing/templates?editar=${t.id}`} className={linkButton}>
          Editar
        </Link>
        {t.channel === "email" && <TemplateTestButton id={t.id} name={t.name} />}
        {t.active && !t.isDefault && (
          <form action={setDefaultTemplate}>
            <input type="hidden" name="canal" value={t.channel} />
            <input type="hidden" name="id" value={t.id} />
            <button className={linkButton}>Definir como padrão</button>
          </form>
        )}
        <form action={toggleTemplate}>
          <input type="hidden" name="id" value={t.id} />
          <button className={linkButton}>{t.active ? "Desativar" : "Ativar"}</button>
        </form>
        <ConfirmButton
          action={deleteTemplate}
          fields={{ id: t.id }}
          title={`Excluir o template “${t.name}”?`}
          description={
            usedBy > 0
              ? `${usedBy === 1 ? "A regra que usa este template passa" : `As ${usedBy} regras que usam este template passam`} a usar o template padrão do canal. Isso não pode ser desfeito.`
              : "Nenhuma regra usa este template. Isso não pode ser desfeito."
          }
          confirmLabel="Excluir template"
          successMessage="Template excluído."
          className="ml-auto text-sm font-semibold text-red-700 underline-offset-4 hover:underline"
        >
          Excluir
        </ConfirmButton>
      </div>
    </li>
  );
}

export default async function TemplatesPage(props: PageProps<"/admin/marketing/templates">) {
  const { canal, novo, editar, sistema, largura } = await props.searchParams;
  const admin = await requireAdmin("/admin/marketing/templates");
  if (isEmailKind(sistema)) {
    return <SystemEmailPreview kind={sistema} mobile={largura === "celular"} viewer={admin} />;
  }
  const { templates, rules } = await getMarketingData();
  const channel: Channel = channelOf(canal) ?? channelOf(novo) ?? "email";
  const editing = typeof editar === "string" ? templates.find((t) => t.id === editar) : undefined;
  const creating = channelOf(novo);
  const list = templates.filter((t) => t.channel === channel);

  if (editing || creating) {
    return <TemplateForm template={editing} channel={editing?.channel ?? creating!} />;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Canal" className="flex gap-1 rounded-lg border border-black/15 bg-white p-1">
          {(["email", "mensagem"] as const).map((c) => (
            <Link
              key={c}
              href={`/admin/marketing/templates?canal=${c}`}
              aria-current={c === channel ? "page" : undefined}
              className={cn(
                "flex h-8 items-center rounded-md px-3 text-sm font-semibold transition",
                c === channel ? "bg-[#121212] text-white" : "text-black hover:bg-black/5",
              )}
            >
              {channelLabel[c]} ({templates.filter((t) => t.channel === c).length})
            </Link>
          ))}
        </nav>
        <Link href={`/admin/marketing/templates?novo=${channel}`} className={cn(primaryButton, "ml-auto")}>
          <PlusIcon className="size-4" />
          Novo template de {channelLabel[channel].toLowerCase()}
        </Link>
      </div>

      {channel === "email" && (
        <>
          <h2 className="mt-6 text-lg font-bold text-black">Templates de marketing</h2>
          <p className="mt-1 text-sm text-black/70">Usados pelas regras de envio, só para quem autorizou receber e-mails.</p>
        </>
      )}

      {list.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-black/25 py-14 text-center text-black/70">
          Nenhum template de {channelLabel[channel].toLowerCase()} ainda.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">
          {list.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              // O padrão também atende as regras do canal sem template próprio.
              usedBy={
                rules.filter((r) => r.templateId === t.id || (t.isDefault && r.channel === t.channel && !r.templateId))
                  .length
              }
            />
          ))}
        </ul>
      )}

      {channel === "email" && <SystemEmailList viewer={admin} />}
    </>
  );
}

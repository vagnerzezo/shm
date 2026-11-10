import Link from "next/link";
import { ArrowLeftIcon } from "@/app/_components/icons";
import type { Customer } from "@/app/_lib/auth";
import { emailProviderReady } from "@/app/_lib/email";
import { EMAIL_KINDS, buildSample, type EmailKind } from "@/app/_lib/email-templates/preview";
import { getStudio } from "@/app/_lib/studio";
import { cn } from "@/lib/utils";
import { Badge, card, linkButton } from "../ui";
import { SystemEmailTestForm } from "./system-email-test-form";

// E-mails automáticos do sistema (boas-vindas, agendamento, cancelamento,
// senha). Não são editáveis como os de marketing: o texto vem do código e os
// dados do estúdio (logo, contato, redes) de Configurações.

const WHEN: Record<EmailKind, string> = {
  "boas-vindas": "Quando o cliente cria a conta pelo site.",
  agendamento: "Quando o cliente marca pelo site, ou quando o estúdio marca com “avisar o cliente” ligado.",
  cancelamento: "Quando o cliente cancela, ou quando o estúdio cancela com “avisar o cliente” ligado.",
  senha: "Quando o cliente usa “Esqueci minha senha”.",
};

const KINDS = Object.keys(EMAIL_KINDS) as EmailKind[];
const previewHref = (kind: EmailKind, mobile = false) =>
  `/admin/marketing/templates?canal=email&sistema=${kind}${mobile ? "&largura=celular" : ""}`;

export async function SystemEmailList({ viewer }: { viewer: Customer }) {
  const studio = await getStudio();
  // "url": só o assunto interessa aqui; não precisa embutir imagens.
  const samples = await Promise.all(KINDS.map((k) => buildSample(k, viewer, studio, "url")));

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-black">E-mails do sistema</h2>
        <Badge tone={emailProviderReady() ? "green" : "amber"}>
          {emailProviderReady() ? "Envio pelo Resend ativo" : "Resend não configurado"}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-black/70">
        Enviados automaticamente, sem regra de marketing e sem depender da autorização do cliente. Logo, contato e redes
        vêm de Configurações → Dados do estúdio.
      </p>
      <ul className="mt-4 grid gap-4 lg:grid-cols-2">
        {KINDS.map((k, i) => (
          <li key={k} className={cn(card, "flex flex-col gap-3 p-4")}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="mr-auto font-semibold text-black">{EMAIL_KINDS[k]}</h3>
              <Badge tone="outline">Automático</Badge>
            </div>
            <p className="text-sm font-semibold text-black/80">Assunto: {samples[i].subject}</p>
            <p className="text-sm text-black/70">{WHEN[k]}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/10 pt-3">
              <Link href={previewHref(k)} className={linkButton}>
                Ver prévia
              </Link>
              <Link href={`${previewHref(k)}#enviar-teste`} className={linkButton}>
                Enviar teste
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const tab = (active: boolean) =>
  cn(
    "flex h-8 items-center rounded-md px-3 text-sm font-semibold transition",
    active ? "bg-[#121212] text-white" : "text-black hover:bg-black/5",
  );

export async function SystemEmailPreview({ kind, mobile, viewer }: { kind: EmailKind; mobile: boolean; viewer: Customer }) {
  // Imagens dentro do HTML: a prévia funciona mesmo com o site em localhost.
  const email = await buildSample(kind, viewer, await getStudio(), "data");

  return (
    <div className="flex flex-col gap-4 pb-1">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/marketing/templates?canal=email" className={cn(linkButton, "inline-flex items-center gap-1.5")}>
          <ArrowLeftIcon className="size-4" />
          Templates de e-mail
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="E-mails do sistema" className="flex flex-wrap gap-1 rounded-lg border border-black/15 bg-white p-1">
          {KINDS.map((k) => (
            <Link key={k} href={previewHref(k, mobile)} aria-current={k === kind ? "page" : undefined} className={tab(k === kind)}>
              {EMAIL_KINDS[k]}
            </Link>
          ))}
        </nav>
        <nav aria-label="Largura" className="flex gap-1 rounded-lg border border-black/15 bg-white p-1">
          <Link href={previewHref(kind, false)} aria-current={!mobile ? "page" : undefined} className={tab(!mobile)}>
            Computador
          </Link>
          <Link href={previewHref(kind, true)} aria-current={mobile ? "page" : undefined} className={tab(mobile)}>
            Celular
          </Link>
        </nav>
      </div>

      <div className={cn(card, "p-4")}>
        <p className="text-xs font-semibold tracking-widest text-black/60">ASSUNTO</p>
        <p className="font-semibold text-black">{email.subject}</p>
        <p className="mt-1 text-sm text-black/70">{WHEN[kind]}</p>
      </div>

      <div className="flex justify-center rounded-xl border border-black/10 bg-[#e9e9e9] p-3 sm:p-6">
        <iframe
          title={`Prévia: ${EMAIL_KINDS[kind]}`}
          srcDoc={email.html}
          sandbox=""
          className={cn("h-[1180px] rounded-lg border-0 bg-[#e9e9e9]", mobile ? "w-[375px]" : "w-full max-w-[680px]")}
        />
      </div>
      <p className="text-xs text-black/60">
        Prévia com seus dados e o primeiro serviço do catálogo; a data é amanhã às 10:00. No envio real entram os dados de cada cliente.
      </p>

      <div id="enviar-teste">
        <SystemEmailTestForm kind={kind} defaultEmail={viewer.email} />
      </div>
    </div>
  );
}

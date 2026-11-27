"use client";

import { useActionState, useState } from "react";
import { ConfirmButton } from "@/app/_components/confirm-button";
import { toast } from "@/app/_components/toaster";
import { FormError, card, fieldClass, labelClass, primaryButton, secondaryButton, switchKnob, switchTrack } from "@/app/_components/ui";
import {
  createBarberAccessAction,
  deleteProfessional,
  linkOwnAccountAction,
  removeBarberAccessAction,
  saveProfessional,
  setBarberPasswordAction,
  type CatalogFormState,
} from "@/app/_lib/catalog-actions";
import type { ProfessionalColor } from "@/app/_lib/db";
import { PROFESSIONAL_COLORS, PROFESSIONAL_DOT } from "@/app/_lib/services";
import { cn } from "@/lib/utils";

type Row = {
  name: string;
  color: ProfessionalColor;
  dot: string;
  services: number;
  upcoming: number;
  /** Contas de barbeiro ligadas a ele. */
  access: { id: string; email: string }[];
  /** A conta do admin logado está ligada a ele. */
  isMe: boolean;
  /** Outros admins que marcaram "Sou eu" para ele. */
  otherAdmins: number;
};

const swatch = PROFESSIONAL_DOT;

function ProfessionalForm({ professional, onDone }: { professional?: Row; onDone: () => void }) {
  // Fecha dentro da própria ação: ao renomear, a linha com o nome antigo some da
  // lista e este formulário desmonta antes de um efeito conseguir avisar.
  const [state, action, pending] = useActionState(async (prev: CatalogFormState, formData: FormData) => {
    const result = await saveProfessional(prev, formData);
    if (result.saved) {
      toast(professional ? "Profissional atualizado." : "Profissional adicionado.");
      onDone();
    }
    return result;
  }, { error: null });

  return (
    <form action={action} className="flex flex-col gap-3 rounded-[14px] border border-[#e7e5e4] bg-white p-4">
      {professional && <input type="hidden" name="original" value={professional.name} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label>
          <span className={labelClass}>Nome</span>
          <input
            name="nome"
            required
            maxLength={40}
            defaultValue={professional?.name}
            autoFocus
            className={cn(fieldClass, "mt-1.5")}
          />
        </label>
        <fieldset>
          <legend className={labelClass}>Cor na agenda</legend>
          <div className="mt-1.5 flex h-11 items-center gap-1.5">
            {PROFESSIONAL_COLORS.map((c) => (
              <label key={c.id} title={c.label} className="cursor-pointer">
                <input
                  type="radio"
                  name="cor"
                  value={c.id}
                  defaultChecked={(professional?.color ?? "emerald") === c.id}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "block size-7 rounded-full ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-black peer-focus-visible:ring-2 peer-focus-visible:ring-black/50",
                    swatch[c.id],
                  )}
                />
                <span className="sr-only">{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      {professional && professional.services > 0 && (
        <p className="text-xs text-[#5c5c5a]">Mudar o nome atualiza os serviços e os períodos fechados deste profissional.</p>
      )}
      <FormError message={state.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={cn(primaryButton, "h-10")}>
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={onDone} className={cn(secondaryButton, "h-10")}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Acesso do barbeiro ao site e ao app: nome, e-mail e senha provisória. */
function AccessForm({ professional, onDone }: { professional: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: CatalogFormState, formData: FormData) => {
    const result = await createBarberAccessAction(prev, formData);
    if (result.saved) {
      toast(`Acesso criado para ${professional}.`);
      onDone();
    }
    return result;
  }, { error: null });

  return (
    <form action={action} className="flex w-full flex-col gap-3 rounded-[14px] border border-[#e7e5e4] bg-white p-4">
      <input type="hidden" name="profissional" value={professional} />
      <p className="text-sm text-[#5c5c5a]">
        A pessoa entra com este e-mail e esta senha e vê só a agenda de {professional}. Passe a senha para ela, que pode
        trocar depois.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Nome</span>
          <input name="nome" required maxLength={80} defaultValue={professional} autoFocus className={cn(fieldClass, "mt-1.5")} />
        </label>
        <label>
          <span className={labelClass}>E-mail</span>
          <input name="email" type="email" required maxLength={120} autoComplete="off" className={cn(fieldClass, "mt-1.5")} />
        </label>
        <label>
          <span className={labelClass}>Senha provisória</span>
          <input
            name="senha"
            type="text"
            required
            minLength={8}
            maxLength={100}
            autoComplete="off"
            className={cn(fieldClass, "mt-1.5")}
          />
        </label>
      </div>
      <FormError message={state.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={cn(primaryButton, "h-10")}>
          {pending ? "Criando..." : "Criar acesso"}
        </button>
        <button type="button" onClick={onDone} className={cn(secondaryButton, "h-10")}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Nova senha provisória para o acesso do barbeiro; as sessões abertas dele são encerradas. */
function PasswordForm({ access, professional, onDone }: { access: { id: string; email: string }; professional: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: CatalogFormState, formData: FormData) => {
    const result = await setBarberPasswordAction(prev, formData);
    if (result.saved) {
      toast(`Nova senha definida para ${professional}.`);
      onDone();
    }
    return result;
  }, { error: null });

  return (
    <form action={action} className="flex w-full flex-col gap-3 rounded-[14px] border border-[#e7e5e4] bg-white p-4">
      <input type="hidden" name="id" value={access.id} />
      <p className="text-sm text-[#5c5c5a]">
        {access.email} passa a entrar com esta senha e sai do site e do app onde estiver conectado. Passe a senha para a
        pessoa, que pode trocar depois em Meus dados.
      </p>
      <label className="sm:max-w-xs">
        <span className={labelClass}>Nova senha provisória</span>
        <input
          name="senha"
          type="text"
          required
          minLength={8}
          maxLength={100}
          autoComplete="off"
          autoFocus
          className={cn(fieldClass, "mt-1.5")}
        />
      </label>
      <FormError message={state.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={cn(primaryButton, "h-10")}>
          {pending ? "Salvando..." : "Definir senha"}
        </button>
        <button type="button" onClick={onDone} className={cn(secondaryButton, "h-10")}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Por que ainda não dá para remover (ou `null` se dá). */
function blockReason(p: Row) {
  if (p.services > 0) return "Para remover: mova ou exclua os serviços dele antes.";
  if (p.upcoming > 0) return "Para remover: remarque ou cancele os horários dele antes.";
  if (p.access.length > 0 || p.isMe) return "Para remover: tire o acesso ligado a ele antes.";
  if (p.otherAdmins > 0) return "Para remover: o outro admin que marcou “Sou eu” precisa desfazer antes.";
  return null;
}

const smallButton = "inline-flex h-9 items-center rounded-[10px] border bg-white px-3 text-[13px] font-semibold transition";

function ProfessionalItem({
  p,
  linkedToMe,
  onEdit,
  accessOpen,
  setAccessOpen,
  passwordFor,
  setPasswordFor,
}: {
  p: Row;
  linkedToMe: string | null;
  onEdit: () => void;
  accessOpen: boolean;
  setAccessOpen: (open: boolean) => void;
  passwordFor: string | null;
  setPasswordFor: (id: string | null) => void;
}) {
  const blocked = blockReason(p);
  return (
    <article className={cn(card, "overflow-hidden lg:rounded-[20px]")}>
      <div className="flex items-center gap-3 py-3.5 pr-3 pl-4">
        <span aria-hidden="true" className={cn("size-3 shrink-0 rounded-full", p.dot)} />
        <span className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-bold">{p.name}</h3>
          <span className="block text-[13px] text-[#5c5c5a]">
            {p.services} {p.services === 1 ? "serviço" : "serviços"}
            {p.access.length === 0 && " · sem acesso ao app"}
          </span>
        </span>
        <button type="button" onClick={onEdit} className={cn(secondaryButton, "h-10 rounded-xl px-3.5")}>
          Editar
        </button>
      </div>

      {p.access.length > 0 && (
        <>
          <p className="px-4 pb-1.5 text-xs font-semibold text-[#5c5c5a]">Acessos ao app</p>
          <ul className="mx-3 rounded-[14px] bg-[#f5f5f4]">
            {p.access.map((a) => (
              <li key={a.id} className="border-b border-[#e7e5e4] px-3 py-2.5 last:border-b-0">
                <p className="text-sm font-semibold [overflow-wrap:anywhere]">{a.email}</p>
                {passwordFor === a.id ? (
                  <div className="mt-2">
                    <PasswordForm access={a} professional={p.name} onDone={() => setPasswordFor(null)} />
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPasswordFor(a.id)}
                      className={cn(smallButton, "border-[#d6d3d1] hover:border-[#121212]")}
                    >
                      Nova senha
                    </button>
                    <ConfirmButton
                      action={removeBarberAccessAction}
                      fields={{ id: a.id }}
                      title={`Remover o acesso de ${p.name}?`}
                      description={`A conta ${a.email} é apagada e sai do site e do app na hora. O profissional e a agenda dele continuam.`}
                      confirmLabel="Remover acesso"
                      successMessage="Acesso removido."
                      className={cn(smallButton, "border-[#fecaca] text-[#b91c1c] hover:bg-red-50")}
                    >
                      Remover acesso
                    </ConfirmButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {p.access.length === 0 && (
        <div className="px-3 pb-3.5">
          {accessOpen ? (
            <AccessForm professional={p.name} onDone={() => setAccessOpen(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAccessOpen(true)}
              className="h-11 w-full rounded-xl border border-dashed border-[#a8a29e] bg-[#fafaf9] text-sm font-semibold transition hover:border-[#121212]"
            >
              + Criar acesso para {p.name}
            </button>
          )}
        </div>
      )}

      <form
        action={linkOwnAccountAction}
        className={cn("flex items-center gap-3 border-t border-[#f0efee] px-4 py-3.5", p.access.length > 0 && "mt-1.5")}
      >
        <input type="hidden" name="profissional" value={p.isMe ? "" : p.name} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Sou eu</span>
          <span className="block text-xs text-[#5c5c5a]">
            {p.isMe
              ? "Sua conta de admin também vê esta agenda"
              : linkedToMe
                ? `Sua conta passa de ${linkedToMe} para ${p.name}`
                : "Sua conta de admin também passa a ver esta agenda"}
          </span>
        </span>
        <button
          type="submit"
          role="switch"
          aria-checked={p.isMe}
          aria-label={`Sou eu: ${p.name}`}
          className={cn(switchTrack, p.isMe && "bg-[#121212]")}
        >
          <span aria-hidden="true" className={cn(switchKnob, p.isMe && "translate-x-5")} />
        </button>
      </form>

      <div className="px-4 pb-3.5">
        {blocked ? (
          <p className="text-xs text-[#6b6b69]">{blocked}</p>
        ) : (
          <ConfirmButton
            action={deleteProfessional}
            fields={{ nome: p.name }}
            title={`Remover ${p.name}?`}
            description="Ele não tem serviços. Some da lista de profissionais e do filtro do histórico."
            confirmLabel="Remover"
            successMessage="Profissional removido."
            className="text-[13px] font-semibold text-[#b91c1c] underline-offset-4 hover:underline"
          >
            Remover {p.name}
          </ConfirmButton>
        )}
      </div>
    </article>
  );
}

export function ProfessionalsCard({ professionals, linkedToMe }: { professionals: Row[]; linkedToMe: string | null }) {
  // Nome em edição, "novo" para adicionar, ou null.
  const [selected, setEditing] = useState<string | null>(null);
  const close = () => setEditing(null);
  // Profissional com o formulário de acesso aberto.
  const [accessFor, setAccessFor] = useState<string | null>(null);
  // Acesso (id da conta) com o formulário de nova senha aberto.
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  // Nome que não existe mais (renomeado ou removido em outra aba) conta como nada em edição.
  const editing = selected === "novo" || professionals.some((p) => p.name === selected) ? selected : null;

  return (
    <section aria-labelledby="profissionais-titulo" className="flex flex-col gap-3.5">
      <div>
        <h2 id="profissionais-titulo" className="text-lg font-bold">
          Profissionais
        </h2>
        <p className="text-sm text-[#5c5c5a]">Quem atende. A cor marca as reservas de cada um na agenda.</p>
      </div>

      {professionals.length === 0 && <p className="text-sm text-[#5c5c5a]">Nenhum profissional cadastrado.</p>}

      <div className="grid gap-3.5 xl:grid-cols-2">
        {professionals.map((p) =>
          editing === p.name ? (
            <ProfessionalForm key={p.name} professional={p} onDone={close} />
          ) : (
            <ProfessionalItem
              key={p.name}
              p={p}
              linkedToMe={linkedToMe}
              onEdit={() => setEditing(p.name)}
              accessOpen={accessFor === p.name}
              setAccessOpen={(open) => setAccessFor(open ? p.name : null)}
              passwordFor={passwordFor}
              setPasswordFor={setPasswordFor}
            />
          ),
        )}
      </div>

      {editing === "novo" ? (
        <ProfessionalForm onDone={close} />
      ) : (
        <button type="button" onClick={() => setEditing("novo")} className={cn(primaryButton, "h-[52px] rounded-[14px] text-[15px] lg:h-11 lg:self-start lg:rounded-xl lg:text-sm")}>
          Adicionar profissional
        </button>
      )}
    </section>
  );
}

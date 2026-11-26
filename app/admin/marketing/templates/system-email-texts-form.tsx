"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { toast } from "@/app/_components/toaster";
import {
  FormError,
  card,
  fieldClass,
  labelClass,
  primaryButton,
} from "@/app/_components/ui";
import {
  EMAIL_TEXT_SPEC,
  type EmailKind,
  type EmailTexts,
  type EmailTextField,
} from "@/app/_lib/email-templates/texts";
import { saveSystemEmailTexts } from "@/app/_lib/settings-actions";
import { cn } from "@/lib/utils";

/** Textos de um e-mail do sistema. O link, o card da reserva e o rodapé não entram aqui: são automáticos. */
export function SystemEmailTextsForm({
  kind,
  texts,
  reset,
}: {
  kind: EmailKind;
  /** Textos em uso (os salvos ou os originais). */
  texts: EmailTexts;
  /** Botão "Voltar ao texto original", só quando há algo mudado. */
  reset?: ReactNode;
}) {
  const [state, action, pending] = useActionState(saveSystemEmailTexts, {
    error: null,
    saved: false,
  });
  useEffect(() => {
    if (state.saved)
      toast("Textos salvos. A prévia abaixo já mostra a versão nova.");
  }, [state]);

  // Depois de salvar ou de voltar ao original, os campos mostram o que ficou gravado.
  const form = useRef<HTMLFormElement>(null);
  const saved = JSON.stringify(texts);
  useEffect(() => form.current?.reset(), [saved]);

  const spec = EMAIL_TEXT_SPEC[kind];
  const fields = Object.entries(spec.fields) as [
    EmailTextField,
    NonNullable<(typeof spec.fields)[EmailTextField]>,
  ][];

  return (
    <div className={cn(card, "flex flex-col gap-4 p-4")}>
      <form ref={form} action={action} className="flex flex-col gap-4">
        <input type="hidden" name="modelo" value={kind} />
        <div>
          <h2 className="font-bold text-black">Textos do e-mail</h2>
          <p className="text-sm text-black/70">
            O botão com o link, o card com os dados e o rodapé com os dados do
            estúdio são colocados pelo sistema.
          </p>
        </div>

        {fields.map(([name, f]) => (
          <label key={name} className="block">
            <span className={labelClass}>{f.label}</span>
            {f.rows ? (
              <textarea
                name={name}
                rows={f.rows}
                maxLength={f.max}
                required={f.required}
                defaultValue={state.values?.[name] ?? texts[name]}
                aria-invalid={state.field === name || undefined}
                className={cn(
                  fieldClass,
                  "mt-1.5 h-auto py-2.5",
                  state.field === name && "border-red-600",
                )}
              />
            ) : (
              <input
                name={name}
                maxLength={f.max}
                required={f.required}
                defaultValue={state.values?.[name] ?? texts[name]}
                aria-invalid={state.field === name || undefined}
                className={cn(
                  fieldClass,
                  "mt-1.5",
                  state.field === name && "border-red-600",
                )}
              />
            )}
            {f.hint && (
              <span className="mt-1 block text-xs text-black/60">{f.hint}</span>
            )}
          </label>
        ))}

        <div className="rounded-lg bg-black/5 px-3 py-2.5 text-xs text-black/70">
          <p className="font-semibold text-black/80">
            Marcadores (trocados pelos dados de cada cliente):
          </p>
          <ul className="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
            {Object.entries(spec.vars).map(([v, label]) => (
              <li key={v}>
                <code className="font-semibold text-black">{`{${v}}`}</code>{" "}
                {label}
              </li>
            ))}
          </ul>
          {spec.note && <p className="mt-2">{spec.note}</p>}
        </div>

        <FormError message={state.error} />
        <button
          type="submit"
          disabled={pending}
          className={cn(primaryButton, "self-start")}
        >
          {pending ? "Salvando..." : "Salvar textos"}
        </button>
      </form>
      {/* Fora do formulário: a confirmação tem o próprio <form>. */}
      {reset && <div className="border-t border-black/10 pt-3">{reset}</div>}
    </div>
  );
}

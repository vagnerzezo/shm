"use client";

import { useActionState } from "react";
import { sendTemplateTestAction } from "@/app/_lib/marketing-actions";
import { cn } from "@/lib/utils";
import { fieldClass, linkButton, primaryButton, secondaryButton } from "../ui";

export function TemplateTestButton({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(sendTemplateTestAction, { error: null, sent: false });

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          const dialog = event.currentTarget.nextElementSibling;
          if (dialog instanceof HTMLDialogElement) dialog.showModal();
        }}
        className={linkButton}
      >
        Enviar teste
      </button>
      <dialog
        aria-labelledby={`teste-${id}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-black shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <form action={action} className="p-7">
          <input type="hidden" name="id" value={id} />
          <h2 id={`teste-${id}`} className="text-xl font-semibold">
            Enviar teste
          </h2>
          <p className="mt-2 text-sm text-black/70">
            Envie uma prévia de <strong className="font-semibold text-black">{name}</strong> para conferir o conteúdo.
          </p>
          <label className="mt-5 block">
            <span className="block text-xs font-semibold tracking-wide text-black/70">E-mail de destino</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              className={cn(fieldClass, "mt-1.5")}
            />
          </label>
          {state.error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {state.error}
            </p>
          )}
          {state.sent && (
            <p role="status" className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              Teste enviado com sucesso.
            </p>
          )}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={(event) => {
                const dialog = event.currentTarget.closest("dialog");
                if (dialog instanceof HTMLDialogElement) dialog.close();
              }}
              className={secondaryButton}
            >
              {state.sent ? "Fechar" : "Cancelar"}
            </button>
            {!state.sent && (
              <button type="submit" disabled={pending} className={primaryButton}>
                {pending ? "Enviando..." : "Enviar"}
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}

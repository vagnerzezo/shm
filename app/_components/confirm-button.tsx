"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { toast } from "./toaster";
import { dangerButton, secondaryButton } from "./ui";

type ActionResult = { error: string | null };

type Props = {
  /** Server action que recebe os `fields` (e o que estiver em `extra`). Pode devolver `{ error }` para avisar que nada foi feito. */
  action: (formData: FormData) => void | ActionResult | Promise<void | ActionResult>;
  fields: Record<string, string>;
  /** Texto do botão que abre a confirmação. */
  children: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  /** Campos extras dentro da confirmação (ex.: "avisar o cliente"). */
  extra?: ReactNode;
  /** Aviso mostrado depois de confirmar. */
  successMessage?: string;
  className?: string;
  /** Ação reversível (ex.: reabrir período): botão de confirmar escuro em vez de vermelho. */
  tone?: "danger" | "neutral";
};

/** Botão que pede confirmação numa janela antes de executar uma ação destrutiva. */
export function ConfirmButton({ children, className, ...dialogProps }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={className}>
        {children}
      </button>
      <ConfirmDialog dialogRef={dialog} {...dialogProps} />
    </>
  );
}

export type ConfirmDialogProps = Omit<Props, "children" | "className">;

/** A janela de confirmação, para abrir de outro lugar (ex.: um item de menu) com `dialogRef.current.showModal()`. */
export function ConfirmDialog({
  dialogRef: dialog,
  action,
  fields,
  title,
  description,
  confirmLabel,
  extra,
  successMessage,
  tone = "danger",
}: ConfirmDialogProps & { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const [pending, setPending] = useState(false);

  return (
    <dialog
      ref={dialog}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) event.currentTarget.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-left text-black shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <form
        action={async (formData) => {
          setPending(true);
          try {
            const result = await action(formData);
            dialog.current?.close();
            if (result?.error) toast(result.error, "error");
            else if (successMessage) toast(successMessage);
          } finally {
            setPending(false);
          }
        }}
        className="p-6"
      >
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <div className="mt-2 text-sm leading-relaxed text-black/70">{description}</div>}
        {extra && <div className="mt-4">{extra}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={() => dialog.current?.close()}
            className={secondaryButton}
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={pending}
            className={cn(dangerButton, tone === "neutral" && "bg-[#121212] hover:bg-black/80")}
          >
            {pending ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

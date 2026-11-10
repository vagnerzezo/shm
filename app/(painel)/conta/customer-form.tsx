"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ConsentFields } from "@/app/_components/consent-fields";
import { CalendarCheckIcon, CheckIcon } from "@/app/_components/icons";
import { updateProfile } from "@/app/_lib/actions";
import type { Consent } from "@/app/_lib/db";

const inputClass =
  "mt-2 h-12 w-full rounded-lg border border-black/20 bg-white px-4 text-sm text-black placeholder:text-black/50 focus:border-black focus:outline-none";

type Props = {
  name: string;
  phone: string;
  email: string;
  consent: Consent;
  returnHref?: string;
  returnLabel?: string;
};

export function CustomerForm({
  name,
  phone,
  email,
  consent,
  returnHref = "/reservas",
  returnLabel = "Minhas reservas",
}: Props) {
  const [state, action, pending] = useActionState(updateProfile, { error: null, saved: false });

  return (
    <form action={action} className="max-w-xl rounded-xl border border-black/10 bg-white/85 p-7">
      <label className="block">
        <span className="block text-sm font-semibold text-black">Nome</span>
        <input
          name="nome"
          required
          minLength={2}
          autoComplete="name"
          defaultValue={name}
          className={inputClass}
        />
      </label>
      <label className="mt-5 block">
        <span className="block text-sm font-semibold text-black">Telefone / WhatsApp</span>
        <input
          name="telefone"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="(51) 99999-9999"
          defaultValue={phone}
          className={inputClass}
        />
      </label>
      <label className="mt-5 block">
        <span className="block text-sm font-semibold text-black">E-mail</span>
        <input
          name="email"
          type="email"
          required
          maxLength={120}
          autoComplete="email"
          placeholder="voce@exemplo.com"
          defaultValue={email}
          className={inputClass}
        />
      </label>
      <div className="mt-6 border-t border-black/10 pt-5">
        <ConsentFields consent={consent} />
      </div>

      {state.error && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}
      {state.saved && !pending && (
        <p role="status" className="mt-5 flex items-center gap-2 text-sm font-semibold text-black">
          <CheckIcon className="size-4" strokeWidth={3} />
          Dados salvos.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 flex-1 items-center justify-center rounded-lg bg-[#121212] px-5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
        <Link
          href={returnHref}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-black bg-white px-5 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
        >
          <CalendarCheckIcon className="size-4" />
          {returnLabel}
        </Link>
      </div>
    </form>
  );
}

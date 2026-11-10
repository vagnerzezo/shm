"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CheckIcon, UserIcon } from "./icons";

const steps = ["Serviço", "Horário", "Confirmação"];

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-3 text-sm">
      {steps.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <li key={label} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden="true" className="hidden h-px w-9 bg-black/30 sm:block" />}
            <span aria-current={active ? "step" : undefined} className="flex items-center gap-2">
              <span
                className={`grid size-6 place-items-center rounded-full border text-xs font-semibold ${
                  active || done
                    ? "border-[#121212] bg-[#121212] text-white"
                    : "border-black text-black"
                }`}
              >
                {done ? <CheckIcon className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`${active ? "" : "sr-only sm:not-sr-only"} ${active || done ? "font-semibold text-black" : "text-black/70"}`}
              >
                {label}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const iconButton =
  "grid size-11 place-items-center rounded-full border border-black/15 bg-white text-black transition hover:bg-black/5";

/** `step` mostra o passo do agendamento; sem ele, o cabeçalho fica sem stepper. */
export function PanelHeader({ step, children }: { step?: number; children?: ReactNode }) {
  const pathname = usePathname();
  const profileHref = pathname.startsWith("/admin") ? "/admin/perfil" : "/conta";

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {step !== undefined && (
          <div className="flex min-h-11 items-center">
            <Stepper current={step} />
          </div>
        )}
        {children}
      </div>
      <div className="flex shrink-0 gap-3">
        <Link href={profileHref} aria-label="Meus dados" className={iconButton}>
          <UserIcon className="size-4" />
        </Link>
      </div>
    </header>
  );
}

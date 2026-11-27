import Link from "next/link";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronLeftIcon, XIcon } from "../icons";

const STEPS = ["Serviço", "Horário", "Confirmação"];

/**
 * Cabeçalho dos passos do agendamento. Celular: "Passo N de 3", barra de
 * progresso e X (passo 1) ou voltar. Computador: etapas numeradas.
 */
export function BookingHeader({ step, back }: { step: 0 | 1 | 2; back?: string }) {
  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 -mt-5 mb-[18px] border-b border-black/6 bg-[#f5f5f4]/95 px-4 pt-[calc(4px+env(safe-area-inset-top))] pb-3.5 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-1">
          {back && (
            <Link href={back} aria-label="Voltar" className="-ml-3 grid size-11 place-items-center rounded-full hover:bg-black/5">
              <ChevronLeftIcon className="size-[22px]" />
            </Link>
          )}
          <p className="flex-1 text-[13px] font-semibold text-[#5c5c5a]">
            Passo {step + 1} de 3 · {STEPS[step]}
          </p>
          {!back && (
            <Link href="/" aria-label="Sair do agendamento" className="-mr-2.5 grid size-11 place-items-center rounded-full hover:bg-black/5">
              <XIcon className="size-5" />
            </Link>
          )}
        </div>
        <div aria-hidden="true" className="mt-1 grid grid-cols-3 gap-1.5">
          {STEPS.map((s, i) => (
            <span key={s} className={cn("h-1 rounded-full", i <= step ? "bg-[#121212]" : "bg-[#e7e5e4]")} />
          ))}
        </div>
      </header>

      <ol aria-label="Etapas" className="mb-[22px] flex items-center gap-3 text-sm max-lg:hidden">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden="true" className={cn("h-px w-12", i <= step ? "bg-[#121212]" : "bg-[#d6d3d1]")} />}
              <span
                aria-current={current ? "step" : undefined}
                className={cn("flex items-center gap-2", current ? "font-bold" : done ? "font-semibold" : "font-semibold text-[#5c5c5a]")}
              >
                <span
                  className={cn(
                    "grid size-[26px] place-items-center rounded-full text-xs",
                    done || current ? "bg-[#121212] text-white" : "border border-[#a8a29e]",
                  )}
                >
                  {done ? <CheckIcon className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/**
 * Cabeçalho do Remarcar. Celular: barra com voltar para Minhas reservas.
 * Computador: link de volta e, quando `title`, o título da página.
 */
export function RescheduleHeader({ title = false }: { title?: boolean }) {
  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 -mt-5 mb-[18px] flex items-center gap-1 border-b border-black/6 bg-[#f5f5f4]/95 px-4 pt-[calc(4px+env(safe-area-inset-top))] pb-1 backdrop-blur-md lg:hidden">
        <Link href="/reservas" aria-label="Voltar para Minhas reservas" className="-ml-3 grid size-11 place-items-center rounded-full hover:bg-black/5">
          <ChevronLeftIcon className="size-[22px]" />
        </Link>
        <p className="text-[15px] font-bold">Remarcar horário</p>
      </header>
      <div className="mb-[22px] flex flex-col gap-3 max-lg:hidden">
        <Link href="/reservas" className="flex items-center gap-1 self-start text-sm font-semibold text-[#5c5c5a] hover:text-[#121212]">
          <ChevronLeftIcon className="size-4" />
          Minhas reservas
        </Link>
        {title && (
          <h1 className="font-[family-name:var(--font-display)] text-[52px] leading-none font-extrabold uppercase">Remarcar horário</h1>
        )}
      </div>
    </>
  );
}

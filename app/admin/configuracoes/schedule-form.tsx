"use client";

import { useActionState, useEffect } from "react";
import { toast } from "@/app/_components/toaster";
import { FormError, fieldClass as baseField, labelClass, primaryButton } from "@/app/_components/ui";
import { STEP_OPTIONS } from "@/app/_lib/availability";
import type { ScheduleSettings } from "@/app/_lib/db";
import { saveSchedule } from "@/app/_lib/settings-actions";
import { cn } from "@/lib/utils";

const fieldClass = cn(baseField, "mt-1.5");
// Segunda primeiro, como o estúdio pensa a semana; o valor segue 0 = domingo.
const weekdays = [
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
  { id: 0, label: "Dom" },
];

export function ScheduleForm({ settings }: { settings: ScheduleSettings }) {
  const [state, action, pending] = useActionState(saveSchedule, { error: null, saved: false });
  useEffect(() => {
    if (state.saved) toast("Funcionamento salvo.");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset>
        <legend className={labelClass}>Dias de atendimento</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {weekdays.map((d) => (
            <label key={d.id} className="cursor-pointer">
              <input
                type="checkbox"
                name="dia"
                value={d.id}
                defaultChecked={settings.openWeekdays.includes(d.id)}
                className="peer sr-only"
              />
              <span className="flex h-10 w-14 items-center justify-center rounded-lg border border-black/20 bg-white text-sm font-semibold text-black transition peer-checked:border-[#121212] peer-checked:bg-[#121212] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black hover:border-black">
                {d.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label>
          <span className={labelClass}>Abre às</span>
          <input type="time" name="abre" required defaultValue={settings.openTime} className={fieldClass} />
        </label>
        <label>
          <span className={labelClass}>Último horário de início</span>
          <input type="time" name="ultimo" required defaultValue={settings.lastStartTime} className={fieldClass} />
        </label>
        <label>
          <span className={labelClass}>Intervalo entre horários</span>
          <select name="intervalo" defaultValue={settings.stepMinutes} className={fieldClass}>
            {STEP_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelClass}>Agendar com até (dias)</span>
          <input
            type="number"
            name="janela"
            required
            min={1}
            max={365}
            defaultValue={settings.maxDaysAhead}
            className={fieldClass}
          />
        </label>
        <label>
          <span className={labelClass}>Antecedência mínima (horas)</span>
          <input
            type="number"
            name="antecedencia"
            required
            min={0}
            max={72}
            defaultValue={settings.minNoticeMinutes / 60}
            className={fieldClass}
          />
        </label>
      </div>

      <p className="text-xs text-black/60">
        Mudanças valem para novos agendamentos. Reservas já feitas continuam como estão.
      </p>

      <FormError message={state.error} />
      <div>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Salvando..." : "Salvar funcionamento"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "@/app/_components/toaster";
import { FormError, fieldClass as baseField, labelClass, primaryButton } from "@/app/_components/ui";
import { addClosure } from "@/app/_lib/settings-actions";
import { cn } from "@/lib/utils";

const fieldClass = cn(baseField, "mt-1.5");
const reasons = ["Férias", "Feriado", "Folga", "Evento", "Manutenção"];

export function ClosureForm({ today, professionals }: { today: string; professionals: string[] }) {
  const [state, action, pending] = useActionState(addClosure, { error: null, saved: false });
  // Só para o mínimo do campo "Até"; o formulário em si não é controlado e limpa ao salvar.
  const [start, setStart] = useState("");
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.saved) {
      toast("Período fechado. Ninguém consegue marcar nesses dias.");
      // O mínimo do campo "Até" fica do período anterior até a próxima escolha de "De"; não atrapalha.
      form.current?.reset();
    }
  }, [state]);

  return (
    <form ref={form} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr_auto] lg:items-end">
      <label>
        <span className={labelClass}>De</span>
        <input
          type="date"
          name="inicio"
          required
          min={today}
          onChange={(e) => setStart(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label>
        <span className={labelClass}>Até</span>
        <input type="date" name="fim" required min={start || today} className={fieldClass} />
      </label>
      <label>
        <span className={labelClass}>Quem não atende</span>
        <select name="profissional" defaultValue="" className={fieldClass}>
          <option value="">Estúdio todo</option>
          {professionals.map((p) => (
            <option key={p} value={p}>
              Só {p}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>Motivo</span>
        <input
          name="motivo"
          required
          maxLength={60}
          list="motivos"
          placeholder="Ex.: Férias"
          className={fieldClass}
        />
        <datalist id="motivos">
          {reasons.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </label>
      <button
        type="submit"
        disabled={pending}
        className={cn(primaryButton, "sm:col-span-2 lg:col-span-1")}
      >
        {pending ? "Fechando..." : "Fechar período"}
      </button>

      <FormError message={state.error} className="sm:col-span-2 lg:col-span-5" />
    </form>
  );
}

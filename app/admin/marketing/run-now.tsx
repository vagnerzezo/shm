"use client";

import { useActionState } from "react";
import { runNow, type RunState } from "@/app/_lib/marketing-actions";
import { cn } from "@/lib/utils";
import { secondaryButton } from "./ui";

export function RunNow() {
  const [state, action, pending] = useActionState<RunState>(runNow, { result: null, error: null });
  const r = state.result;
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className={cn(secondaryButton, "lg:h-10")}>
        {pending ? "Executando..." : "Executar agora"}
      </button>
      {r && (
        <p role="status" className="text-sm text-black/70">
          {r.sent} enviados · {r.failed} com falha · {r.scheduled} agendados · {r.cancelled} cancelados
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { ConfirmButton } from "@/app/_components/confirm-button";
import { cn } from "@/lib/utils";
import { FormError, fieldClass, labelClass, primaryButton, secondaryButton } from "@/app/_components/ui";
import type { Attendance } from "@/app/_lib/db";
import {
  cancelReservationByAdmin,
  rescheduleReservation,
  setAttendance,
} from "@/app/_lib/reservation-actions";

const checkbox = "mt-0.5 size-4 shrink-0 accent-[#121212]";

function NotifyField({ defaultChecked = true }: { defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-2 text-sm text-black">
      <input type="checkbox" name="avisar" defaultChecked={defaultChecked} className={checkbox} />
      Avisar o cliente pelo chat
    </label>
  );
}

function RescheduleForm({
  id,
  date,
  time,
  times,
  today,
  onCancel,
}: {
  id: string;
  date: string;
  time: string;
  times: string[];
  today: string;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(rescheduleReservation, { error: null });
  return (
    <form action={action} className="mt-3 flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-semibold text-black">Remarcar</p>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={labelClass}>Data</span>
          <input type="date" name="data" required min={today} defaultValue={date} className={cn(fieldClass, "mt-1 h-10")} />
        </label>
        <label>
          <span className={labelClass}>Horário</span>
          <input
            type="time"
            name="hora"
            required
            step={300}
            list="horarios-agenda"
            defaultValue={time}
            className={cn(fieldClass, "mt-1 h-10")}
          />
        </label>
      </div>
      <datalist id="horarios-agenda">
        {times.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <NotifyField />
      <FormError message={state.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={cn(primaryButton, "h-10 flex-1")}>
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={onCancel} className={cn(secondaryButton, "h-10")}>
          Voltar
        </button>
      </div>
    </form>
  );
}

function AttendanceControl({ id, attendance }: { id: string; attendance?: Attendance }) {
  const current = attendance ?? "";
  const options = [
    { value: "compareceu", label: "Compareceu" },
    { value: "faltou", label: "Faltou" },
  ] as const;
  return (
    <div>
      <p className={labelClass}>O cliente veio?</p>
      <div className="mt-1.5 flex gap-1 rounded-lg border border-black/15 bg-white p-1" role="group" aria-label="Comparecimento">
        {options.map((o) => {
          const active = current === o.value;
          return (
            <form key={o.value} action={setAttendance} className="flex-1">
              <input type="hidden" name="id" value={id} />
              {/* Clicar de novo na opção marcada desfaz a marcação. */}
              <input type="hidden" name="situacao" value={active ? "" : o.value} />
              <button
                aria-pressed={active}
                className={cn(
                  "h-8 w-full rounded-md text-sm font-semibold transition",
                  active
                    ? o.value === "faltou"
                      ? "bg-red-700 text-white"
                      : "bg-[#121212] text-white"
                    : "text-black/70 hover:bg-black/5 hover:text-black",
                )}
              >
                {o.label}
              </button>
            </form>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-black/50">
        {current === "faltou"
          ? "Falta não entra no faturamento nem conta como visita."
          : current === "compareceu"
            ? "Confirmado."
            : "Sem marcação, o horário conta como realizado."}
      </p>
    </div>
  );
}

/** Ações da reserva aberta na agenda: comparecimento (passadas) ou remarcar/cancelar (futuras). */
export function ReservationActions({
  id,
  date,
  time,
  past,
  attendance,
  times,
  today,
  label,
}: {
  id: string;
  date: string;
  time: string;
  past: boolean;
  attendance?: Attendance;
  times: string[];
  today: string;
  /** "Corte com Heitor em 6 de novembro às 14:00", para a confirmação. */
  label: string;
}) {
  const [rescheduling, setRescheduling] = useState(false);

  return (
    <div className="mt-4 flex flex-col gap-3">
      {past ? (
        <AttendanceControl id={id} attendance={attendance} />
      ) : rescheduling ? (
        <RescheduleForm id={id} date={date} time={time} times={times} today={today} onCancel={() => setRescheduling(false)} />
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => setRescheduling(true)} className={cn(secondaryButton, "h-10 flex-1")}>
            Remarcar
          </button>
          <ConfirmButton
            action={cancelReservationByAdmin}
            fields={{ id }}
            title="Cancelar esta reserva?"
            description={<>O horário de {label} fica livre para outros clientes. Isso não pode ser desfeito.</>}
            confirmLabel="Cancelar reserva"
            extra={
              <div className="flex flex-col gap-3">
                <NotifyField />
                <label>
                  <span className={labelClass}>Motivo (opcional, vai na mensagem)</span>
                  <input name="motivo" maxLength={200} placeholder="Ex.: profissional doente" className={cn(fieldClass, "mt-1")} />
                </label>
              </div>
            }
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Cancelar
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}

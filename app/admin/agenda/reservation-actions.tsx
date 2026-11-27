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

function NotifyField({ defaultChecked = true, email = false }: { defaultChecked?: boolean; email?: boolean }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" name="avisar" defaultChecked={defaultChecked} className={checkbox} />
      {email ? "Avisar o cliente pelo chat e por e-mail" : "Avisar o cliente pelo chat"}
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
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-[#e7e5e4] bg-white p-3.5">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-bold">Remarcar</p>
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
      <div className="mt-1.5 flex gap-1 rounded-xl bg-[#f0efee] p-[3px]" role="group" aria-label="Comparecimento">
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
                  "h-10 w-full rounded-[9px] text-sm font-semibold transition",
                  active
                    ? o.value === "faltou"
                      ? "bg-[#b91c1c] text-white"
                      : "bg-[#121212] text-white"
                    : "text-[#5c5c5a] hover:text-[#121212]",
                )}
              >
                {o.label}
              </button>
            </form>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-[#6b6b69]">
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
    <div className="flex flex-col gap-3">
      {past ? (
        <AttendanceControl id={id} attendance={attendance} />
      ) : rescheduling ? (
        <RescheduleForm id={id} date={date} time={time} times={times} today={today} onCancel={() => setRescheduling(false)} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <ConfirmButton
            action={cancelReservationByAdmin}
            fields={{ id }}
            title="Cancelar esta reserva?"
            description={<>O horário de {label} fica livre para outros clientes. Isso não pode ser desfeito.</>}
            confirmLabel="Cancelar reserva"
            extra={
              <div className="flex flex-col gap-3">
                <NotifyField email />
                <label>
                  <span className={labelClass}>Motivo (opcional, vai na mensagem)</span>
                  <input name="motivo" maxLength={200} placeholder="Ex.: profissional doente" className={cn(fieldClass, "mt-1")} />
                </label>
              </div>
            }
            className="inline-flex h-12 items-center justify-center rounded-[14px] border border-red-200 bg-white px-4 text-[15px] font-semibold text-[#b91c1c] transition hover:bg-red-50"
          >
            Cancelar reserva
          </ConfirmButton>
          <button type="button" onClick={() => setRescheduling(true)} className={cn(primaryButton, "h-12 rounded-[14px] text-[15px]")}>
            Remarcar
          </button>
        </div>
      )}
    </div>
  );
}

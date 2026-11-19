import { setMyAttendance } from "@/app/_lib/reservation-actions";
import type { Attendance } from "@/app/_lib/db";
import { cn } from "@/lib/utils";

const options = [
  { value: "compareceu", label: "Compareceu" },
  { value: "faltou", label: "Faltou" },
] as const;

/** Compareceu / Faltou. Tocar de novo na opção marcada desfaz. */
export function AttendanceButtons({ id, attendance }: { id: string; attendance?: Attendance }) {
  return (
    <div className="flex gap-1 rounded-lg border border-black/15 bg-white p-1" role="group" aria-label="O cliente veio?">
      {options.map((o) => {
        const active = attendance === o.value;
        return (
          <form key={o.value} action={setMyAttendance} className="flex-1">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="situacao" value={active ? "" : o.value} />
            <button
              aria-pressed={active}
              title={active ? "Tocar de novo desfaz" : undefined}
              className={cn(
                "h-11 w-full rounded-md text-sm font-semibold transition",
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
  );
}

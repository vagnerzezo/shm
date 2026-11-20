"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "@/app/_components/toaster";
import { FormError, fieldClass, labelClass, primaryButton } from "@/app/_components/ui";
import type { TeamMember } from "@/app/_lib/domain/team";
import { saveTeamMember } from "@/app/_lib/settings-actions";
import { cn } from "@/lib/utils";

/** Uma pessoa da equipe e o papel dela. */
function MemberRow({ member }: { member: TeamMember }) {
  const [state, action, pending] = useActionState(saveTeamMember, { error: null });
  const [role, setRole] = useState(member.role);
  useEffect(() => {
    if (state.saved) toast("Acesso salvo.");
  }, [state]);

  return (
    <li className="border-t border-black/10 py-4 first:border-t-0 first:pt-0">
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={member.id} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-black">{member.name}</p>
            <p className="text-sm break-all text-black/60">
              {member.email} · {member.professional ? `profissional ${member.professional}` : "sem profissional"}
            </p>
          </div>
          <label className="w-40">
            <span className={labelClass}>Papel</span>
            <select
              name="papel"
              value={role}
              onChange={(e) => setRole(e.target.value as TeamMember["role"])}
              className={cn(fieldClass, "mt-1.5")}
            >
              <option value="admin">Admin</option>
              <option value="barbeiro" disabled={!member.professional}>
                Barbeiro
              </option>
            </select>
          </label>
        </div>

        <p className="text-sm text-black/60">
          {role === "barbeiro"
            ? "Barbeiro vê a própria agenda, os clientes que já atendeu e o próprio histórico."
            : "Admin vê todos os menus e os dados de todo mundo."}
        </p>

        <FormError message={state.error} />
        <div>
          <button type="submit" disabled={pending} className={cn(primaryButton, "h-10")}>
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </li>
  );
}

/** Configurações → Equipe. A conta de quem está logado aparece sem controles. */
export function TeamCard({ team, meId }: { team: TeamMember[]; meId: string }) {
  return (
    <ul>
      {team.map((m) =>
        m.id === meId ? (
          <li key={m.id} className="border-t border-black/10 py-4 first:border-t-0 first:pt-0">
            <p className="font-semibold text-black">
              {m.name} <span className="text-sm font-normal text-black/60">(você)</span>
            </p>
            <p className="text-sm break-all text-black/60">{m.email} · admin. O seu acesso só outro admin muda.</p>
          </li>
        ) : (
          <MemberRow key={m.id} member={m} />
        ),
      )}
    </ul>
  );
}

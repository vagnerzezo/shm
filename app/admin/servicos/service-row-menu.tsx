"use client";

import { Menu } from "@base-ui/react/menu";
import { useRef, useTransition } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-button";
import { MoreVerticalIcon } from "@/app/_components/icons";
import { deleteService, toggleService } from "@/app/_lib/catalog-actions";

const item =
  "flex h-10 w-full cursor-pointer items-center rounded-lg px-3 text-sm font-semibold outline-none select-none data-highlighted:bg-black/5";

/** Menu "⋮" de cada serviço: Desativar/Ativar e, se nenhuma reserva usa, Excluir. */
export function ServiceRowMenu({ id, name, active, canDelete }: { id: string; name: string; active: boolean; canDelete: boolean }) {
  // A janela fica fora do menu: o menu some ao escolher o item, a janela continua aberta.
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const data = new FormData();
    data.set("id", id);
    startTransition(() => toggleService(data));
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Mais ações de ${name}: ${active ? "desativar" : "ativar"}${canDelete ? " ou excluir" : ""}`}
          disabled={pending}
          className="grid size-9 place-items-center rounded-[10px] text-[#5c5c5a] transition hover:bg-black/5 hover:text-[#121212] focus-visible:outline-2 focus-visible:outline-black disabled:opacity-50 data-popup-open:bg-black/5"
        >
          <MoreVerticalIcon className="size-5" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={4} className="z-50">
            <Menu.Popup className="min-w-36 rounded-xl border border-black/10 bg-white p-1 text-black shadow-lg outline-none">
              <Menu.Item onClick={toggle} className={item}>
                {active ? "Desativar" : "Ativar"}
              </Menu.Item>
              {canDelete && (
                <Menu.Item
                  onClick={() => dialog.current?.showModal()}
                  className={`${item} text-red-700 data-highlighted:bg-red-50`}
                >
                  Excluir
                </Menu.Item>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {canDelete && (
        <ConfirmDialog
          dialogRef={dialog}
          action={deleteService}
          fields={{ id }}
          title={`Excluir “${name}”?`}
          description="O serviço sai do catálogo de vez. Nenhuma reserva usa este serviço."
          confirmLabel="Excluir serviço"
          successMessage="Serviço excluído."
        />
      )}
    </>
  );
}

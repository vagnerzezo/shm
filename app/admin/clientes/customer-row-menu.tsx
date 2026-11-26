"use client";

import { Menu } from "@base-ui/react/menu";
import Link from "next/link";
import { useRef } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-button";
import { MoreVerticalIcon } from "@/app/_components/icons";
import { deleteCustomerDialog } from "./delete-customer";

const item =
  "flex h-10 w-full cursor-pointer items-center rounded-lg px-3 text-sm font-semibold outline-none select-none data-highlighted:bg-black/5";

/** Menu "⋮" no fim de cada linha da lista de clientes: Editar e, para o admin, Excluir. */
export function CustomerRowMenu({ id, name, canDelete }: { id: string; name: string; canDelete: boolean }) {
  // A janela fica fora do menu: o menu some ao escolher o item, a janela continua aberta.
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Ações de ${name}`}
          className="grid size-9 place-items-center rounded-lg text-black transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-black data-popup-open:bg-black/5"
        >
          <MoreVerticalIcon className="size-5" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={4} className="z-50">
            <Menu.Popup className="min-w-36 rounded-xl border border-black/10 bg-white p-1 text-black shadow-lg outline-none">
              <Menu.LinkItem render={<Link href={`/admin/clientes/${id}`} />} className={item}>
                Editar
              </Menu.LinkItem>
              {canDelete && (
                <Menu.Item onClick={() => dialog.current?.showModal()} className={`${item} text-red-700 data-highlighted:bg-red-50`}>
                  Excluir
                </Menu.Item>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {canDelete && <ConfirmDialog dialogRef={dialog} {...deleteCustomerDialog(id, name)} />}
    </>
  );
}

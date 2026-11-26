"use client";

import type { ConfirmDialogProps } from "@/app/_components/confirm-button";
import { fieldClass, labelClass } from "@/app/_components/ui";
import { deleteCustomer } from "@/app/_lib/customer-actions";
import { cn } from "@/lib/utils";

/** Confirmação de "Excluir dados do cliente": a mesma na ficha e no menu da lista. */
export function deleteCustomerDialog(customerId: string, name: string): ConfirmDialogProps {
  return {
    action: deleteCustomer,
    fields: { id: customerId },
    title: `Excluir todos os dados de ${name}?`,
    description: (
      <>
        Some o cadastro, as reservas (inclusive do histórico e do faturamento), a conversa do chat e os envios de
        marketing. <strong className="font-semibold text-black">Não dá para desfazer.</strong> Use para pedidos de
        exclusão de dados (LGPD); para só bloquear o acesso, desative a conta.
      </>
    ),
    extra: (
      <label className="block">
        <span className={labelClass}>Digite EXCLUIR para confirmar</span>
        <input
          name="confirmacao"
          required
          pattern="EXCLUIR"
          autoComplete="off"
          placeholder="EXCLUIR"
          title="Digite EXCLUIR em maiúsculas"
          className={cn(fieldClass, "mt-1.5")}
        />
      </label>
    ),
    confirmLabel: "Excluir definitivamente",
  };
}

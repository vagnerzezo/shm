"use client";

import { useActionState, useState } from "react";
import { CheckIcon } from "@/app/_components/icons";
import { ConfirmButton } from "@/app/_components/confirm-button";
import { deleteCustomer, setCustomerActive, setCustomerPassword } from "@/app/_lib/customer-actions";
import { generatePassword } from "@/app/_lib/password";
import { fieldClass as baseField, labelClass, primaryButton, secondaryButton } from "@/app/_components/ui";
import { cn } from "@/lib/utils";

const fieldClass = cn(baseField, "mt-1.5");
const darkButton = primaryButton;
const lightButton = secondaryButton;


function PasswordForm({ customerId }: { customerId: string }) {
  const [state, action, pending] = useActionState(setCustomerPassword, { error: null, saved: false });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);

  function generate() {
    const value = generatePassword();
    setPassword(value);
    setConfirm(value);
    setVisible(true);
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={customerId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Nova senha</span>
          <input
            name="senha"
            type={visible ? "text" : "password"}
            required
            minLength={8}
            maxLength={100}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 8 caracteres"
            className={cn(fieldClass, visible && "font-mono")}
          />
        </label>
        <label>
          <span className={labelClass}>Confirmar senha</span>
          <input
            name="confirmacao"
            type={visible ? "text" : "password"}
            required
            minLength={8}
            maxLength={100}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={cn(fieldClass, visible && "font-mono")}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2 text-black">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            className="size-4 accent-[#121212]"
          />
          Mostrar senha
        </label>
        <button
          type="button"
          onClick={generate}
          className="font-semibold text-black/70 underline underline-offset-4 hover:text-black"
        >
          Gerar senha
        </button>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}
      {state.saved && !pending && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-black/5 px-4 py-3 text-sm text-black"
        >
          <CheckIcon className="mt-0.5 size-4 shrink-0" strokeWidth={3} />
          Senha alterada. O cliente foi desconectado de todos os aparelhos; passe a nova senha para ele.
        </p>
      )}

      <div>
        <button type="submit" disabled={pending} className={darkButton}>
          {pending ? "Salvando..." : "Alterar senha"}
        </button>
      </div>
    </form>
  );
}

function ActiveToggle({
  customerId,
  disabled,
  upcoming,
}: {
  customerId: string;
  disabled: boolean;
  upcoming: number;
}) {
  // Desativar pede uma segunda confirmação na própria tela (sem diálogo do navegador).
  const [confirming, setConfirming] = useState(false);

  if (disabled) {
    return (
      <form action={setCustomerActive}>
        <input type="hidden" name="id" value={customerId} />
        <input type="hidden" name="ativo" value="true" />
        <button className={darkButton}>Reativar conta</button>
      </form>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={cn(lightButton, "border-red-200 text-red-700 hover:bg-red-50")}
      >
        Desativar conta
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-semibold">Desativar esta conta?</p>
      <p className="mt-1">
        O cliente sai de todos os aparelhos, não consegue mais entrar nem marcar horários e para de receber
        comunicações automáticas.{" "}
        {upcoming > 0
          ? `${upcoming === 1 ? "A reserva futura continua marcada" : `As ${upcoming} reservas futuras continuam marcadas`}; cancele pela agenda (em “Próximos horários”) se precisar.`
          : "Ele não tem reservas futuras."}{" "}
        Você pode reativar quando quiser.
      </p>
      <form action={setCustomerActive} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="id" value={customerId} />
        <input type="hidden" name="ativo" value="false" />
        <button className="h-10 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800">
          Confirmar desativação
        </button>
        <button type="button" onClick={() => setConfirming(false)} className={cn(lightButton, "h-10")}>
          Cancelar
        </button>
      </form>
    </div>
  );
}

function DeleteData({ customerId, name }: { customerId: string; name: string }) {
  return (
    <ConfirmButton
      action={deleteCustomer}
      fields={{ id: customerId }}
      title={`Excluir todos os dados de ${name}?`}
      description={
        <>
          Some o cadastro, as reservas (inclusive do histórico e do faturamento), a conversa do chat e os envios de
          marketing. <strong className="font-semibold text-black">Não dá para desfazer.</strong> Use para pedidos de
          exclusão de dados (LGPD); para só bloquear o acesso, desative a conta.
        </>
      }
      extra={
        <label className="block">
          <span className={labelClass}>Digite EXCLUIR para confirmar</span>
          <input
            name="confirmacao"
            required
            pattern="EXCLUIR"
            autoComplete="off"
            placeholder="EXCLUIR"
            title="Digite EXCLUIR em maiúsculas"
            className={fieldClass}
          />
        </label>
      }
      confirmLabel="Excluir definitivamente"
      className={cn(lightButton, "border-red-200 text-red-700 hover:bg-red-50")}
    >
      Excluir dados do cliente
    </ConfirmButton>
  );
}

export function AccessCard({
  customerId,
  customerName,
  disabledAt,
  upcoming,
}: {
  customerId: string;
  customerName: string;
  disabledAt: string | null;
  upcoming: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-black">Senha</h3>
        <p className="mb-3 text-xs text-black/60">
          Para quando o cliente esqueceu a senha. A senha atual não é exibida em nenhum lugar.
        </p>
        <PasswordForm customerId={customerId} />
      </div>
      <div className="border-t border-black/10 pt-5">
        <h3 className="text-sm font-semibold text-black">Situação da conta</h3>
        <p className="mb-3 text-xs text-black/60">
          {disabledAt
            ? `Desativada em ${new Date(disabledAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })}.`
            : "Ativa: o cliente entra e marca horários normalmente."}
        </p>
        <ActiveToggle customerId={customerId} disabled={Boolean(disabledAt)} upcoming={upcoming} />
      </div>
      <div className="border-t border-black/10 pt-5">
        <h3 className="text-sm font-semibold text-black">Excluir dados</h3>
        <p className="mb-3 text-xs text-black/60">Quando o cliente pede para apagar o cadastro. Remove tudo de vez.</p>
        <DeleteData customerId={customerId} name={customerName} />
      </div>
    </div>
  );
}

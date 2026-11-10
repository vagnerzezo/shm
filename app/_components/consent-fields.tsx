import type { Consent } from "@/app/_lib/db";

/** Autorizações de marketing, usadas no cadastro e em "Meus dados". Desmarcadas por padrão. */
export function ConsentFields({ consent }: { consent?: Consent }) {
  const box = "mt-0.5 size-4 shrink-0 accent-[#121212]";
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 block text-sm font-semibold text-black">Comunicações do estúdio</legend>
      <label className="flex items-start gap-3 text-sm text-black">
        <input type="checkbox" name="aceita_email" defaultChecked={consent?.email} className={box} />
        Quero receber e-mails com lembretes e novidades.
      </label>
      <label className="flex items-start gap-3 text-sm text-black">
        <input type="checkbox" name="aceita_mensagem" defaultChecked={consent?.mensagem} className={box} />
        Quero receber mensagens do estúdio no chat.
      </label>
    </fieldset>
  );
}

"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Classes do contêiner (margens ficam aqui, não no campo, para o botão alinhar ao campo). */
  wrapperClassName?: string;
  /** Controle de fora (ex.: "Gerar senha" já mostra o que gerou). Sem isso, cada campo guarda o seu. */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
};

/** Campo de senha com o botão de olho para mostrar ou ocultar o que foi digitado. */
export function PasswordInput({ className, wrapperClassName, visible, onVisibleChange, ...props }: Props) {
  const [ownVisible, setOwnVisible] = useState(false);
  const shown = visible ?? ownVisible;
  const toggle = () => {
    setOwnVisible(!shown);
    onVisibleChange?.(!shown);
  };
  const Icon = shown ? EyeOff : Eye;

  return (
    <span className={cn("relative block", wrapperClassName)}>
      <input {...props} type={shown ? "text" : "password"} className={cn(className, "pr-12")} />
      <button
        type="button"
        onClick={toggle}
        aria-label={shown ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[inherit] text-black/55 transition-colors hover:text-black focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-black"
      >
        <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
      </button>
    </span>
  );
}

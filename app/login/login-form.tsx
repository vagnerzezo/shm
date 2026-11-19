"use client";

import { useActionState, type InputHTMLAttributes } from "react";
import { ConsentFields } from "../_components/consent-fields";
import { PasswordInput } from "../_components/password-input";
import { LockIcon } from "../_components/icons";
import { signIn, signUp } from "../_lib/actions";

export type Variant = "desktop" | "mobile";

// Computador: campos e botão retos. Celular: o desenho de "Login mobile" (campos
// cinza-claro de 52px, botão em pílula, senha com mostrar/ocultar, +55 no telefone).
export const authFormStyles = {
  desktop: {
    label: "block text-sm font-semibold text-black",
    /** Espaço entre o rótulo e o campo (no contêiner, não no campo). */
    gap: "mt-2",
    input:
      "h-12 w-full rounded-lg border border-black/20 bg-white px-4 text-sm text-black placeholder:text-black/50 focus:border-black focus:outline-none",
    button:
      "mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#121212] font-semibold text-white transition hover:bg-black/80 disabled:cursor-wait disabled:opacity-70",
  },
  mobile: {
    label: "block text-[13px] font-semibold text-[#222]",
    gap: "mt-1.5",
    input:
      "h-[52px] w-full rounded-[14px] border-[1.5px] border-[#dcdcdc] bg-[#f5f5f5] px-4 text-[15px] text-[#111] placeholder:text-[#6b6b6b] focus:border-[#111] focus:bg-white focus:outline-none",
    button:
      "mt-2 flex h-14 w-full items-center justify-center rounded-full bg-[#111] text-base font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition hover:bg-black/85 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-black disabled:cursor-wait disabled:opacity-70",
  },
} satisfies Record<Variant, Record<string, string>>;
const styles = authFormStyles;

function Field({
  label,
  variant,
  prefix,
  type,
  className,
  ...props
}: {
  label: string;
  variant: Variant;
  /** Texto fixo antes do valor (ex.: "+55"). */
  prefix?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const s = styles[variant];
  if (type === "password") {
    return (
      <label className="block">
        <span className={s.label}>{label}</span>
        <PasswordInput required wrapperClassName={s.gap} className={`${s.input} ${className ?? ""}`} {...props} />
      </label>
    );
  }
  return (
    <label className="block">
      <span className={s.label}>{label}</span>
      <span className={`relative block ${s.gap}`}>
        {prefix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-4 flex items-center gap-2.5 text-[15px] font-medium text-[#111]"
          >
            {prefix}
            <span className="h-[22px] w-px bg-[#cfcfcf]" />
          </span>
        )}
        <input required type={type} className={`${s.input} ${prefix ? "pl-[70px]" : ""} ${className ?? ""}`} {...props} />
      </span>
    </label>
  );
}

export function LoginForm({
  mode,
  next,
  variant = "desktop",
}: {
  mode: "entrar" | "cadastro";
  next: string;
  variant?: Variant;
}) {
  const signingUp = mode === "cadastro";
  const mobile = variant === "mobile";
  const [state, action, pending] = useActionState(signingUp ? signUp : signIn, { error: null });

  return (
    <form action={action} className={mobile ? "flex flex-col gap-3.5" : "mt-6 flex flex-col gap-4"}>
      <input type="hidden" name="next" value={next} />

      {signingUp && (
        <>
          <Field
            variant={variant}
            label="Nome"
            name="nome"
            minLength={2}
            autoComplete="name"
            placeholder={mobile ? "Seu nome completo" : undefined}
          />
          <Field
            variant={variant}
            label="Telefone / WhatsApp"
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete={mobile ? "tel-national" : "tel"}
            placeholder="(51) 99999-9999"
            prefix={mobile ? "+55" : undefined}
          />
        </>
      )}
      <Field
        variant={variant}
        label="E-mail"
        name="email"
        type="email"
        maxLength={120}
        autoComplete="email"
        placeholder={mobile ? "voce@email.com" : "voce@exemplo.com"}
      />
      <Field
        variant={variant}
        label="Senha"
        name="senha"
        type="password"
        minLength={signingUp ? 8 : undefined}
        autoComplete={signingUp ? "new-password" : "current-password"}
        placeholder={signingUp ? "Mínimo de 8 caracteres" : undefined}
      />
      {signingUp && <ConsentFields />}

      {state.error && (
        <p role="alert" className={`${mobile ? "rounded-[14px]" : "rounded-lg"} bg-red-50 px-4 py-3 text-sm font-medium text-red-800`}>
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={styles[variant].button}>
        {!mobile && <LockIcon className="size-4" />}
        {pending ? "Aguarde..." : signingUp ? "Criar conta" : "Entrar"}
      </button>
    </form>
  );
}

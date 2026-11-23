"use client";

import { useActionState, type InputHTMLAttributes } from "react";
import { ConsentFields } from "../_components/consent-fields";
import { PasswordInput } from "../_components/password-input";
import { LockIcon } from "../_components/icons";
import { signIn, signUp } from "../_lib/actions";
import { authFormStyles, type Variant } from "./auth-form-styles";

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
  // Depois de um erro, o React limpa o formulário; estes valores o preenchem de novo (a senha não volta).
  const typed = state.values ?? {};

  return (
    <form action={action} className={mobile ? "flex flex-col gap-3.5" : "mt-6 flex flex-col gap-4"}>
      <input type="hidden" name="next" value={next} />

      {signingUp && (
        <>
          <Field
            variant={variant}
            label="Nome"
            name="nome"
            defaultValue={typed.nome}
            minLength={2}
            autoComplete="name"
            placeholder={mobile ? "Seu nome completo" : undefined}
          />
          <Field
            variant={variant}
            label="Telefone / WhatsApp"
            name="telefone"
            defaultValue={typed.telefone}
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
        defaultValue={typed.email}
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
      {signingUp && (
        <ConsentFields
          {...(state.values && { consent: { email: typed.aceita_email === "on", mensagem: typed.aceita_mensagem === "on" } })}
        />
      )}

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

"use client";

import type { ComponentProps } from "react";

/** `<select>` que envia o próprio formulário ao trocar (filtros sem botão "Aplicar"). */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

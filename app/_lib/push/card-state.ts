// Situação do cartão "Avisos no celular". Função pura: o componente
// (app/_components/push-card.tsx) lê o navegador e chama esta.

export type PushCardEnv = {
  /** As chaves estão configuradas no servidor. */
  enabled: boolean;
  /** O navegador tem service worker, PushManager e Notification. */
  supported: boolean;
  ios: boolean;
  /** Aberto como app instalado. */
  standalone: boolean;
  permission: "default" | "granted" | "denied";
  /** Este aparelho está inscrito nesta sessão (navegador e servidor concordam). */
  subscribed: boolean;
};

export type PushCardState = "indisponivel" | "sem-suporte" | "instalar-ios" | "bloqueado" | "ligado" | "desligado";

export function pushCardState(env: PushCardEnv): PushCardState {
  if (!env.enabled) return "indisponivel";
  // No iPhone, avisos só com o app instalado na tela de início (iOS 16.4+).
  if (env.ios && !env.standalone) return "instalar-ios";
  if (!env.supported) return "sem-suporte";
  if (env.permission === "denied") return "bloqueado";
  if (env.subscribed) return "ligado";
  return "desligado";
}

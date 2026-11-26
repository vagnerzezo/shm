// Decide se a faixa "Instale o app do estúdio" aparece, e qual. Função pura:
// o componente (app/_components/install-banner.tsx) lê o navegador e chama esta.

export type InstallEnv = {
  userAgent: string;
  maxTouchPoints: number;
  /** Já aberto como app instalado (display-mode standalone ou navigator.standalone). */
  standalone: boolean;
  /** Tocou "Agora não" neste aparelho. */
  dismissed: boolean;
  /** O navegador ofereceu a instalação (evento beforeinstallprompt). */
  hasPrompt: boolean;
};

export type InstallBanner = "android" | "ios" | null;

export const DISMISS_KEY = "shm:pwa-dispensado";

export function installBannerFor(env: InstallEnv): InstallBanner {
  if (env.standalone || env.dismissed) return null;
  const ua = env.userAgent;
  if (isIOS(ua, env.maxTouchPoints)) {
    // Navegador de dentro de outro app (Instagram, Facebook, Google, TikTok,
    // LinkedIn, Line, Snapchat, X) não deixa adicionar à tela de início.
    if (/Instagram|FBAN|FBAV|GSA\/|BytedanceWebview|musical_ly|LinkedInApp|Line\/|Snapchat|Twitter/.test(ua)) return null;
    return "ios";
  }
  if (/Android/.test(ua) && env.hasPrompt) return "android";
  return null;
}

/** iPhone, iPod ou iPad. O iPadOS se apresenta como Mac; o toque denuncia. */
export function isIOS(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

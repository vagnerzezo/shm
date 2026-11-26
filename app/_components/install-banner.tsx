"use client";

import { useEffect, useState } from "react";
import { DISMISS_KEY, installBannerFor, type InstallBanner as Kind } from "@/app/_lib/install-banner";
import { linkButton, primaryButton } from "./ui";

// Faixa "Instale o app do estúdio", no alto das áreas logadas, só no celular.

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

// O Chrome avisa que dá para instalar uma vez por carregamento de página, e
// isso pode acontecer no /login, antes de a faixa existir. Por isso o aviso é
// guardado aqui, no nível do módulo, que o layout raiz carrega em toda página
// (via <InstallPromptCatcher />).
let savedPrompt: PromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    savedPrompt = e as PromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    savedPrompt = null;
    notify();
  });
}

/** Só carrega este módulo em toda página, para não perder o aviso de instalação. */
export function InstallPromptCatcher() {
  return null;
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function saveDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Sem armazenamento: a faixa só some até recarregar.
  }
}

export function InstallBanner() {
  // Começa vazia: servidor e navegador montam o mesmo HTML.
  const [kind, setKind] = useState<Kind>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const update = () => {
      const nav = navigator as Navigator & { standalone?: boolean };
      setKind(
        installBannerFor({
          userAgent: nav.userAgent,
          maxTouchPoints: nav.maxTouchPoints ?? 0,
          standalone: installed || matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
          dismissed: readDismissed(),
          hasPrompt: savedPrompt !== null,
        }),
      );
    };
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  if (!kind || closed) return null;

  const dismiss = () => {
    saveDismissed();
    setClosed(true);
  };

  const install = async () => {
    const prompt = savedPrompt;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    savedPrompt = null;
    setClosed(true);
  };

  return (
    <div
      role="region"
      aria-label="Instalar o app"
      className="mb-4 flex shrink-0 flex-col gap-3 rounded-xl border border-black/10 bg-white/85 p-4 lg:hidden"
    >
      <div>
        <p className="text-sm font-semibold text-black">Instale o app do estúdio</p>
        {kind === "ios" && (
          <p className="mt-1 text-sm text-black/70">
            Toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {kind === "android" && (
          <button type="button" onClick={install} className={primaryButton}>
            Instalar
          </button>
        )}
        <button type="button" onClick={dismiss} className={linkButton}>
          Agora não
        </button>
      </div>
    </div>
  );
}

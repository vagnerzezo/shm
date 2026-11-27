"use client";

import { useEffect, useState } from "react";
import { isIOS } from "@/app/_lib/install-banner";
import { pushSubscriptionStatus, subscribePush, unsubscribePush } from "@/app/_lib/push/actions";
import { pushCardState, type PushCardState } from "@/app/_lib/push/card-state";
import { ensureSubscription } from "@/app/_lib/push/ensure-subscription";
import { card, FormError, primaryButton, secondaryButton } from "./ui";

// Cartão "Avisos no celular" (Meus dados do barbeiro e Perfil do admin).

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

/** Lê o navegador e o servidor e diz em que situação o cartão está. */
async function readState(publicKey: string | null): Promise<PushCardState> {
  const nav = navigator as Navigator & { standalone?: boolean };
  const env = {
    enabled: Boolean(publicKey),
    supported: supported(),
    ios: isIOS(nav.userAgent, nav.maxTouchPoints ?? 0),
    standalone: matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
    permission: (supported() ? Notification.permission : "default") as NotificationPermission,
    subscribed: false,
  };
  const first = pushCardState(env);
  if (first !== "desligado") return first;
  // Só confere: o service worker é instalado ao tocar em "Ativar".
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  // Ligado só se o servidor ainda tem esta inscrição para esta sessão (sair e entrar apaga).
  env.subscribed = Boolean(sub && (await pushSubscriptionStatus(sub.endpoint)));
  return pushCardState(env);
}

export function PushCard({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<PushCardState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    readState(publicKey)
      .then((s) => alive && setState(s))
      .catch(() => alive && setState("sem-suporte"));
    return () => {
      alive = false;
    };
  }, [publicKey]);

  const activate = async () => {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "bloqueado" : "desligado");
        return;
      }
      await registration();
      // Inscrever pede um service worker ativo.
      const reg = await navigator.serviceWorker.ready;
      const sub = await ensureSubscription(reg.pushManager, pushSubscriptionStatus, urlBase64ToUint8Array(publicKey));
      const result = await subscribePush(sub.toJSON());
      if ("error" in result) setError(result.error);
      else setState("ligado");
    } catch {
      setError("Não foi possível ligar os avisos neste aparelho.");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("desligado");
    } catch {
      setError("Não foi possível desligar os avisos neste aparelho.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${card} p-5`} aria-labelledby="push-card-title">
      <h2 id="push-card-title" className="text-base font-semibold text-black">
        Avisos no celular
      </h2>
      <p className="mt-1 text-sm text-black/70">
        Receba na hora as marcações, remarcações e cancelamentos da sua agenda.
      </p>

      <div className="mt-4 text-sm text-black/80" aria-live="polite">
        {state === null && <p className="text-black/60">Verificando…</p>}
        {state === "indisponivel" && <p>Os avisos no celular ainda não estão disponíveis.</p>}
        {state === "sem-suporte" && <p>Este navegador não recebe avisos.</p>}
        {state === "instalar-ios" && (
          <p>
            Para receber avisos no iPhone, instale o app primeiro: toque em Compartilhar e depois em &quot;Adicionar à
            Tela de Início&quot;. Depois abra o app pela tela de início e ative aqui.
          </p>
        )}
        {state === "bloqueado" && (
          <p>Os avisos estão bloqueados neste aparelho. Libere nas configurações do navegador ou do celular.</p>
        )}
        {state === "desligado" && (
          <button type="button" onClick={activate} disabled={busy} className={primaryButton}>
            Ativar neste aparelho
          </button>
        )}
        {state === "ligado" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold text-black">Avisos ligados neste aparelho.</p>
            <button type="button" onClick={deactivate} disabled={busy} className={secondaryButton}>
              Desativar
            </button>
          </div>
        )}
      </div>
      <FormError message={error} className="mt-3" />
    </section>
  );
}

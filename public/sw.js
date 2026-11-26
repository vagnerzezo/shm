// Service worker dos avisos no celular (Web Push). Só mostra o aviso e abre a
// tela certa ao tocar. Não guarda páginas nem intercepta requisições.

// Assume as abas já abertas, para o toque no aviso conseguir levar a elas.
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Studio Heitor Macks", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const mine = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (mine) {
        try {
          await mine.focus();
          if ("navigate" in mine && (await mine.navigate(url))) return;
        } catch {
          // Janela que este worker não controla: abre uma nova abaixo.
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import sharp from "sharp";
import manifest from "../app/manifest";
import { installBannerFor, type InstallEnv } from "../app/_lib/install-banner";

// App instalável (PWA). Não usa o banco.

describe("manifesto do app", () => {
  test("nome, início e modo de tela", () => {
    const m = manifest();
    assert.equal(m.name, "Studio Heitor Macks");
    assert.equal(m.short_name, "SHM");
    assert.equal(m.start_url, "/");
    assert.equal(m.display, "standalone");
    assert.equal(m.theme_color, "#121212");
    assert.equal(m.background_color, "#121212");
  });

  test("ícones 192, 512 e maskable existem no tamanho certo", async () => {
    const icons = manifest().icons ?? [];
    const wanted = [
      { src: "/icons/icon-192.png", sizes: "192x192", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", purpose: "maskable" },
    ];
    for (const w of wanted) {
      assert.ok(icons.some((i) => i.src === w.src && i.sizes === w.sizes && i.purpose === w.purpose), w.src);
      const meta = await sharp(`public${w.src}`).metadata();
      assert.equal(`${meta.width}x${meta.height}`, w.sizes);
    }
    const apple = await sharp("app/apple-icon.png").metadata();
    assert.equal(`${apple.width}x${apple.height}`, "180x180");
  });
});

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPAD =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const INSTAGRAM_IOS = IPHONE + " Instagram 350.0.0";
const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const base: InstallEnv = { userAgent: IPHONE, maxTouchPoints: 5, standalone: false, dismissed: false, hasPrompt: false };

describe("faixa de instalar", () => {
  test("iPhone no Safari vê a instrução", () => assert.equal(installBannerFor(base), "ios"));
  test("iPad (se diz Mac, mas tem toque) vê a instrução", () =>
    assert.equal(installBannerFor({ ...base, userAgent: IPAD, maxTouchPoints: 5 }), "ios"));
  test("Mac de verdade não vê", () =>
    assert.equal(installBannerFor({ ...base, userAgent: IPAD, maxTouchPoints: 0 }), null));
  test("Android com pedido de instalação vê o botão", () =>
    assert.equal(installBannerFor({ ...base, userAgent: ANDROID, hasPrompt: true }), "android"));
  test("Android sem pedido de instalação não vê", () =>
    assert.equal(installBannerFor({ ...base, userAgent: ANDROID }), null));
  test("computador não vê, mesmo com pedido", () =>
    assert.equal(installBannerFor({ ...base, userAgent: DESKTOP, maxTouchPoints: 0, hasPrompt: true }), null));
  test("já instalado não vê", () => assert.equal(installBannerFor({ ...base, standalone: true }), null));
  test('depois de "Agora não" não vê', () => assert.equal(installBannerFor({ ...base, dismissed: true }), null));
  test("navegador do Instagram/Facebook no iPhone não vê", () => {
    assert.equal(installBannerFor({ ...base, userAgent: INSTAGRAM_IOS }), null);
    assert.equal(installBannerFor({ ...base, userAgent: IPHONE + " [FBAN/FBIOS;FBAV/450.0]" }), null);
  });
});

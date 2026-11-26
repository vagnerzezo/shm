import assert from "node:assert/strict";
import { describe, test } from "node:test";
import sharp from "sharp";
import manifest from "../app/manifest";

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

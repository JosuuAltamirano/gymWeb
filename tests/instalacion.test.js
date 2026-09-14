/* Instalarla en el móvil. iOS no lee iconos SVG: si el apple-touch-icon no es
   un PNG de verdad, "Añadir a pantalla de inicio" pone una captura borrosa.
   Los iconos se generan con tools/iconos.js, así que esto también comprueba
   que lo generado y lo declarado no se han separado. */

const { test, describe } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const raiz = path.join(__dirname, "..");
const leer = (f) => fs.readFileSync(path.join(raiz, f));
const texto = (f) => leer(f).toString("utf8");

// Cabecera PNG: firma + IHDR con el ancho y el alto.
function medidasPNG(archivo) {
  const b = leer(archivo);
  const firma = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(b.subarray(0, 8).equals(firma), archivo + " no es un PNG");
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
}

describe("Instalación en el móvil", () => {
  test("el apple-touch-icon es un PNG de 180x180", () => {
    const html = texto("index.html");
    const m = html.match(/rel="apple-touch-icon"[^>]*href="([^"]+)"/);
    assert.ok(m, "falta el apple-touch-icon");
    assert.ok(m[1].endsWith(".png"), "iOS ignora el SVG: " + m[1]);
    assert.deepEqual(medidasPNG(m[1]), { ancho: 180, alto: 180 });
  });

  test("los iconos del manifest existen y miden lo que dicen", () => {
    const manifest = JSON.parse(texto("manifest.json"));
    const png = manifest.icons.filter((i) => i.type === "image/png");
    assert.ok(png.length >= 2, "hacen falta PNG para Android y para el escritorio");
    png.forEach((i) => {
      const lado = Number(i.sizes.split("x")[0]);
      assert.deepEqual(medidasPNG(i.src), { ancho: lado, alto: lado }, i.src);
    });
    assert.ok(manifest.icons.some((i) => i.purpose === "maskable"), "falta el maskable");
  });

  test("el service worker guarda todo lo que la web necesita para arrancar", () => {
    const sw = texto("sw.js");
    const manifest = JSON.parse(texto("manifest.json"));
    ["./index.html", "./css/estilos.css", "./js/app.js", "./js/db.js",
      "./js/datos.js", "./js/avisos.js", "./manifest.json"].forEach((f) => {
      assert.ok(sw.includes(`"${f}"`), "el sw no cachea " + f);
    });
    manifest.icons.forEach((i) => {
      assert.ok(sw.includes(`"./${i.src}"`), "el sw no cachea " + i.src);
    });
  });

  test("el color del navegador es el mismo que el de la web", () => {
    const css = texto("css/estilos.css");
    const fondo = css.match(/--bg:\s*(#[0-9A-Fa-f]{6})/)[1].toUpperCase();
    const html = texto("index.html");
    const tema = html.match(/name="theme-color" content="(#[0-9A-Fa-f]{6})"/)[1].toUpperCase();
    const manifest = JSON.parse(texto("manifest.json"));
    assert.equal(tema, fondo, "la barra del navegador no pega con la web");
    assert.equal(manifest.theme_color.toUpperCase(), fondo);
    assert.equal(manifest.background_color.toUpperCase(), fondo);
  });

  test("el generador de iconos vuelve a dar exactamente los mismos archivos", () => {
    const antes = ["icon-180.png", "icon-192.png", "icon-512.png", "icon-512-maskable.png"]
      .map((f) => leer(f).toString("base64"));
    require("node:child_process").execFileSync(process.execPath,
      [path.join(raiz, "tools", "iconos.js")], { stdio: "ignore" });
    const despues = ["icon-180.png", "icon-192.png", "icon-512.png", "icon-512-maskable.png"]
      .map((f) => leer(f).toString("base64"));
    assert.deepEqual(despues, antes, "los PNG del repo no salen de tools/iconos.js");
  });

  test("la barra de estado del iPhone no tapa el título", () => {
    const css = texto("css/estilos.css");
    const topbar = css.slice(css.indexOf("#topbar{"), css.indexOf("#topbar .row"));
    assert.match(topbar, /safe-area-inset-top/);
  });
});

/* El iPhone descarta la pestaña en cuanto abres otra app. Al volver, la web
   tiene que dejarte donde estabas: entre series, no en la pantalla de inicio. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp, completarEjercicio } = require("./ayuda");

describe("Volver a una sesión a medias", () => {
  let app;
  before(async () => { app = await abrirApp("2026-11-24T06:05:00"); });   // martes
  after(async () => { await app.cerrar(); });

  test("al reabrir la web sigues en la sesión", async () => {
    await app.pagina.click("#btnEmpezar");
    await app.pagina.waitForSelector("#screen-sesion.active");
    await completarEjercicio(app.pagina, 0, 40, 8);
    await app.pagina.waitForTimeout(300);

    await app.recargar();
    await app.pagina.waitForSelector("#screen-sesion.active");
    const activa = await app.pagina.$$eval(".navbtn.active", (n) => n[0].dataset.screen);
    assert.equal(activa, "sesion", "la pestaña de abajo también");
  });

  test("y las series marcadas siguen marcadas", async () => {
    const marcadas = await app.pagina.$$eval(".chk.on", (n) => n.length);
    assert.ok(marcadas > 0, "no se pierde lo apuntado");
  });

  test("una sesión de otro día no te secuestra la pantalla", async () => {
    await app.viajarA("2026-11-26T07:00:00");
    await app.pagina.waitForSelector("#screen-hoy.active");
    const activa = await app.pagina.$$eval(".navbtn.active", (n) => n[0].dataset.screen);
    assert.equal(activa, "hoy");
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

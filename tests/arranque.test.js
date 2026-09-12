/* Días previos al 22 de septiembre: la web tiene que servir ya, no solo
   enseñar un calendario. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp } = require("./ayuda");

describe("Días de arranque", () => {
  let app;
  before(async () => { app = await abrirApp("2026-09-12T18:00:00"); });
  after(async () => { await app.cerrar(); });

  test("cuenta los días que faltan para empezar el plan", async () => {
    const texto = await app.pagina.textContent("#screen-hoy");
    assert.match(texto.replace(/\s+/g, " "), /10 días para empezar el plan/);
  });

  test("deja registrar el peso inicial", async () => {
    await app.pagina.fill("#pesoRapido", "66");
    await app.pagina.click("#btnPesoRapido");
    await app.pagina.waitForTimeout(300);
    const pesajes = await app.pagina.evaluate(() => Datos.pesajes.length);
    assert.equal(pesajes, 1);
  });

  test("deja marcar la foto del día 1", async () => {
    await app.pagina.click("#btnFotoDia1");
    await app.pagina.waitForTimeout(300);
    const fecha = await app.pagina.evaluate(() => Datos.ajustes.fotos.ultimaFecha);
    assert.equal(fecha, "2026-09-12");
  });

  test("los hitos del calendario se marcan y se guardan", async () => {
    await app.pagina.click('[data-hito="3"]');
    await app.pagina.waitForTimeout(300);
    await app.recargar();
    const marcado = await app.pagina.textContent('[data-hito="3"]');
    assert.match(marcado, /✓/);
  });

  test("permite hacer las sesiones suaves del 15 y el 16", async () => {
    await app.pagina.click("#btnOtraSesion");
    await app.pagina.waitForTimeout(200);
    await app.pagina.click('[data-sesion="martes"]');
    await app.pagina.waitForTimeout(300);
    const sesion = await app.pagina.textContent("#screen-sesion");
    assert.match(sesion, /EMPUJE/);
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

/* Equivocarse apuntando pasa. Sin poder corregir, un 400 en vez de un 40
   envenena el récord, el volumen y las gráficas para siempre. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp, sembrarSesiones } = require("./ayuda");

describe("Corregir lo ya guardado", () => {
  let app;

  before(async () => {
    app = await abrirApp("2026-11-24T09:00:00");
    await sembrarSesiones(app.pagina, [
      { fecha: "2026-11-17", nombre: "EMPUJE", volumen: 1000, ejercicios: [
        { ejercicioId: "press_banca", series: [{ peso: 40, repes: 8 }, { peso: 400, repes: 8 }] }] },
      { fecha: "2026-11-23", nombre: "PIERNA A", volumen: 600, ejercicios: [
        { ejercicioId: "sentadilla", series: [{ peso: 60, repes: 6 }] }] }
    ]);
    await app.pagina.click('[data-screen="progreso"]');
    await app.pagina.waitForSelector("#screen-progreso.active");
  });

  after(async () => { await app.cerrar(); });

  test("el error se ve en el récord antes de corregirlo", async () => {
    assert.match(await app.pagina.textContent("#screen-progreso"), /400 kg/);
  });

  test("se puede abrir una sesión pasada y ver sus series", async () => {
    await app.pagina.click('[data-sesion-id]:last-child');
    await app.pagina.waitForSelector(".sheet");
    const texto = await app.pagina.textContent(".sheet");
    assert.match(texto, /EMPUJE/);
    assert.equal((await app.pagina.$$("[data-editar-peso]")).length, 2);
  });

  test("corregir el peso arregla el récord y el volumen", async () => {
    const inputs = await app.pagina.$$("[data-editar-peso]");
    await inputs[1].fill("40");
    await app.pagina.click("#mGuardarSesion");
    await app.pagina.waitForTimeout(400);

    const texto = await app.pagina.textContent("#screen-progreso");
    assert.doesNotMatch(texto, /400 kg/, "el récord ya no está envenenado");

    const sesion = await app.pagina.evaluate(() =>
      Datos.sesiones.find((s) => s.fecha === "2026-11-17"));
    assert.equal(sesion.volumen, 640, "el volumen se recalcula: 40x8 + 40x8");
  });

  test("se puede borrar una serie suelta", async () => {
    await app.pagina.click('[data-sesion-id]:last-child');
    await app.pagina.waitForSelector(".sheet");
    await app.pagina.click("[data-borrar-serie]");
    await app.pagina.waitForTimeout(400);
    const series = await app.pagina.evaluate(() =>
      Datos.series.filter((s) => s.fecha === "2026-11-17").length);
    assert.equal(series, 1);
  });

  test("se puede guardar una nota en una sesión", async () => {
    await app.pagina.click('[data-sesion-id]:last-child');
    await app.pagina.waitForSelector("#notaSesion");
    await app.pagina.fill("#notaSesion", "Hombro molesta al bajar");
    await app.pagina.click("#mGuardarSesion");
    await app.pagina.waitForTimeout(400);
    const nota = await app.pagina.evaluate(() =>
      Datos.sesiones.find((s) => s.fecha === "2026-11-17").nota);
    assert.equal(nota, "Hombro molesta al bajar");
  });

  test("borrar una sesión se lleva sus series, sin dejar huérfanas", async () => {
    await app.pagina.click('[data-sesion-id]:last-child');
    await app.pagina.waitForSelector("#mBorrarSesion");
    await app.pagina.click("#mBorrarSesion");
    await app.pagina.waitForTimeout(400);
    const estado = await app.pagina.evaluate(() => ({
      sesiones: Datos.sesiones.length,
      huerfanas: Datos.series.filter((s) =>
        !Datos.sesiones.some((x) => x.id === s.sesionId)).length
    }));
    assert.equal(estado.sesiones, 1);
    assert.equal(estado.huerfanas, 0);
  });

  test("se puede borrar un pesaje mal metido", async () => {
    await app.pagina.evaluate(() => Datos.añadirPesaje("2026-11-24", 690));
    await app.pagina.evaluate(() => RENDERERS.progreso());
    await app.pagina.click("summary:has-text('Corregir pesajes')");
    await app.pagina.click("[data-borrar-pesaje]");
    await app.pagina.waitForTimeout(300);
    const pesajes = await app.pagina.evaluate(() => Datos.pesajes.length);
    assert.equal(pesajes, 0);
  });

  test("las correcciones sobreviven a recargar", async () => {
    await app.recargar();
    const estado = await app.pagina.evaluate(() => ({
      sesiones: Datos.sesiones.length,
      series: Datos.series.length
    }));
    assert.equal(estado.sesiones, 1);
    assert.equal(estado.series, 1);
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

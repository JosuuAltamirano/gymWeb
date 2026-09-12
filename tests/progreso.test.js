/* Progreso: cifras, récords y lo que la báscula tiene que decir. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp, sembrarSesiones, sembrarPesajes } = require("./ayuda");

describe("Progreso", () => {
  let app;

  before(async () => {
    app = await abrirApp("2026-11-24T09:00:00");
    await sembrarSesiones(app.pagina, [
      { fecha: "2026-11-02", volumen: 2400, ejercicios: [
        { ejercicioId: "press_banca", series: [{ peso: 40, repes: 8 }, { peso: 40, repes: 7 }] }] },
      { fecha: "2026-11-09", volumen: 2600, ejercicios: [
        { ejercicioId: "press_banca", series: [{ peso: 42.5, repes: 7 }, { peso: 42.5, repes: 6 }] }] },
      { fecha: "2026-11-16", volumen: 2800, ejercicios: [
        { ejercicioId: "press_banca", series: [{ peso: 45, repes: 6 }] },
        { ejercicioId: "dominadas", series: [{ peso: 0, repes: 9 }] }] },
      { fecha: "2026-11-23", volumen: 3000, ejercicios: [
        { ejercicioId: "sentadilla", series: [{ peso: 70, repes: 6 }] }] }
    ]);
    await app.pagina.click('[data-screen="progreso"]');
    await app.pagina.waitForSelector("#screen-progreso.active");
  });

  after(async () => { await app.cerrar(); });

  test("resume sesiones, media semanal y carga movida", async () => {
    const texto = (await app.pagina.textContent("#screen-progreso")).replace(/\s+/g, " ");
    assert.match(texto, /4 SESIONES/i);
    assert.match(texto, /4 en 4 semanas/);
    assert.match(texto, /1,0 POR SEMANA/i);
  });

  test("los récords de ejercicios a peso corporal no rompen la fecha", async () => {
    const texto = await app.pagina.textContent("#screen-progreso");
    assert.match(texto, /Dominadas/);
    assert.doesNotMatch(texto, /undefined/);
  });

  test("el récord muestra peso y repeticiones", async () => {
    assert.match(await app.pagina.textContent("#screen-progreso"), /45 kg × 6/);
  });

  test("si en dos semanas no subes, recuerda comer más", async () => {
    await sembrarPesajes(app.pagina, [["2026-11-10", 68], ["2026-11-24", 68.1]]);
    await app.pagina.evaluate(() => RENDERERS.progreso());
    assert.match(await app.pagina.textContent("#screen-progreso"), /Come más/);
  });

  test("si subes demasiado rápido, avisa de frenar", async () => {
    await sembrarPesajes(app.pagina, [["2026-11-10", 66], ["2026-11-24", 69]]);
    await app.pagina.evaluate(() => RENDERERS.progreso());
    assert.match(await app.pagina.textContent("#screen-progreso"), /Frena un poco|subiendo/i);
  });

  test("el consejo caduca: sin pesajes recientes no dice nada", async () => {
    await app.viajarA("2026-12-20T09:00:00");
    await app.pagina.click('[data-screen="progreso"]');
    await app.pagina.waitForSelector("#screen-progreso.active");
    const texto = await app.pagina.textContent("#screen-progreso");
    assert.doesNotMatch(texto, /Come más/);
  });

  test("exportar e importar devuelve los datos tal cual", async () => {
    const copia = await app.pagina.evaluate(() => JSON.stringify(Datos.instantanea()));
    await app.pagina.evaluate(() => {
      Datos.sesiones = []; Datos.series = []; Datos.pesajes = [];
    });
    await app.pagina.evaluate((json) => new Promise((r) => {
      Datos.importar(JSON.parse(json), r);
    }), copia);
    const sesiones = await app.pagina.evaluate(() => Datos.sesiones.length);
    assert.equal(sesiones, 4);
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

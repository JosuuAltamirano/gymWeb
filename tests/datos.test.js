/* La base de datos: migración desde el formato antiguo y resistencia a que
   el navegador borre cosas. Aquí es donde se juega no perder un año de trabajo. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp } = require("./ayuda");

const FORMATO_ANTIGUO = {
  modo: "normal",
  pesoLog: [{ fecha: "2026-11-10", kg: 68.2 }, { fecha: "2026-11-17", kg: 68.8 }],
  historial: {
    press_banca: [{ fecha: "2026-11-17", series: [{ peso: 40, repes: 8 }, { peso: 40, repes: 8 }] }],
    sentadilla: [{ fecha: "2026-11-16", series: [{ peso: 60, repes: 6 }] }]
  },
  sesionesHechas: [{ fecha: "2026-11-17", nombre: "EMPUJE", diaKey: "martes" }],
  medidas: [{ fecha: "2026-11-01", brazo: "32" }],
  subirPeso: { press_banca: { desde: 40, hasta: 42.5 } },
  fotos: { ultimaFecha: "2026-11-01" }
};

describe("Base de datos", () => {
  let app;
  before(async () => { app = await abrirApp("2026-11-24T09:00:00"); });
  after(async () => { await app.cerrar(); });

  test("migra el formato antiguo reconstruyendo sesiones y series", async () => {
    await app.pagina.evaluate((viejo) => {
      localStorage.setItem("gymapp_v1", JSON.stringify(viejo));
    }, FORMATO_ANTIGUO);
    // Vaciar la base obliga a que la migración entre al recargar.
    await app.pagina.evaluate(() => new Promise((r) => {
      const tx = Datos.bd.transaction(["sesiones", "series", "pesajes"], "readwrite");
      tx.objectStore("sesiones").clear();
      tx.objectStore("series").clear();
      tx.objectStore("pesajes").clear();
      tx.oncomplete = r; tx.onerror = r;
    }));
    await app.recargar();

    const estado = await app.pagina.evaluate(() => ({
      sesiones: Datos.sesiones.length,
      series: Datos.series.length,
      pesajes: Datos.pesajes.length,
      medidas: Datos.medidas.length,
      sugerencia: Datos.ajustes.subirPeso.press_banca
    }));
    assert.equal(estado.sesiones, 2, "dos fechas distintas = dos sesiones");
    assert.equal(estado.series, 3);
    assert.equal(estado.pesajes, 2);
    assert.equal(estado.medidas, 1);
    assert.deepEqual(estado.sugerencia, { desde: 40, hasta: 42.5 });
  });

  test("no vuelve a migrar ni duplica al abrir otra vez", async () => {
    await app.recargar();
    const series = await app.pagina.evaluate(() => Datos.series.length);
    assert.equal(series, 3);
  });

  test("el bloque antiguo no se borra", async () => {
    const sigue = await app.pagina.evaluate(() => !!localStorage.getItem("gymapp_v1"));
    assert.ok(sigue, "es la única copia de los datos previos");
  });

  test("los datos sobreviven a que el navegador vacíe localStorage", async () => {
    await app.pagina.evaluate(() => localStorage.clear());
    await app.recargar();
    const series = await app.pagina.evaluate(() => Datos.series.length);
    assert.equal(series, 3);
  });

  test("se reconstruye desde la copia de rescate si se vacía la base", async () => {
    await app.pagina.evaluate(() => new Promise((r) => {
      const tx = Datos.bd.transaction(["sesiones", "series", "pesajes"], "readwrite");
      tx.objectStore("sesiones").clear();
      tx.objectStore("series").clear();
      tx.objectStore("pesajes").clear();
      tx.oncomplete = r; tx.onerror = r;
    }));
    await app.recargar();
    const series = await app.pagina.evaluate(() => Datos.series.length);
    assert.ok(series > 0, "la copia de rescate en localStorage devuelve los datos");
  });

  test("consultar el histórico de un ejercicio usa las filas, no un bloque", async () => {
    const historial = await app.pagina.evaluate(() => Datos.historialDe("press_banca"));
    assert.equal(historial.length, 1);
    assert.equal(historial[0].series.length, 2);
    assert.equal(historial[0].fecha, "2026-11-17");
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

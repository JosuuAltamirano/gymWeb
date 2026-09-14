/* Auditoría de la base de datos con un año entero de datos encima.
   No comprueba que la app "funcione": comprueba que los datos son
   consistentes, que no se pierde nada por el camino y que sigue rápida
   cuando hay historial de verdad. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp } = require("./ayuda");

// Un año a 4 sesiones por semana, como el plan real.
const SEMANAS = 52;
const SESIONES_POR_SEMANA = 4;

describe("Integridad de la base de datos", () => {
  let app, medidas;

  before(async () => {
    app = await abrirApp("2026-11-24T09:00:00");

    medidas = await app.pagina.evaluate(async ({ semanas, porSemana }) => {
      const ejercicios = ["sentadilla", "press_banca", "peso_muerto_rumano",
        "dominadas", "gemelo_pie", "remo_barra"];
      const t0 = performance.now();

      for (let s = 0; s < semanas; s++) {
        for (let d = 0; d < porSemana; d++) {
          const dia = new Date(2025, 10, 24 + s * 7 + d * 2);
          const fecha = dia.toISOString().slice(0, 10);
          const porEjercicio = ejercicios.slice(0, 5).map((id, i) => ({
            ejercicioId: id,
            series: Array.from({ length: 4 }, () => ({
              peso: 40 + s * 0.5 + i * 10,
              repes: 6 + (s % 3)
            }))
          }));
          Datos.registrarSesion({
            fecha, nombre: "EMPUJE", diaKey: "martes", modo: "normal",
            ejercicios: porEjercicio.length, series: 20, rapida: false,
            volumen: 5000, minutos: 72
          }, porEjercicio);
        }
        Datos.añadirPesaje(new Date(2025, 10, 24 + s * 7).toISOString().slice(0, 10), 66 + s * 0.15);
        for (let c = 0; c < 6; c++) {
          Datos.añadirComida({ fecha: new Date(2025, 10, 24 + s * 7).toISOString().slice(0, 10),
            nombre: "Huevo", proteina: 6.5, kcal: 80, hora: "09:00" });
        }
      }
      const msEscritura = performance.now() - t0;

      // Esperar a que las escrituras asíncronas lleguen al disco.
      await new Promise((r) => setTimeout(r, 3000));

      const t1 = performance.now();
      const historial = Datos.historialDe("sentadilla");
      const msHistorial = performance.now() - t1;

      const t2 = performance.now();
      const record = Datos.recordDe("press_banca");
      const msRecord = performance.now() - t2;

      const t3 = performance.now();
      const volumen = Datos.volumenPorSemana(8);
      const msVolumen = performance.now() - t3;

      const t4 = performance.now();
      const copia = JSON.stringify(Datos.instantanea());
      const msCopia = performance.now() - t4;

      return {
        sesiones: Datos.sesiones.length,
        series: Datos.series.length,
        pesajes: Datos.pesajes.length,
        comidas: Datos.comidas.length,
        msEscritura, msHistorial, msRecord, msVolumen, msCopia,
        kbCopia: Math.round(copia.length / 1024),
        historialLargo: historial.length,
        record,
        volumenSemanas: volumen.length
      };
    }, { semanas: SEMANAS, porSemana: SESIONES_POR_SEMANA });

    console.log("    → " + JSON.stringify(medidas, null, 2).replace(/\n/g, "\n    "));
  });

  after(async () => { await app.cerrar(); });

  test("guarda todas las filas que se le piden", () => {
    assert.equal(medidas.sesiones, SEMANAS * SESIONES_POR_SEMANA);
    assert.equal(medidas.series, SEMANAS * SESIONES_POR_SEMANA * 5 * 4);
    assert.equal(medidas.pesajes, SEMANAS);
  });

  test("todo lo escrito está de verdad en disco, no solo en memoria", async () => {
    await app.recargar();
    const enDisco = await app.pagina.evaluate(() => ({
      sesiones: Datos.sesiones.length,
      series: Datos.series.length,
      pesajes: Datos.pesajes.length,
      comidas: Datos.comidas.length
    }));
    assert.deepEqual(enDisco, {
      sesiones: medidas.sesiones,
      series: medidas.series,
      pesajes: medidas.pesajes,
      comidas: medidas.comidas
    }, "lo que enseña la app tiene que ser lo que hay guardado");
  });

  test("no hay series huérfanas ni ids repetidos", async () => {
    const problemas = await app.pagina.evaluate(() => {
      const idsSesion = new Set(Datos.sesiones.map((s) => s.id));
      const huerfanas = Datos.series.filter((s) => !idsSesion.has(s.sesionId)).length;
      const idsSerie = Datos.series.map((s) => s.id);
      const repetidos = idsSerie.length - new Set(idsSerie).size;
      const sinId = Datos.series.filter((s) => s.id == null).length;
      const fechasRaras = Datos.series.filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s.fecha)).length;
      return { huerfanas, repetidos, sinId, fechasRaras };
    });
    assert.deepEqual(problemas, { huerfanas: 0, repetidos: 0, sinId: 0, fechasRaras: 0 });
  });

  test("cada sesión conserva sus 20 series", async () => {
    const mal = await app.pagina.evaluate(() => {
      const porSesion = new Map();
      Datos.series.forEach((s) => porSesion.set(s.sesionId, (porSesion.get(s.sesionId) || 0) + 1));
      return Datos.sesiones.filter((s) => porSesion.get(s.id) !== 20).length;
    });
    assert.equal(mal, 0, "una sesión a medio escribir es una sesión perdida");
  });

  test("las consultas siguen siendo instantáneas con un año dentro", () => {
    assert.ok(medidas.msHistorial < 150, `historial: ${medidas.msHistorial.toFixed(0)} ms`);
    assert.ok(medidas.msRecord < 100, `récord: ${medidas.msRecord.toFixed(0)} ms`);
    assert.ok(medidas.msVolumen < 150, `volumen: ${medidas.msVolumen.toFixed(0)} ms`);
  });

  test("abrir la app con un año de datos no se nota", async () => {
    const ms = await app.pagina.evaluate(() => performance.now());
    await app.recargar();
    const tras = await app.pagina.evaluate(() =>
      performance.now() - (window.performance.timing ? 0 : 0));
    assert.ok(tras < 4000, `arranque: ${tras.toFixed(0)} ms`);
    assert.ok(ms >= 0);
  });

  test("la copia de rescate cabe en localStorage", () => {
    // localStorage ronda los 5 MB por origen.
    assert.ok(medidas.kbCopia < 4000, `la copia ocupa ${medidas.kbCopia} KB`);
  });

  test("exportar e importar no pierde ni cambia nada", async () => {
    const resultado = await app.pagina.evaluate(async () => {
      // El sello de exportación es la hora, no un dato: fuera de la comparación.
      const sinSello = (d) => { const c = { ...d }; delete c.exportado; return JSON.stringify(c); };
      const antes = sinSello(Datos.instantanea());
      const copia = JSON.parse(JSON.stringify(Datos.instantanea()));
      await new Promise((r) => Datos.importar(copia, r));
      const despues = sinSello(Datos.instantanea());
      return {
        iguales: antes === despues,
        sesiones: Datos.sesiones.length,
        series: Datos.series.length
      };
    });
    assert.equal(resultado.sesiones, medidas.sesiones, "importar no debe duplicar");
    assert.equal(resultado.series, medidas.series);
    assert.ok(resultado.iguales, "los datos tienen que volver idénticos");
  });

  test("el histórico de un ejercicio sale agrupado y ordenado", async () => {
    const h = await app.pagina.evaluate(() => {
      const hist = Datos.historialDe("sentadilla");
      const ordenado = hist.every((s, i) => i === 0 || hist[i - 1].fecha <= s.fecha);
      return {
        sesiones: hist.length,
        seriesPorSesion: [...new Set(hist.map((s) => s.series.length))],
        ordenado
      };
    });
    assert.equal(h.sesiones, SEMANAS * SESIONES_POR_SEMANA);
    assert.deepEqual(h.seriesPorSesion, [4], "4 series por sesión, siempre");
    assert.ok(h.ordenado, "de la más antigua a la más reciente");
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

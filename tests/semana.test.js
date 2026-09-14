/* La semana: qué llevas hecho, qué queda y qué se quedó por el camino.
   Jueves 26/11/2026, plan NORMAL: lunes, martes, jueves y domingo. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp, sembrarSesiones } = require("./ayuda");

describe("La semana en HOY", () => {
  let app;
  before(async () => { app = await abrirApp("2026-11-26T19:00:00"); });
  after(async () => { await app.cerrar(); });

  test("sin entrenar aún, dice lo que queda", async () => {
    const texto = await app.pagina.textContent("#screen-hoy");
    assert.match(texto, /0\s*de 4/, "cuenta las sesiones del plan");
    assert.match(texto, /Queda PIERNA B \(jueves\)/);
  });

  test("cuenta lo hecho desde el lunes y marca los días", async () => {
    await sembrarSesiones(app.pagina, [
      { fecha: "2026-11-23", nombre: "PIERNA A", diaKey: "lunes",
        ejercicios: [{ ejercicioId: "sentadilla", series: [{ peso: 60, repes: 8 }] }] },
      { fecha: "2026-11-24", nombre: "EMPUJE", diaKey: "martes",
        ejercicios: [{ ejercicioId: "press_banca", series: [{ peso: 40, repes: 8 }] }] }
    ]);
    await app.pagina.evaluate(() => RENDERERS.hoy());

    const texto = await app.pagina.textContent("#screen-hoy");
    assert.match(texto, /2\s*de 4/);
    const hechos = await app.pagina.$$eval(".semana .dia.hecho", (n) => n.length);
    assert.equal(hechos, 2, "lunes y martes marcados");
  });

  test("lo de la semana pasada no cuenta", async () => {
    await sembrarSesiones(app.pagina, [
      { fecha: "2026-11-19", nombre: "TIRÓN", diaKey: "jueves",
        ejercicios: [{ ejercicioId: "remo_barra", series: [{ peso: 40, repes: 8 }] }] }
    ]);
    await app.pagina.evaluate(() => RENDERERS.hoy());
    assert.match(await app.pagina.textContent("#screen-hoy"), /2\s*de 4/);
  });

  test("avisa de un día del plan que se dejó atrás", async () => {
    // El lunes está hecho; si lo quitamos, el jueves ya es pasado para él.
    await app.pagina.evaluate(() => {
      const lunes = Datos.sesiones.find((s) => s.fecha === "2026-11-23");
      Datos.borrarSesion(lunes.id);
      RENDERERS.hoy();
    });
    const texto = await app.pagina.textContent("#screen-hoy");
    assert.match(texto, /Se quedó sin hacer PIERNA A \(lunes\)/);
    assert.match(texto, /entrenar otra sesión/);
  });

  test("en modo OBRA cuenta los dos días de obra, no cuatro", async () => {
    await app.pagina.evaluate(() => { state.modo = "obra"; RENDERERS.hoy(); });
    assert.match(await app.pagina.textContent("#screen-hoy"), /de 2/);
    await app.pagina.evaluate(() => { state.modo = "normal"; RENDERERS.hoy(); });
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

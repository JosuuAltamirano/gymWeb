/* Comida: el contador tiene que cuadrar, y el día reiniciarse solo. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp } = require("./ayuda");

describe("Contador de comida", () => {
  let app;
  before(async () => {
    app = await abrirApp("2026-11-24T09:00:00");
    await app.pagina.click('[data-screen="comida"]');
    await app.pagina.waitForSelector("#screen-comida.active");
  });
  after(async () => { await app.cerrar(); });

  test("suma proteína y calorías al tocar un alimento", async () => {
    await app.pagina.click('[data-food="0"]'); // 3 huevos: 18 g, 210 kcal
    await app.pagina.waitForTimeout(200);
    const texto = await app.pagina.textContent("#screen-comida");
    assert.match(texto, /18 \/ 130 g/);
    assert.match(texto, /210 kcal/);
  });

  test("al borrar un alimento se restan también las calorías", async () => {
    await app.pagina.click(".item-x");
    await app.pagina.waitForTimeout(200);
    const texto = await app.pagina.textContent("#screen-comida");
    assert.match(texto, /0 \/ 130 g/);
    assert.match(texto, /0 kcal/);
  });

  test("permite anotar comidas que no están en la lista", async () => {
    await app.pagina.click("#btnOtroAlimento");
    await app.pagina.waitForSelector("#mGuardar");
    await app.pagina.fill("#oNombre", "Comida en familia");
    await app.pagina.fill("#oProte", "40");
    await app.pagina.fill("#oKcal", "900");
    await app.pagina.click("#mGuardar");
    await app.pagina.waitForTimeout(300);
    const texto = await app.pagina.textContent("#screen-comida");
    assert.match(texto, /40 \/ 130 g/);
    assert.match(texto, /Comida en familia/);
  });

  test("el contador se reinicia solo al día siguiente", async () => {
    await app.viajarA("2026-11-25T08:00:00");
    await app.pagina.click('[data-screen="comida"]');
    await app.pagina.waitForSelector("#screen-comida.active");
    assert.match(await app.pagina.textContent("#screen-comida"), /0 \/ 130 g/);
  });

  test("lo comido ayer sigue guardado en la base", async () => {
    const ayer = await app.pagina.evaluate(() => Datos.comidasDe("2026-11-24").length);
    assert.equal(ayer, 1);
  });

  test("el contador de HOY refleja lo anotado", async () => {
    await app.pagina.click('[data-screen="comida"]');
    await app.pagina.click('[data-food="2"]'); // 150g pollo: 33 g
    await app.pagina.waitForTimeout(200);
    await app.pagina.click('[data-screen="hoy"]');
    await app.pagina.waitForSelector("#screen-hoy.active");
    assert.match(await app.pagina.textContent("#screen-hoy"), /33 \/ 130 g/);
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

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
    await app.pagina.click('[data-alimento="pollo"]'); // 150 g: 35 g, 175 kcal
    await app.pagina.waitForTimeout(300);
    const texto = await app.pagina.textContent("#screen-comida");
    assert.match(texto, /35 \/ 130 g/);
    assert.match(texto, /175 kcal/);
  });

  test("el buscador filtra sin tildes ni mayúsculas", async () => {
    try {
      await app.pagina.fill("#buscarAlimento", "platano");
      await app.pagina.waitForTimeout(250);
      const lista = await app.pagina.textContent("#listaAlimentos");
      assert.match(lista, /Plátano/, "encuentra el plátano escrito sin tilde");
      // El batido lleva plátano, así que también sale: lo que no debe salir es el resto.
      assert.doesNotMatch(lista, /Pechuga de pollo/);
      assert.doesNotMatch(lista, /Arroz cocido/);
    } finally {
      await app.pagina.fill("#buscarAlimento", "");
      await app.pagina.waitForTimeout(250);
    }
  });

  test("se puede corregir un valor con el de tu etiqueta", async () => {
    await app.pagina.click('[data-editar-alimento="yogur_griego"]');
    await app.pagina.waitForSelector("#alProte");
    await app.pagina.fill("#alProte", "9");
    await app.pagina.fill("#alRacion", "1 ud (150 g)");
    await app.pagina.click("#mGuardarAlimento");
    await app.pagina.waitForTimeout(300);
    const guardado = await app.pagina.evaluate(() =>
      Datos.catalogo().find((a) => a.id === "yogur_griego"));
    assert.equal(guardado.proteina_g, 9);
    assert.equal(guardado.racion, "1 ud (150 g)");
    assert.ok(guardado.propio, "queda marcado como tuyo");
  });

  test("la corrección sobrevive a recargar y se puede deshacer", async () => {
    await app.recargar();
    await app.pagina.click('[data-screen="comida"]');
    await app.pagina.waitForSelector("#listaAlimentos");
    let valor = await app.pagina.evaluate(() =>
      Datos.catalogo().find((a) => a.id === "yogur_griego").proteina_g);
    assert.equal(valor, 9);

    await app.pagina.click('[data-editar-alimento="yogur_griego"]');
    await app.pagina.waitForSelector("#mBorrarAlimento");
    await app.pagina.click("#mBorrarAlimento");
    await app.pagina.waitForTimeout(300);
    valor = await app.pagina.evaluate(() =>
      Datos.catalogo().find((a) => a.id === "yogur_griego").proteina_g);
    assert.equal(valor, 5, "vuelve al valor del catálogo");
  });

  test("se puede guardar un alimento propio que no está en la lista", async () => {
    await app.pagina.click("#btnNuevoAlimento");
    await app.pagina.waitForSelector("#alNombre");
    await app.pagina.fill("#alNombre", "Requesón Hacendado");
    await app.pagina.fill("#alRacion", "1 tarrina (250 g)");
    await app.pagina.fill("#alProte", "28");
    await app.pagina.fill("#alKcal", "245");
    await app.pagina.click("#mGuardarAlimento");
    await app.pagina.waitForTimeout(300);
    assert.match(await app.pagina.textContent("#listaAlimentos"), /Requesón Hacendado/);
  });

  test("al borrar un alimento se restan también las calorías", async () => {
    await app.pagina.click(".item-x");
    await app.pagina.waitForTimeout(300);
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
    await app.pagina.click('[data-alimento="pollo"]'); // 150 g de pollo: 35 g
    await app.pagina.waitForTimeout(200);
    await app.pagina.click('[data-screen="hoy"]');
    await app.pagina.waitForSelector("#screen-hoy.active");
    assert.match(await app.pagina.textContent("#screen-hoy"), /35 \/ 130 g/);
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

/* La coma. En el teclado del móvil en español la tecla decimal es una coma,
   y un input type="number" la tira sin decir nada: 62,5 se guardaba como 625.
   Esto comprueba, tecleando como se teclea de verdad, que 62,5 es 62,5. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp } = require("./ayuda");

// Escribe tecla a tecla, como en el móvil (fill() no pasa por el teclado).
async function teclear(pagina, selector, texto) {
  await pagina.click(selector);
  await pagina.evaluate((sel) => { document.querySelector(sel).value = ""; }, selector);
  await pagina.keyboard.type(texto);
}

describe("Decimales con coma", () => {
  let app;
  before(async () => { app = await abrirApp("2026-11-24T06:05:00"); });   // martes
  after(async () => { await app.cerrar(); });

  test("el peso de una serie se guarda con coma", async () => {
    await app.pagina.click("#btnEmpezar");
    await app.pagina.waitForSelector("#screen-sesion.active");

    await teclear(app.pagina, 'input[data-peso][data-ex="0"][data-set="0"]', "62,5");
    await teclear(app.pagina, 'input[data-repes][data-ex="0"][data-set="0"]', "8");
    await app.pagina.click('.chk[data-ex="0"][data-set="0"]');
    await app.pagina.waitForTimeout(200);

    await app.pagina.click("#btnTerminar");
    await app.pagina.waitForTimeout(500);

    const series = await app.pagina.evaluate(() =>
      Datos.series.map((s) => ({ peso: s.peso, repes: s.repes })));
    assert.deepEqual(series, [{ peso: 62.5, repes: 8 }], "62,5 kg, no 625");
  });

  test("y con punto también, que en el portátil se escribe así", async () => {
    const r = await app.pagina.evaluate(() => [
      aNumero("62.5"), aNumero("62,5"), aNumero("62"), aNumero(" 40,25 ")
    ]);
    assert.deepEqual(r, [62.5, 62.5, 62, 40.25]);
  });

  test("lo que no es un número no cuela", async () => {
    const r = await app.pagina.evaluate(() => [
      aNumero(""), aNumero("kg"), aNumero("62,5,5"), aNumero("--3"), aNumero(null)
    ].map((n) => (isNaN(n) ? "NaN" : n)));
    assert.deepEqual(r, ["NaN", "NaN", "NaN", "NaN", "NaN"]);
  });

  test("el pesaje rápido de HOY acepta la coma", async () => {
    await app.pagina.click('[data-screen="hoy"]');
    await app.pagina.waitForSelector("#screen-hoy.active");
    await teclear(app.pagina, "#pesoRapido", "67,4");
    await app.pagina.click("#btnPesoRapido");
    await app.pagina.waitForTimeout(300);
    const ultimo = await app.pagina.evaluate(() => Datos.pesajes[Datos.pesajes.length - 1]);
    assert.equal(ultimo.kg, 67.4);
  });

  test("el pesaje de PROGRESO también", async () => {
    await app.pagina.click('[data-screen="progreso"]');
    await app.pagina.waitForSelector("#screen-progreso.active");
    await app.pagina.fill("#pesoFecha", "2026-11-20");
    await teclear(app.pagina, "#pesoKg", "66,8");
    await app.pagina.click("#btnAddPeso");
    await app.pagina.waitForTimeout(300);
    const kg = await app.pagina.evaluate(() =>
      Datos.pesajes.find((p) => p.fecha === "2026-11-20").kg);
    assert.equal(kg, 66.8);
  });

  test("el peso objetivo se guarda y se vuelve a enseñar con coma", async () => {
    await teclear(app.pagina, "#objPeso", "76,5");
    await app.pagina.click("#btnObjetivos");
    await app.pagina.waitForTimeout(300);
    assert.equal(await app.pagina.evaluate(() => objetivo("peso_objetivo_12_meses_kg")), 76.5);
    assert.equal(await app.pagina.inputValue("#objPeso"), "76,5", "se relee como se escribió");
  });

  test("las kcal con punto de millar son kcal, no decimales", async () => {
    const r = await app.pagina.evaluate(() => [aEntero("2.900"), aEntero("2900"), aEntero("2,900")]);
    assert.deepEqual(r, [2900, 2900, 2900]);
  });

  test("la proteína de un alimento admite 3,9", async () => {
    await app.pagina.click('[data-screen="comida"]');
    await app.pagina.waitForSelector("#screen-comida.active");
    await app.pagina.click("#btnNuevoAlimento");
    await app.pagina.waitForTimeout(200);
    await app.pagina.fill("#alNombre", "Yogur de prueba");
    await teclear(app.pagina, "#alProte", "3,9");
    await app.pagina.click("#mGuardarAlimento");
    await app.pagina.waitForTimeout(300);
    const guardado = await app.pagina.evaluate(() =>
      Datos.catalogo().find((a) => a.nombre === "Yogur de prueba").proteina_g);
    assert.equal(guardado, 3.9);
  });

  test("corregir una serie pasada mantiene el decimal", async () => {
    await app.pagina.click('[data-screen="progreso"]');
    await app.pagina.waitForSelector("#screen-progreso.active");
    await app.pagina.click("[data-sesion-id]");
    await app.pagina.waitForTimeout(250);
    assert.equal(await app.pagina.inputValue("[data-editar-peso]"), "62,5");

    const campo = "[data-editar-peso]";
    await teclear(app.pagina, campo, "65,5");
    await app.pagina.click("#mGuardarSesion");
    await app.pagina.waitForTimeout(400);
    const peso = await app.pagina.evaluate(() => Datos.series[0].peso);
    assert.equal(peso, 65.5);
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

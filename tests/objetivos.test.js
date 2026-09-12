/* Los objetivos cambian con el peso: a 74 kg no tocan los mismos gramos que
   a 66, y no se puede depender de editar el código para eso. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp, sembrarPesajes } = require("./ayuda");

describe("Objetivos", () => {
  let app;
  before(async () => {
    app = await abrirApp("2026-11-24T09:00:00");
    await app.pagina.click('[data-screen="progreso"]');
    await app.pagina.waitForSelector("#screen-progreso.active");
  });
  after(async () => { await app.cerrar(); });

  test("arrancan con los valores del perfil", async () => {
    assert.equal(await app.pagina.inputValue("#objProteina"), "130");
    assert.equal(await app.pagina.inputValue("#objKcal"), "2900");
    assert.equal(await app.pagina.inputValue("#objPeso"), "74");
  });

  test("enseña los gramos por kilo, calculados con tu peso real", async () => {
    await sembrarPesajes(app.pagina, [["2026-11-22", 68]]);
    await app.pagina.evaluate(() => RENDERERS.progreso());
    // 130 g / 68 kg = 1,91
    assert.match(await app.pagina.textContent("#screen-progreso"), /1,91 g por kilo/);
  });

  test("se pueden cambiar y se aplican al contador de comida", async () => {
    await app.pagina.fill("#objProteina", "150");
    await app.pagina.fill("#objKcal", "3200");
    await app.pagina.click("#btnObjetivos");
    await app.pagina.waitForTimeout(300);

    await app.pagina.click('[data-screen="comida"]');
    await app.pagina.waitForSelector("#screen-comida.active");
    const comida = await app.pagina.textContent("#screen-comida");
    assert.match(comida, /0 \/ 150 g/, "el contador usa el objetivo nuevo");
    assert.match(comida, /de 3200 objetivo/);
  });

  test("también en HOY", async () => {
    await app.pagina.click('[data-screen="hoy"]');
    await app.pagina.waitForSelector("#screen-hoy.active");
    assert.match(await app.pagina.textContent("#screen-hoy"), /0 \/ 150 g/);
  });

  test("sobreviven a recargar", async () => {
    await app.recargar();
    const guardado = await app.pagina.evaluate(() => objetivo("proteina_objetivo_g"));
    assert.equal(guardado, 150);
  });

  test("el peso objetivo se usa en la gráfica de peso", async () => {
    await app.pagina.click('[data-screen="progreso"]');
    await app.pagina.waitForSelector("#screen-progreso.active");
    await app.pagina.fill("#objPeso", "78");
    await app.pagina.click("#btnObjetivos");
    await app.pagina.waitForTimeout(300);
    const texto = await app.pagina.textContent("#screen-progreso");
    assert.match(texto, /objetivo 78 kg/);
    assert.match(texto, /faltan 10.0 kg/, "78 - 68 = 10");
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

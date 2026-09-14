/* La comida no es solo la de hoy: la cena de ayer se apunta al día siguiente
   y lo que importa de verdad es la media de la semana. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp } = require("./ayuda");

describe("Comida por días", () => {
  let app;

  before(async () => {
    app = await abrirApp("2026-11-26T19:00:00");   // jueves
    await app.pagina.evaluate(() => {
      const dias = ["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25"];
      const gramos = [140, 90, 120, 135, 150, 60];
      dias.forEach((f, i) => Datos.añadirComida(
        { fecha: f, nombre: "Pollo", proteina: gramos[i], kcal: 1500, hora: "14:00" }));
    });
    await app.pagina.click('[data-screen="comida"]');
    await app.pagina.waitForSelector("#screen-comida.active");
  });

  after(async () => { await app.cerrar(); });

  test("la media de 7 días incluye los días a cero", async () => {
    const texto = await app.pagina.textContent("#screen-comida");
    // (140+90+120+135+150+60+0) / 7 = 99
    assert.match(texto, /99\s*g de media/);
    assert.match(texto, /3 de 7 días al objetivo/, "130 g: solo tres días llegan");
  });

  test("una barra por día, y las que llegan al objetivo se marcan", async () => {
    assert.equal(await app.pagina.$$eval(".barras-proteina .tubo", (n) => n.length), 7);
    assert.equal(await app.pagina.$$eval(".barras-proteina .relleno.ok", (n) => n.length), 3);
  });

  test("se puede anotar en ayer sin tocar lo de hoy", async () => {
    await app.pagina.click('[data-dia-comida="ayer"]');
    await app.pagina.waitForTimeout(150);
    assert.match(await app.pagina.textContent("#screen-comida h2"), /Proteína de ayer/);

    await app.pagina.fill("#buscarAlimento", "huevo");
    await app.pagina.waitForTimeout(150);
    await app.pagina.click("[data-alimento]");
    await app.pagina.waitForTimeout(250);

    const guardado = await app.pagina.evaluate(() => ({
      ayer: Datos.comidasDe("2026-11-25").length,
      hoy: Datos.comidasDe("2026-11-26").length
    }));
    assert.deepEqual(guardado, { ayer: 2, hoy: 0 }, "la comida va al día elegido");
  });

  test("y sigue ahí al recargar", async () => {
    await app.recargar();
    const ayer = await app.pagina.evaluate(() => Datos.comidasDe("2026-11-25").length);
    assert.equal(ayer, 2);
  });

  test("al volver a la pantalla se vuelve a hoy", async () => {
    await app.pagina.click('[data-screen="comida"]');
    await app.pagina.waitForSelector("#screen-comida.active");
    await app.pagina.click('[data-dia-comida="ayer"]');
    await app.pagina.click('[data-screen="hoy"]');
    await app.pagina.click('[data-screen="comida"]');
    assert.match(await app.pagina.textContent("#screen-comida h2"), /Proteína de hoy/);
  });

  test("sin nada apuntado no enseña la gráfica vacía", async () => {
    const limpia = await abrirApp("2026-11-26T19:00:00");
    await limpia.pagina.click('[data-screen="comida"]');
    await limpia.pagina.waitForSelector("#screen-comida.active");
    const hay = await limpia.pagina.$$eval(".barras-proteina", (n) => n.length);
    assert.equal(hay, 0, "siete barras a cero no dicen nada");
    assert.deepEqual(limpia.errores, []);
    await limpia.cerrar();
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

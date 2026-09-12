/* La descarga y las salidas de emergencia dentro del gym: cambiar un
   ejercicio si la máquina está ocupada, saltarlo si algo duele. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp } = require("./ayuda");

describe("Semana de descarga", () => {
  let app;
  // Día 63 del plan: novena semana, toca descarga.
  before(async () => { app = await abrirApp("2026-11-24T06:30:00"); });
  after(async () => { await app.cerrar(); });

  test("avisa de que toca a las 8 semanas", async () => {
    assert.match(await app.pagina.textContent("#screen-hoy"), /Toca descarga/);
  });

  test("aplicarla cambia la sesión, no solo el mensaje", async () => {
    // Antes: press banca son 4 series.
    await app.pagina.click("#btnEmpezar");
    await app.pagina.waitForSelector(".exset");
    const normales = (await app.pagina.$$('.chk[data-ex="0"]')).length;
    assert.equal(normales, 4);
    await app.pagina.click("#btnDescartar");
    await app.pagina.waitForSelector("#mDescartar");
    await app.pagina.click("#mDescartar");
    await app.pagina.waitForTimeout(300);

    await app.pagina.click("#btnDeloadAplicar");
    await app.pagina.waitForTimeout(300);
    await app.pagina.click("#btnEmpezar");
    await app.pagina.waitForSelector(".exset");
    const enDescarga = (await app.pagina.$$('.chk[data-ex="0"]')).length;
    assert.equal(enDescarga, 2, "la mitad de las series");
    assert.match(await app.pagina.textContent("#screen-sesion"), /Descarga/);
  });

  test("en descarga no se sube peso aunque llegues al tope", async () => {
    for (let i = 0; i < 2; i++) {
      await app.pagina.fill(`input[data-peso][data-ex="0"][data-set="${i}"]`, "40");
      await app.pagina.fill(`input[data-repes][data-ex="0"][data-set="${i}"]`, "8");
      await app.pagina.click(`.chk[data-ex="0"][data-set="${i}"]`);
    }
    await app.pagina.click("#btnTerminar");
    await app.pagina.waitForTimeout(400);
    const sugerencia = await app.pagina.evaluate(() => Datos.ajustes.subirPeso.press_banca);
    assert.ok(!sugerencia, "una semana suave no es motivo para subir carga");
  });

  test("se puede dar por terminada", async () => {
    await app.pagina.click("#btnDeloadFin");
    await app.pagina.waitForTimeout(300);
    assert.doesNotMatch(await app.pagina.textContent("#screen-hoy"), /Semana de descarga/);
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

describe("Cuando algo falla en el gym", () => {
  let app;
  before(async () => {
    app = await abrirApp("2026-10-05T06:10:00");
    await app.pagina.click("#btnEmpezar");
    await app.pagina.waitForSelector(".exset");
  });
  after(async () => { await app.cerrar(); });

  test("se puede cambiar un ejercicio si la máquina está ocupada", async () => {
    const antes = await app.pagina.textContent(".exname");
    assert.match(antes, /Sentadilla/);
    await app.pagina.click('[data-cambiar="0"]');
    await app.pagina.waitForSelector("[data-nuevo]");
    await app.pagina.click('[data-nuevo="prensa"]');
    await app.pagina.waitForTimeout(300);
    assert.match(await app.pagina.textContent(".exname"), /Prensa/);
  });

  test("se puede saltar un ejercicio que duele", async () => {
    const antes = (await app.pagina.$$(".exname")).length;
    await app.pagina.click('[data-saltar="0"]');
    await app.pagina.waitForTimeout(300);
    assert.equal((await app.pagina.$$(".exname")).length, antes - 1);
  });

  test("la nota de la sesión se guarda al terminar", async () => {
    await app.pagina.fill("#notaEnCurso", "Rodilla derecha molesta");
    await app.pagina.waitForTimeout(200);
    await app.pagina.fill('input[data-peso][data-ex="0"][data-set="0"]', "80");
    await app.pagina.fill('input[data-repes][data-ex="0"][data-set="0"]', "10");
    await app.pagina.click('.chk[data-ex="0"][data-set="0"]');
    await app.pagina.click("#btnTerminar");
    await app.pagina.waitForTimeout(400);
    const nota = await app.pagina.evaluate(() => Datos.sesiones[0].nota);
    assert.equal(nota, "Rodilla derecha molesta");
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

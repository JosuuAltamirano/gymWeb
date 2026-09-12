/* La pantalla que se usa dentro del gym: sugerencias, registro de un toque,
   progresión y las salidas de emergencia. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp, completarEjercicio } = require("./ayuda");

describe("Sesión de entrenamiento", () => {
  let app;
  before(async () => { app = await abrirApp("2026-11-24T06:05:00"); });
  after(async () => { await app.cerrar(); });

  test("la primera vez no hay nada que sugerir", async () => {
    await app.pagina.click("#btnEmpezar");
    await app.pagina.waitForSelector(".exset");
    const ph = await app.pagina.getAttribute('input[data-peso][data-ex="0"][data-set="0"]', "placeholder");
    assert.equal(ph, "kg");
  });

  test("al completar el tope del rango propone subir el peso exacto", async () => {
    await completarEjercicio(app.pagina, 0, 40, 8); // press banca, 4x8 = tope de 6-8
    await app.pagina.click("#btnTerminar");
    await app.pagina.waitForTimeout(500);
    const sugerencia = await app.pagina.evaluate(() => Datos.ajustes.subirPeso.press_banca);
    assert.deepEqual(sugerencia, { desde: 40, hasta: 42.5 });
  });

  test("la sesión siguiente llega pre-rellenada con esa sugerencia", async () => {
    await app.pagina.evaluate(() => iniciarSesion("martes", false));
    await app.pagina.waitForSelector(".exset");
    const peso = await app.pagina.getAttribute('input[data-peso][data-ex="0"][data-set="0"]', "placeholder");
    const repes = await app.pagina.getAttribute('input[data-repes][data-ex="0"][data-set="0"]', "placeholder");
    assert.equal(peso, "42.5");
    assert.equal(repes, "6", "tras subir peso se vuelve al tope bajo del rango");
  });

  test("un solo toque registra la serie sugerida", async () => {
    await app.pagina.click('.chk[data-ex="0"][data-set="0"]');
    await app.pagina.waitForTimeout(200);
    assert.equal(await app.pagina.inputValue('input[data-peso][data-ex="0"][data-set="0"]'), "42.5");
    assert.equal(await app.pagina.inputValue('input[data-repes][data-ex="0"][data-set="0"]'), "6");
  });

  test("marcar una serie arranca el descanso", async () => {
    assert.ok(await app.pagina.isVisible("#resttimer"));
    assert.match(await app.pagina.textContent("#resttimer"), /Descanso: 3:00/);
  });

  test("explica de dónde sale el peso propuesto", async () => {
    await app.pagina.click("[data-porque]");
    await app.pagina.waitForSelector(".sheet");
    const texto = await app.pagina.textContent(".sheet");
    assert.match(texto, /Doble progresión/);
    assert.match(texto, /no una orden/);
    await app.pagina.click("#mCerrar");
  });

  test("se pueden añadir y quitar series sobre la marcha", async () => {
    const antes = (await app.pagina.$$('.chk[data-ex="0"]')).length;
    await app.pagina.click('[data-addset="0"]');
    await app.pagina.waitForTimeout(200);
    assert.equal((await app.pagina.$$('.chk[data-ex="0"]')).length, antes + 1);
    await app.pagina.click('[data-delset="0"]');
    await app.pagina.waitForTimeout(200);
    assert.equal((await app.pagina.$$('.chk[data-ex="0"]')).length, antes);
  });

  test("el modo rápido deja 3 ejercicios y avisa de lo que se salta", async () => {
    await app.pagina.evaluate(() => iniciarSesion("lunes", false));
    await app.pagina.waitForTimeout(300);
    if (await app.pagina.isVisible("#mNueva")) await app.pagina.click("#mNueva");
    await app.pagina.waitForSelector(".exset");
    await app.pagina.click("#btnRapido");
    await app.pagina.waitForTimeout(200);
    assert.equal((await app.pagina.$$(".exname")).length, 3);
    assert.match(await app.pagina.textContent("#screen-sesion"), /Deja fuera Gemelo/);
  });

  test("marca los puntos débiles, que en modo rápido quedan fuera", async () => {
    assert.doesNotMatch(await app.pagina.textContent("#screen-sesion"), /Punto débil/,
      "en modo rápido los gemelos no se ven: por eso existe el aviso");
    await app.pagina.click("#btnRapido");   // volver a la sesión completa
    await app.pagina.waitForTimeout(200);
    assert.match(await app.pagina.textContent("#screen-sesion"), /Punto débil/);
  });

  test("descartar una sesión no guarda nada", async () => {
    const antes = await app.pagina.evaluate(() => Datos.sesiones.length);
    await app.pagina.fill('input[data-peso][data-ex="0"][data-set="0"]', "99");
    await app.pagina.click("#btnDescartar");
    await app.pagina.waitForSelector("#mDescartar");
    await app.pagina.click("#mDescartar");
    await app.pagina.waitForTimeout(300);
    assert.equal(await app.pagina.evaluate(() => Datos.sesiones.length), antes);
    assert.equal(await app.pagina.evaluate(() => Datos.ajustes.sesionActual), null);
  });

  test("avisa antes de pisar una sesión abierta con series apuntadas", async () => {
    await app.pagina.click('[data-screen="hoy"]');
    await app.pagina.click("#btnEmpezar");
    await app.pagina.waitForSelector(".exset");
    await app.pagina.click('.chk[data-ex="0"][data-set="0"]');
    await app.pagina.click('[data-screen="hoy"]');
    await app.pagina.click("#btnOtraSesion");
    await app.pagina.waitForTimeout(200);
    await app.pagina.click('[data-sesion="jueves"]');
    await app.pagina.waitForSelector("#mSeguir");
    await app.pagina.click("#mSeguir");
    await app.pagina.waitForTimeout(200);
    assert.match(await app.pagina.textContent("#screen-sesion"), /EMPUJE/);
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

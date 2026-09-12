/* Simulación del uso real, con el horario de verdad: lunes a las 6:00 con
   prisa, domingo por la noche y una semana de obra. */

const { test, describe } = require("node:test");
const assert = require("node:assert");
const { abrirApp, completarEjercicio } = require("./ayuda");

describe("Día a día", () => {
  test("lunes 6:05 con prisa: modo rápido y fuera", async () => {
    const app = await abrirApp("2026-10-05T06:05:00");
    try {
      const hoy = await app.pagina.textContent("#screen-hoy");
      assert.match(hoy, /PIERNA A/);
      assert.match(hoy, /Gym hoy 06:00 - 23:00/);

      await app.pagina.click("#btnEmpezar");
      await app.pagina.waitForSelector(".exset");
      await app.pagina.click("#btnRapido");
      await app.pagina.waitForTimeout(200);
      assert.equal((await app.pagina.$$(".exname")).length, 3, "solo los 3 primeros");

      for (let i = 0; i < 3; i++) await completarEjercicio(app.pagina, i, 50, 8);
      await app.pagina.click("#btnTerminar");
      await app.pagina.waitForTimeout(500);

      const sesion = await app.pagina.evaluate(() => Datos.sesiones[0]);
      assert.equal(sesion.rapida, true);
      assert.ok(sesion.volumen > 0, "guarda el volumen movido");
    } finally { await app.cerrar(); }
  });

  test("domingo 22:00: el checklist aparece porque mañana toca gym", async () => {
    const app = await abrirApp("2026-10-11T22:00:00");
    try {
      const hoy = await app.pagina.textContent("#screen-hoy");
      assert.match(hoy, /Mañana/);
      assert.match(hoy, /PIERNA A/);
      assert.match(hoy, /Déjalo listo ahora/);

      await app.pagina.click('#screen-hoy [data-item="ropa"]');
      await app.pagina.waitForTimeout(200);
      assert.match(await app.pagina.textContent('#screen-hoy [data-item="ropa"]'), /✓/);
    } finally { await app.cerrar(); }
  });

  test("miércoles: descanso sin culpa y sin botón de entrenar", async () => {
    const app = await abrirApp("2026-10-07T07:00:00");
    try {
      assert.match(await app.pagina.textContent("#screen-hoy"), /Descanso/i);
      assert.equal(await app.pagina.$("#btnEmpezar"), null);
      assert.ok(await app.pagina.$("#btnOtraSesion"), "aun así puede entrenar si quiere");
    } finally { await app.cerrar(); }
  });

  test("semana de obra: entre semana no hay gym, el sábado sí", async () => {
    const app = await abrirApp("2026-10-13T06:00:00");
    try {
      await app.pagina.click('[data-modo="obra"]');
      await app.pagina.waitForTimeout(300);
      assert.match(await app.pagina.textContent("#screen-hoy"), /Descanso/i);
      assert.equal(await app.pagina.$("#btnEmpezar"), null);

      await app.viajarA("2026-10-17T16:00:00");
      const sabado = await app.pagina.textContent("#screen-hoy");
      assert.match(sabado, /TORSO COMPLETO/);
      assert.match(sabado, /cierra a las 18:00/);
      assert.match(sabado, /09:00 - 18:00/);
    } finally { await app.cerrar(); }
  });

  test("el botón de rescate ofrece media sesión en vez de ninguna", async () => {
    const app = await abrirApp("2026-10-05T06:10:00");
    try {
      await app.pagina.click("#btnRescate");
      await app.pagina.waitForSelector("#mIr");
      assert.match(await app.pagina.textContent(".sheet"), /haz la mitad y vete/);
      await app.pagina.click("#mIr");
      await app.pagina.waitForSelector(".exset");
      const rapida = await app.pagina.evaluate(() => Datos.ajustes.sesionActual.modoRapido);
      assert.equal(rapida, true);
    } finally { await app.cerrar(); }
  });

  test("abrir la web por primera vez no la recarga sola", async () => {
    // El service worker reclama la página al instalarse. Si se recarga ahí,
    // la web se reinicia sola en la primera visita, y a mitad de una serie
    // eso significa perder lo que estabas apuntando.
    const app = await abrirApp("2026-10-05T06:10:00");
    try {
      await app.pagina.evaluate(() => { window.__marca = "viva"; });
      await app.pagina.waitForTimeout(2500);   // margen para que el sw se active
      const sigue = await app.pagina.evaluate(() => window.__marca);
      assert.equal(sigue, "viva", "la página se ha recargado sola");
    } finally { await app.cerrar(); }
  });

  test("una sesión a medias sobrevive a cerrar y volver a abrir", async () => {
    const app = await abrirApp("2026-10-05T06:10:00");
    try {
      await app.pagina.click("#btnEmpezar");
      await app.pagina.waitForSelector(".exset");
      await completarEjercicio(app.pagina, 0, 60, 7);
      await app.pagina.waitForTimeout(300);
      await app.recargar();
      await app.pagina.click('[data-screen="sesion"]');
      await app.pagina.waitForSelector(".exset");
      assert.equal(await app.pagina.inputValue('input[data-peso][data-ex="0"][data-set="0"]'), "60");
    } finally { await app.cerrar(); }
  });
});

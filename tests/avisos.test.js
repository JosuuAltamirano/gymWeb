/* El calendario es la única vía real de que el móvil te avise con la web
   cerrada, así que el .ics tiene que salir bien formado. */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { abrirApp } = require("./ayuda");

describe("Avisos", () => {
  let app, ics;

  before(async () => {
    app = await abrirApp("2026-11-24T09:00:00");
    ics = await app.pagina.evaluate(() => Avisos.generarCalendario("normal"));
  });
  after(async () => { await app.cerrar(); });

  test("genera un calendario válido", () => {
    assert.ok(ics.startsWith("BEGIN:VCALENDAR"));
    assert.ok(ics.trimEnd().endsWith("END:VCALENDAR"));
    const abre = (ics.match(/BEGIN:VEVENT/g) || []).length;
    const cierra = (ics.match(/END:VEVENT/g) || []).length;
    assert.equal(abre, cierra, "todos los eventos cerrados");
  });

  test("incluye los cuatro entrenos de la semana normal", () => {
    ["PIERNA A", "EMPUJE", "PIERNA B", "TIRÓN"].forEach((nombre) => {
      assert.ok(ics.includes("SUMMARY:" + nombre), "falta " + nombre);
    });
  });

  test("cada entreno se repite en su día de la semana", () => {
    assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO/);
    assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=TU/);
    assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=TH/);
    assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=SU/);
  });

  test("recuerda preparar la mochila la noche antes", () => {
    assert.match(ics, /SUMMARY:Preparar gym: PIERNA A/);
    // El lunes se entrena, así que el aviso cae el domingo por la noche.
    const bloque = ics.split("SUMMARY:Preparar gym: PIERNA A")[0];
    assert.match(bloque.slice(-400), /BYDAY=SU/);
  });

  test("incluye pesaje semanal y foto mensual", () => {
    assert.match(ics, /SUMMARY:Pesarte/);
    assert.match(ics, /SUMMARY:Foto de progreso/);
    assert.match(ics, /RRULE:FREQ=MONTHLY;BYMONTHDAY=1/);
  });

  test("cada evento lleva su alarma", () => {
    const eventos = (ics.match(/BEGIN:VEVENT/g) || []).length;
    const alarmas = (ics.match(/BEGIN:VALARM/g) || []).length;
    assert.equal(alarmas, eventos);
  });

  test("la semana de obra exporta solo sus dos días", async () => {
    const obra = await app.pagina.evaluate(() => Avisos.generarCalendario("obra"));
    assert.ok(obra.includes("SUMMARY:TORSO COMPLETO"));
    assert.ok(obra.includes("SUMMARY:PIERNA COMPLETA"));
    assert.ok(!obra.includes("SUMMARY:EMPUJE"));
  });

  test("no deja errores en consola", () => {
    assert.deepEqual(app.errores, []);
  });
});

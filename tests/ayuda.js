/* Utilidades comunes de los tests: levantar la web, abrirla en un navegador
   con una fecha fija y sembrar datos. */

const { chromium } = require("playwright");
const { arrancar } = require("./servidor");

const EJECUTABLE = process.env.PLAYWRIGHT_CHROMIUM || "/opt/pw-browsers/chromium";

// Abre la web con el reloj congelado en `fecha` y espera a que la base esté lista.
async function abrirApp(fecha = "2026-11-24T07:00:00") {
  const servidor = await arrancar();
  let navegador;
  try {
    navegador = await chromium.launch({ executablePath: EJECUTABLE });
  } catch {
    navegador = await chromium.launch(); // en CI usa el Chromium que instala Playwright
  }
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  const pagina = await contexto.newPage();

  const errores = [];
  pagina.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
  pagina.on("console", (m) => {
    if (m.type() === "error") errores.push("CONSOLE: " + m.text());
  });

  await pagina.clock.setFixedTime(new Date(fecha));
  await pagina.goto(servidor.url + "/index.html");
  await pagina.waitForSelector("html[data-listo]");

  return {
    pagina,
    errores,
    // Avanza el reloj y recarga, como si abrieras la web otro día.
    async viajarA(nuevaFecha) {
      await pagina.clock.setFixedTime(new Date(nuevaFecha));
      await pagina.reload();
      await pagina.waitForSelector("html[data-listo]");
    },
    async recargar() {
      await pagina.reload();
      await pagina.waitForSelector("html[data-listo]");
    },
    async cerrar() {
      await navegador.close();
      await servidor.cerrar();
    }
  };
}

// Registra sesiones completas en la base y espera a que se escriban.
async function sembrarSesiones(pagina, sesiones) {
  await pagina.evaluate((filas) => {
    filas.forEach((s) => {
      Datos.registrarSesion(
        {
          fecha: s.fecha,
          nombre: s.nombre || "EMPUJE",
          diaKey: s.diaKey || "martes",
          modo: "normal",
          ejercicios: s.ejercicios.length,
          series: s.ejercicios.reduce((t, e) => t + e.series.length, 0),
          rapida: false,
          volumen: s.volumen || 0,
          minutos: s.minutos || 70
        },
        s.ejercicios
      );
    });
  }, sesiones);
  await pagina.waitForTimeout(400);
}

async function sembrarPesajes(pagina, pesajes) {
  await pagina.evaluate((filas) => {
    filas.forEach(([fecha, kg]) => Datos.añadirPesaje(fecha, kg));
  }, pesajes);
  await pagina.waitForTimeout(400);
}

// Completa todas las series de un ejercicio de la sesión en curso.
async function completarEjercicio(pagina, indice, peso, repes) {
  const checks = await pagina.$$(`.chk[data-ex="${indice}"]`);
  for (let i = 0; i < checks.length; i++) {
    if (peso !== undefined) {
      await pagina.fill(`input[data-peso][data-ex="${indice}"][data-set="${i}"]`, String(peso));
    }
    if (repes !== undefined) {
      await pagina.fill(`input[data-repes][data-ex="${indice}"][data-set="${i}"]`, String(repes));
    }
    await pagina.click(`.chk[data-ex="${indice}"][data-set="${i}"]`);
  }
}

module.exports = { abrirApp, sembrarSesiones, sembrarPesajes, completarEjercicio };

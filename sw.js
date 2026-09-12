/* Service worker: hace que la web funcione sin internet.

   La versión llega en la URL del registro (sw.js?v=1.1.0), así hay una sola
   fuente de verdad (VERSION en js/datos.js) y cada versión usa su propia
   caché. No se activa solo: espera a que la app diga que es buen momento,
   para no cambiar los archivos en mitad de un entreno. */

const VERSION = new URL(self.location).searchParams.get("v") || "dev";
const CACHE = "mi-gym-" + VERSION;

const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./css/estilos.css",
  "./js/datos.js",
  "./js/db.js",
  "./js/avisos.js",
  "./js/app.js"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// La app pide el relevo cuando la actualización no molesta.
self.addEventListener("message", (evento) => {
  if (evento.data && evento.data.tipo === "activar") self.skipWaiting();
});

/* Primero la caché (dentro del gym puede no haber cobertura) y de fondo se
   refresca, para que la próxima vez ya esté lo nuevo. */
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;
  if (new URL(evento.request.url).origin !== self.location.origin) return;

  evento.respondWith(
    caches.match(evento.request).then((guardado) => {
      const red = fetch(evento.request)
        .then((respuesta) => {
          if (respuesta && respuesta.status === 200) {
            const copia = respuesta.clone();
            caches.open(CACHE).then((c) => c.put(evento.request, copia));
          }
          return respuesta;
        })
        .catch(() => guardado);
      return guardado || red;
    })
  );
});

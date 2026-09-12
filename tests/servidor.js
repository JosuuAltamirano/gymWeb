/* Servidor estático mínimo para los tests y para desarrollo local.
   Sin dependencias: la web tampoco las tiene. */

const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function crearServidor() {
  return http.createServer((req, res) => {
    const relativa = decodeURIComponent(req.url.split("?")[0]);
    const destino = path.join(RAIZ, relativa === "/" ? "index.html" : relativa);

    // Nunca servir fuera de la carpeta del proyecto.
    if (!destino.startsWith(RAIZ)) {
      res.writeHead(403).end("Prohibido");
      return;
    }
    fs.readFile(destino, (err, datos) => {
      if (err) {
        res.writeHead(404).end("No encontrado");
        return;
      }
      res.writeHead(200, {
        "Content-Type": TIPOS[path.extname(destino)] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      res.end(datos);
    });
  });
}

// Puerto 0 = el sistema elige uno libre, así los tests pueden ir en paralelo.
function arrancar(puerto = 0) {
  return new Promise((resolver) => {
    const servidor = crearServidor();
    servidor.listen(puerto, "127.0.0.1", () => {
      resolver({
        url: `http://127.0.0.1:${servidor.address().port}`,
        cerrar: () => new Promise((r) => servidor.close(r))
      });
    });
  });
}

if (require.main === module) {
  const i = process.argv.indexOf("--puerto");
  const puerto = i > -1 ? Number(process.argv[i + 1]) : 8080;
  arrancar(puerto).then(({ url }) => console.log("Sirviendo en " + url));
}

module.exports = { arrancar };

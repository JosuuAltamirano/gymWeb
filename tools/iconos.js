/* Genera los iconos PNG de la app a partir de la misma geometría que icon.svg.

   iOS ignora los iconos SVG: si "Añadir a pantalla de inicio" no encuentra un
   PNG, pone una captura borrosa de la página. Por eso hacen falta PNG de
   verdad, y por eso se generan aquí en vez de arrastrar un binario suelto que
   nadie sabe rehacer:

     node tools/iconos.js

   Sin dependencias: zlib va en Node y el PNG se escribe a mano. */

const zlib = require("node:zlib");
const fs = require("node:fs");
const path = require("node:path");

const FONDO = [0x0a, 0x0a, 0x0b];      // --bg
const SENAL = [0xd7, 0xf9, 0x4f];      // --volt

/* La barra, en el lienzo de 192 del SVG: barra, discos grandes y pequeños. */
const BARRA = [
  { x1: 30, y1: 96, x2: 162, y2: 96, w: 14 },
  { x1: 52, y1: 70, x2: 52, y2: 122, w: 14 },
  { x1: 140, y1: 70, x2: 140, y2: 122, w: 14 },
  { x1: 34, y1: 80, x2: 34, y2: 112, w: 14 },
  { x1: 158, y1: 80, x2: 158, y2: 112, w: 14 }
];

// Distancia de un punto al segmento: con esto una línea redondeada es un test.
function distanciaASegmento(px, py, s) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const largo = dx * dx + dy * dy;
  let t = largo === 0 ? 0 : ((px - s.x1) * dx + (py - s.y1) * dy) / largo;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (s.x1 + t * dx), py - (s.y1 + t * dy));
}

function dentroDeRedondeado(px, py, lado, radio) {
  const cx = Math.min(Math.max(px, radio), lado - radio);
  const cy = Math.min(Math.max(py, radio), lado - radio);
  if (px >= radio && px <= lado - radio) return py >= 0 && py <= lado;
  if (py >= radio && py <= lado - radio) return px >= 0 && px <= lado;
  return Math.hypot(px - cx, py - cy) <= radio;
}

/* Un icono maskable se recorta en círculo en Android: la barra va más
   pequeña y el fondo llega a los bordes. */
function pintar(lado, { maskable }) {
  const escala = lado / 192;
  const radio = maskable ? 0 : lado * 0.22;
  const zoom = maskable ? 0.72 : 1;
  const centro = 96;
  const muestras = 4;                 // suavizado: 4x4 por píxel
  const pixeles = Buffer.alloc(lado * lado * 4);

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let fondo = 0, senal = 0;
      for (let sy = 0; sy < muestras; sy++) {
        for (let sx = 0; sx < muestras; sx++) {
          const px = x + (sx + 0.5) / muestras;
          const py = y + (sy + 0.5) / muestras;
          if (!dentroDeRedondeado(px, py, lado, radio)) continue;
          fondo++;
          const ux = centro + (px / escala - centro) / zoom;
          const uy = centro + (py / escala - centro) / zoom;
          if (BARRA.some((s) => distanciaASegmento(ux, uy, s) <= s.w / 2)) senal++;
        }
      }
      const total = muestras * muestras;
      const i = (y * lado + x) * 4;
      const mezcla = senal / total;
      for (let c = 0; c < 3; c++) {
        pixeles[i + c] = Math.round(FONDO[c] * (1 - mezcla) + SENAL[c] * mezcla);
      }
      pixeles[i + 3] = Math.round((fondo / total) * 255);
    }
  }
  return pixeles;
}

/* ---- PNG a mano: firma, IHDR, IDAT y IEND, cada uno con su CRC ---- */

const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

function png(lado, pixeles) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8;    // bits por canal
  ihdr[9] = 6;    // RGBA
  const crudo = Buffer.alloc(lado * (lado * 4 + 1));
  for (let y = 0; y < lado; y++) {
    crudo[y * (lado * 4 + 1)] = 0;   // sin filtro
    pixeles.copy(crudo, y * (lado * 4 + 1) + 1, y * lado * 4, (y + 1) * lado * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo("IHDR", ihdr),
    trozo("IDAT", zlib.deflateSync(crudo, { level: 9 })),
    trozo("IEND", Buffer.alloc(0))
  ]);
}

const raiz = path.join(__dirname, "..");
[
  ["icon-180.png", 180, { maskable: false }],   // apple-touch-icon
  ["icon-192.png", 192, { maskable: false }],
  ["icon-512.png", 512, { maskable: false }],
  ["icon-512-maskable.png", 512, { maskable: true }]
].forEach(([nombre, lado, opciones]) => {
  const destino = path.join(raiz, nombre);
  fs.writeFileSync(destino, png(lado, pintar(lado, opciones)));
  console.log(nombre, fs.statSync(destino).size + " bytes");
});

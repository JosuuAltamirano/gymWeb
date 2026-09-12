# Mi Gym

Web personal de una sola pantalla para llevar la rutina de gym, las sesiones,
el progreso y la comida. Pensada para abrirse en el móvil, dentro del gym,
con una sola mano.

## Qué es

Sin backend, sin cuentas, sin build y sin dependencias externas. Todo funciona abriendo la página; los datos viven en el móvil.

```
index.html          estructura y navegación
css/estilos.css     sistema visual
js/datos.js         rutinas, técnica, alimentos, guía — los datos fijos
js/db.js            base de datos local y capa de acceso
js/app.js           pantallas y lógica
sw.js, manifest.json, icon.svg    instalación y funcionamiento sin internet
```

## La base de datos

IndexedDB normalizada, con índices y migraciones versionadas. El esquema:

| Tabla | Clave | Índices | Qué guarda |
|---|---|---|---|
| `sesiones` | id | fecha, diaKey | cada entreno: nombre, modo, volumen, duración |
| `series` | id | ejercicio, sesion, (ejercicio, fecha) | una fila por serie: peso y repeticiones |
| `pesajes` | fecha | — | peso corporal |
| `medidas` | fecha | — | brazo, pecho, muslo, gemelo, antebrazo |
| `comidas` | id | fecha | cada cosa que anotas, con proteína y kcal |
| `ajustes` | clave | — | modo de semana, sesión en curso, checklist... |

Las series son filas independientes, así que consultar el histórico de un ejercicio, su récord o el volumen de una semana es una consulta, no recorrer un bloque entero. Al arrancar se carga todo en memoria (un año de entrenos son unos miles de filas) y por eso la interfaz responde al instante.

Si existen datos del formato antiguo, se migran solos la primera vez: se reconstruyen sesiones y series a partir del historial por ejercicio. El bloque antiguo no se borra nunca.

## Cómo usarla

### Opción 1 — abrir el archivo directamente
Abre `index.html` en el navegador del móvil (por ejemplo, mándatelo por WhatsApp/Drive y ábrelo). Funciona igual, pero sin el "Añadir a pantalla de inicio" tan pulido y sin el service worker de caché.

### Opción 2 — GitHub Pages (recomendado)
1. En el repo, ve a **Settings → Pages**.
2. En "Build and deployment" elige **Deploy from a branch**.
3. Selecciona la rama con estos archivos (o mergéala a `main`) y la carpeta `/ (root)`.
4. Guarda. En un par de minutos tendrás una URL tipo `https://<usuario>.github.io/gymWeb/`.
5. Abre esa URL en el móvil → menú del navegador → **"Añadir a pantalla de inicio"**.

A partir de ahí se abre como una app normal, en pantalla completa, tema oscuro, y sigue funcionando sin cobertura.

## Pantallas

1. **HOY** — qué toca hoy, horario del gym del día, botón para empezar sesión, opción de entrenar otra sesión (para cuando el domingo no cuadra o recuperas un día), selector NORMAL/OBRA, peso actual con pesaje semanal en línea, proteína del día de un vistazo, aviso de semana de descarga y, por la noche, el checklist de mañana si al día siguiente toca gym.

   Antes del 22 de septiembre muestra la cuenta atrás y el calendario de arranque, pero **funcionando**: puedes marcar cada hito, registrar el peso inicial, marcar la foto del día 1 y hacer las sesiones suaves del 15 y el 16.
2. **SESIÓN** — calentamiento con los pesos de aproximación ya calculados, cada serie pre-sugerida según la doble progresión (un toque al check y queda registrada), últimas cargas a la vista, tiempo que llevas dentro, temporizador de descanso automático (aguanta si recargas la página), técnica de cada ejercicio, marca de puntos débiles, añadir/quitar series, modo rápido (avisando de qué se queda fuera) y descartar sesión. La pantalla no se apaga mientras entrenas.
3. **PROGRESO** — gráfica de peso corporal con objetivo y aviso automático de "come más" si en 2 semanas no subes, récords personales, gráfica de carga por ejercicio, historial de sesiones, medidas, foto mensual, copia de seguridad (exportar/importar JSON).
4. **COMIDA** — contador de proteína del día con botones rápidos, menús guardados, lista de la compra con botón de copiar para WhatsApp.
5. **GUÍA** — técnica, progresión, suplementos, sueño, alcohol, qué hacer cuando algo falla, qué esperar mes a mes, lo que no hago.
6. **CHECK** — checklist de la noche anterior a un día de gym.

## Datos

Todo el contenido (rutinas, técnica, comida, suplementos, sueño...) viene directamente de tus notas (`rutina-gym.md`, `guia-completa-gym.md`, `spec-web.md`) y está embebido en `index.html`. Si cambias de rutina o de datos, se edita ahí — son objetos JS al principio del `<script>`, fáciles de localizar por nombre (`RUTINA_NORMAL`, `ALIMENTOS`, `TECNICA`, etc.).

## Cómo se guardan los datos

Todo se guarda solo, en el móvil, cada vez que tocas algo. No hay cuentas ni servidor. Tres capas para que el progreso no se pierda:

1. **IndexedDB** — el registro principal, escrito en cada cambio.
2. **Copia de rescate en `localStorage`** — se reescribe en paralelo. Si la base se vacía, al abrir la web se reconstruye desde aquí.
3. **Exportar/importar `.json`** desde PROGRESO — la red de seguridad si cambias de móvil o borras los datos del navegador. La web te recuerda hacerlo si hace más de un mes.

Además pide al navegador almacenamiento persistente (`navigator.storage.persist()`), que evita que el sistema borre los datos para hacer sitio.

## Diseño

Casi negro, hueso y un solo color de señal (volt). Sin librerías ni fuentes externas: tipografía del sistema trabajada con escala, peso y tracking, números tabulares para las cargas, iconos SVG dibujados a mano e interfaz pensada para leerse a las 6:00 con poca luz y una sola mano.

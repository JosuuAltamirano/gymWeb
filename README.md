# Mi Gym

Web personal de una sola pantalla para llevar la rutina de gym, las sesiones,
el progreso y la comida. Pensada para abrirse en el móvil, dentro del gym,
con una sola mano.

## Qué es

Sin backend, sin cuentas, sin build y sin dependencias externas. Todo funciona abriendo la página; los datos viven en el móvil.

```
index.html                estructura y navegación
css/estilos.css           sistema visual
js/datos.js               rutinas, técnica, alimentos, guía — los datos fijos
js/db.js                  base de datos local y capa de acceso
js/avisos.js              calendario (.ics) y aviso de descanso
js/app.js                 pantallas y lógica
sw.js                     funcionamiento sin internet y actualizaciones
manifest.json, icon*.png  instalación en el móvil
tools/iconos.js           genera los iconos PNG
tests/                    pruebas de extremo a extremo
.github/workflows/        CI y publicación automática
```

### Desarrollo

```bash
npm ci                       # solo eslint y playwright
npx playwright install chromium
npm run serve                # http://localhost:8080
npm test                     # 118 pruebas sobre un navegador real
npm run lint
```

Las pruebas abren la web en Chromium con el reloj congelado en una fecha concreta, así se puede comprobar cómo se comporta un lunes a las 6:05, un domingo por la noche o durante una semana de obra. Cada archivo levanta su propio servidor en un puerto libre y su propio navegador.

Cada `push` pasa lint y pruebas en CI; cada `push` a `main` publica en GitHub Pages.

### Versiones

`VERSION` en `js/datos.js` es la única fuente: el service worker se registra con ella (`sw.js?v=…`), cada versión usa su propia caché y las anteriores se borran. Una versión nueva **no** se instala sola a mitad de sesión: la web avisa y se actualiza cuando lo aceptas, y nunca mientras estás entrenando.

## La base de datos

IndexedDB normalizada, con índices y migraciones versionadas. El esquema:

| Tabla | Clave | Índices | Qué guarda |
|---|---|---|---|
| `sesiones` | id | fecha, diaKey | cada entreno: nombre, modo, volumen, duración |
| `series` | id | ejercicio, sesion, (ejercicio, fecha) | una fila por serie: peso y repeticiones |
| `pesajes` | fecha | — | peso corporal |
| `medidas` | fecha | — | brazo, pecho, muslo, gemelo, antebrazo |
| `comidas` | id | fecha | cada cosa que anotas, con proteína y kcal |
| `alimentos` | id | — | tus alimentos propios y tus correcciones al catálogo |
| `ajustes` | clave | — | modo de semana, sesión en curso, checklist... |

Las series son filas independientes, así que consultar el histórico de un ejercicio, su récord o el volumen de una semana es una consulta, no recorrer un bloque entero. Al arrancar se carga todo en memoria (un año de entrenos son unos miles de filas) y por eso la interfaz responde al instante.

Tres garantías, con una prueba cada una (`tests/integridad.test.js`, que mete un año entero: 208 sesiones y 4160 series):

- **Una sesión entra entera o no entra.** Guardar un entreno es una sola transacción, así que cerrar la web a media escritura no deja una sesión con la mitad de sus series. Borrarla también: se lleva las suyas de una vez, sin dejar huérfanas.
- **Los ids no se repiten nunca.** Son estrictamente crecientes y al arrancar se siembran con el mayor que ya exista, así que aunque el móvil atrase la hora (cambio de zona, NTP) una fila nueva no puede machacar una guardada.
- **Si una escritura falla, te enteras.** No se guarda en silencio: la sesión sigue en memoria y en la copia de rescate, y la web te dice que exportes antes de cerrar.

Con un año de datos dentro, las consultas siguen siendo instantáneas (histórico 1 ms, récord y volumen por debajo de 5 ms) y la copia de rescate ocupa unos 600 KB de los ~5 MB que da `localStorage`.

Si existen datos del formato antiguo, se migran solos la primera vez: se reconstruyen sesiones y series a partir del historial por ejercicio. El bloque antiguo no se borra nunca.

## Cómo usarla

### En el iPhone (lo normal)
1. Abre la URL de GitHub Pages en **Safari** (en Chrome no sale la opción).
2. Botón de compartir → **Añadir a pantalla de inicio**.
3. Se abre como una app: pantalla completa, sin barra del navegador y sin necesidad de cobertura.

Los iconos son PNG de verdad (`icon-180.png` para iOS, que ignora los SVG), así que en la pantalla de inicio sale el icono y no una captura de la página. Se generan con `node tools/iconos.js` a partir de la misma geometría que `icon.svg`: si cambia el color de la web, se vuelven a generar y listo.

### Publicarla
Ya está publicada en **https://josuualtamirano.github.io/gymWeb/**. Cada `push` a `main` copia la web a la rama `gh-pages` (`.github/workflows/pages.yml`) y GitHub la sirve desde ahí; en `gh-pages` solo va lo que el navegador necesita, sin pruebas ni herramientas.

No se usa el camino de `configure-pages`/`deploy-pages` porque crear el sitio de Pages pide permisos de administración que el token de Actions no tiene.

### Sin publicarla
Abre `index.html` directamente en el navegador. Funciona igual, pero sin "Añadir a pantalla de inicio" tan pulido y sin caché sin conexión.

## Pantallas

1. **HOY** — qué toca hoy, **cómo va la semana** (los siete días de un vistazo: lo hecho, lo que queda y lo que se dejó atrás, con el nombre de la sesión que falta), horario del gym del día, botón para empezar sesión, opción de entrenar otra sesión (para cuando el domingo no cuadra o recuperas un día), selector NORMAL/OBRA, peso actual con pesaje semanal en línea, proteína del día de un vistazo, aviso de semana de descarga y, por la noche, el checklist de mañana si al día siguiente toca gym.

   Antes del 22 de septiembre muestra la cuenta atrás y el calendario de arranque, pero **funcionando**: puedes marcar cada hito, registrar el peso inicial, marcar la foto del día 1 y hacer las sesiones suaves del 15 y el 16.
2. **SESIÓN** — calentamiento con los pesos de aproximación ya calculados, cada serie pre-sugerida según la doble progresión (un toque al check y queda registrada), últimas cargas a la vista, tiempo que llevas dentro, temporizador de descanso automático (aguanta si recargas la página), técnica de cada ejercicio, marca de puntos débiles, añadir/quitar series, **cambiar o saltar un ejercicio** (gym lleno, algo que duele), **nota de la sesión**, modo rápido (avisando de qué se queda fuera) y descartar sesión. La pantalla no se apaga mientras entrenas, y si el móvil cierra la pestaña (en el iPhone pasa en cuanto abres otra app) al volver entras directamente en la sesión, no en el inicio.
3. **PROGRESO** — resumen (sesiones, media semanal, carga movida, ritmo real de peso), gráfica de peso corporal con objetivo y aviso automático de "come más" si en 2 semanas no subes, volumen por semana, récords personales, carga por ejercicio, historial de sesiones **abrible y corregible**, medidas con gráfica de evolución, foto mensual, recordatorios al calendario y copia de seguridad.
4. **COMIDA** — contador de proteína del día (y de **ayer**, porque la cena se apunta al día siguiente más veces de las que uno admite), **los últimos 7 días** con la media y los días que llegaste al objetivo, catálogo de productos reales del Mercadona con raciones concretas (buscable y con lo que más repites arriba), corrección de cualquier valor con el de tu etiqueta, alimentos propios, menús guardados y lista de la compra con botón de copiar para WhatsApp.
5. **GUÍA** — técnica, progresión, suplementos, sueño, alcohol, qué hacer cuando algo falla, qué esperar mes a mes, lo que no hago.
6. **CHECK** — checklist de la noche anterior a un día de gym.

## Datos

Todo el contenido (rutinas, técnica, comida, suplementos, sueño...) viene directamente de tus notas (`rutina-gym.md`, `guia-completa-gym.md`, `spec-web.md`) y vive en `js/datos.js`, separado de la lógica. Si cambias de rutina, se edita ahí: son objetos con nombre (`RUTINA_NORMAL`, `RUTINA_OBRA`, `ALIMENTOS`, `TECNICA`...) y nada más hay que tocar.

## Cómo se guardan los datos

Todo se guarda solo, en el móvil, cada vez que tocas algo. No hay cuentas ni servidor. Tres capas para que el progreso no se pierda:

1. **IndexedDB** — el registro principal, escrito en cada cambio.
2. **Copia de rescate en `localStorage`** — se reescribe en paralelo. Si la base se vacía, al abrir la web se reconstruye desde aquí.
3. **Exportar/importar `.json`** desde PROGRESO — la red de seguridad si cambias de móvil o borras los datos del navegador. La web te recuerda hacerlo si hace más de un mes.

Además pide al navegador almacenamiento persistente (`navigator.storage.persist()`), que evita que el sistema borre los datos para hacer sitio.

## Objetivos

Los 130 g de proteína, las 2900 kcal y los 74 kg de peso objetivo se editan desde PROGRESO, sin tocar código: a 74 kg no tocan los mismos gramos que a 66. Debajo se ve a cuántos **gramos por kilo** equivale tu objetivo con tu peso actual (para ganar músculo se suele apuntar a 1,6-2,2), así el número se puede juzgar en vez de arrastrarlo. El perfil de `js/datos.js` es solo el punto de partida.

## Los alimentos

El catálogo son productos que se compran en el Mercadona, con raciones de verdad (una lata escurrida, un vaso de 250 ml, 150 g de pechuga) en vez de "100 g" de algo abstracto. Los valores son orientativos por ración: las recetas cambian y cada formato trae lo suyo, así que **cualquier valor se corrige con el de tu etiqueta** tocando el lápiz, y esa corrección se guarda como tuya para siempre. Lo que compras y no está, se añade como alimento fijo.

Lo que más repites sale arriba del todo, calculado de tu propio historial: después de una semana son casi todo lo que necesitas.

## Corregir errores

Apuntar 400 kg en vez de 40 pasa, y sin poder arreglarlo ese error envenena el récord, el volumen y las gráficas para siempre. Desde PROGRESO se abre cualquier sesión pasada para ver lo que hiciste, corregir pesos y repeticiones, borrar una serie suelta o la sesión entera (que se lleva sus series, sin dejar huérfanas) y dejar una nota. Los pesajes también se pueden borrar.

## Semana de descarga

A las 8 semanas la web avisa, y puede **aplicarla**: durante 7 días las sesiones vienen con la mitad de las series y el peso al 65%, y no se sube carga aunque llegues al tope del rango — una semana suave no es motivo para progresar.

## Avisos

Una web sin servidor no puede notificarte nada con el móvil guardado, así que no se simula:

- **Calendario (.ics)** — desde PROGRESO se descargan tus entrenos, el recordatorio de preparar la mochila la noche antes, el pesaje del domingo y la foto mensual, cada uno con su alarma. Los avisos los da el calendario del móvil, que sí funciona siempre.
- **Fin del descanso** — si sales de la web mientras descansas entre series, puede avisarte al terminar la cuenta atrás (permiso opcional).

## Diseño

Casi negro, hueso y un solo color de señal (volt). Sin librerías ni fuentes externas: tipografía del sistema trabajada con escala, peso y tracking, números tabulares para las cargas, iconos SVG dibujados a mano e interfaz pensada para leerse a las 6:00 con poca luz y una sola mano.

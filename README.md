# Mi Gym

Web personal de una sola pantalla para llevar la rutina de gym, las sesiones,
el progreso y la comida. Pensada para abrirse en el móvil, dentro del gym,
con una sola mano.

## Qué es

- **index.html** — toda la app: interfaz, datos de la rutina/comida/guía y lógica en un único archivo.
- **manifest.json** + **icon.svg** + **sw.js** — lo mínimo para poder "Añadir a pantalla de inicio" e instalar la web como una app que funciona sin internet una vez cargada.

No hay backend, no hay build, no hay dependencias externas. Todo se guarda en el navegador (`localStorage`), no hay cuentas ni login.

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

1. **HOY** — qué toca hoy, botón para empezar sesión, selector NORMAL/OBRA, peso actual, cuenta atrás hasta el 22 de septiembre.
2. **SESIÓN** — ejercicios del día con últimas cargas, series/repes a rellenar, temporizador de descanso automático, técnica de cada ejercicio, modo rápido.
3. **PROGRESO** — gráfica de peso corporal, récords personales, gráfica de carga por ejercicio, medidas, foto mensual, copia de seguridad (exportar/importar JSON).
4. **COMIDA** — contador de proteína del día con botones rápidos, menús guardados, lista de la compra con botón de copiar para WhatsApp.
5. **GUÍA** — técnica, progresión, suplementos, sueño, alcohol, qué hacer cuando algo falla, qué esperar mes a mes, lo que no hago.
6. **CHECK** — checklist de la noche anterior a un día de gym.

## Datos

Todo el contenido (rutinas, técnica, comida, suplementos, sueño...) viene directamente de tus notas (`rutina-gym.md`, `guia-completa-gym.md`, `spec-web.md`) y está embebido en `index.html`. Si cambias de rutina o de datos, se edita ahí — son objetos JS al principio del `<script>`, fáciles de localizar por nombre (`RUTINA_NORMAL`, `ALIMENTOS`, `TECNICA`, etc.).

## Backup

Como los datos viven solo en el navegador de tu móvil, en **PROGRESO** hay un botón para exportar todo a un `.json` (por si cambias de móvil o borras datos del navegador) y otro para importarlo de vuelta.

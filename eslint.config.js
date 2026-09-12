/* Sin bundler ni transpilador: los archivos de js/ se cargan como scripts
   clásicos y comparten ámbito global, así que se declaran entre ellos. */

const globalesNavegador = {
  window: "readonly", document: "readonly", navigator: "readonly",
  localStorage: "readonly", indexedDB: "readonly", location: "readonly",
  setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly",
  clearInterval: "readonly", console: "readonly", Blob: "readonly",
  URL: "readonly", FileReader: "readonly", Notification: "readonly",
  caches: "readonly", fetch: "readonly", self: "readonly"
};

// Lo que cada archivo publica para los demás.
const globalesApp = {
  PERFIL: "readonly", HORARIOS_GYM: "readonly", NOTAS_DIA: "readonly",
  RUTINA_NORMAL: "readonly", RUTINA_OBRA: "readonly", REGLAS_PROGRESION: "readonly",
  CALENTAMIENTO: "readonly", TECNICA: "readonly", ALIMENTOS: "readonly",
  MENUS: "readonly", COMPRA: "readonly", SUPLEMENTOS: "readonly", SUENO: "readonly",
  ALCOHOL: "readonly", PROBLEMAS: "readonly", NO_HAGO: "readonly",
  EXPECTATIVAS: "readonly", CALENDARIO: "readonly", FRASES: "readonly",
  CHECKLIST_ITEMS: "readonly", VERSION: "readonly",
  Datos: "readonly", Avisos: "readonly", DIAS_ORDEN: "readonly",
  state: "readonly", saveState: "readonly",
  pedirAlmacenamientoPersistente: "readonly", lunesDe: "readonly", nuevoId: "readonly",
  toast: "readonly", RENDERERS: "readonly", iniciarSesion: "readonly",
  switchScreen: "readonly", fmtFecha: "readonly", todayStr: "readonly",
  daysBetween: "readonly", escapeHtml: "readonly"
};

module.exports = [
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globalesNavegador, ...globalesApp }
    },
    rules: {
      "no-undef": "error",
      /* Los globales que declara un archivo los consumen los otros, así que
         solo interesan las variables locales sin usar (esas sí son un olvido). */
      "no-unused-vars": ["warn", { vars: "local", args: "none", caughtErrors: "none" }],
      "no-var": "error",
      "prefer-const": "warn",
      eqeqeq: ["warn", "smart"],
      "no-implicit-globals": "off"
    }
  },
  {
    files: ["tests/**/*.js", "*.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        require: "readonly", module: "writable", process: "readonly",
        __dirname: "readonly", console: "readonly", localStorage: "readonly",
        ...globalesApp
      }
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }]
    }
  },
  {
    files: ["sw.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globalesNavegador }
    }
  }
];

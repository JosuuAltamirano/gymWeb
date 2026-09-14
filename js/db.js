/* ============================================================
   BASE DE DATOS LOCAL
   ------------------------------------------------------------
   IndexedDB normalizada con índices y migraciones versionadas.
   Es el registro principal; localStorage queda solo como copia
   de rescate por si el navegador vacía la base.

   El histórico completo se carga en memoria al arrancar (un año
   de entrenos son unos pocos miles de filas), así el renderizado
   sigue siendo síncrono y la interfaz responde al instante.
   ============================================================ */

const DB_NOMBRE = "migym";
const DB_VERSION = 2;
const CLAVE_RESCATE = "migym_rescate";
const CLAVE_ANTIGUA = "gymapp_v1";

const ESQUEMA = {
  sesiones: { keyPath:"id", autoIncrement:true, indices:[
    {nombre:"fecha", campo:"fecha"},
    {nombre:"diaKey", campo:"diaKey"}
  ]},
  series: { keyPath:"id", autoIncrement:true, indices:[
    {nombre:"ejercicio", campo:"ejercicioId"},
    {nombre:"sesion", campo:"sesionId"},
    {nombre:"ejercicioFecha", campo:["ejercicioId","fecha"]}
  ]},
  pesajes: { keyPath:"fecha", indices:[] },
  medidas: { keyPath:"fecha", indices:[] },
  comidas: { keyPath:"id", autoIncrement:true, indices:[
    {nombre:"fecha", campo:"fecha"}
  ]},
  ajustes: { keyPath:"clave", indices:[] },
  // Alimentos propios y correcciones a los del catálogo, por id.
  alimentos: { keyPath:"id", indices:[] }
};

const Datos = {
  bd: null,
  disponible: false,
  sesiones: [],
  series: [],
  pesajes: [],
  medidas: [],
  comidas: [],
  alimentos: [],
  ajustes: {},

  /* ---------- Apertura y migración ---------- */

  abrir(alTerminar){
    if(!("indexedDB" in window)){
      this.cargarDeRescate();
      alTerminar();
      return;
    }
    let req;
    try{ req = indexedDB.open(DB_NOMBRE, DB_VERSION); }
    catch(e){ this.cargarDeRescate(); alTerminar(); return; }

    req.onupgradeneeded = ev=>{
      const bd = req.result;
      Object.keys(ESQUEMA).forEach(nombre=>{
        if(bd.objectStoreNames.contains(nombre)) return;
        const def = ESQUEMA[nombre];
        const almacen = bd.createObjectStore(nombre, {
          keyPath: def.keyPath,
          autoIncrement: !!def.autoIncrement
        });
        def.indices.forEach(i=> almacen.createIndex(i.nombre, i.campo));
      });
    };
    req.onerror = ()=>{ this.cargarDeRescate(); alTerminar(); };
    req.onsuccess = ()=>{
      this.bd = req.result;
      this.disponible = true;
      this.bd.onversionchange = ()=>{ try{ this.bd.close(); }catch(e){} };
      this.cargarTodo(()=>{
        this.migrarSiHaceFalta(()=>{
          this.rescatarSiVacia(()=>{
            /* Rehace la copia de rescate en cada arranque: si el navegador
               vació localStorage, sin esto la red de seguridad no existiría
               hasta el siguiente cambio. */
            this.escribirRescate();
            alTerminar();
          });
        });
      });
    };
  },

  cargarTodo(alTerminar){
    const nombres = Object.keys(ESQUEMA);
    let pendientes = nombres.length;
    try{
      const tx = this.bd.transaction(nombres, "readonly");
      nombres.forEach(nombre=>{
        const req = tx.objectStore(nombre).getAll();
        req.onsuccess = ()=>{
          if(nombre==="ajustes"){
            this.ajustes = {};
            (req.result||[]).forEach(f=> this.ajustes[f.clave] = f.valor);
          } else {
            this[nombre] = req.result || [];
          }
          if(--pendientes === 0){ this.ordenar(); alTerminar(); }
        };
        req.onerror = ()=>{ if(--pendientes === 0){ this.ordenar(); alTerminar(); } };
      });
    }catch(e){ alTerminar(); }
  },

  ordenar(){
    sembrarContadorId(this.series);
    sembrarContadorId(this.sesiones);
    sembrarContadorId(this.comidas);
    this.pesajes.sort((a,b)=> a.fecha.localeCompare(b.fecha));
    this.medidas.sort((a,b)=> a.fecha.localeCompare(b.fecha));
    this.sesiones.sort((a,b)=> a.fecha.localeCompare(b.fecha) || (a.id-b.id));
    this.series.sort((a,b)=> a.fecha.localeCompare(b.fecha) || (a.id-b.id));
  },

  /* Pasa el formato antiguo (un único blob en localStorage) a tablas.
     La condición es que la base esté vacía y exista el blob: no hace falta
     marca de "ya migrado", porque en cuanto hay filas deja de cumplirse.
     El blob antiguo no se borra nunca, por si hubiera que repetirlo. */
  migrarSiHaceFalta(alTerminar){
    const vacia = !this.sesiones.length && !this.series.length && !this.pesajes.length;
    if(!vacia){ alTerminar(); return; }
    let viejo = null;
    try{ viejo = JSON.parse(localStorage.getItem(CLAVE_ANTIGUA) || "null"); }catch(e){}
    if(!viejo){ alTerminar(); return; }

    const escrituras = [];
    (viejo.pesoLog||[]).forEach(p=> escrituras.push(["pesajes", {fecha:p.fecha, kg:p.kg}]));
    (viejo.medidas||[]).forEach(m=> escrituras.push(["medidas", m]));

    // El historial antiguo iba por ejercicio; se reconstruyen sesiones y series.
    const porFecha = {};
    Object.keys(viejo.historial||{}).forEach(ejercicioId=>{
      (viejo.historial[ejercicioId]||[]).forEach(ses=>{
        (porFecha[ses.fecha] = porFecha[ses.fecha] || []).push({ejercicioId, series:ses.series||[]});
      });
    });
    const resumenes = {};
    (viejo.sesionesHechas||[]).forEach(s=> resumenes[s.fecha] = s);

    Object.keys(porFecha).sort().forEach(fecha=>{
      const resumen = resumenes[fecha] || {};
      const sesion = {
        fecha,
        diaKey: resumen.diaKey || "",
        nombre: resumen.nombre || "Sesión",
        modo: resumen.modo || "normal",
        rapida: !!resumen.rapida,
        migrada: true
      };
      escrituras.push(["sesiones", sesion, filas=>{
        porFecha[fecha].forEach(ej=>{
          ej.series.forEach((st,i)=> escrituras.push(["series", {
            sesionId: filas, ejercicioId: ej.ejercicioId, orden:i,
            peso: Number(st.peso), repes: Number(st.repes), fecha
          }]));
        });
      }]);
    });

    this.escribirEnCadena(escrituras, ()=>{
      const ajustes = {
        modo: viejo.modo || "normal",
        sesionActual: viejo.sesionActual || null,
        checklist: viejo.checklist || {fecha:null, marcados:{}},
        arranque: viejo.arranque || {},
        deload: viejo.deload || {ultimaFecha:null},
        fotos: viejo.fotos || {ultimaFecha:null},
        subirPeso: viejo.subirPeso || {},
        ultimaExportacion: viejo.ultimaExportacion || null
      };
      Object.keys(ajustes).forEach(c=> this.guardarAjuste(c, ajustes[c]));
      // Las comidas del día antiguo no se arrastran: son de hoy y caducan solas.
      this.cargarTodo(alTerminar);
    });
  },

  // Escribe en orden porque las series necesitan el id de su sesión.
  escribirEnCadena(escrituras, alTerminar){
    if(!escrituras.length){ alTerminar(); return; }
    const siguiente = (i)=>{
      if(i >= escrituras.length){ alTerminar(); return; }
      const [almacen, valor, despues] = escrituras[i];
      try{
        const tx = this.bd.transaction(almacen, "readwrite");
        const req = tx.objectStore(almacen).put(valor);
        req.onsuccess = ()=>{
          if(despues) despues(req.result);
          siguiente(i+1);
        };
        req.onerror = ()=> siguiente(i+1);
      }catch(e){ siguiente(i+1); }
    };
    siguiente(0);
  },

  /* ---------- Escrituras ---------- */

  escribir(almacen, valor, alTerminar){
    this.guardarRescate();
    if(!this.disponible){ if(alTerminar) alTerminar(valor[ESQUEMA[almacen].keyPath]); return; }
    try{
      const tx = this.bd.transaction(almacen, "readwrite");
      const req = tx.objectStore(almacen).put(valor);
      req.onsuccess = ()=>{ if(alTerminar) alTerminar(req.result); };
      req.onerror = ()=>{ if(alTerminar) alTerminar(null); };
    }catch(e){ if(alTerminar) alTerminar(null); }
  },

  borrar(almacen, clave){
    this.guardarRescate();
    if(!this.disponible) return;
    try{ this.bd.transaction(almacen,"readwrite").objectStore(almacen).delete(clave); }catch(e){}
  },

  guardarAjuste(clave, valor){
    this.ajustes[clave] = valor;
    this.escribir("ajustes", {clave, valor});
  },

  añadirPesaje(fecha, kg){
    const fila = {fecha, kg};
    this.pesajes = this.pesajes.filter(p=>p.fecha!==fecha).concat([fila]);
    this.pesajes.sort((a,b)=> a.fecha.localeCompare(b.fecha));
    this.escribir("pesajes", fila);
  },

  añadirMedidas(medida){
    this.medidas = this.medidas.filter(m=>m.fecha!==medida.fecha).concat([medida]);
    this.medidas.sort((a,b)=> a.fecha.localeCompare(b.fecha));
    this.escribir("medidas", medida);
  },

  /* Guarda la sesión y todas sus series en UNA transacción: o entra el
     entreno entero o no entra nada. Antes iba fila a fila, y cerrar la web
     a media escritura dejaba sesiones con la mitad de las series. */
  registrarSesion(sesion, seriesPorEjercicio){
    sesion.id = nuevoId();
    const filas = [];
    seriesPorEjercicio.forEach(({ejercicioId, series})=>{
      series.forEach((st,i)=> filas.push({
        id: nuevoId(), sesionId: sesion.id, ejercicioId, orden: i,
        peso: Number(st.peso), repes: Number(st.repes), fecha: sesion.fecha
      }));
    });

    this.sesiones.push(sesion);
    filas.forEach(f=> this.series.push(f));
    this.guardarRescate();

    if(!this.disponible) return;
    try{
      const tx = this.bd.transaction(["sesiones","series"], "readwrite");
      tx.objectStore("sesiones").put(sesion);
      const almacen = tx.objectStore("series");
      filas.forEach(f=> almacen.put(f));
      tx.onabort = tx.onerror = ()=> this.avisarEscrituraFallida();
    }catch(e){ this.avisarEscrituraFallida(); }
  },

  /* Si la escritura falla, la sesión sigue en memoria y en la copia de
     rescate, así que no se pierde: lo que no puede pasar es que el usuario
     no se entere. */
  avisarEscrituraFallida(){
    this.escribirRescate();
    if(typeof toast === "function"){
      toast("No se ha podido guardar en la base del móvil. Exporta una copia desde PROGRESO antes de cerrar.", 8000);
    }
  },

  /* ---------- Correcciones ----------
     Apuntar 400 kg en vez de 40 pasa. Sin esto, ese error queda para
     siempre en el récord, en el volumen y en las gráficas. */

  actualizarSerie(id, cambios){
    const fila = this.series.find(s=> s.id === id);
    if(!fila) return;
    Object.assign(fila, cambios);
    this.escribir("series", fila);
  },

  borrarSerie(id){
    this.series = this.series.filter(s=> s.id !== id);
    this.borrar("series", id);
  },

  actualizarSesion(id, cambios){
    const fila = this.sesiones.find(s=> s.id === id);
    if(!fila) return;
    Object.assign(fila, cambios);
    this.escribir("sesiones", fila);
  },

  /* Borrar una sesión se lleva sus series, en una sola transacción: a medias
     quedarían filas huérfanas contando en el volumen y en los récords. */
  borrarSesion(id){
    const suyas = this.series.filter(s=> s.sesionId === id).map(s=> s.id);
    this.series = this.series.filter(s=> s.sesionId !== id);
    this.sesiones = this.sesiones.filter(s=> s.id !== id);
    this.guardarRescate();

    if(!this.disponible) return;
    try{
      const tx = this.bd.transaction(["sesiones","series"], "readwrite");
      const almacen = tx.objectStore("series");
      suyas.forEach(idSerie=> almacen.delete(idSerie));
      tx.objectStore("sesiones").delete(id);
      tx.onabort = tx.onerror = ()=> this.avisarEscrituraFallida();
    }catch(e){ this.avisarEscrituraFallida(); }
  },

  borrarPesaje(fecha){
    this.pesajes = this.pesajes.filter(p=> p.fecha !== fecha);
    this.borrar("pesajes", fecha);
  },

  borrarMedida(fecha){
    this.medidas = this.medidas.filter(m=> m.fecha !== fecha);
    this.borrar("medidas", fecha);
  },

  // Recalcula el resumen de una sesión tras editarla.
  recalcularSesion(id){
    const series = this.series.filter(s=> s.sesionId === id);
    const ejercicios = new Set(series.map(s=> s.ejercicioId)).size;
    this.actualizarSesion(id, {
      series: series.length,
      ejercicios,
      volumen: Math.round(series.reduce((t,s)=> t + s.peso*s.repes, 0))
    });
  },

  /* Catálogo = lo que trae la web, con tus correcciones encima, más los
     alimentos que hayas añadido tú. Si tu etiqueta dice otra cosa, manda
     la tuya. */
  catalogo(){
    const propios = new Map(this.alimentos.map(a=> [a.id, a]));
    const base = ALIMENTOS.map(a=> propios.has(a.id) ? {...a, ...propios.get(a.id), propio:true} : a);
    const extra = this.alimentos.filter(a=> !ALIMENTOS.some(b=> b.id === a.id))
      .map(a=> ({...a, propio:true, nuevo:true}));
    return base.concat(extra);
  },

  guardarAlimento(alimento){
    this.alimentos = this.alimentos.filter(a=> a.id !== alimento.id).concat([alimento]);
    this.escribir("alimentos", alimento);
  },

  // Borrar el tuyo devuelve el del catálogo, si lo había.
  borrarAlimento(id){
    this.alimentos = this.alimentos.filter(a=> a.id !== id);
    this.borrar("alimentos", id);
  },

  // Lo que más repites: después de una semana son casi todo lo que usas.
  alimentosFrecuentes(cuantos){
    const cuenta = new Map();
    this.comidas.forEach(c=> cuenta.set(c.nombre, (cuenta.get(c.nombre)||0) + 1));
    return [...cuenta.entries()]
      .sort((a,b)=> b[1]-a[1])
      .slice(0, cuantos||6)
      .map(([nombre])=> this.catalogo().find(a=> a.nombre === nombre))
      .filter(Boolean);
  },

  añadirComida(comida){
    comida.id = nuevoId();
    this.comidas.push(comida);
    this.escribir("comidas", comida);
  },

  borrarComida(id){
    this.comidas = this.comidas.filter(c=>c.id!==id);
    this.borrar("comidas", id);
  },

  /* ---------- Consultas ---------- */

  seriesDe(ejercicioId){
    return this.series.filter(s=>s.ejercicioId===ejercicioId);
  },

  // Series agrupadas por sesión, de la más antigua a la más reciente.
  historialDe(ejercicioId){
    const porSesion = new Map();
    this.seriesDe(ejercicioId).forEach(s=>{
      const clave = s.sesionId!=null ? s.sesionId : s.fecha;
      if(!porSesion.has(clave)) porSesion.set(clave, {fecha:s.fecha, series:[]});
      porSesion.get(clave).series.push(s);
    });
    return [...porSesion.values()]
      .map(g=>({fecha:g.fecha, series:g.series.sort((a,b)=>a.orden-b.orden)}))
      .sort((a,b)=> a.fecha.localeCompare(b.fecha));
  },

  ultimaVezDe(ejercicioId){
    const h = this.historialDe(ejercicioId);
    return h.length ? h[h.length-1] : null;
  },

  ejerciciosConHistorial(){
    return [...new Set(this.series.map(s=>s.ejercicioId))];
  },

  recordDe(ejercicioId){
    let mejor = null;
    this.seriesDe(ejercicioId).forEach(s=>{
      if(!mejor || s.peso>mejor.peso || (s.peso===mejor.peso && s.repes>mejor.repes)) mejor = s;
    });
    return mejor;
  },

  comidasDe(fecha){
    return this.comidas.filter(c=>c.fecha===fecha).sort((a,b)=> (a.id||0)-(b.id||0));
  },

  // Volumen = peso x repes, sumado por semana. Sirve para ver la carga real.
  volumenPorSemana(semanas){
    const cubos = new Map();
    this.series.forEach(s=>{
      const lunes = lunesDe(s.fecha);
      cubos.set(lunes, (cubos.get(lunes)||0) + s.peso*s.repes);
    });
    return [...cubos.entries()]
      .sort((a,b)=> a[0].localeCompare(b[0]))
      .slice(-(semanas||8))
      .map(([fecha,v])=>({fecha, v:Math.round(v)}));
  },

  /* ---------- Copia de rescate y exportación ---------- */

  instantanea(){
    /* Los ajustes salen con las claves ordenadas. Un objeto conserva el orden
       en que se escribieron sus claves, y ese orden cambia al recargar de la
       base: sin esto, exportar e importar los mismos datos da dos archivos
       distintos y no hay forma de compararlos. */
    const ajustes = {};
    Object.keys(this.ajustes).sort().forEach(c=> ajustes[c] = this.ajustes[c]);
    return {
      version: DB_VERSION,
      exportado: new Date().toISOString(),
      sesiones: this.sesiones, series: this.series, pesajes: this.pesajes,
      medidas: this.medidas, comidas: this.comidas, ajustes
    };
  },

  hayDatos(){
    return !!(this.series.length || this.pesajes.length || this.sesiones.length);
  },

  guardarRescate(){
    clearTimeout(this._rescate);
    this._rescate = setTimeout(()=> this.escribirRescate(), 500);
  },

  escribirRescate(){
    /* Nunca pisar una copia con datos por una vacía: si la base se ha
       vaciado, esta copia es lo único que queda. */
    if(!this.hayDatos()){
      try{
        const previa = JSON.parse(localStorage.getItem(CLAVE_RESCATE) || "null");
        if(previa && ((previa.series||[]).length || (previa.pesajes||[]).length)) return;
      }catch(e){}
    }
    try{
      localStorage.setItem(CLAVE_RESCATE, JSON.stringify(this.instantanea()));
      this._rescateRoto = false;
    }catch(e){
      // Modo privado o cuota llena: avisa una vez en lugar de callarse.
      if(!this._rescateRoto && !this.disponible && typeof toast === "function"){
        this._rescateRoto = true;
        toast("Este navegador no deja guardar datos. Exporta una copia desde PROGRESO.", 6000);
      }
    }
  },

  cargarDeRescate(){
    try{
      const datos = JSON.parse(localStorage.getItem(CLAVE_RESCATE) || "null");
      if(!datos) return false;
      this.sesiones = datos.sesiones||[]; this.series = datos.series||[];
      this.pesajes = datos.pesajes||[]; this.medidas = datos.medidas||[];
      this.comidas = datos.comidas||[]; this.ajustes = datos.ajustes||{};
      this.ordenar();
      return true;
    }catch(e){ return false; }
  },

  // Si la base está vacía pero hay copia de rescate, la reconstruye.
  rescatarSiVacia(alTerminar){
    const seguir = alTerminar || (()=>{});
    if(this.hayDatos()) { seguir(); return; }
    let copia = null;
    try{ copia = JSON.parse(localStorage.getItem(CLAVE_RESCATE) || "null"); }catch(e){}
    if(!copia || !((copia.series||[]).length || (copia.pesajes||[]).length)){ seguir(); return; }
    this.importar(copia, seguir);
  },

  importar(datos, alTerminar){
    const escrituras = [];
    ["sesiones","series","pesajes","medidas","comidas"].forEach(almacen=>{
      (datos[almacen]||[]).forEach(fila=> escrituras.push([almacen, fila]));
    });
    Object.keys(datos.ajustes||{}).forEach(c=> escrituras.push(["ajustes", {clave:c, valor:datos.ajustes[c]}]));
    if(!this.disponible){
      this.sesiones = datos.sesiones||[]; this.series = datos.series||[];
      this.pesajes = datos.pesajes||[]; this.medidas = datos.medidas||[];
      this.comidas = datos.comidas||[]; this.ajustes = datos.ajustes||{};
      this.ordenar(); this.guardarRescate(); alTerminar(); return;
    }
    this.escribirEnCadena(escrituras, ()=> this.cargarTodo(alTerminar));
  }
};

/* Los ids los genera la app, no el autoincremento de IndexedDB: así la fila
   entra en memoria en el mismo instante y la pantalla no va un toque por
   detrás esperando a que vuelva la escritura.

   Son estrictamente crecientes y no dependen solo del reloj. Si el móvil
   ajusta la hora hacia atrás (cambio de zona, NTP), un id basado únicamente
   en Date.now() se repetiría y machacaría filas ya guardadas. Al arrancar se
   siembra con el mayor id que ya exista, así nunca se pisa nada. */
let _ultimoId = 0;
function nuevoId(){
  const porReloj = Date.now()*1000;
  _ultimoId = porReloj > _ultimoId ? porReloj : _ultimoId + 1;
  return _ultimoId;
}
function sembrarContadorId(filas){
  filas.forEach(f=>{ if(typeof f.id === "number" && f.id > _ultimoId) _ultimoId = f.id; });
}

// Lunes de la semana a la que pertenece una fecha ISO.
function lunesDe(iso){
  const d = new Date(iso+"T00:00:00");
  const dia = (d.getDay()+6)%7;
  d.setDate(d.getDate()-dia);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

/* ============================================================
   AJUSTES
   ------------------------------------------------------------
   Viven en la tabla `ajustes`, pero se usan como un objeto normal
   para que el código de las pantallas siga siendo legible.
   ============================================================ */

function ajusteCon(clave, porDefecto){
  if(Datos.ajustes[clave] === undefined || Datos.ajustes[clave] === null){
    Datos.ajustes[clave] = porDefecto;
  }
  return Datos.ajustes[clave];
}

/* Los objetivos cambian con el tiempo: a 74 kg ya no tocan los mismos
   gramos de proteína que a 66. Se guardan en ajustes y el perfil es solo
   el punto de partida. */
function objetivo(clave){
  const propios = Datos.ajustes.objetivos || {};
  return propios[clave] !== undefined && propios[clave] !== null
    ? propios[clave]
    : PERFIL[clave];
}

const state = {
  get objetivos(){ return ajusteCon("objetivos", {}); },
  set objetivos(v){ Datos.guardarAjuste("objetivos", v); },

  get modo(){ return ajusteCon("modo", "normal"); },
  set modo(v){ Datos.guardarAjuste("modo", v); },

  get sesionActual(){ return Datos.ajustes.sesionActual || null; },
  set sesionActual(v){ Datos.guardarAjuste("sesionActual", v); },

  get checklist(){ return ajusteCon("checklist", {fecha:null, marcados:{}}); },
  set checklist(v){ Datos.guardarAjuste("checklist", v); },

  get arranque(){ return ajusteCon("arranque", {}); },
  set arranque(v){ Datos.guardarAjuste("arranque", v); },

  get deload(){ return ajusteCon("deload", {ultimaFecha:null}); },
  set deload(v){ Datos.guardarAjuste("deload", v); },

  get fotos(){ return ajusteCon("fotos", {ultimaFecha:null}); },
  set fotos(v){ Datos.guardarAjuste("fotos", v); },

  get subirPeso(){ return ajusteCon("subirPeso", {}); },
  set subirPeso(v){ Datos.guardarAjuste("subirPeso", v); },

  get ultimaExportacion(){ return Datos.ajustes.ultimaExportacion || null; },
  set ultimaExportacion(v){ Datos.guardarAjuste("ultimaExportacion", v); },

  get guardadoEn(){ return Datos.ajustes.guardadoEn || null; }
};

const AJUSTES_PERSISTIDOS = ["modo","sesionActual","checklist","arranque",
  "deload","fotos","subirPeso","ultimaExportacion","objetivos"];

// Persiste los ajustes que se hayan podido modificar en el sitio.
function saveState(){
  Datos.ajustes.guardadoEn = Date.now();
  Datos.guardarAjuste("guardadoEn", Datos.ajustes.guardadoEn);
  AJUSTES_PERSISTIDOS.forEach(c=>{
    if(Datos.ajustes[c] !== undefined) Datos.guardarAjuste(c, Datos.ajustes[c]);
  });
}

// Pide al navegador que no borre estos datos para hacer sitio.
function pedirAlmacenamientoPersistente(){
  try{
    if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  }catch(e){}
}

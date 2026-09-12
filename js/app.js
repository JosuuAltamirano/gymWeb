/* ============================= HELPERS ============================= */

const DIAS_ORDEN = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
const DIAS_LABEL = {lunes:"LUNES",martes:"MARTES",miercoles:"MIÉRCOLES",jueves:"JUEVES",viernes:"VIERNES",sabado:"SÁBADO",domingo:"DOMINGO"};

function todayStr(){
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function getDiaKey(date){
  const jsDay = date.getDay(); // 0=domingo
  return ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][jsDay];
}
function fmtFecha(iso){
  const [y,m,d] = iso.split("-");
  return d+"/"+m+"/"+y;
}
function daysBetween(a,b){
  const A = new Date(a+"T00:00:00"), B = new Date(b+"T00:00:00");
  return Math.round((B-A)/86400000);
}
function getRutina(modo){ return modo==="obra" ? RUTINA_OBRA : RUTINA_NORMAL; }
function getRutinaDia(modo, diaKey){ return getRutina(modo).dias[diaKey]; }
function nombreEjercicio(id){
  for(const modo of [RUTINA_NORMAL, RUTINA_OBRA]){
    for(const dk of DIAS_ORDEN){
      const dia = modo.dias[dk];
      if(!dia || !dia.ejercicios) continue;
      const ex = dia.ejercicios.find(e=>e.id===id);
      if(ex) return ex.nombre;
    }
  }
  return id;
}
function parseRepRange(str){
  const nums = (str.match(/\d+(\.\d+)?/g)||[]).map(Number);
  if(nums.length===0) return {low:0, high:0};
  if(nums.length===1) return {low:nums[0], high:nums[0]};
  return {low:nums[0], high:nums[1]};
}
function fmtDescanso(seg){
  if(seg < 60) return seg+"s";
  const m = Math.floor(seg/60), s = seg%60;
  return s ? m+"m "+s+"s" : m+"m";
}
function tipoEjercicio(id, fallback){
  if(fallback) return fallback;
  for(const dk of DIAS_ORDEN){
    const dia = RUTINA_NORMAL.dias[dk];
    if(!dia || !dia.ejercicios) continue;
    const ex = dia.ejercicios.find(e=>e.id===id);
    if(ex && ex.tipo) return ex.tipo;
  }
  return "aislamiento";
}
function incrementoPara(id, tipo){
  return tipoEjercicio(id, tipo)==="pesado" ? 2.5 : 1.25;
}
function redondear(kg){ return Math.round(kg/2.5)*2.5; }
function horarioGymHoy(diaKey){
  if(diaKey==="sabado") return HORARIOS_GYM["Sábado"];
  if(diaKey==="domingo") return HORARIOS_GYM["Domingo y festivos"];
  return HORARIOS_GYM["L-V"];
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function toast(msg, ms){
  const root = document.getElementById("toastRoot");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(()=>{ el.remove(); }, ms||2600);
}
function randFrase(){
  return FRASES[Math.floor(Math.random()*FRASES.length)];
}

/* ============================= NAVEGACIÓN ============================= */

const RENDERERS = {};
function switchScreen(name){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("screen-"+name).classList.add("active");
  document.querySelectorAll(".navbtn").forEach(b=>b.classList.toggle("active", b.dataset.screen===name));
  if(RENDERERS[name]) RENDERERS[name]();
  window.scrollTo(0,0);
}
document.getElementById("nav").addEventListener("click", e=>{
  const btn = e.target.closest(".navbtn");
  if(btn) switchScreen(btn.dataset.screen);
});

function refreshTopbar(){
  const modoLabel = state.modo==="obra" ? "MODO OBRA" : "MODO NORMAL";
  document.getElementById("topDay").textContent = modoLabel;
  const d = new Date();
  const diaKey = getDiaKey(d);
  document.getElementById("topSub").textContent = DIAS_LABEL[diaKey]+" · "+fmtFecha(todayStr());
}

/* ============================= PANTALLA: HOY ============================= */

RENDERERS.hoy = function(){
  refreshTopbar();
  const el = document.getElementById("screen-hoy");
  const hoyISO = todayStr();
  const iniciado = hoyISO >= PERFIL.fecha_inicio;

  if(!iniciado){
    const dias = daysBetween(hoyISO, PERFIL.fecha_inicio);
    el.innerHTML = `
      <div class="card hero" style="text-align:center;">
        <div class="eyebrow">Faltan</div>
        <div class="num" style="font-size:4.2rem;font-weight:800;color:var(--volt);line-height:.95;margin:6px 0 2px;">${dias}</div>
        <div class="muted" style="font-size:.88rem;">día${dias===1?"":"s"} para empezar el plan</div>
      </div>
      <div class="card">
        <h2>Antes de empezar</h2>
        <p class="muted" style="font-size:.82rem;">El 15 toca apuntarse, foto del día 1 y peso inicial. Márcalo aquí mismo.</p>
        ${cardPesoHTML(hoyISO, true, "Peso inicial. En ayunas, después de mear.")}
        <hr>
        <div class="kpi" style="margin-bottom:6px;">
          <span class="muted" style="font-size:.85rem;">Foto del día 1</span>
          <span class="muted" style="font-size:.8rem;">${state.fotos.ultimaFecha? "hecha el "+fmtFecha(state.fotos.ultimaFecha) : "pendiente"}</span>
        </div>
        ${state.fotos.ultimaFecha? "" : `<button class="btn btn-small" id="btnFotoDia1">Ya me la he hecho</button>`}
        <hr>
        <p class="muted" style="font-size:.82rem;">Las sesiones suaves del 15 y el 16 también cuentan: elígelas aquí y baja el peso.</p>
        <button class="btn btn-ghost btn-small" id="btnOtraSesion" style="width:100%;">Entrenar una sesión suave</button>
      </div>
      <div class="card">
        <h2>Calendario de arranque</h2>
        <p class="muted" style="font-size:.78rem;">Toca cada línea al hacerla.</p>
        ${CALENDARIO.map((c,i)=>{
          const hecho = state.arranque[i];
          return `<button class="btn btn-ghost" data-hito="${i}" style="justify-content:flex-start;text-align:left;height:auto;min-height:48px;padding:8px 10px;margin-bottom:6px;${hecho?'opacity:.5;':''}">
            <span style="margin-right:8px;">${hecho?'✓':'○'}</span>
            <span style="font-weight:400;">
              <span class="muted">${escapeHtml(c.fecha)}</span><br>
              <span class="${c.destacado?'destacado':''}">${escapeHtml(c.que)}</span>
            </span>
          </button>`;
        }).join("")}
      </div>
      <div class="card">
        <p class="frase">"${randFrase()}"</p>
      </div>
    `;
    engancharHoy(hoyISO, null, false);
    return;
  }

  const diaKey = getDiaKey(new Date());
  const dia = getRutinaDia(state.modo, diaKey);
  const esDescanso = !dia.ejercicios || dia.ejercicios.length===0;
  const diasDesdeInicio = Math.max(0, daysBetween(PERFIL.fecha_inicio, hoyISO));
  const ultimoPeso = Datos.pesajes.length ? Datos.pesajes[Datos.pesajes.length-1] : null;
  const tocaPesaje = !ultimoPeso || daysBetween(ultimoPeso.fecha, hoyISO) >= 7;
  const semanas = Math.floor(diasDesdeInicio/7);
  const tocaDeload = state.modo!=="obra" && semanas>=8 &&
    (!state.deload.ultimaFecha || daysBetween(state.deload.ultimaFecha, hoyISO) >= 56);
  const enDescarga = descargaActiva();

  el.innerHTML = `
    <div class="card hero">
      <div class="row" style="justify-content:space-between;align-items:flex-start;">
        <div>
          <div class="eyebrow">${DIAS_LABEL[diaKey]}${dia.hora? " · "+dia.hora:""}</div>
          <h1>${esDescanso? "Descanso" : escapeHtml(dia.nombre)}</h1>
        </div>
        <span class="badge">Día ${diasDesdeInicio}</span>
      </div>
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:4px;">
        ${dia.aviso? `<p class="muted" style="font-size:.84rem;margin:0;color:var(--amber);">${escapeHtml(dia.aviso)}</p>`:""}
        ${NOTAS_DIA[diaKey] ? `<p class="muted" style="font-size:.84rem;margin:0;">${escapeHtml(NOTAS_DIA[diaKey])}</p>` : ""}
        <p class="muted" style="font-size:.84rem;margin:0;">Gym hoy ${horarioGymHoy(diaKey)}</p>
      </div>
      ${esDescanso
        ? `<p class="frase" style="margin-top:16px;">${randFrase()}</p>`
        : `<button class="btn btn-primary" id="btnEmpezar" style="margin-top:18px;">Empezar sesión</button>`
      }
      <button class="btn btn-ghost btn-small" id="btnOtraSesion" style="margin-top:8px;width:100%;">Entrenar otra sesión</button>
    </div>

    ${enDescarga ? `
    <div class="card" style="border-color:var(--accent2);">
      <h2>Semana de descarga</h2>
      <p style="font-size:.88rem;">Las sesiones vienen con <b>la mitad de las series</b> y el peso al <b>65%</b>. Sin acercarte al fallo: esto es dejar que el cuerpo se ponga al día.</p>
      <button class="btn btn-ghost btn-small" id="btnDeloadFin">Terminar la descarga</button>
    </div>` : tocaDeload ? `
    <div class="card" style="border-color:var(--accent2);">
      <h2>Toca descarga</h2>
      <p style="font-size:.88rem;">Llevas ${semanas} semanas seguidas. Esta semana: mismos ejercicios y días, <b>la mitad de las series</b> y <b>60-70% del peso</b>. Sin acercarte al fallo.</p>
      <div class="row">
        <button class="btn btn-small col" id="btnDeloadAplicar">Aplicar esta semana</button>
        <button class="btn btn-ghost btn-small col" id="btnDeloadHecho">Ya la hice</button>
      </div>
    </div>` : ""}

    <div class="card">
      <h2>Modo de semana</h2>
      <div class="switch2">
        <button data-modo="normal" class="${state.modo==='normal'?'active':''}">NORMAL (4 días)</button>
        <button data-modo="obra" class="${state.modo==='obra'?'active':''}">OBRA (2 días)</button>
      </div>
    </div>

    <div class="card">
      <div class="kpi">
        <span class="muted">Peso actual</span>
        <b>${ultimoPeso? ultimoPeso.kg+" kg" : PERFIL.peso_inicial_kg+" kg (inicial)"}</b>
      </div>
      <div class="muted" style="font-size:.78rem;">${ultimoPeso? "Último pesaje: "+fmtFecha(ultimoPeso.fecha) : "Aún no has registrado ningún pesaje."}</div>
      ${cardPesoHTML(hoyISO, tocaPesaje, "Toca pesarte. En ayunas, después de mear.")}
    </div>

    ${cardProteinaHTML()}

    ${cardChecklistNocheHTML()}

    <button class="rescate" id="btnRescate">No tengo ganas</button>
  `;

  engancharHoy(hoyISO, diaKey, esDescanso);
};

// Trozos de HOY que se reutilizan en la cuenta atrás y en el día a día.
function cardPesoHTML(hoyISO, mostrar, texto){
  if(!mostrar) return "";
  return `
    <hr>
    <p class="muted" style="font-size:.82rem;">${escapeHtml(texto)}</p>
    <div class="row">
      <input type="number" id="pesoRapido" placeholder="kg" step="0.1" style="flex:1;">
      <button class="btn btn-primary btn-small" id="btnPesoRapido">Guardar</button>
    </div>`;
}

function cardProteinaHTML(){
  const g = proteinaHoy().gramos, obj = objetivo("proteina_objetivo_g");
  const pct = Math.min(100, Math.round((g/obj)*100));
  return `
    <div class="card" id="cardProteina" style="cursor:pointer;">
      <div class="kpi">
        <span class="eyebrow">Proteína de hoy</span>
        <b><span style="color:${g>=obj?'var(--volt)':'var(--ink)'};">${g.toFixed(0)}</span><span class="muted" style="font-size:1rem;font-weight:600;"> / ${obj} g</span></b>
      </div>
      <div class="progress" style="margin-top:12px;"><div style="width:${pct}%;"></div></div>
    </div>`;
}

// "No decido por la mañana si voy. Eso ya se decidió anoche."
function cardChecklistNocheHTML(){
  const ahora = new Date();
  if(ahora.getHours() < 20) return "";
  const manana = new Date(ahora.getTime() + 86400000);
  const dk = getDiaKey(manana);
  const dia = getRutinaDia(state.modo, dk);
  if(!dia || !dia.ejercicios || !dia.ejercicios.length) return "";
  const hoyISO = todayStr();
  if(state.checklist.fecha !== hoyISO) state.checklist = {fecha:hoyISO, marcados:{}};
  const faltan = CHECKLIST_ITEMS.filter(it=>!state.checklist.marcados[it.id]);
  return `
    <div class="card" style="border-color:${faltan.length? 'var(--amber)':'transparent'};">
      <div class="eyebrow">Mañana${dia.hora? " · "+dia.hora:""}</div>
      <h1 style="font-size:1.5rem;margin:4px 0 10px;">${escapeHtml(dia.nombre)}</h1>
      <p class="muted" style="font-size:.86rem;">Déjalo listo ahora. Por la mañana ya no se decide.</p>
      ${CHECKLIST_ITEMS.map(it=>`
        <button class="btn ${state.checklist.marcados[it.id]?'btn-good':''}" data-item="${it.id}" style="justify-content:flex-start;margin-bottom:6px;">
          ${state.checklist.marcados[it.id]?'✓':'○'}&nbsp;&nbsp;${escapeHtml(it.txt)}
        </button>`).join("")}
    </div>`;
}

function engancharHoy(hoyISO, diaKey, esDescanso){
  const btn = document.getElementById("btnEmpezar");
  if(btn) btn.addEventListener("click", ()=> iniciarSesion(diaKey, false));

  document.querySelectorAll("[data-modo]").forEach(b=>{
    b.addEventListener("click", ()=>{
      state.modo = b.dataset.modo;
      saveState();
      RENDERERS.hoy();
    });
  });

  const btnPesoRapido = document.getElementById("btnPesoRapido");
  if(btnPesoRapido) btnPesoRapido.addEventListener("click", ()=>{
    const kg = parseFloat(document.getElementById("pesoRapido").value);
    if(!kg) return;
    Datos.añadirPesaje(hoyISO, kg);
    RENDERERS.hoy();
    toast("Peso guardado.");
  });

  const btnDeload = document.getElementById("btnDeloadHecho");
  if(btnDeload) btnDeload.addEventListener("click", ()=>{
    state.deload.ultimaFecha = hoyISO;
    state.deload.activaDesde = null;
    saveState();
    RENDERERS.hoy();
  });

  const btnAplicar = document.getElementById("btnDeloadAplicar");
  if(btnAplicar) btnAplicar.addEventListener("click", ()=>{
    state.deload.activaDesde = hoyISO;
    saveState();
    RENDERERS.hoy();
    toast("Descarga activada: mitad de series y 65% del peso durante 7 días.", 5000);
  });

  const btnFin = document.getElementById("btnDeloadFin");
  if(btnFin) btnFin.addEventListener("click", ()=>{
    state.deload.ultimaFecha = hoyISO;
    state.deload.activaDesde = null;
    saveState();
    RENDERERS.hoy();
  });

  const btnFoto1 = document.getElementById("btnFotoDia1");
  if(btnFoto1) btnFoto1.addEventListener("click", ()=>{
    state.fotos.ultimaFecha = hoyISO;
    saveState();
    RENDERERS.hoy();
    toast("Foto del día 1 marcada.");
  });

  document.querySelectorAll("[data-hito]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const i = b.dataset.hito;
      state.arranque[i] = !state.arranque[i];
      saveState();
      RENDERERS.hoy();
    });
  });

  const cardProte = document.getElementById("cardProteina");
  if(cardProte) cardProte.addEventListener("click", ()=> switchScreen("comida"));

  document.querySelectorAll("#screen-hoy [data-item]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id = b.dataset.item;
      state.checklist.marcados[id] = !state.checklist.marcados[id];
      saveState();
      RENDERERS.hoy();
    });
  });

  const btnOtra = document.getElementById("btnOtraSesion");
  if(btnOtra) btnOtra.addEventListener("click", ()=>{
    const disponibles = DIAS_ORDEN.filter(dk=>{
      const d = getRutinaDia(state.modo, dk);
      return d && d.ejercicios && d.ejercicios.length;
    });
    showModal(`
      <h2>Entrenar otra sesión</h2>
      <p class="muted" style="font-size:.85rem;">Para cuando el domingo no cuadra o recuperas un día. No pasa nada.</p>
      ${disponibles.map(dk=>{
        const d = getRutinaDia(state.modo, dk);
        return `<button class="btn" data-sesion="${dk}" style="margin-bottom:8px;justify-content:flex-start;">
          ${escapeHtml(d.nombre)} <span class="muted" style="font-weight:400;">&nbsp;· ${DIAS_LABEL[dk].toLowerCase()}</span>
        </button>`;
      }).join("")}
      <button class="btn btn-ghost" id="mCerrar">Cerrar</button>
    `);
    document.getElementById("mCerrar").addEventListener("click", closeModal);
    document.querySelectorAll("[data-sesion]").forEach(b=>{
      b.addEventListener("click", ()=>{
        closeModal();
        iniciarSesion(b.dataset.sesion, false);
      });
    });
  });

  const btnResc = document.getElementById("btnRescate");
  if(btnResc) btnResc.addEventListener("click", ()=>{
    showModal(`
      <h2>Oye.</h2>
      <p style="font-size:1.05rem;">Ve, haz la mitad y vete.</p>
      <p class="muted">Mantener el hábito vale más que cualquier sesión perfecta.</p>
      <div class="row" style="margin-top:14px;">
        <button class="btn btn-ghost col" id="mCerrar">Cerrar</button>
        <button class="btn btn-primary col" id="mIr">${esDescanso? "Vale" : "Empezar en modo rápido"}</button>
      </div>
    `);
    document.getElementById("mCerrar").addEventListener("click", closeModal);
    document.getElementById("mIr").addEventListener("click", ()=>{
      closeModal();
      if(!esDescanso) iniciarSesion(diaKey, true);
    });
  });
}

/* ============================= SESIÓN ============================= */

function iniciarSesion(diaKey, modoRapido){
  const abierta = state.sesionActual;
  const tieneDatos = abierta && abierta.ejercicios.some(ex=>ex.sets.some(st=>st.done || st.peso!==""));
  if(tieneDatos){
    showModal(`
      <h2>Tienes una sesión abierta</h2>
      <p class="muted">${escapeHtml(abierta.nombre)} del ${fmtFecha(abierta.fecha)}, con series ya apuntadas. Si empiezas otra, esa se pierde.</p>
      <div class="row" style="margin-top:12px;">
        <button class="btn btn-primary col" id="mSeguir">Seguir con esa</button>
        <button class="btn col btn-danger" id="mNueva">Empezar la nueva</button>
      </div>`, {center:true});
    document.getElementById("mSeguir").addEventListener("click", ()=>{ closeModal(); switchScreen("sesion"); });
    document.getElementById("mNueva").addEventListener("click", ()=>{ closeModal(); arrancarSesion(diaKey, modoRapido); });
    return;
  }
  arrancarSesion(diaKey, modoRapido);
}

function arrancarSesion(diaKey, modoRapido){
  const dia = getRutinaDia(state.modo, diaKey);
  state.sesionActual = {
    fecha: todayStr(),
    diaKey, nombre: dia.nombre, modo: state.modo,
    modoRapido: !!modoRapido,
    inicio: Date.now(),
    descarga: descargaActiva(),
    ejercicios: dia.ejercicios.map(ex=>{
      // En descarga: la mitad de las series, redondeando hacia arriba.
      const series = descargaActiva() ? Math.max(1, Math.ceil(ex.series/2)) : ex.series;
      return {
        id:ex.id, nombre:ex.nombre, series, repes:ex.repes,
        descanso_seg:ex.descanso_seg||90, tipo:ex.tipo,
        sets: sugerenciaSets({...ex, series})
      };
    })
  };
  saveState();
  pedirWakeLock();
  switchScreen("sesion");
}

// Que no se apague la pantalla en mitad de la serie.
let wakeLock = null;
function pedirWakeLock(){
  if(!("wakeLock" in navigator) || wakeLock) return;
  navigator.wakeLock.request("screen").then(wl=>{
    wakeLock = wl;
    wl.addEventListener("release", ()=>{ wakeLock = null; });
  }).catch(()=>{});
}
function soltarWakeLock(){
  if(wakeLock){ wakeLock.release().catch(()=>{}); wakeLock = null; }
}
document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState==="visible" && state.sesionActual) pedirWakeLock();
});

// La descarga dura una semana desde que se activa.
function descargaActiva(){
  const desde = state.deload.activaDesde;
  return !!desde && daysBetween(desde, todayStr()) < 7;
}

// Sugerencia por serie según doble progresión: si toca subir peso, voy al tope
// bajo del rango; si no, repito peso e intento una repetición más que la última vez.
function sugerenciaSets(ex){
  const uv = ultimaVez(ex.id);
  const sug = state.subirPeso[ex.id];
  const {low, high} = parseRepRange(ex.repes);
  return Array.from({length:ex.series}, (_,i)=>{
    let sugPeso = "", sugRepes = "";
    if(sug && sug.hasta){
      sugPeso = sug.hasta; sugRepes = low;
    } else if(uv && uv.series.length){
      const prev = uv.series[i] || uv.series[uv.series.length-1];
      sugPeso = prev.peso; sugRepes = Math.min(prev.repes+1, high);
    }
    if(descargaActiva() && sugPeso !== ""){
      sugPeso = redondear(sugPeso*0.65);
      sugRepes = low;
    }
    return {peso:"", repes:"", done:false, sugPeso, sugRepes};
  });
}

function ultimaVez(exId){
  return Datos.ultimaVezDe(exId);
}

function textoTiempoSesion(){
  const s = state.sesionActual;
  if(!s || !s.inicio) return "";
  const min = Math.floor((Date.now()-s.inicio)/60000);
  return min+" min";
}
setInterval(()=>{
  const el = document.getElementById("tiempoSesion");
  if(el) el.textContent = textoTiempoSesion();
}, 15000);

RENDERERS.sesion = function(){
  const el = document.getElementById("screen-sesion");
  const s = state.sesionActual;
  if(!s){
    el.innerHTML = `
      <div class="card" style="text-align:center;">
        <p class="muted">No hay ninguna sesión activa.</p>
        <p class="muted" style="font-size:.85rem;">Ve a HOY y pulsa EMPEZAR SESIÓN.</p>
      </div>`;
    return;
  }
  const lista = s.modoRapido ? s.ejercicios.slice(0,3) : s.ejercicios;
  const totalCompletos = s.ejercicios.filter(ex=>ex.sets.every(st=>st.done)).length;

  el.innerHTML = `
    <div class="card" style="padding:16px 20px;">
      <div class="row" style="justify-content:space-between;align-items:flex-start;">
        <div>
          <div class="eyebrow">${DIAS_LABEL[s.diaKey]} · <span id="tiempoSesion">${textoTiempoSesion()}</span></div>
          <h1 style="font-size:1.45rem;margin-top:4px;">${escapeHtml(s.nombre)}</h1>
        </div>
        <span class="badge${s.descarga? " on":""}">${s.descarga? "Descarga · " : ""}${totalCompletos}/${s.ejercicios.length}</span>
      </div>
      <div class="progress" style="margin-top:14px;">
        <div style="width:${Math.round(totalCompletos/s.ejercicios.length*100)}%;"></div>
      </div>
    </div>

    ${s.fecha !== todayStr()
      ? `<div class="card tight" style="border-color:var(--accent2);"><p class="muted" style="font-size:.82rem;margin:0;">Esta sesión la empezaste el ${fmtFecha(s.fecha)} y sigue abierta. Termínala o descártala abajo.</p></div>`
      : ""}

    ${renderCalentamiento(lista[0])}

    ${lista.map((ex,i)=>renderEjercicio(ex,i)).join("")}

    <div class="card">
      <div class="row">
        <button class="btn col ${s.modoRapido?'btn-primary':''}" id="btnRapido">${s.modoRapido? "MODO RÁPIDO ✓" : "Activar modo rápido"}</button>
      </div>
      ${(()=>{
        if(!s.modoRapido) return "";
        const fuera = s.ejercicios.slice(3).filter(ex=>tipoEjercicio(ex.id, ex.tipo)==="punto_debil");
        if(!fuera.length) return "";
        return `<p style="font-size:.8rem;color:var(--accent2);margin:8px 0 0 0;">Deja fuera ${fuera.map(e=>escapeHtml(e.nombre)).join(" y ")}. Si te queda un minuto, mete aunque sean 2 series: es justo lo que más te cuesta.</p>`;
      })()}
    </div>

    <div class="card">
      <div class="field" style="margin:0;">
        <label for="notaEnCurso">Nota de hoy</label>
        <textarea id="notaEnCurso" rows="2" placeholder="Molestias, cambios, cómo te has visto...">${escapeHtml(s.nota||"")}</textarea>
      </div>
    </div>

    <button class="btn btn-good" id="btnTerminar">TERMINAR SESIÓN</button>
    <button class="btn btn-ghost btn-small btn-danger" id="btnDescartar" style="width:100%;margin-top:8px;">Descartar sesión</button>
  `;

  document.getElementById("btnRapido").addEventListener("click", ()=>{
    s.modoRapido = !s.modoRapido;
    saveState();
    RENDERERS.sesion();
  });
  document.getElementById("btnTerminar").addEventListener("click", terminarSesion);
  document.getElementById("btnDescartar").addEventListener("click", ()=>{
    showModal(`
      <h2>¿Descartar la sesión?</h2>
      <p class="muted">No se guarda nada de lo que has metido.</p>
      <div class="row" style="margin-top:12px;">
        <button class="btn btn-ghost col" id="mCerrar">Seguir</button>
        <button class="btn col btn-danger" id="mDescartar">Descartar</button>
      </div>`, {center:true});
    document.getElementById("mCerrar").addEventListener("click", closeModal);
    document.getElementById("mDescartar").addEventListener("click", ()=>{
      closeModal();
      stopRestTimer();
      state.sesionActual = null;
      saveState();
      soltarWakeLock();
      switchScreen("hoy");
    });
  });

  el.querySelectorAll(".exset .chk").forEach(chk=>{
    chk.addEventListener("click", onSetCheck);
  });
  el.querySelectorAll("[data-peso], [data-repes]").forEach(inp=>{
    inp.addEventListener("input", onSetInput);
  });
  el.querySelectorAll(".btn-tecnica").forEach(b=>{
    b.addEventListener("click", ()=> showTecnica(b.dataset.ex));
  });
  el.querySelectorAll("[data-addset]").forEach(b=> b.addEventListener("click", onAddSet));
  el.querySelectorAll("[data-delset]").forEach(b=> b.addEventListener("click", onDelSet));
  el.querySelectorAll("[data-porque]").forEach(b=>{
    b.addEventListener("click", ()=> explicarSugerencia(currentEjercicios()[Number(b.dataset.porque)]));
  });
  el.querySelectorAll("[data-cambiar]").forEach(b=>{
    b.addEventListener("click", ()=> cambiarEjercicio(Number(b.dataset.cambiar)));
  });
  el.querySelectorAll("[data-saltar]").forEach(b=>{
    b.addEventListener("click", ()=> saltarEjercicio(Number(b.dataset.saltar)));
  });
  const nota = document.getElementById("notaEnCurso");
  if(nota) nota.addEventListener("input", ()=>{
    state.sesionActual.nota = nota.value;
    saveState();
  });

  if(s.restFin && s.restFin > Date.now()) runRestTimer(s.restFin);
};

function pesoTrabajo(exId){
  const sug = state.subirPeso[exId];
  if(sug && typeof sug === "object" && sug.hasta) return sug.hasta;
  const uv = ultimaVez(exId);
  if(uv) return Math.max(...uv.series.map(s=>s.peso));
  return null;
}

function renderCalentamiento(primerEx){
  if(!primerEx) return "";
  const trabajo = pesoTrabajo(primerEx.id);
  const aprox = trabajo
    ? [`Barra vacía o muy poco peso × 10`,
       `${redondear(trabajo*0.5)} kg × 5`,
       `${redondear(trabajo*0.75)} kg × 3`]
    : CALENTAMIENTO.aproximacion;
  return `
  <details>
    <summary>Calentamiento — no me lo salto</summary>
    <div class="body">
      <p style="font-size:.88rem;">${escapeHtml(CALENTAMIENTO.general)}</p>
      <p style="font-size:.88rem;">Aproximación en <b>${escapeHtml(primerEx.nombre)}</b>${trabajo? ` (peso de trabajo ${trabajo} kg)`:""}:</p>
      <ul style="font-size:.88rem;">${aprox.map(a=>`<li>${escapeHtml(a)}</li>`).join("")}</ul>
      <p class="muted" style="font-size:.8rem;">${escapeHtml(CALENTAMIENTO.nota)}</p>
    </div>
  </details>`;
}

function renderEjercicio(ex, idx){
  const uv = ultimaVez(ex.id);
  const uvTxt = uv ? uv.series.map(st=>`${st.peso}kg×${st.repes}`).join(", ") : "Sin registros previos";
  const sug = state.subirPeso[ex.id];
  const avisoSubir = sug
    ? (typeof sug === "object" && sug.hasta
        ? `<span class="badge on">Sube a ${sug.hasta} kg</span>`
        : `<span class="badge on">Sube peso</span>`)
    : "";
  const completo = ex.sets.every(st=>st.done);
  return `
  <div class="card ${completo?'exdone':''}">
    <div class="row" style="justify-content:space-between;align-items:flex-start;">
      <div>
        <div class="exname">${escapeHtml(ex.nombre)} ${avisoSubir}</div>
        <div class="extarget">${ex.sets.length} x ${escapeHtml(ex.repes)} · descanso ${fmtDescanso(ex.descanso_seg)}</div>
        ${tipoEjercicio(ex.id, ex.tipo)==="punto_debil"
          ? `<div style="font-size:.76rem;color:var(--accent2);">Punto débil — rango completo, sin rebote y sin prisa</div>` : ""}
        <div class="exlast">Última vez: ${escapeHtml(uvTxt)}</div>
      </div>
      <button class="btn btn-small btn-ghost btn-tecnica" data-ex="${ex.id}">técnica</button>
    </div>
    <div class="row" style="gap:16px;align-items:center;">
      ${ex.sets[0] && ex.sets[0].sugPeso!=="" && ex.sets[0].sugPeso!=null
        ? `<button class="porque" data-porque="${idx}">por qué este peso</button>` : ""}
      <button class="porque" data-cambiar="${idx}">cambiar</button>
      <button class="porque" data-saltar="${idx}">saltar</button>
    </div>
    ${ex.sets.map((st,si)=>`
      <div class="exset">
        <div class="lbl">#${si+1}</div>
        <input type="number" inputmode="decimal" placeholder="${st.sugPeso!==""&&st.sugPeso!=null? st.sugPeso : "kg"}" value="${st.peso}" data-peso data-ex="${idx}" data-set="${si}">
        <input type="number" inputmode="numeric" placeholder="${st.sugRepes!==""&&st.sugRepes!=null? st.sugRepes : "repes"}" value="${st.repes}" data-repes data-ex="${idx}" data-set="${si}">
        <button class="chk ${st.done?'on':''}" data-ex="${idx}" data-set="${si}"
          aria-pressed="${st.done}" aria-label="Serie ${si+1} de ${escapeHtml(ex.nombre)}">${st.done?'✓':'—'}</button>
      </div>
    `).join("")}
    <div class="row" style="gap:6px;margin-top:2px;">
      <button class="btn btn-small btn-ghost" data-addset="${idx}">+ serie</button>
      ${ex.sets.length>1? `<button class="btn btn-small btn-ghost" data-delset="${idx}">− serie</button>`:""}
    </div>
  </div>`;
}

function currentEjercicios(){
  const s = state.sesionActual;
  return s.modoRapido ? s.ejercicios.slice(0,3) : s.ejercicios;
}

function onSetInput(e){
  const lista = currentEjercicios();
  const exIdx = Number(e.target.dataset.ex);
  const setIdx = Number(e.target.dataset.set);
  const ex = lista[exIdx];
  const st = ex.sets[setIdx];
  if(e.target.hasAttribute("data-peso")) st.peso = e.target.value;
  else st.repes = e.target.value;
  saveState();
}

function onSetCheck(e){
  const lista = currentEjercicios();
  const exIdx = Number(e.target.dataset.ex);
  const setIdx = Number(e.target.dataset.set);
  const ex = lista[exIdx];
  const st = ex.sets[setIdx];
  if(!st.done){
    if(st.peso==="" && st.sugPeso!=="" && st.sugPeso!=null) st.peso = String(st.sugPeso);
    if(st.repes==="" && st.sugRepes!=="" && st.sugRepes!=null) st.repes = String(st.sugRepes);
  }
  st.done = !st.done;
  saveState();
  if(st.done){
    startRestTimer(ex.descanso_seg);
  }
  RENDERERS.sesion();
}

function onAddSet(e){
  const ex = currentEjercicios()[Number(e.target.dataset.addset)];
  const ultima = ex.sets[ex.sets.length-1];
  ex.sets.push({peso:"", repes:"", done:false,
    sugPeso: ultima ? (ultima.peso || ultima.sugPeso) : "",
    sugRepes: ultima ? (ultima.repes || ultima.sugRepes) : ""});
  saveState();
  RENDERERS.sesion();
}

function onDelSet(e){
  const ex = currentEjercicios()[Number(e.target.dataset.delset)];
  if(ex.sets.length>1) ex.sets.pop();
  saveState();
  RENDERERS.sesion();
}

let restInterval = null;
function startRestTimer(seconds){
  const fin = Date.now() + seconds*1000;
  if(state.sesionActual){ state.sesionActual.restFin = fin; saveState(); }
  runRestTimer(fin);
}
function runRestTimer(fin){
  clearInterval(restInterval);
  const box = document.getElementById("resttimer");
  function tick(){
    const restante = Math.round((fin - Date.now())/1000);
    if(restante<=0){
      stopRestTimer();
      if(navigator.vibrate) navigator.vibrate([200,100,200]);
      Avisos.descansoTerminado();
      return;
    }
    const m = Math.floor(restante/60), sec = restante%60;
    box.classList.add("show");
    box.innerHTML = `Descanso: ${m}:${String(sec).padStart(2,"0")} <span style="text-decoration:underline;margin-left:10px;" id="skipRest">saltar</span>`;
    const skip = document.getElementById("skipRest");
    if(skip) skip.onclick = stopRestTimer;
  }
  tick();
  restInterval = setInterval(tick, 1000);
}
function stopRestTimer(){
  clearInterval(restInterval);
  document.getElementById("resttimer").classList.remove("show");
  if(state.sesionActual){ state.sesionActual.restFin = null; saveState(); }
}

/* La sugerencia no es magia: esto enseña la regla aplicada y los datos
   concretos de los que sale, para poder discutirla o ignorarla con criterio. */
/* "El gym está lleno" y "me duele X" están en sus notas: la web tiene que
   dejar cambiar el ejercicio o saltarlo, no obligar a seguir el guion. */
function ejerciciosDisponibles(){
  const vistos = new Map();
  [RUTINA_NORMAL, RUTINA_OBRA].forEach(rutina=>{
    DIAS_ORDEN.forEach(dk=>{
      const dia = rutina.dias[dk];
      if(!dia || !dia.ejercicios) return;
      dia.ejercicios.forEach(e=>{ if(!vistos.has(e.id)) vistos.set(e.id, e.nombre); });
    });
  });
  return [...vistos.entries()].map(([id,nombre])=>({id,nombre}))
    .sort((a,b)=> a.nombre.localeCompare(b.nombre,"es"));
}

function cambiarEjercicio(idx){
  const actual = state.sesionActual.ejercicios[idx];
  showModal(`
    <h2>Cambiar ejercicio</h2>
    <p class="muted" style="font-size:.85rem;">
      En vez de ${escapeHtml(actual.nombre)}. Se mantienen las series y el rango.
    </p>
    ${ejerciciosDisponibles().filter(e=> e.id !== actual.id).map(e=>
      `<button class="btn" data-nuevo="${e.id}" style="justify-content:flex-start;margin-bottom:8px;">${escapeHtml(e.nombre)}</button>`
    ).join("")}
    <button class="btn btn-ghost" id="mCerrar">Cerrar</button>
  `);
  document.getElementById("mCerrar").addEventListener("click", closeModal);
  document.querySelectorAll("[data-nuevo]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const nuevo = ejerciciosDisponibles().find(e=> e.id === b.dataset.nuevo);
      actual.id = nuevo.id;
      actual.nombre = nuevo.nombre;
      actual.tipo = tipoEjercicio(nuevo.id);
      // Las sugerencias eran del ejercicio anterior: se recalculan.
      actual.sets = sugerenciaSets({id:actual.id, series:actual.sets.length, repes:actual.repes});
      saveState();
      closeModal();
      RENDERERS.sesion();
      toast("Cambiado a "+nuevo.nombre+".");
    });
  });
}

function saltarEjercicio(idx){
  const ex = state.sesionActual.ejercicios[idx];
  state.sesionActual.ejercicios.splice(idx, 1);
  saveState();
  RENDERERS.sesion();
  toast(ex.nombre+" saltado. No pasa nada.");
}

function explicarSugerencia(ex){
  const uv = ultimaVez(ex.id);
  const sug = state.subirPeso[ex.id];
  const {low, high} = parseRepRange(ex.repes);
  const subiendo = !!(sug && sug.hasta);
  const anterior = uv ? uv.series.map(st=>`${st.peso} kg × ${st.repes}`).join(" · ") : "—";

  showModal(`
    <h2>${escapeHtml(ex.nombre)}</h2>
    <dl class="regla">
      <dt>Regla</dt><dd>Doble progresión: mismo peso hasta el tope del rango, y entonces subir.</dd>
      <dt>Rango</dt><dd>${low}${high!==low? " a "+high : ""} repeticiones${high!==low? " por serie" : ""}</dd>
      <dt>Última vez</dt><dd>${escapeHtml(anterior)}</dd>
      <dt>Lectura</dt><dd>${subiendo
        ? `Completaste el tope del rango en todas las series con ${sug.desde} kg, así que toca subir ${(sug.hasta-sug.desde).toFixed(2).replace(".",",").replace(",00","")} kg y volver a ${low}.`
        : `Aún no has llegado al tope en todas las series, así que se repite el peso buscando una repetición más.`}</dd>
      <dt>Propuesta</dt><dd><b>${ex.sets[0].sugPeso} kg × ${ex.sets[0].sugRepes}</b>, dejando 1-2 repeticiones en recámara.</dd>
    </dl>
    <p class="muted" style="font-size:.82rem;margin-top:12px;">Es una propuesta, no una orden: si has dormido mal o comido poco, baja y repite peso.</p>
    <button class="btn btn-primary" id="mCerrar" style="margin-top:8px;">Entendido</button>
  `, {center:true});
  document.getElementById("mCerrar").addEventListener("click", closeModal);
}

function showTecnica(exId){
  const t = TECNICA[exId];
  const nombre = nombreEjercicio(exId);
  let body;
  if(!t){
    body = `<p class="muted">Sin notas específicas guardadas para este ejercicio. Técnica estándar, controlada y sin prisa.</p>`;
  }else{
    body = `
      <ul>${t.claves.map(c=>`<li>${escapeHtml(c)}</li>`).join("")}</ul>
      ${t.error? `<p><b>Error típico:</b> ${escapeHtml(t.error)}</p>`:""}
      ${t.seguridad? `<p><b>Seguridad:</b> ${escapeHtml(t.seguridad)}</p>`:""}
      ${t.nota? `<p class="muted"><b>Nota:</b> ${escapeHtml(t.nota)}</p>`:""}
    `;
  }
  showModal(`<h2>${escapeHtml(nombre)}</h2>${body}<button class="btn btn-primary" id="mCerrar" style="margin-top:10px;">Cerrar</button>`);
  document.getElementById("mCerrar").addEventListener("click", closeModal);
}

function terminarSesion(){
  const s = state.sesionActual;
  stopRestTimer();
  soltarWakeLock();
  const subenPeso = [];
  const porEjercicio = [];
  let seriesHechas = 0, volumen = 0;
  s.ejercicios.forEach(ex=>{
    const setsGuardables = ex.sets.filter(st=>st.done && st.peso!=="" && st.repes!=="");
    if(setsGuardables.length===0) return;
    seriesHechas += setsGuardables.length;
    const series = setsGuardables.map(st=>({peso:Number(st.peso), repes:Number(st.repes)}));
    series.forEach(st=> volumen += st.peso*st.repes);
    porEjercicio.push({ejercicioId:ex.id, series});
    const {high} = parseRepRange(ex.repes);
    const todasAlTope = !s.descarga &&
      setsGuardables.length>=ex.series && series.every(st=>st.repes>=high);
    if(todasAlTope){
      const pesoUsado = Math.max(...series.map(st=>st.peso));
      const hasta = pesoUsado + incrementoPara(ex.id, ex.tipo);
      state.subirPeso[ex.id] = {desde:pesoUsado, hasta};
      subenPeso.push(ex.nombre+" → "+hasta+" kg");
    } else {
      state.subirPeso[ex.id] = null;
    }
  });
  const ejerciciosHechos = porEjercicio.length;
  if(ejerciciosHechos){
    Datos.registrarSesion({
      fecha:s.fecha, nombre:s.nombre, diaKey:s.diaKey, modo:s.modo,
      ejercicios:ejerciciosHechos, series:seriesHechas, rapida:!!s.modoRapido,
      nota: (s.nota||"").trim(),
      volumen: Math.round(volumen),
      minutos: s.inicio ? Math.round((Date.now()-s.inicio)/60000) : null
    }, porEjercicio);
  }
  state.sesionActual = null;
  saveState();
  switchScreen("hoy");
  if(subenPeso.length){
    toast("Sesión guardada. Sube el peso: "+subenPeso.join(" · "), 5000);
  }else if(ejerciciosHechos){
    toast("Sesión guardada. Buen trabajo.");
  }else{
    toast("Sesión cerrada sin series registradas.");
  }
}

/* ============================= MODAL ============================= */

function showModal(html, opts){
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="overlay ${opts&&opts.center?'center':''}" id="ovl"><div class="sheet">${html}</div></div>`;
  document.getElementById("ovl").addEventListener("click", e=>{
    if(e.target.id==="ovl") closeModal();
  });
}
function closeModal(){
  document.getElementById("modalRoot").innerHTML = "";
}

/* ============================= PROGRESO ============================= */

RENDERERS.progreso = function(){
  const el = document.getElementById("screen-progreso");
  const hoy = todayStr();
  const mostrarFoto = !state.fotos.ultimaFecha || daysBetween(state.fotos.ultimaFecha, hoy) >= 30;

  const exIds = Datos.ejerciciosConHistorial();
  const prs = exIds.map(id=>{
    const mejor = Datos.recordDe(id);
    return mejor && {id, nombre:nombreEjercicio(id), max:mejor.peso, fecha:mejor.fecha, repes:mejor.repes};
  }).filter(Boolean).sort((a,b)=> b.max-a.max);

  el.innerHTML = `
    ${cardResumenHTML()}

    <div class="card">
      <h2>Peso corporal</h2>
      ${renderPesoChart()}
      ${(()=>{
        const u = Datos.pesajes.length? Datos.pesajes[Datos.pesajes.length-1].kg : PERFIL.peso_inicial_kg;
        const falta = (objetivo("peso_objetivo_12_meses_kg") - u).toFixed(1);
        return `<div class="kpi" style="margin-top:6px;">
          <span class="muted" style="font-size:.8rem;">Desde ${PERFIL.peso_inicial_kg} kg · objetivo ${objetivo("peso_objetivo_12_meses_kg")} kg</span>
          <span class="muted" style="font-size:.8rem;">${falta>0? "faltan "+falta+" kg" : "objetivo cumplido"}</span>
        </div>`;
      })()}
      <div class="grid2" style="margin-top:14px;">
        <div><label>Fecha</label><input type="date" id="pesoFecha" value="${hoy}"></div>
        <div><label>Peso (kg)</label><input type="number" id="pesoKg" placeholder="0,0" step="0.1" inputmode="decimal"></div>
      </div>
      <button class="btn btn-primary" id="btnAddPeso" style="margin-top:10px;">Añadir pesaje</button>
      ${Datos.pesajes.length ? `
        <details style="background:none;padding:0;margin:14px 0 0;border:none;">
          <summary style="font-size:.68rem;">Corregir pesajes</summary>
          <div class="body">
            ${Datos.pesajes.slice(-8).reverse().map(p=>`
              <div class="row" style="justify-content:space-between;align-items:center;">
                <span style="font-variant-numeric:tabular-nums;">${fmtFecha(p.fecha)} · ${p.kg} kg</span>
                <button class="item-x" data-borrar-pesaje="${p.fecha}" aria-label="Borrar el pesaje del ${fmtFecha(p.fecha)}">✕</button>
              </div>`).join("")}
            <p class="muted" style="font-size:.78rem;margin-top:8px;">Volver a guardar la misma fecha la sobrescribe.</p>
          </div>
        </details>` : ""}
      ${(()=>{
        const a = avisoRitmoPeso();
        return a? `<p style="margin-top:10px;font-size:.85rem;border-left:3px solid ${a.color};padding-left:8px;">${a.txt}</p>` : "";
      })()}
    </div>

    ${mostrarFoto ? `
    <div class="card" style="border-color:var(--amber);">
      <div class="eyebrow" style="color:var(--amber);">Toca foto</div>
      <p style="margin-top:6px;">Foto de progreso: frente y perfil, misma luz y mismo sitio.</p>
      <button class="btn btn-small" id="btnFotoHecha">Ya la hice</button>
    </div>` : ""}

    <div class="card">
      <h2>Récords personales</h2>
      ${prs.length? `<table><tbody>${prs.map(p=>`<tr><td>${escapeHtml(p.nombre)}</td><td>${p.max} kg × ${p.repes}</td><td class="muted">${fmtFecha(p.fecha)}</td></tr>`).join("")}</tbody></table>`
        : `<p class="muted">Aún no hay sesiones registradas.</p>`}
    </div>

    <div class="card">
      <h2>Carga por ejercicio</h2>
      ${exIds.length? `
        <select id="selEjercicio">${exIds.map(id=>`<option value="${id}">${escapeHtml(nombreEjercicio(id))}</option>`).join("")}</select>
        <div id="chartEjercicio" style="margin-top:8px;"></div>
      ` : `<p class="muted">Registra alguna sesión para ver la gráfica.</p>`}
    </div>

    <div class="card">
      <h2>Medidas (cada 2 meses)</h2>
      <div class="grid3" style="margin-bottom:8px;">
        <input type="number" id="mBrazo" placeholder="Brazo cm">
        <input type="number" id="mPecho" placeholder="Pecho cm">
        <input type="number" id="mMuslo" placeholder="Muslo cm">
      </div>
      <div class="grid2" style="margin-bottom:8px;">
        <input type="number" id="mGemelo" placeholder="Gemelo cm">
        <input type="number" id="mAntebrazo" placeholder="Antebrazo cm">
      </div>
      <button class="btn btn-primary btn-small" id="btnAddMedidas">Guardar medidas</button>
      ${Datos.medidas.length>1 ? `
        <div style="margin-top:16px;">
          <label for="selMedida">Ver evolución</label>
          <select id="selMedida">
            <option value="gemelo">Gemelo</option>
            <option value="antebrazo">Antebrazo</option>
            <option value="brazo">Brazo</option>
            <option value="pecho">Pecho</option>
            <option value="muslo">Muslo</option>
          </select>
          <div id="chartMedida" style="margin-top:10px;"></div>
        </div>` : ""}
      ${Datos.medidas.length? `
        <table style="margin-top:10px;">
          <thead><tr><th>Fecha</th><th>Brazo</th><th>Pecho</th><th>Muslo</th><th>Gemelo</th><th>Antebr.</th></tr></thead>
          <tbody>${Datos.medidas.slice().reverse().map(m=>`<tr><td>${fmtFecha(m.fecha)}</td><td>${escapeHtml(m.brazo||"-")}</td><td>${escapeHtml(m.pecho||"-")}</td><td>${escapeHtml(m.muslo||"-")}</td><td>${escapeHtml(m.gemelo||"-")}</td><td>${escapeHtml(m.antebrazo||"-")}</td></tr>`).join("")}</tbody>
        </table>` : ""}
    </div>

    <div class="card">
      <h2>Sesiones hechas</h2>
      ${Datos.sesiones.length ? `
        <p class="muted" style="font-size:.8rem;">${Datos.sesiones.length} sesiones registradas. Solo el registro, sin rachas ni culpas.</p>
        <p class="muted" style="font-size:.78rem;">Toca una para verla o corregirla.</p>
        <table><tbody>
          ${Datos.sesiones.slice(-12).reverse().map(ses=>`
            <tr data-sesion-id="${ses.id}" style="cursor:pointer;">
              <td style="white-space:nowrap;">${fmtFecha(ses.fecha)}</td>
              <td>${escapeHtml(ses.nombre)}${ses.rapida? ' <span class="muted">(rápida)</span>':''}${ses.nota? ' <span class="muted">·</span>':''}</td>
              <td class="muted">${ses.series} series</td>
            </tr>`).join("")}
        </tbody></table>`
        : `<p class="muted">Aún no has terminado ninguna sesión.</p>`}
    </div>

    ${cardObjetivosHTML()}

    <div class="card">
      <h2>Recordatorios</h2>
      <p class="muted" style="font-size:.82rem;">
        Una web no puede avisarte con el móvil guardado. El calendario sí.
        Esto te descarga tus entrenos, el aviso de preparar la mochila la noche
        antes, el pesaje del domingo y la foto mensual; lo abres y se añaden.
      </p>
      <button class="btn btn-small" id="btnCalendario">Añadir al calendario</button>
      <hr>
      <p class="muted" style="font-size:.82rem;">
        Y si sales de la web mientras descansas entre series, puede avisarte al
        terminar la cuenta atrás.
      </p>
      <button class="btn btn-small" id="btnPermisoAviso">${Avisos.permitido? "Avisos activados" : "Activar aviso de descanso"}</button>
    </div>

    <div class="card">
      <h2>Tus datos</h2>
      <p class="muted" style="font-size:.82rem;">
        Se guardan solos en este móvil cada vez que tocas algo, con copia de seguridad interna.
        ${state.guardadoEn? "Último guardado: "+new Date(state.guardadoEn).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})+"." : ""}
      </p>
      ${(()=>{
        const dias = state.ultimaExportacion? daysBetween(state.ultimaExportacion, hoy) : null;
        if(dias===null) return `<p style="font-size:.82rem;border-left:3px solid var(--accent2);padding-left:8px;">Guarda una copia en el móvil de vez en cuando. Si cambias de teléfono o borras datos del navegador, es lo único que la recupera.</p>`;
        if(dias>=30) return `<p style="font-size:.82rem;border-left:3px solid var(--accent2);padding-left:8px;">Hace ${dias} días de la última copia. Exporta otra.</p>`;
        return `<p class="muted" style="font-size:.8rem;">Última copia exportada: ${fmtFecha(state.ultimaExportacion)}.</p>`;
      })()}
      <div class="row">
        <button class="btn btn-small col" id="btnExport">Exportar copia</button>
        <label class="btn btn-small col" style="text-align:center;">
          Importar copia<input type="file" id="fileImport" accept="application/json" style="display:none;">
        </label>
      </div>
    </div>
  `;

  document.getElementById("btnAddPeso").addEventListener("click", ()=>{
    const fecha = document.getElementById("pesoFecha").value || hoy;
    const kg = parseFloat(document.getElementById("pesoKg").value);
    if(!kg) return;
    Datos.añadirPesaje(fecha, kg);
    RENDERERS.progreso();
    toast("Peso guardado.");
  });

  el.querySelectorAll("[data-borrar-pesaje]").forEach(b=>{
    b.addEventListener("click", ()=>{
      Datos.borrarPesaje(b.dataset.borrarPesaje);
      RENDERERS.progreso();
      toast("Pesaje borrado.");
    });
  });

  const btnFoto = document.getElementById("btnFotoHecha");
  if(btnFoto) btnFoto.addEventListener("click", ()=>{
    state.fotos.ultimaFecha = hoy;
    saveState();
    RENDERERS.progreso();
  });

  const sel = document.getElementById("selEjercicio");
  if(sel){
    const drawSel = ()=>{
      document.getElementById("chartEjercicio").innerHTML = renderEjercicioChart(sel.value);
    };
    sel.addEventListener("change", drawSel);
    drawSel();
  }

  const selMedida = document.getElementById("selMedida");
  if(selMedida){
    const pintar = ()=>{
      const puntos = Datos.medidas
        .filter(m=> m[selMedida.value] !== "" && m[selMedida.value] != null)
        .map(m=>({v:Number(m[selMedida.value]), fecha:m.fecha}));
      document.getElementById("chartMedida").innerHTML =
        puntos.length>1 ? svgLineChart(puntos, {minSpan:2})
                        : `<p class="muted" style="font-size:.85rem;">Hacen falta dos medidas para ver la evolución.</p>`;
    };
    selMedida.addEventListener("change", pintar);
    pintar();
  }

  document.getElementById("btnAddMedidas").addEventListener("click", ()=>{
    const m = {
      fecha: hoy,
      brazo: document.getElementById("mBrazo").value,
      pecho: document.getElementById("mPecho").value,
      muslo: document.getElementById("mMuslo").value,
      gemelo: document.getElementById("mGemelo").value,
      antebrazo: document.getElementById("mAntebrazo").value
    };
    Datos.añadirMedidas(m);
    RENDERERS.progreso();
    toast("Medidas guardadas.");
  });

  el.querySelectorAll("[data-sesion-id]").forEach(fila=>{
    fila.addEventListener("click", ()=> verSesion(Number(fila.dataset.sesionId)));
  });

  document.getElementById("btnObjetivos").addEventListener("click", ()=>{
    const proteina = parseFloat(document.getElementById("objProteina").value);
    const kcal = parseFloat(document.getElementById("objKcal").value);
    const peso = parseFloat(document.getElementById("objPeso").value);
    state.objetivos = {
      proteina_objetivo_g: proteina || PERFIL.proteina_objetivo_g,
      calorias_objetivo: kcal || PERFIL.calorias_objetivo,
      peso_objetivo_12_meses_kg: peso || PERFIL.peso_objetivo_12_meses_kg
    };
    RENDERERS.progreso();
    toast("Objetivos actualizados.");
  });

  document.getElementById("btnCalendario").addEventListener("click", ()=>{
    Avisos.descargarCalendario(state.modo);
    toast("Abre el archivo descargado para añadirlo a tu calendario.", 5000);
  });

  document.getElementById("btnPermisoAviso").addEventListener("click", e=>{
    Avisos.pedirPermiso().then(ok=>{
      toast(ok ? "Listo: te avisará al acabar el descanso."
               : "El navegador no ha dado permiso para avisar.");
      if(ok) e.target.textContent = "Avisos activados";
    });
  });

  document.getElementById("btnExport").addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(Datos.instantanea(),null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mi-gym-"+hoy+".json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    state.ultimaExportacion = hoy;
    RENDERERS.progreso();
  });
  document.getElementById("fileImport").addEventListener("change", e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      let datos;
      try{ datos = JSON.parse(reader.result); }
      catch(err){ toast("Ese archivo no es una copia válida."); return; }
      Datos.importar(datos, ()=>{
        toast("Copia restaurada.");
        RENDERERS.progreso();
      });
    };
    reader.readAsText(file);
  });
};

/* Resumen: lo que la base de datos permite calcular y antes no existía.
   Números exactos, sin adornos: constancia, carga movida y tendencia. */
/* Ver una sesión pasada y poder arreglarla: corregir un peso mal tecleado,
   borrar una serie que no hiciste o quitar la sesión entera. */
function verSesion(id){
  const ses = Datos.sesiones.find(s=> s.id === id);
  if(!ses) return;
  const series = Datos.series.filter(s=> s.sesionId === id);
  const porEjercicio = [];
  series.forEach(s=>{
    let grupo = porEjercicio.find(g=> g.id === s.ejercicioId);
    if(!grupo){ grupo = {id:s.ejercicioId, nombre:nombreEjercicio(s.ejercicioId), series:[]}; porEjercicio.push(grupo); }
    grupo.series.push(s);
  });

  showModal(`
    <h2>${escapeHtml(ses.nombre)}</h2>
    <p class="muted" style="font-size:.82rem;">
      ${fmtFecha(ses.fecha)}${ses.minutos? " · "+ses.minutos+" min":""}${ses.volumen? " · "+ses.volumen.toLocaleString("es-ES")+" kg movidos":""}
    </p>

    ${porEjercicio.length? porEjercicio.map(g=>`
      <div style="margin-top:16px;">
        <div class="exname" style="font-size:1rem;">${escapeHtml(g.nombre)}</div>
        ${g.series.map((s,i)=>`
          <div class="exset" style="grid-template-columns:26px 1fr 1fr 44px;">
            <div class="lbl">#${i+1}</div>
            <input type="number" inputmode="decimal" value="${s.peso}" data-editar-peso="${s.id}" aria-label="Peso de la serie ${i+1}">
            <input type="number" inputmode="numeric" value="${s.repes}" data-editar-repes="${s.id}" aria-label="Repeticiones de la serie ${i+1}">
            <button class="item-x" data-borrar-serie="${s.id}" aria-label="Borrar la serie ${i+1}">✕</button>
          </div>`).join("")}
      </div>`).join("") : `<p class="muted">Esta sesión no tiene series apuntadas.</p>`}

    <div class="field" style="margin-top:18px;">
      <label for="notaSesion">Nota</label>
      <textarea id="notaSesion" rows="2" placeholder="Hombro molesta, banca ocupada...">${escapeHtml(ses.nota||"")}</textarea>
    </div>

    <button class="btn btn-primary" id="mGuardarSesion">Guardar cambios</button>
    <button class="btn btn-ghost btn-danger" id="mBorrarSesion" style="width:100%;margin-top:8px;">Borrar la sesión entera</button>
    <button class="btn btn-ghost" id="mCerrar" style="width:100%;margin-top:8px;">Cerrar</button>
  `);

  document.getElementById("mCerrar").addEventListener("click", closeModal);

  document.querySelectorAll("[data-borrar-serie]").forEach(b=>{
    b.addEventListener("click", ()=>{
      Datos.borrarSerie(Number(b.dataset.borrarSerie));
      Datos.recalcularSesion(id);
      closeModal();
      RENDERERS.progreso();
      toast("Serie borrada.");
    });
  });

  document.getElementById("mGuardarSesion").addEventListener("click", ()=>{
    document.querySelectorAll("[data-editar-peso]").forEach(inp=>{
      const serieId = Number(inp.dataset.editarPeso);
      const repes = document.querySelector(`[data-editar-repes="${serieId}"]`);
      Datos.actualizarSerie(serieId, {
        peso: Number(inp.value) || 0,
        repes: Number(repes.value) || 0
      });
    });
    Datos.actualizarSesion(id, {nota: document.getElementById("notaSesion").value.trim()});
    Datos.recalcularSesion(id);
    closeModal();
    RENDERERS.progreso();
    toast("Sesión corregida.");
  });

  document.getElementById("mBorrarSesion").addEventListener("click", ()=>{
    Datos.borrarSesion(id);
    closeModal();
    RENDERERS.progreso();
    toast("Sesión borrada.");
  });
}

/* Los objetivos no son fijos: a 74 kg no tocan los mismos gramos que a 66.
   Se muestra el ratio por kilo para que el número se pueda juzgar, sin decirte
   lo que tienes que hacer. */
function cardObjetivosHTML(){
  const peso = Datos.pesajes.length
    ? Datos.pesajes[Datos.pesajes.length-1].kg
    : PERFIL.peso_inicial_kg;
  const prote = objetivo("proteina_objetivo_g");
  const porKilo = (prote/peso).toFixed(2).replace(".", ",");

  return `
    <div class="card">
      <h2>Objetivos</h2>
      <div class="grid2">
        <div><label for="objProteina">Proteína (g)</label>
          <input type="number" id="objProteina" inputmode="numeric" value="${prote}"></div>
        <div><label for="objKcal">Calorías</label>
          <input type="number" id="objKcal" inputmode="numeric" value="${objetivo("calorias_objetivo")}"></div>
      </div>
      <div class="field" style="margin-top:10px;">
        <label for="objPeso">Peso objetivo (kg)</label>
        <input type="number" id="objPeso" inputmode="decimal" step="0.5" value="${objetivo("peso_objetivo_12_meses_kg")}">
      </div>
      <p class="muted" style="font-size:.8rem;">
        ${prote} g con ${peso} kg son <b>${porKilo} g por kilo</b>. Para ganar músculo se suele
        apuntar a 1,6-2,2. Cuando subas de peso, este número baja solo.
      </p>
      <button class="btn btn-primary btn-small" id="btnObjetivos">Guardar objetivos</button>
    </div>`;
}

function cardResumenHTML(){
  const sesiones = Datos.sesiones;
  if(!sesiones.length){
    return `<div class="card">
      <h2>Resumen</h2>
      <p class="muted">Cuando registres la primera sesión, aquí salen las cifras.</p>
    </div>`;
  }
  const desde28 = new Date(Date.now() - 28*86400000).toISOString().slice(0,10);
  const recientes = sesiones.filter(s=> s.fecha >= desde28);
  const seriesRecientes = Datos.series.filter(s=> s.fecha >= desde28);
  const volumenTotal = Datos.series.reduce((t,s)=> t + s.peso*s.repes, 0);
  const porSemana = (recientes.length/4).toFixed(1).replace(".",",");

  // Ritmo real de peso corporal, en kg por semana, con los últimos pesajes.
  let ritmo = null;
  const p = Datos.pesajes;
  if(p.length >= 2){
    const ult = p[p.length-1];
    let ref = p[0];
    for(let i=p.length-2;i>=0;i--){ if(daysBetween(p[i].fecha, ult.fecha) >= 14){ ref = p[i]; break; } }
    const dias = daysBetween(ref.fecha, ult.fecha);
    if(dias >= 7) ritmo = (ult.kg-ref.kg)/(dias/7);
  }

  const volumenSemanas = Datos.volumenPorSemana(8);

  return `
    <div class="card">
      <h2>Resumen</h2>
      <div class="cifras">
        <div class="cifra">
          <span class="v">${sesiones.length}</span>
          <span class="k">Sesiones</span>
          <span class="d">${recientes.length} en 4 semanas</span>
        </div>
        <div class="cifra">
          <span class="v">${porSemana}</span>
          <span class="k">Por semana</span>
          <span class="d">media de 4 semanas</span>
        </div>
        <div class="cifra">
          <span class="v">${(volumenTotal/1000).toFixed(1).replace(".",",")}<span style="font-size:.8rem;font-weight:600;"> t</span></span>
          <span class="k">Levantado</span>
          <span class="d">${seriesRecientes.length} series en 4 sem.</span>
        </div>
        <div class="cifra">
          <span class="v">${ritmo===null? "—" : (ritmo>0?"+":"")+ritmo.toFixed(2).replace(".",",")}</span>
          <span class="k">kg / semana</span>
          <span class="d">${ritmo===null? "faltan pesajes" : "objetivo +0,30 a +0,50"}</span>
        </div>
      </div>
      ${volumenSemanas.length>1 ? `
        <div class="eyebrow" style="margin:18px 0 8px;">Volumen por semana · kg movidos</div>
        ${svgBarChart(volumenSemanas)}` : ""}
    </div>`;
}

function svgBarChart(points){
  const w = 300, h = 90, pad = 6;
  const max = Math.max(...points.map(p=>p.v)) || 1;
  const hueco = 4;
  const ancho = (w - pad*2 - hueco*(points.length-1)) / points.length;
  const barras = points.map((p,i)=>{
    const alto = Math.max(2, (p.v/max)*(h-pad*2));
    const x = pad + i*(ancho+hueco);
    const ultima = i===points.length-1;
    return `<rect x="${x.toFixed(1)}" y="${(h-pad-alto).toFixed(1)}" width="${ancho.toFixed(1)}"
      height="${alto.toFixed(1)}" rx="2" fill="${ultima? "#D7F94F" : "#3A3A42"}"/>`;
  }).join("");
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:90px;display:block;">${barras}</svg>
    <div class="row" style="justify-content:space-between;font-size:.66rem;text-transform:uppercase;
      letter-spacing:.1em;color:var(--dim);font-weight:600;margin-top:6px;">
      <span>${fmtFecha(points[0].fecha).slice(0,5)}</span>
      <span>${points[points.length-1].v.toLocaleString("es-ES")} kg esta semana</span>
    </div>`;
}

function svgLineChart(points, opts){
  opts = opts || {};
  if(!points.length) return `<p class="muted">Sin datos todavía.</p>`;
  const w = 300, h = 120, pad = 20;
  const values = points.map(p=>p.v);
  let min = Math.min(...values), max = Math.max(...values);
  if(min===max){ min-=1; max+=1; }
  // Sin esto, subir 100 g dibuja una cuesta enorme y engaña.
  if(opts.minSpan && (max-min) < opts.minSpan){
    const centro = (max+min)/2;
    min = centro - opts.minSpan/2;
    max = centro + opts.minSpan/2;
  }
  const stepX = points.length>1 ? (w-2*pad)/(points.length-1) : 0;
  const coords = points.map((p,i)=>{
    const x = pad + i*stepX;
    const y = h-pad - ((p.v-min)/(max-min))*(h-2*pad);
    return [x,y];
  });
  const path = coords.map((c,i)=> (i===0?"M":"L")+c[0].toFixed(1)+","+c[1].toFixed(1)).join(" ");
  const area = path+` L${coords[coords.length-1][0].toFixed(1)},${h-pad} L${coords[0][0].toFixed(1)},${h-pad} Z`;
  const ult = coords[coords.length-1];
  const id = "g"+Math.random().toString(36).slice(2,7);
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D7F94F" stop-opacity=".22"/>
      <stop offset="100%" stop-color="#D7F94F" stop-opacity="0"/>
    </linearGradient></defs>
    <line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#26262C" stroke-width="1"/>
    <path d="${area}" fill="url(#${id})"/>
    <path d="${path}" fill="none" stroke="#D7F94F" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${ult[0].toFixed(1)}" cy="${ult[1].toFixed(1)}" r="3.5" fill="#D7F94F"/>
  </svg>
  <div class="row" style="justify-content:space-between;font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:var(--dim);font-weight:600;margin-top:2px;">
    <span>${fmtFecha(points[0].fecha)} · ${points[0].v}</span>
    <span>${fmtFecha(points[points.length-1].fecha)} · ${points[points.length-1].v}</span>
  </div>`;
}

function renderPesoChart(){
  const pts = Datos.pesajes.map(p=>({v:p.kg, fecha:p.fecha}));
  return svgLineChart(pts, {minSpan:4});
}

// La báscula manda: objetivo +0,3 a 0,5 kg por semana.
function avisoRitmoPeso(){
  const log = Datos.pesajes;
  if(log.length < 2) return null;
  const ultimo = log[log.length-1];
  // Si hace semanas que no te pesas, el consejo no vale: primero pésate.
  if(daysBetween(ultimo.fecha, todayStr()) > 10) return null;
  let ref = null;
  for(let i=log.length-2; i>=0; i--){
    if(daysBetween(log[i].fecha, ultimo.fecha) >= 12){ ref = log[i]; break; }
  }
  if(!ref) return null;
  const dias = daysBetween(ref.fecha, ultimo.fecha);
  const dif = ultimo.kg - ref.kg;
  const porSemana = dif/(dias/7);
  if(dif < 0.3){
    return {color:"var(--accent)", txt:`Llevas ${Math.round(dias/7)} semanas y has subido ${dif.toFixed(1)} kg. <b>Come más:</b> 300 kcal al día — puñado de frutos secos + vaso de leche + chorro de aceite.`};
  }
  if(porSemana > 1){
    return {color:"var(--accent2)", txt:`Estás subiendo ${porSemana.toFixed(1)} kg por semana. Frena un poco o cogerás grasa de más.`};
  }
  return {color:"var(--good)", txt:`${porSemana.toFixed(1)} kg por semana. Vas en el ritmo bueno (0,3-0,5). Sigue comiendo igual.`};
}
function renderEjercicioChart(exId){
  const pts = Datos.historialDe(exId).map(ses=>({v: Math.max(...ses.series.map(s=>s.peso)), fecha: ses.fecha}));
  return svgLineChart(pts);
}

/* ============================= COMIDA ============================= */

let filtroAlimento = "";

// Sin tildes ni mayúsculas: a las 6:00 nadie escribe "plátano" con tilde.
function normalizar(t){
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function pintarListaAlimentos(){
  const caja = document.getElementById("listaAlimentos");
  if(!caja) return;

  const catalogo = Datos.catalogo();
  const busca = normalizar(filtroAlimento.trim());
  const encontrados = busca
    ? catalogo.filter(a=> normalizar(a.nombre + " " + (a.cat||"")).includes(busca))
    : null;

  const fila = a=> `
    <div class="alimento">
      <button class="alimento-add" data-alimento="${escapeHtml(a.id)}">
        <span class="alimento-nombre">${escapeHtml(a.nombre)}${a.propio? ' <span class="badge" style="padding:2px 6px;">tuyo</span>':''}</span>
        <span class="alimento-racion">${escapeHtml(a.racion||"")}</span>
      </button>
      <span class="alimento-prote">+${a.proteina_g} g</span>
      <button class="alimento-editar" data-editar-alimento="${escapeHtml(a.id)}"
        aria-label="Corregir ${escapeHtml(a.nombre)}">✎</button>
    </div>`;

  if(encontrados){
    caja.innerHTML = encontrados.length
      ? encontrados.map(fila).join("")
      : `<p class="muted" style="font-size:.88rem;">Nada con ese nombre. Puedes guardarlo como alimento fijo.</p>`;
  } else {
    const frecuentes = Datos.alimentosFrecuentes(6);
    const grupos = CATEGORIAS_ALIMENTOS.map(cat=>{
      const items = catalogo.filter(a=> a.cat === cat);
      if(!items.length) return "";
      return `<div class="eyebrow" style="margin:16px 0 8px;">${cat}</div>` + items.map(fila).join("");
    }).join("");
    const otros = catalogo.filter(a=> !CATEGORIAS_ALIMENTOS.includes(a.cat));
    caja.innerHTML =
      (frecuentes.length ? `<div class="eyebrow" style="margin-bottom:8px;">Lo que más repites</div>` +
        frecuentes.map(fila).join("") : "") +
      grupos +
      (otros.length ? `<div class="eyebrow" style="margin:16px 0 8px;">Tuyos</div>` + otros.map(fila).join("") : "");
  }

  caja.querySelectorAll("[data-alimento]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const a = Datos.catalogo().find(x=> x.id === b.dataset.alimento);
      if(a) anotarAlimento(a.nombre, a.proteina_g, a.kcal);
    });
  });
  caja.querySelectorAll("[data-editar-alimento]").forEach(b=>{
    b.addEventListener("click", ()=> editarAlimento(b.dataset.editarAlimento));
  });
}

/* Corregir un alimento del catálogo o crear uno tuyo. Las recetas cambian y
   cada uno compra lo que compra: lo que manda es tu etiqueta. */
function editarAlimento(id){
  const a = id ? Datos.catalogo().find(x=> x.id === id) : null;
  const propio = a && a.propio;

  showModal(`
    <h2>${a ? escapeHtml(a.nombre) : "Alimento nuevo"}</h2>
    <p class="muted" style="font-size:.85rem;">
      ${a ? "Pon lo que diga tu etiqueta para la ración que te comes." : "Algo que compras y no está en la lista."}
    </p>
    <div class="field"><label for="alNombre">Nombre</label>
      <input type="text" id="alNombre" value="${a? escapeHtml(a.nombre):""}" placeholder="Requesón Hacendado"></div>
    <div class="field"><label for="alRacion">Ración</label>
      <input type="text" id="alRacion" value="${a? escapeHtml(a.racion||""):""}" placeholder="1 tarrina (250 g)"></div>
    <div class="row">
      <div class="col field"><label for="alProte">Proteína (g)</label>
        <input type="number" id="alProte" inputmode="decimal" value="${a? a.proteina_g:""}"></div>
      <div class="col field"><label for="alKcal">Kcal</label>
        <input type="number" id="alKcal" inputmode="numeric" value="${a? a.kcal:""}"></div>
    </div>
    <button class="btn btn-primary" id="mGuardarAlimento">Guardar</button>
    ${propio ? `<button class="btn btn-ghost btn-danger" id="mBorrarAlimento" style="width:100%;margin-top:8px;">${a.nuevo? "Borrar este alimento" : "Volver al valor original"}</button>` : ""}
    <button class="btn btn-ghost" id="mCerrar" style="width:100%;margin-top:8px;">Cerrar</button>
  `);

  document.getElementById("mCerrar").addEventListener("click", closeModal);

  document.getElementById("mGuardarAlimento").addEventListener("click", ()=>{
    const nombre = document.getElementById("alNombre").value.trim();
    const proteina = parseFloat(document.getElementById("alProte").value);
    if(!nombre || isNaN(proteina)) return;
    Datos.guardarAlimento({
      id: id || "propio_" + normalizar(nombre).replace(/[^a-z0-9]+/g, "_").slice(0, 30) + "_" + Date.now(),
      nombre,
      racion: document.getElementById("alRacion").value.trim(),
      proteina_g: proteina,
      kcal: parseFloat(document.getElementById("alKcal").value) || 0,
      cat: (a && a.cat) || "Rápido"
    });
    closeModal();
    pintarListaAlimentos();
    toast("Guardado.");
  });

  const btnBorrar = document.getElementById("mBorrarAlimento");
  if(btnBorrar) btnBorrar.addEventListener("click", ()=>{
    Datos.borrarAlimento(id);
    closeModal();
    pintarListaAlimentos();
    toast("Listo.");
  });
}

function anotarAlimento(nombre, proteina_g, kcal){
  Datos.añadirComida({
    fecha: todayStr(), nombre,
    proteina: proteina_g, kcal,
    hora: new Date().toTimeString().slice(0,5)
  });
  RENDERERS.comida();
  const buscador = document.getElementById("buscarAlimento");
  if(buscador && filtroAlimento) buscador.focus();
}

// Las comidas son filas con fecha, así que el día se reinicia solo.
function proteinaHoy(){
  const filas = Datos.comidasDe(todayStr());
  return {
    filas,
    gramos: filas.reduce((t,c)=> t + (c.proteina||0), 0),
    kcal: filas.reduce((t,c)=> t + (c.kcal||0), 0)
  };
}

RENDERERS.comida = function(){
  const el = document.getElementById("screen-comida");
  const dia = proteinaHoy();
  const pct = Math.min(100, Math.round((dia.gramos/objetivo("proteina_objetivo_g"))*100));

  el.innerHTML = `
    <div class="card">
      <h2>Proteína de hoy</h2>
      <div class="kpi">
        <b style="font-size:2.4rem;color:${dia.gramos>=objetivo("proteina_objetivo_g")?'var(--volt)':'var(--ink)'};">${Math.round(dia.gramos)}<span class="muted" style="font-size:1.1rem;font-weight:600;"> / ${objetivo("proteina_objetivo_g")} g</span></b>
        <span class="muted" style="font-size:.8rem;">${Math.round(dia.gramos/objetivo("proteina_objetivo_g")*100)}%</span>
      </div>
      <div class="progress" style="margin:12px 0 10px;">
        <div style="width:${pct}%;"></div>
      </div>
      <div class="muted" style="font-size:.8rem;">${dia.kcal} kcal de ${objetivo("calorias_objetivo")} objetivo</div>
      ${dia.filas.length? `
        <hr>
        <div style="font-size:.85rem;display:flex;flex-direction:column;gap:6px;">
          ${dia.filas.map(it=>`
            <div class="row" style="justify-content:space-between;align-items:center;">
              <span>${it.hora} — ${escapeHtml(it.nombre)} <span class="muted">+${it.proteina} g</span></span>
              <button class="item-x" data-remove="${it.id}" aria-label="Quitar ${escapeHtml(it.nombre)}">✕</button>
            </div>`).join("")}
        </div>` : ""}
    </div>

    <div class="card">
      <h2>Añadir comida</h2>
      <input type="search" id="buscarAlimento" placeholder="Buscar: pollo, yogur, avena..."
        value="${escapeHtml(filtroAlimento)}" aria-label="Buscar alimento">
      <div id="listaAlimentos" style="margin-top:14px;"></div>
      <div class="row" style="margin-top:12px;">
        <button class="btn btn-ghost btn-small col" id="btnOtroAlimento">Comida suelta</button>
        <button class="btn btn-ghost btn-small col" id="btnNuevoAlimento">+ alimento fijo</button>
      </div>
      <p class="muted" style="font-size:.78rem;margin:10px 0 0;">
        Raciones y valores orientativos del Mercadona. Si tu etiqueta dice otra cosa,
        toca el lápiz y se guarda tu valor para siempre.
      </p>
    </div>

    <details>
      <summary>Menús guardados</summary>
      <div class="body">
        <h3>Día de gym entre semana</h3>
        <table><tbody>${MENUS.dia_gym.map(m=>`<tr><td class="muted" style="white-space:nowrap;">${m.hora}</td><td>${escapeHtml(m.que)}</td></tr>`).join("")}</tbody></table>
        <h3 style="margin-top:12px;">Lunes con prisa</h3>
        <p><b>Problema:</b> ${escapeHtml(MENUS.lunes_prisa.problema)}</p>
        <p><b>Solución:</b> ${escapeHtml(MENUS.lunes_prisa.solucion)}</p>
        <p><b>Plan B:</b> ${escapeHtml(MENUS.lunes_prisa.plan_b)}</p>
        <h3 style="margin-top:12px;">Martes / jueves noche</h3>
        <p><b>Problema:</b> ${escapeHtml(MENUS.martes_jueves.problema)}</p>
        <p><b>Solución:</b> ${escapeHtml(MENUS.martes_jueves.solucion)}</p>
        <p><b>Al llegar:</b> ${escapeHtml(MENUS.martes_jueves.al_llegar)}</p>
        <h3 style="margin-top:12px;">Domingo</h3>
        <table><tbody>${MENUS.domingo.map(m=>`<tr><td class="muted" style="white-space:nowrap;">${m.hora}</td><td>${escapeHtml(m.que)}</td></tr>`).join("")}</tbody></table>
        <h3 style="margin-top:12px;">Salvavidas — siempre a mano</h3>
        <ul>${MENUS.salvavidas.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul>
      </div>
    </details>

    <details>
      <summary>Lista de la compra</summary>
      <div class="body">
        <p class="muted" style="font-style:italic;">"${escapeHtml(COMPRA.mensaje_madre)}"</p>
        <h3>Esenciales</h3>
        <ul>${COMPRA.esenciales.map(x=>`<li><b>${escapeHtml(x)}</b></li>`).join("")}</ul>
        <h3>Proteína</h3><ul>${COMPRA.proteina.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <h3>Grasas</h3><ul>${COMPRA.grasas.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <h3>Hidratos</h3><ul>${COMPRA.hidratos.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <h3>Fruta y verdura</h3><ul>${COMPRA.fruta_verdura.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <button class="btn btn-primary" id="btnCopiarCompra" style="margin-top:8px;">Copiar para WhatsApp</button>
      </div>
    </details>
  `;

  pintarListaAlimentos();

  const buscador = document.getElementById("buscarAlimento");
  buscador.addEventListener("input", ()=>{
    filtroAlimento = buscador.value;
    pintarListaAlimentos();   // solo la lista, para no perder el foco al escribir
  });

  document.getElementById("btnNuevoAlimento").addEventListener("click", ()=> editarAlimento(null));
  el.querySelectorAll("[data-remove]").forEach(b=>{
    b.addEventListener("click", ()=>{
      Datos.borrarComida(Number(b.dataset.remove));
      RENDERERS.comida();
    });
  });

  document.getElementById("btnOtroAlimento").addEventListener("click", ()=>{
    showModal(`
      <h2>Otra comida</h2>
      <p class="muted" style="font-size:.85rem;">Para lo que no está en la lista: la comida en familia, el bocadillo de la calle...</p>
      <div class="field"><label>Qué era</label><input type="text" id="oNombre" placeholder="Comida en familia"></div>
      <div class="row">
        <div class="col field"><label>Proteína (g)</label><input type="number" id="oProte" inputmode="decimal" placeholder="30"></div>
        <div class="col field"><label>Kcal (opcional)</label><input type="number" id="oKcal" inputmode="numeric" placeholder="600"></div>
      </div>
      <div class="row" style="margin-top:6px;">
        <button class="btn btn-ghost col" id="mCerrar">Cerrar</button>
        <button class="btn btn-primary col" id="mGuardar">Añadir</button>
      </div>`, {center:true});
    document.getElementById("mCerrar").addEventListener("click", closeModal);
    document.getElementById("mGuardar").addEventListener("click", ()=>{
      const prote = parseFloat(document.getElementById("oProte").value) || 0;
      const kcal = parseFloat(document.getElementById("oKcal").value) || 0;
      const nombre = document.getElementById("oNombre").value.trim() || "Otra comida";
      if(!prote && !kcal) return;
      closeModal();
      anotarAlimento(nombre, prote, kcal);
    });
  });
  const btnCopiar = document.getElementById("btnCopiarCompra");
  if(btnCopiar) btnCopiar.addEventListener("click", ()=>{
    const txt = COMPRA.mensaje_madre+"\n\n"+
      "ESENCIALES: "+COMPRA.esenciales.join(", ")+"\n"+
      "Proteína: "+COMPRA.proteina.join(", ")+"\n"+
      "Grasas: "+COMPRA.grasas.join(", ")+"\n"+
      "Hidratos: "+COMPRA.hidratos.join(", ")+"\n"+
      "Fruta y verdura: "+COMPRA.fruta_verdura.join(", ");
    copyToClipboard(txt);
  });
};

function copyToClipboard(txt){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>toast("Copiado. Pégalo en WhatsApp.")).catch(fallbackCopy);
  } else fallbackCopy();
  function fallbackCopy(){
    const ta = document.createElement("textarea");
    ta.value = txt; document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); toast("Copiado. Pégalo en WhatsApp."); }catch(e){ toast("No se pudo copiar."); }
    ta.remove();
  }
}

/* ============================= GUÍA ============================= */

RENDERERS.guia = function(){
  const el = document.getElementById("screen-guia");
  el.innerHTML = `
    <details open>
      <summary>Técnica de cada ejercicio</summary>
      <div class="body">
        ${Object.keys(TECNICA).map(id=>`
          <h3>${escapeHtml(nombreEjercicio(id))}</h3>
          <ul>${TECNICA[id].claves.map(c=>`<li>${escapeHtml(c)}</li>`).join("")}</ul>
          ${TECNICA[id].error? `<p><b>Error típico:</b> ${escapeHtml(TECNICA[id].error)}</p>`:""}
          ${TECNICA[id].seguridad? `<p><b>Seguridad:</b> ${escapeHtml(TECNICA[id].seguridad)}</p>`:""}
          ${TECNICA[id].nota? `<p class="muted">${escapeHtml(TECNICA[id].nota)}</p>`:""}
          <hr>
        `).join("")}
      </div>
    </details>

    <details>
      <summary>Calentamiento</summary>
      <div class="body">
        <p>${escapeHtml(CALENTAMIENTO.general)}</p>
        <p>${escapeHtml(CALENTAMIENTO.especifico)}</p>
        <ul>${CALENTAMIENTO.aproximacion.map(a=>`<li>${escapeHtml(a)}</li>`).join("")}</ul>
        <p class="muted">${escapeHtml(CALENTAMIENTO.nota)}</p>
      </div>
    </details>

    <details>
      <summary>Cómo progreso</summary>
      <div class="body">
        <p><b>${escapeHtml(REGLAS_PROGRESION.metodo)}</b> — RIR: ${escapeHtml(REGLAS_PROGRESION.rir)}</p>
        <ol>${REGLAS_PROGRESION.pasos.map(p=>`<li>${escapeHtml(p)}</li>`).join("")}</ol>
        <p>${escapeHtml(REGLAS_PROGRESION.incrementos)}</p>
        <p class="muted">Si no llego: ${escapeHtml(REGLAS_PROGRESION.si_no_llego)}</p>
        <p class="muted">Si 3 semanas estancado: ${escapeHtml(REGLAS_PROGRESION.si_3_semanas_estancado)}</p>
        <h3 style="margin-top:10px;">Descarga (deload)</h3>
        <p>Cada ${REGLAS_PROGRESION.deload.cada}: ${REGLAS_PROGRESION.deload.series} de las series, ${REGLAS_PROGRESION.deload.peso}.</p>
        <p class="muted">${escapeHtml(REGLAS_PROGRESION.deload.nota)}</p>
      </div>
    </details>

    <details>
      <summary>Suplementos</summary>
      <div class="body">
        <h3>Sí</h3>
        ${SUPLEMENTOS.si.map(s=>`<p><b>${escapeHtml(s.nombre)}</b>${s.dosis? " — "+escapeHtml(s.dosis):""}${s.cuando? " · "+escapeHtml(s.cuando):""}${s.nota? "<br><span class='muted'>"+escapeHtml(s.nota)+"</span>":""}</p>`).join("")}
        <h3>No</h3>
        <ul>${SUPLEMENTOS.no.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul>
      </div>
    </details>

    <details>
      <summary>Sueño</summary>
      <div class="body">
        <p>${escapeHtml(SUENO.diagnostico)}</p>
        <p class="muted">${escapeHtml(SUENO.error_pasado)}</p>
        <h3>Para despertarme</h3><ul>${SUENO.para_despertarme.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <h3>Para dormirme</h3><ul>${SUENO.para_dormirme.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <p><b>Clave:</b> ${escapeHtml(SUENO.clave)}</p>
        <p><b>Cómo empiezo:</b> ${escapeHtml(SUENO.como_empiezo)}</p>
        <p class="muted">${escapeHtml(SUENO.minimo)}</p>
        <p class="muted">${escapeHtml(SUENO.alarma)}</p>
      </div>
    </details>

    <details>
      <summary>Alcohol y vida social</summary>
      <div class="body">
        <p>${escapeHtml(ALCOHOL.regla)}</p>
        <ul>${ALCOHOL.efectos.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <ul>${ALCOHOL.reglas.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <p class="muted">${escapeHtml(ALCOHOL.dano)}</p>
      </div>
    </details>

    <details>
      <summary>Cuando algo falla</summary>
      <div class="body">
        ${PROBLEMAS.map(pr=>`<p><b>${escapeHtml(pr.p)}</b><br>${escapeHtml(pr.s)}</p>`).join("")}
      </div>
    </details>

    <details>
      <summary>Qué esperar mes a mes</summary>
      <div class="body">
        ${EXPECTATIVAS.map(e=>`<p><b>${escapeHtml(e.mes)}</b> ${e.peso? "("+escapeHtml(e.peso)+")":""}<br>${escapeHtml(e.que)}</p>`).join("")}
      </div>
    </details>

    <details>
      <summary>Lo que NO hago</summary>
      <div class="body">
        ${Object.keys(NO_HAGO).map(k=>`<h3>${escapeHtml(k)}</h3><ul>${NO_HAGO[k].map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`).join("")}
        <p class="frase" style="margin-top:10px;">"Si tuviera que elegir uno solo: NO DEJO DE COMER."</p>
      </div>
    </details>
  `;
};

/* ============================= CHECKLIST ============================= */

RENDERERS.check = function(){
  const el = document.getElementById("screen-check");
  const hoy = todayStr();
  if(state.checklist.fecha !== hoy){
    state.checklist = {fecha:hoy, marcados:{}};
    saveState();
  }
  const todosMarcados = CHECKLIST_ITEMS.every(it=>state.checklist.marcados[it.id]);
  el.innerHTML = `
    <div class="card">
      <h2>Checklist noche anterior</h2>
      <p class="muted" style="font-size:.82rem;">Marca esto antes de acostarte (domingo, lunes y miércoles, antes de un día de gym).</p>
      ${CHECKLIST_ITEMS.map(it=>`
        <button class="btn ${state.checklist.marcados[it.id]?'btn-good':''}" data-item="${it.id}" style="justify-content:flex-start;margin-bottom:8px;">
          ${state.checklist.marcados[it.id]?'✓':'○'}&nbsp;&nbsp;${escapeHtml(it.txt)}
        </button>
      `).join("")}
      ${todosMarcados? `<p class="frase" style="margin-top:6px;">Todo listo. Ahora a dormir.</p>` : ""}
    </div>
  `;
  el.querySelectorAll("[data-item]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id = b.dataset.item;
      state.checklist.marcados[id] = !state.checklist.marcados[id];
      saveState();
      RENDERERS.check();
    });
  });
};

/* ============================= ARRANQUE ============================= */

/* Si algo falla, decirlo. Una pantalla en blanco sin explicación es peor que
   un aviso feo, y encima hace dudar de si se han perdido los datos. */
window.addEventListener("error", e=> avisarDeFallo(e.message));
window.addEventListener("unhandledrejection", e=> avisarDeFallo(e.reason && e.reason.message));

let fallosAvisados = 0;
function avisarDeFallo(mensaje){
  if(fallosAvisados++ > 2) return;   // no encadenar avisos
  try{
    Datos.guardarAjuste("ultimoFallo", {mensaje:String(mensaje||"desconocido"), cuando:Date.now()});
    toast("Algo ha fallado, pero tus datos están guardados. Si se repite, exporta una copia.", 6000);
  }catch(e){}
}

// Nada se pinta hasta que la base de datos está abierta y cargada: así la
// primera pantalla ya sale con los datos buenos, sin parpadeos.
Datos.abrir(()=>{
  pedirAlmacenamientoPersistente();
  RENDERERS.hoy();
  // Señal de "ya está todo cargado": la usan los tests para no esperar a ciegas.
  document.documentElement.dataset.listo = "1";
});

/* El service worker se registra con la versión en la URL: al cambiarla, el
   navegador detecta un archivo distinto y busca la versión nueva. No se
   instala a la fuerza (cambiar los archivos a media sesión rompe cosas):
   se avisa y se actualiza cuando tú quieras. */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js?v=' + VERSION).then(registro=>{
      registro.addEventListener('updatefound', ()=>{
        const entrante = registro.installing;
        if(!entrante) return;
        entrante.addEventListener('statechange', ()=>{
          if(entrante.state === 'installed' && navigator.serviceWorker.controller){
            avisarDeActualizacion(entrante);
          }
        });
      });
    }).catch(()=>{});

    /* Solo recargar si la actualización la has pedido tú. El service worker
       reclama la página la primera vez que se instala, y recargar ahí hacía
       que la web se reiniciara sola en la primera visita: a mitad de una
       serie eso es inaceptable. */
    navigator.serviceWorker.addEventListener('controllerchange', ()=>{
      if(!actualizacionPedida) return;
      actualizacionPedida = false;
      window.location.reload();
    });
  });
}

let actualizacionPedida = false;

function avisarDeActualizacion(entrante){
  // Nunca en mitad de un entreno: se avisa al terminar.
  if(state.sesionActual) return;
  const root = document.getElementById("toastRoot");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `Hay una versión nueva.
    <button class="btn btn-small btn-primary" style="margin-top:8px;width:100%;">Actualizar</button>`;
  el.querySelector("button").addEventListener("click", ()=>{
    actualizacionPedida = true;
    entrante.postMessage({tipo:"activar"});
    el.remove();
  });
  root.appendChild(el);
}

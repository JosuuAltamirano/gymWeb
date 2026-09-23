/* ============================================================
   AVISOS
   ------------------------------------------------------------
   Sin servidor no hay notificaciones push de verdad: un navegador
   no puede avisarte de nada con la web cerrada. Así que se hacen
   las dos cosas que sí funcionan:

   1. Exportar la rutina al calendario del móvil (.ics). El
      calendario sí avisa, siempre, aunque no abras la web.
   2. Avisar del fin del descanso mientras entrenas, si has salido
      de la web pero sigue abierta.
   ============================================================ */

const Avisos = {

  /* ---------- Aviso de fin de descanso ---------- */

  get permitido(){
    return typeof Notification !== "undefined" && Notification.permission === "granted";
  },

  pedirPermiso(){
    if(typeof Notification === "undefined") return Promise.resolve(false);
    return Notification.requestPermission().then(r=> r === "granted").catch(()=> false);
  },

  // Solo cuando la web no está en pantalla: si la estás mirando, ya lo ves.
  descansoTerminado(){
    if(!this.permitido || !document.hidden) return;
    try{
      new Notification("Descanso terminado", {
        body: "Siguiente serie.",
        tag: "descanso",
        silent: false
      });
    }catch(e){}
  },

  /* ---------- Calendario ---------- */

  // Genera el .ics con la rutina, el pesaje y la foto mensual.
  generarCalendario(modo){
    const rutina = modo === "obra" ? RUTINA_OBRA : RUTINA_NORMAL;
    const lineas = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Mi Gym//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Mi Gym"
    ];

    DIAS_ORDEN.forEach(diaKey=>{
      const dia = rutina.dias[diaKey];
      if(!dia || !dia.ejercicios || !dia.ejercicios.length || !dia.hora) return;

      lineas.push(...this._evento({
        uid: "entreno-" + diaKey,
        titulo: dia.nombre,
        descripcion: dia.ejercicios.map(e=> `${e.nombre} ${e.series}x${e.repes}`).join("\\n"),
        diaKey,
        hora: dia.hora,
        minutos: 80,
        regla: "FREQ=WEEKLY;BYDAY=" + this._byday(diaKey),
        avisoMin: 15
      }));

      // La noche antes: dejarlo todo listo, que por la mañana no se decide.
      const vispera = DIAS_ORDEN[(DIAS_ORDEN.indexOf(diaKey) + 6) % 7];
      lineas.push(...this._evento({
        uid: "checklist-" + diaKey,
        titulo: "Preparar gym: " + dia.nombre,
        descripcion: CHECKLIST_ITEMS.map(i=> i.txt).join("\\n"),
        diaKey: vispera,
        hora: "21:30",
        minutos: 10,
        regla: "FREQ=WEEKLY;BYDAY=" + this._byday(vispera),
        avisoMin: 0
      }));
    });

    lineas.push(...this._evento({
      uid: "pesaje",
      titulo: "Pesarte",
      descripcion: "En ayunas, después de mear. Mismo día y misma hora siempre.",
      diaKey: "domingo",
      hora: "08:30",
      minutos: 10,
      regla: "FREQ=WEEKLY;BYDAY=SU",
      avisoMin: 0
    }));

    lineas.push(...this._evento({
      uid: "foto",
      titulo: "Foto de progreso",
      descripcion: "Frente y perfil. Misma luz, mismo sitio, misma hora.",
      diaKey: "domingo",
      hora: "09:00",
      minutos: 10,
      regla: "FREQ=MONTHLY;BYMONTHDAY=1",
      avisoMin: 0
    }));

    lineas.push("END:VCALENDAR");
    return lineas.join("\r\n");
  },

  _byday(diaKey){
    return {lunes:"MO", martes:"TU", miercoles:"WE", jueves:"TH",
            viernes:"FR", sabado:"SA", domingo:"SU"}[diaKey];
  },

  // Primera fecha futura que caiga en ese día de la semana.
  _proximoDia(diaKey, hora){
    const objetivo = DIAS_ORDEN.indexOf(diaKey);
    const d = new Date();
    const actual = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() + ((objetivo - actual + 7) % 7));
    const [h, m] = hora.split(":").map(Number);
    d.setHours(h, m, 0, 0);
    return d;
  },

  _sello(fecha){
    const p = n=> String(n).padStart(2,"0");
    return fecha.getFullYear() + p(fecha.getMonth()+1) + p(fecha.getDate()) +
      "T" + p(fecha.getHours()) + p(fecha.getMinutes()) + "00";
  },

  _evento({uid, titulo, descripcion, diaKey, hora, minutos, regla, avisoMin}){
    const inicio = this._proximoDia(diaKey, hora);
    const fin = new Date(inicio.getTime() + minutos*60000);
    const lineas = [
      "BEGIN:VEVENT",
      "UID:" + uid + "@migym",
      "DTSTAMP:" + this._sello(new Date()) + "Z",
      "DTSTART:" + this._sello(inicio),
      "DTEND:" + this._sello(fin),
      "RRULE:" + regla,
      "SUMMARY:" + titulo,
      "DESCRIPTION:" + descripcion
    ];
    if(avisoMin !== null && avisoMin !== undefined){
      lineas.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "DESCRIPTION:" + titulo,
        "TRIGGER:-PT" + avisoMin + "M",
        "END:VALARM"
      );
    }
    lineas.push("END:VEVENT");
    return lineas;
  },

  descargarCalendario(modo){
    const texto = this.generarCalendario(modo);
    const blob = new Blob([texto], {type:"text/calendar;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mi-gym.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};

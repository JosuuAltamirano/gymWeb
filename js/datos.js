/* ============================= DATOS ============================= */

const PERFIL = {
  nombre:"J", edad:19, altura_cm:180, peso_inicial_kg:66,
  objetivo:"ganar musculo", puntos_debiles:["gemelos","piernas","antebrazos"],
  puntos_fuertes:["pectoral"], gym:"Synergym Gandía Sur",
  fecha_inicio:"2026-09-22", calorias_objetivo:2900, proteina_objetivo_g:130,
  peso_objetivo_12_meses_kg:74, ritmo_objetivo_kg_semana:0.4
};

const HORARIOS_GYM = {
  "L-V":"06:00 - 23:00", "Sábado":"09:00 - 18:00", "Domingo y festivos":"09:00 - 14:00"
};

const NOTAS_DIA = {
  lunes:"Benidorm 09:00. Quedo con un amigo a las 07:50 junto al gym.",
  martes:"Predicación 09:30 zona Corea.",
  miercoles:"Descanso. Predicación en Bellreguard o negocio.",
  jueves:"Predicación 09:30 zona Corea + estudio personal.",
  viernes:"Descanso. Noche libre para salir.",
  sabado:"Predicación 10:00. Descanso en semana normal; en semana de obra, gym 16:00.",
  domingo:"Reunión 12:30 (salir de casa 11:30)."
};

const RUTINA_NORMAL = {
  modo:"normal",
  dias:{
    lunes:{ hora:"06:00", nombre:"PIERNA A", ejercicios:[
      {id:"sentadilla", nombre:"Sentadilla", series:4, repes:"6-8", descanso_seg:180, tipo:"pesado"},
      {id:"prensa", nombre:"Prensa", series:3, repes:"10-12", descanso_seg:120, tipo:"pesado"},
      {id:"femoral_tumbado", nombre:"Curl femoral tumbado", series:3, repes:"10-12", descanso_seg:90, tipo:"aislamiento"},
      {id:"extension_cuadriceps", nombre:"Extensión de cuádriceps", series:3, repes:"12", descanso_seg:90, tipo:"aislamiento"},
      {id:"gemelo_pie", nombre:"Gemelo de pie", series:4, repes:"10-15", descanso_seg:60, tipo:"punto_debil"},
      {id:"gemelo_sentado", nombre:"Gemelo sentado", series:3, repes:"15-20", descanso_seg:60, tipo:"punto_debil"}
    ]},
    martes:{ hora:"06:00", nombre:"EMPUJE", ejercicios:[
      {id:"press_banca", nombre:"Press banca", series:4, repes:"6-8", descanso_seg:180, tipo:"pesado"},
      {id:"press_militar", nombre:"Press militar", series:3, repes:"8-10", descanso_seg:120, tipo:"pesado"},
      {id:"press_inclinado", nombre:"Press inclinado con mancuernas", series:3, repes:"10", descanso_seg:120, tipo:"pesado"},
      {id:"elevaciones_laterales", nombre:"Elevaciones laterales", series:3, repes:"15", descanso_seg:60, tipo:"aislamiento"},
      {id:"triceps_polea", nombre:"Tríceps en polea", series:3, repes:"12", descanso_seg:60, tipo:"aislamiento"},
      {id:"fondos", nombre:"Fondos en paralelas o press francés", series:2, repes:"10", descanso_seg:90, tipo:"aislamiento"}
    ]},
    miercoles:{ nombre:"DESCANSO", ejercicios:[] },
    jueves:{ hora:"06:00", nombre:"PIERNA B", ejercicios:[
      {id:"peso_muerto_rumano", nombre:"Peso muerto rumano", series:4, repes:"8", descanso_seg:180, tipo:"pesado"},
      {id:"zancadas", nombre:"Zancadas con mancuernas", series:3, repes:"10 por pierna", descanso_seg:120, tipo:"pesado"},
      {id:"hack", nombre:"Hack o prensa", series:3, repes:"12", descanso_seg:120, tipo:"pesado"},
      {id:"femoral_sentado", nombre:"Curl femoral sentado", series:3, repes:"12", descanso_seg:90, tipo:"aislamiento"},
      {id:"gemelo_pie", nombre:"Gemelo de pie", series:4, repes:"10-15", descanso_seg:60, tipo:"punto_debil"},
      {id:"gemelo_prensa", nombre:"Gemelo en prensa", series:3, repes:"20", descanso_seg:60, tipo:"punto_debil"}
    ]},
    viernes:{ nombre:"DESCANSO", ejercicios:[] },
    sabado:{ nombre:"DESCANSO", ejercicios:[] },
    domingo:{ hora:"09:00", nombre:"TIRÓN", ejercicios:[
      {id:"dominadas", nombre:"Dominadas o jalón al pecho", series:4, repes:"8", descanso_seg:150, tipo:"pesado"},
      {id:"remo_barra", nombre:"Remo con barra", series:4, repes:"8", descanso_seg:150, tipo:"pesado"},
      {id:"remo_polea", nombre:"Remo en polea baja", series:3, repes:"12", descanso_seg:90, tipo:"aislamiento"},
      {id:"face_pull", nombre:"Face pull o pájaros", series:3, repes:"15", descanso_seg:60, tipo:"aislamiento"},
      {id:"curl_barra", nombre:"Curl de bíceps con barra", series:3, repes:"10", descanso_seg:60, tipo:"aislamiento"},
      {id:"curl_martillo", nombre:"Curl martillo", series:3, repes:"12", descanso_seg:60, tipo:"punto_debil"},
      {id:"curl_muneca", nombre:"Curl de muñeca", series:3, repes:"15", descanso_seg:45, tipo:"punto_debil"},
      {id:"agarre_muerto", nombre:"Agarre muerto (farmer hold)", series:3, repes:"30-45 seg", descanso_seg:60, tipo:"punto_debil"}
    ]}
  }
};

const RUTINA_OBRA = {
  modo:"obra",
  dias:{
    lunes:{ nombre:"DESCANSO (obra)", ejercicios:[] },
    martes:{ nombre:"DESCANSO (obra)", ejercicios:[] },
    miercoles:{ nombre:"DESCANSO (obra)", ejercicios:[] },
    jueves:{ nombre:"DESCANSO (obra)", ejercicios:[] },
    viernes:{ nombre:"DESCANSO (obra)", ejercicios:[] },
    sabado:{ hora:"16:00", nombre:"TORSO COMPLETO", aviso:"El gym cierra a las 18:00 los sábados", ejercicios:[
      {id:"press_banca", nombre:"Press banca", series:4, repes:"6-8", descanso_seg:180},
      {id:"dominadas", nombre:"Dominadas o jalón", series:4, repes:"8", descanso_seg:150},
      {id:"press_militar", nombre:"Press militar", series:3, repes:"8-10", descanso_seg:120},
      {id:"remo_barra", nombre:"Remo con barra", series:3, repes:"10", descanso_seg:120},
      {id:"elevaciones_laterales", nombre:"Elevaciones laterales", series:3, repes:"15", descanso_seg:60},
      {id:"curl_barra", nombre:"Curl de bíceps", series:3, repes:"12", descanso_seg:60},
      {id:"triceps_polea", nombre:"Tríceps en polea", series:3, repes:"12", descanso_seg:60},
      {id:"agarre_muerto", nombre:"Agarre muerto", series:3, repes:"30-45 seg", descanso_seg:60}
    ]},
    domingo:{ hora:"09:00", nombre:"PIERNA COMPLETA", ejercicios:[
      {id:"sentadilla", nombre:"Sentadilla", series:4, repes:"6-8", descanso_seg:180},
      {id:"peso_muerto_rumano", nombre:"Peso muerto rumano", series:3, repes:"8", descanso_seg:180},
      {id:"prensa", nombre:"Prensa", series:3, repes:"12", descanso_seg:120},
      {id:"femoral_tumbado", nombre:"Curl femoral", series:3, repes:"12", descanso_seg:90},
      {id:"gemelo_pie", nombre:"Gemelo de pie", series:4, repes:"12", descanso_seg:60},
      {id:"gemelo_sentado", nombre:"Gemelo sentado", series:3, repes:"20", descanso_seg:60}
    ]}
  }
};

const REGLAS_PROGRESION = {
  rir:"1-2 repes en recámara, no llegar al fallo",
  metodo:"Doble progresión",
  pasos:[
    "Empiezo con un peso con el que llego al tope bajo del rango dejando 2 repes en recámara.",
    "Cada semana intento una repetición más en cada serie con el mismo peso.",
    "Cuando completo el tope alto en TODAS las series, subo el peso y vuelvo al tope bajo."
  ],
  incrementos:"Ejercicios grandes: 2,5-5 kg. Ejercicios pequeños (aislamiento): 1,25-2,5 kg.",
  si_no_llego:"Repito el mismo peso la semana siguiente. Pudo ser sueño o comida.",
  si_3_semanas_estancado:"Reviso comida y sueño antes de tocar la rutina.",
  deload:{ cada:"8-10 semanas", series:"la mitad", peso:"60-70% del habitual",
    nota:"Las semanas de obra ya funcionan como deload natural." }
};

const CALENTAMIENTO = {
  general:"3 min de bici o cinta suave, solo para entrar en calor.",
  especifico:"Solo antes del primer ejercicio del día:",
  aproximacion:[
    "1ª serie: barra vacía o muy poco peso, 10 repes",
    "2ª serie: 50% del peso de trabajo, 5 repes",
    "3ª serie: 75% del peso de trabajo, 3 repes"
  ],
  nota:"Las series de aproximación NO cuentan como series de trabajo."
};

const TECNICA = {
  sentadilla:{ claves:["Barra en trapecios, no en el cuello","Pies anchura hombros, puntas algo hacia fuera","Bajo empujando caderas atrás y rodillas hacia fuera","Bajo hasta muslo paralelo al suelo o algo más","Espalda recta, mirada al frente","Subo empujando con los talones"], error:"Que se junten las rodillas al subir." },
  prensa:{ claves:["Pies a media altura de la plataforma","Bajo hasta 90° sin despegar la lumbar del respaldo","No bloqueo del todo las rodillas arriba"], error:"Bajar demasiado y curvar la lumbar." },
  peso_muerto_rumano:{ claves:["Rodillas ligeramente flexionadas y FIJAS","Barra pegada a las piernas, empujo el culo atrás","Bajo hasta notar el estirón en el femoral (media espinilla aprox)","Espalda totalmente recta"], error:"Se siente en el femoral, NO en la lumbar. Si duele la lumbar, estoy curvando la espalda." },
  zancadas:{ claves:["Paso largo","Bajo hasta que la rodilla de atrás casi toca el suelo","Tronco erguido","La rodilla delantera no pasa mucho de la punta del pie"] },
  gemelo_pie:{ claves:["RANGO COMPLETO: bajo el talón todo lo que pueda y subo del todo","Pausa de 1 seg abajo y 1 arriba","Lento, sin rebotar"], error:"Hacerlo rápido con rebote. No sirve de nada.", nota:"PUNTO DÉBIL. Aquí pongo más atención." },
  gemelo_sentado:{ claves:["Igual pero sentado, trabaja el sóleo","Repes altas 15-20","Pausa abajo"], nota:"PUNTO DÉBIL." },
  press_banca:{ claves:["Escápulas juntas y retraídas contra el banco","Pies firmes en el suelo","Barra al pecho medio, codos a 45-70°","Toco el pecho suave, no reboto"], seguridad:"Con peso alto pido ayuda o uso el rack de seguridad." },
  press_militar:{ claves:["De pie o sentado","Barra desde la clavícula hacia arriba, la cabeza se mete debajo al subir","Abdomen apretado"], error:"Arquear la lumbar para subir más peso." },
  press_inclinado:{ claves:["Banco a 30°, no más","Bajo hasta notar estiramiento en el pecho","Trayectoria algo hacia dentro al subir"] },
  elevaciones_laterales:{ claves:["Peso ligero, esto no es de ir fuerte","Subo hasta altura del hombro, no más","Codo algo flexionado, subo con el codo no con la mano","Bajo lento"], error:"Usar impulso con la espalda." },
  dominadas:{ claves:["Si no me salen, uso jalón o máquina asistida","Agarre algo más ancho que los hombros","Empiezo hundiendo los hombros hacia abajo","Subo hasta pasar la barbilla","Bajo controlado hasta estirar del todo"] },
  remo_barra:{ claves:["Tronco inclinado 45°, espalda recta","Barra hacia el ombligo, no hacia el pecho","Codos pegados al cuerpo","Aprieto escápulas al final"], error:"Usar impulso balanceando el tronco." },
  curl_barra:{ claves:["Codos pegados al cuerpo y quietos","Sin balancear la espalda","Bajo controlado"] },
  curl_martillo:{ claves:["Agarre neutro, palmas mirándose","Igual que el curl normal"], nota:"Ayuda al antebrazo. PUNTO DÉBIL." },
  curl_muneca:{ claves:["Sentado, antebrazos en los muslos, palmas arriba","Solo se mueve la muñeca","Rango completo, bajo hasta los dedos y subo"], nota:"PUNTO DÉBIL." },
  agarre_muerto:{ claves:["Cojo dos mancuernas pesadas y aguanto de pie","30-45 segundos hasta no poder más"], nota:"Lo que más engorda el antebrazo. PUNTO DÉBIL." }
};

const ALIMENTOS = [
  {nombre:"3 huevos", proteina_g:18, kcal:210},
  {nombre:"1 lata de atún", proteina_g:15, kcal:110},
  {nombre:"150g pollo", proteina_g:33, kcal:250},
  {nombre:"150g carne picada", proteina_g:30, kcal:330},
  {nombre:"Vaso leche entera", proteina_g:8, kcal:160},
  {nombre:"Yogur griego", proteina_g:10, kcal:130},
  {nombre:"100g queso fresco", proteina_g:12, kcal:100},
  {nombre:"Puñado frutos secos", proteina_g:6, kcal:180},
  {nombre:"2 cdas crema cacahuete", proteina_g:8, kcal:190},
  {nombre:"100g arroz cocido", proteina_g:2.5, kcal:130},
  {nombre:"Cacito proteína", proteina_g:24, kcal:120},
  {nombre:"Cucharada aceite oliva", proteina_g:0, kcal:120},
  {nombre:"Plátano", proteina_g:1, kcal:100},
  {nombre:"Bocadillo atún", proteina_g:20, kcal:450},
  {nombre:"Batido leche+plátano+cacahuete", proteina_g:17, kcal:500}
];

const MENUS = {
  dia_gym:[
    {hora:"05:30", que:"Plátano + vaso de leche entera"},
    {hora:"08:15", que:"3-4 huevos revueltos + pan + aceite + leche"},
    {hora:"11:30", que:"Puñado de frutos secos + fruta"},
    {hora:"14:30", que:"Arroz con pollo o carne + chorro de aceite + verdura"},
    {hora:"17:30", que:"Bocadillo de atún o pavo + fruta (en clase)"},
    {hora:"21:45", que:"Huevos o carne + patata/pan + yogur griego"},
    {hora:"antes de dormir", que:"Vaso de leche entera si me he quedado corto"}
  ],
  lunes_prisa:{ problema:"Llego a las 14:30 corriendo, ducha, comida y salgo.",
    solucion:"Comida hecha del día antes.",
    plan_b:"Arroz precocido (2 min) + lata de atún + chorro de aceite = 3 min y 700 kcal." },
  martes_jueves:{ problema:"Llego a las 23:00 sin cenar.",
    solucion:"Llevo comida: bocadillo de tortilla o pavo con queso sobre las 18:30.",
    al_llegar:"Yogur griego + frutos secos + leche, o dos huevos a la plancha." },
  domingo:[
    {hora:"08:30", que:"Plátano + leche"},
    {hora:"10:45", que:"Batido: leche + plátano + crema de cacahuete (mientras me visto)"},
    {hora:"14:30", que:"Comida en familia"}
  ],
  salvavidas:["Plátanos","Frutos secos","Leche entera"]
};

const COMPRA = {
  proteina:["Huevos (2-3 docenas/semana)","Pechuga de pollo","Muslos de pollo","Carne picada ternera","Atún en lata","Pavo o jamón york","Leche entera","Yogur griego natural","Queso fresco","Queso curado"],
  grasas:["Aceite de oliva","Cacahuetes","Almendras","Nueces","Crema de cacahuete","Aguacate"],
  hidratos:["Arroz","Pan","Pasta","Patatas","Avena"],
  fruta_verdura:["Plátanos","Manzanas","Naranjas","Verdura variada"],
  esenciales:["Huevos","Leche entera","Pollo","Plátanos","Aceite de oliva","Arroz"],
  mensaje_madre:"Que haya siempre huevos, leche entera, pollo y plátanos en casa."
};

const SUPLEMENTOS = {
  si:[
    {nombre:"Creatina monohidrato", dosis:"5 g al día", cuando:"La hora da igual, también días sin entrenar", nota:"Sin fase de carga. Tarda 3-4 semanas en notarse. NO la dejo porque \"no la noto\"."},
    {nombre:"Proteína en polvo", dosis:"1 cacito", cuando:"Solo si no llego a 130 g comiendo", nota:"No es magia, es comida cómoda."},
    {nombre:"Vitamina D", cuando:"Si no me da el sol."},
    {nombre:"Multivitamínico", nota:"Opcional. No hace daño ni milagros."}
  ],
  no:["Preentrenos","BCAA","Quemadores de grasa","Boosters de testosterona","Glutamina","Esteroides"]
};

const SUENO = {
  diagnostico:"Si las alarmas no me despiertan es que no duermo suficiente.",
  error_pasado:"Alarmas cada 2 minutos. Eso enseña al cerebro que la primera no significa nada.",
  para_despertarme:["UNA sola alarma","Móvil al otro lado de la habitación","Luz inmediata, todas las luces","Agua fría en la cara al estar de pie","Cero snooze"],
  para_dormirme:["Móvil fuera de la cama a partir de las 22:30","Nada de siestas largas","Habitación oscura y fresca","Nada de cafeína después de las 15:00"],
  clave:"No puedo forzarme a dormir, pero sí a despertarme. Fijo la hora de levantarme y la respeto. En 4-5 días el sueño se adelanta solo.",
  como_empiezo:"NO empiezo a las 5:25. Primera semana me levanto a las 6:30 sin gym. Adelanto 15 min cada dos días.",
  minimo:"Días de gym: 6,5 h mínimo. Miércoles, sábado y domingo: lo que necesite, sin culpa.",
  alarma:"Si en 2-3 semanas sigo sin poder despertarme durmiendo 7h seguidas, lo miro con un médico."
};

const ALCOHOL = {
  regla:"No hace falta dejarlo.",
  efectos:["Baja la síntesis proteica unas horas","Empeora el sueño aunque me duerma antes","Calorías vacías (en mi caso casi juega a favor)"],
  reglas:["No beber la noche antes de un día de gym (libres: viernes y sábado)","Comer antes o durante, nunca en ayunas","Agua entre copas"],
  dano:"No es la cerveza del viernes, es la noche de ocho copas."
};

const PROBLEMAS = [
  {p:"El gym está lleno", s:"Cambio el orden. Hago otro ejercicio y vuelvo. Nunca me voy sin entrenar por eso."},
  {p:"Solo tengo 30 minutos", s:"Los 2-3 primeros ejercicios y me voy. Son los que más importan."},
  {p:"Me he saltado un día", s:"Lo hago otro día si puedo, o lo dejo pasar. No meto dos sesiones en un día."},
  {p:"Llevo 2 semanas sin progresar", s:"1) ¿Como suficiente? 2) ¿Duermo? 3) ¿Necesito deload? Casi nunca es la rutina."},
  {p:"El peso no sube", s:"Como más. 300 kcal al día: puñado de frutos secos + vaso de leche + chorro de aceite."},
  {p:"Dolor muscular", s:"Normal, sigo."},
  {p:"Dolor articular", s:"Paro ese ejercicio, lo cambio por otro que no duela."},
  {p:"Dolor lumbar en peso muerto rumano", s:"Estoy curvando la espalda. Bajo el peso y reviso técnica."},
  {p:"Dolor más de una semana", s:"Fisio o médico."},
  {p:"Me he levantado tarde", s:"Voy por la tarde si puedo, o lo muevo. Un día no rompe nada."},
  {p:"Estoy reventado y no quiero ir", s:"Voy, hago la mitad y me voy. Mantener el hábito vale más que cualquier sesión perfecta."},
  {p:"Tengo obra toda la semana", s:"Plan de 2 días. Sábado y domingo. Sin culpa."},
  {p:"No sé si voy a poder mantener esto", s:"Si a las 3 semanas me arrastro, quito el jueves y me quedo en 3 días. Tres días sostenidos un año dan más que cinco sostenidos tres semanas."}
];

const NO_HAGO = {
  "En el gym":["No cambio de rutina cada dos semanas","No llevo todas las series al fallo total","No me salto pierna ni gemelos porque cuestan","No hago cardio largo","No copio las cargas del de al lado","No entreno con prisa los ejercicios pesados"],
  "Con la comida":["No entreno en ayunas totales (plátano + leche mínimo)","No me salto comidas por prisa","No confío en el batido para llegar a la proteína"],
  "Con los suplementos":["No dejo la creatina \"porque no la noto\"","No compro preentrenos, quemadores, BCAA ni boosters","Nada de esteroides"],
  "Con la constancia":["No decido por la mañana si voy, eso ya se decidió anoche","No abandono la semana entera por fallar un día","No me peso cada día","No espero ver cambios en un mes"],
  "Con el sueño":["No sacrifico sueño para meter una sesión extra","No me meto en el móvil hasta tarde si me levanto a las 5:25"]
};

const EXPECTATIVAS = [
  {mes:"Mes 1", que:"No veo nada en el espejo. Normal, es neurológico: aprendo técnica y subo peso rápido.", peso:"+1-2 kg"},
  {mes:"Mes 2-3", que:"Noto la ropa distinta. La gente aún no lo ve. Las cargas suben bien.", peso:"+2-4 kg desde el inicio"},
  {mes:"Mes 4-6", que:"Aquí se nota. Amigos y familia empiezan a decir cosas. Gemelos y antebrazos son los que más tardan.", peso:""},
  {mes:"Mes 6-12", que:"Cambio real y visible.", peso:"72-76 kg"}
];

const CALENDARIO = [
  {fecha:"Hasta el 7 sep", que:"Ecuador. Dormir todo lo que pueda."},
  {fecha:"8-11 sep", que:"Adelantar 1h el sueño cada día antes del vuelo."},
  {fecha:"11 sep", que:"Vuelo. Duermo según hora española."},
  {fecha:"12 sep", que:"Llego por la tarde. Nada de siesta larga (máx 20 min). Aguantar hasta las 23:00."},
  {fecha:"13 sep", que:"Predicación 10:00. Luz de mañana, perfecto para reajustar."},
  {fecha:"14 sep", que:"Recuperar."},
  {fecha:"15 sep", que:"Apuntarme al Synergym. Sesión suave. FOTO DEL DÍA 1. Peso inicial."},
  {fecha:"16 sep", que:"Segunda sesión suave."},
  {fecha:"17-21 sep", que:"Roma."},
  {fecha:"22 sep", que:"EMPIEZA EL PLAN DE VERDAD", destacado:true}
];

const FRASES = [
  "Ve, haz la mitad y vete. Mantener el hábito vale más que cualquier sesión perfecta.",
  "Aparecer vale más que la sesión perfecta.",
  "Un mal día no rompe la semana. Solo la rompe abandonarla.",
  "Tres días sostenidos un año dan mucho más que cinco días sostenidos tres semanas.",
  "El músculo se construye durmiendo, no levantando.",
  "Con 66 kg a 1,80, sin comer más no hay músculo.",
  "No decido por la mañana si voy. Eso ya se decidió anoche.",
  "Media sesión hecha es infinitamente mejor que una sesión saltada.",
  "Los gemelos y los antebrazos tardan. Paciencia con ellos.",
  "Fracasar no es fallar un día. Es dejar de ir tres semanas porque una salió mal."
];

const CHECKLIST_ITEMS = [
  {id:"ropa", txt:"Ropa de gym preparada"},
  {id:"mochila", txt:"Mochila y botella listas"},
  {id:"alarma", txt:"Alarma puesta (UNA sola)"},
  {id:"movil", txt:"Móvil al otro lado de la habitación"},
  {id:"comida", txt:"Plátano y leche localizados"}
];

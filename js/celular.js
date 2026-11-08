// ============================================================
//  FLUJO DEL CELULAR: inicio → (alerta → juego → resultado) x5 → final
// ============================================================

const RASGOS = ["las cejas", "los ojos", "la nariz", "la boca", "todo el rostro"];

const EXPEDIENTES = [
  {
    corto: "AF 447", titulo: "Toma el control", juego: juegoAvion,
    fecha: "1 DE JUNIO DE 2009 · OCÉANO ATLÁNTICO",
    alerta: "Vuelo 447, de Río de Janeiro a París. 228 personas a bordo. Es de noche, a 11 000 metros de altura, y los sensores de velocidad se congelan.",
    instr: "El piloto automático se desconectó. Ahora vuelas tú: mantén el avión derecho durante 15 segundos. Inclina el celular (o mueve la barra) hacia donde indique la flecha.",
    ia: "✦ Que la IA vuele por ti",
    revelacion: "El hielo bloqueó los sensores de velocidad y el piloto automático se desconectó. Los pilotos, poco entrenados para volar a mano a esa altura, levantaron la nariz del avión y este entró en pérdida. Las 228 personas a bordo murieron.",
    siguiente: "Un aterrizaje en San Francisco. Los pilotos creían que la máquina cuidaba la velocidad…",
  },
  {
    corto: "Asiana 214", titulo: "Aterrizaje manual", juego: juegoAterrizaje,
    fecha: "6 DE JULIO DE 2013 · SAN FRANCISCO",
    alerta: "Vuelo 214 de Asiana Airlines, a punto de aterrizar con 307 personas a bordo. Los pilotos creen que el sistema automático está cuidando la velocidad del avión… pero no es así.",
    instr: "Mantén presionado ▲ ACELERAR para que la aguja quede en la zona verde hasta tocar la pista (22 segundos). Si sueltas, el avión se frena; si aceleras de más, se pasa.",
    ia: "✦ Que la IA aterrice por ti",
    revelacion: "Los pilotos creían que el sistema automático mantenía la velocidad, pero había quedado en un modo (“HOLD”) en el que no la controlaba. Nadie miró la velocidad a tiempo: el avión llegó demasiado lento y bajo, y golpeó el muro antes de la pista. Murieron 3 personas y casi 200 resultaron heridas. Los investigadores señalaron que la tripulación dependía demasiado de la automatización.",
    siguiente: "Un hospital, 1986. La máquina decía que todo estaba bien…",
  },
  {
    corto: "Therac-25", titulo: "Malfunction 54", juego: juegoTherac,
    fecha: "1986 · UN HOSPITAL EN TEXAS",
    alerta: "Eres operador/a de la Therac-25, una máquina de radioterapia controlada por computador. Hay 6 pacientes esperando. La máquina dice que todo está bien.",
    instr: "Compara la receta del médico con la pantalla de la máquina: paciente, dosis y modo. Si algo no coincide o aparece un error, detén el tratamiento. Tienes 10 segundos por paciente y necesitas 5 de 6.",
    ia: "✦ Que la IA decida",
    revelacion: "La Therac-25 lo confiaba todo a su software, sin las protecciones físicas de los modelos anteriores. Un error del programa causó sobredosis de radiación, y el mensaje “Malfunction 54” no explicaba nada; los operadores confiaban en la máquina y seguían con el tratamiento. Entre 1985 y 1987 hubo seis sobredosis graves y varias personas murieron.",
    siguiente: "Un carro que se maneja solo, y una persona que dejó de mirar…",
  },
  {
    corto: "Tempe", titulo: "Ojos en el camino", juego: juegoCamino,
    fecha: "18 DE MARZO DE 2018 · TEMPE, ARIZONA",
    alerta: "Un carro autónomo de prueba avanza de noche. Tú eres la persona de respaldo: el carro se maneja solo… o eso parece.",
    instr: "Toca FRENAR cuando algo se acerque POR LA VÍA (ni muy pronto ni muy tarde). Lo que está a la orilla no importa. Cierra las notificaciones para poder ver. Tienes que frenar a tiempo 6 veces, y solo puedes frenar 2 veces sin motivo.",
    ia: "✦ Que la IA maneje por ti",
    revelacion: "La conductora de respaldo iba viendo un video en su celular, confiada en que el carro se manejaba solo. El sistema no identificó a tiempo a Elaine Herzberg, que cruzaba la calle con su bicicleta, y ella murió.",
    siguiente: "El último: un examen sin ayuda sobre todo lo que investigaste…",
  },
  {
    corto: "Final", titulo: "El examen sin ayuda", juego: juegoExamen,
    fecha: "EXPEDIENTE FINAL",
    alerta: "Llegó el momento de demostrar lo que aprendiste. Cinco preguntas sobre lo que pasó de verdad en cada caso. Si algún expediente lo resolvió la IA… tú no lo viste.",
    instr: "Responde cada pregunta antes de que se acabe el tiempo (15 segundos). Necesitas 4 de 5 para aprobar.",
    ia: "✦ Que la IA responda por ti",
    revelacion: "Los cuatro accidentes siguen el mismo patrón: primero confiamos a ciegas en la máquina, luego dejamos de practicar, y cuando la máquina falla ya no sabemos reaccionar. Hoy le entregamos a la IA nuestras tareas, resúmenes y decisiones.",
    siguiente: "",
  },
];

const MEDALLAS = [
  { max: 0, nombre: "Piloto manual", texto: "Resolviste todo con tu propia cabeza." },
  { max: 2, nombre: "Copiloto atento", texto: "Usaste la IA como apoyo, sin soltar el control." },
  { max: 4, nombre: "Pasajero/a", texto: "Dejaste que la máquina manejara casi todo." },
  { max: 5, nombre: "Piloto automático", texto: "La IA lo hizo todo por ti." },
];

const params = new URLSearchParams(location.search);
const SESION = params.get("s");
const app = document.getElementById("app");
let canal = null;
let detenerJuego = null;

const estado = { i: 0, delegaciones: 0, propias: 0, racha: 0, puntos: 0, casos: [] };

// ------------------------------------------------------------
//  Sonido, vibración y avisos
// ------------------------------------------------------------
let audio = null;
function activarAudio() {
  try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); } catch (e) {}
}
function tono(frec, dur, tipo = "sine", vol = 0.15, cuando = 0) {
  if (!audio) return;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = tipo; o.frequency.value = frec;
  const t0 = audio.currentTime + cuando;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(audio.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
const SONIDOS = {
  tic: () => tono(660, 0.06, "square", 0.05),
  bien: () => { tono(660, 0.12, "sine", 0.15); tono(990, 0.18, "sine", 0.15, 0.1); },
  error: () => tono(180, 0.25, "sawtooth", 0.1),
  alarma: () => { tono(880, 0.15, "square", 0.08); tono(660, 0.15, "square", 0.08, 0.16); },
  stall: () => { tono(520, 0.12, "square", 0.09); tono(520, 0.12, "square", 0.09, 0.18); },
  noti: () => tono(1320, 0.08, "sine", 0.06),
  choque: () => { tono(90, 0.5, "sawtooth", 0.2); tono(60, 0.6, "square", 0.15, 0.05); },
  sello: () => { tono(523, 0.1, "triangle", 0.15); tono(659, 0.1, "triangle", 0.15, 0.08); tono(784, 0.25, "triangle", 0.15, 0.16); },
  ia: () => { tono(1200, 0.4, "sine", 0.05); tono(1600, 0.5, "sine", 0.04, 0.2); },
};
const sonar = (t) => { try { SONIDOS[t] && SONIDOS[t](); } catch (e) {} };
const vibrar = (p) => {
  try {
    const activo = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (activo && navigator.vibrate) navigator.vibrate(p);
  } catch (e) {}
};

let toastEl = null, toastT = null;
function aviso(texto, tipo = "") {
  if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
  toastEl.textContent = texto;
  toastEl.className = "toast ver " + tipo;
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove("ver"), 1500);
}

function enviar(msg) { if (canal) canal.enviar(msg); }

// ------------------------------------------------------------
//  Pantallas
// ------------------------------------------------------------
function pintar(html) {
  if (detenerJuego) { detenerJuego(); detenerJuego = null; }
  apagarCamara();
  app.innerHTML = html;
  window.scrollTo(0, 0);
}
function cabecera(n) {
  const e = EXPEDIENTES[n];
  return `<div class="top"><span>Expediente ${n + 1} · ${e.corto}</span><span class="racha ${estado.racha ? "" : "apagada"}">🔥 ${estado.racha}</span></div>`;
}
function candados(alFinal = false) {
  return `<div class="candados">${EXPEDIENTES.map((_, k) => {
    const c = estado.casos[k];
    const activo = !alFinal && k === estado.i;
    const cls = c === "propio" ? "hecho" : c === "ia" ? "ia" : activo ? "activo" : "";
    const txt = c === "propio" ? "✓" : c === "ia" ? "✦" : activo ? k + 1 : alFinal ? "–" : "🔒";
    return `<div class="${cls}">${txt}</div>`;
  }).join("")}</div>`;
}

function etiquetaConexion() {
  return SESION
    ? '<span class="pastilla" style="background:#1f3b2c;color:#6ee7a2">● Conectado al espejo</span>'
    : '<span class="pastilla" style="background:#3a1d22;color:#ff8a8a">Sin espejo · modo demostración</span>';
}

// ------------------------------------------------------------
//  Paso 1: la foto del rostro
// ------------------------------------------------------------
function pantallaBienvenida() {
  pintar(`
    <div class="crece">
      <div class="centro" style="margin-top:8px">${etiquetaConexion()}</div>
      <div class="centro archivo" style="margin-top:40px">EL ESPEJO QUE SE DESGASTA</div>
      <div class="titulo centro" style="font-size:30px">Antes de empezar,<br>el espejo necesita<br>tu reflejo.</div>
      <p class="texto centro">Vas a tomarte una foto. Aparecerá en la pantalla grande y será tu reflejo durante toda la experiencia.</p>
      <div class="abajo"><button class="btn blanco" id="irFoto">📸 Tomar mi foto</button></div>
    </div>`);
  document.getElementById("irFoto").addEventListener("click", () => { activarAudio(); pantallaFoto(); });
}

let flujoCamara = null;
function apagarCamara() {
  if (flujoCamara) { flujoCamara.getTracks().forEach((t) => t.stop()); flujoCamara = null; }
}

function pantallaFoto() {
  const o = FOTO.ovalo;
  pintar(`
    <div class="top"><span>Paso 1 de 2 · Tu reflejo</span><span></span></div>
    <div class="visor" id="visor">
      <video id="video" playsinline muted autoplay></video>
      <img id="captura" class="oculto" alt="Tu foto">
      <div class="guia-ovalo" style="left:${o.x * 100}%;top:${o.y * 100}%;width:${o.w * 100}%;height:${o.h * 100}%"></div>
      <div class="cuenta oculto" id="cuenta"></div>
      <div class="visor-msg" id="visorMsg">Encendiendo la cámara…</div>
    </div>
    <p class="texto centro" id="consejo">Ubica tu rostro dentro del óvalo, mirando de frente y con buena luz.</p>
    <div class="abajo" id="acciones">
      <button class="btn blanco" id="disparar" disabled>📸 Tomar foto</button>
      <label class="btn borde centro" for="archivo" style="font-size:14px">o elige una foto de tu galería</label>
      <input type="file" id="archivo" accept="image/*" hidden>
    </div>`);

  const video = document.getElementById("video");
  const msg = document.getElementById("visorMsg");
  const disparar = document.getElementById("disparar");

  document.getElementById("archivo").addEventListener("change", (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => { revisarFoto(recortar(img, img.naturalWidth, img.naturalHeight, false)); URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(f);
  });

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    msg.textContent = "Este navegador no deja usar la cámara aquí. Elige una foto de tu galería.";
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 1280 } }, audio: false })
    .then((flujo) => {
      flujoCamara = flujo;
      video.srcObject = flujo;
      video.onloadedmetadata = () => { msg.classList.add("oculto"); disparar.disabled = false; };
    })
    .catch((e) => {
      msg.textContent = e && e.name === "NotAllowedError"
        ? "No se dio permiso para usar la cámara. Actívalo en el navegador o elige una foto de tu galería."
        : "No se pudo abrir la cámara. Elige una foto de tu galería.";
    });

  disparar.addEventListener("click", () => {
    disparar.disabled = true;
    const cuenta = document.getElementById("cuenta");
    cuenta.classList.remove("oculto");
    let n = 3;
    const paso = () => {
      if (n === 0) {
        cuenta.classList.add("oculto");
        document.getElementById("visor").classList.add("flash");
        sonar("tic");
        const foto = recortar(video, video.videoWidth, video.videoHeight, true);
        apagarCamara();
        revisarFoto(foto);
        return;
      }
      cuenta.textContent = n;
      sonar("tic");
      n--;
      setTimeout(paso, 800);
    };
    paso();
  });
}

// Recorta la imagen al formato 3:4 de la foto (como "cover"); en espejo si viene de la cámara.
function recortar(fuente, w, h, espejo) {
  const W = FOTO.ancho, H = FOTO.alto, prop = W / H;
  let sx = 0, sy = 0, sw = w, sh = h;
  if (w / h > prop) { sw = h * prop; sx = (w - sw) / 2; } else { sh = w / prop; sy = (h - sh) / 2; }
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (espejo) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  ctx.drawImage(fuente, sx, sy, sw, sh, 0, 0, W, H);
  return c.toDataURL("image/jpeg", 0.82);
}

function revisarFoto(datos) {
  const img = document.getElementById("captura");
  const video = document.getElementById("video");
  if (!img) return;
  img.src = datos;
  img.classList.remove("oculto");
  video.classList.add("oculto");
  document.getElementById("visorMsg").classList.add("oculto");
  document.getElementById("consejo").textContent = "¿Se ve bien tu rostro dentro del óvalo?";
  document.getElementById("acciones").innerHTML = `
    <button class="btn blanco" id="usar">Usar esta foto</button>
    <button class="btn borde" id="repetir">Repetir</button>`;
  document.getElementById("repetir").addEventListener("click", pantallaFoto);
  document.getElementById("usar").addEventListener("click", () => {
    enviar({ tipo: "foto", datos });
    sonar("bien");
    pantallaInicio();
  });
}

// ------------------------------------------------------------
//  Paso 2: los expedientes
// ------------------------------------------------------------
function pantallaInicio() {
  pintar(`
    <div class="crece">
      <div class="top"><span>Paso 2 de 2 · Los expedientes</span><span></span></div>
      <div class="centro" style="margin-top:8px">${etiquetaConexion()}</div>
      <div class="centro archivo" style="margin-top:26px">ARCHIVO CONFIDENCIAL</div>
      <div class="titulo centro" style="font-size:30px">5 expedientes<br>sin resolver</div>
      <p class="texto centro">Eres investigador/a de accidentes tecnológicos. Cada expediente es un accidente real, y vas a vivirlo desde adentro.</p>
      ${candados()}
      <p class="texto centro" style="font-size:14px;color:#9aa6c4">En cada uno puedes investigar tú… o dejar que la IA lo haga por ti.<br>Tu foto ya está en la pantalla grande: mírala de vez en cuando.</p>
      <div class="abajo"><button class="btn blanco" id="empezar">Abrir expediente 1</button></div>
    </div>`);
  document.getElementById("empezar").addEventListener("click", async () => {
    activarAudio();
    // iPhone pide permiso para leer la inclinación (debe ser dentro de un toque)
    try {
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
        await DeviceOrientationEvent.requestPermission();
      }
    } catch (e) {}
    pantallaAlerta(0);
  });
}

function pantallaAlerta(n) {
  const e = EXPEDIENTES[n];
  estado.i = n;
  enviar({ tipo: "abrir", n: n + 1, titulo: e.titulo });
  sonar("alarma"); vibrar([120, 80, 120]);
  pintar(`
    ${cabecera(n)}
    <div class="crece">
      <div class="alerta-roja" style="margin-top:10px">⚠ ALERTA · CAJA NEGRA</div>
      <div class="fecha">${e.fecha}</div>
      <div class="titulo" style="font-size:28px">${e.titulo}</div>
      <p class="texto">${e.alerta}</p>
      <div class="caja"><b>Tu misión:</b> ${e.instr}</div>
      <div class="abajo">
        <button class="btn blanco" id="jugar">Lo investigo yo</button>
        <button class="btn ia" id="ia">${e.ia}</button>
      </div>
    </div>`);
  document.getElementById("jugar").addEventListener("click", () => { activarAudio(); pantallaJuego(n); });
  document.getElementById("ia").addEventListener("click", () => delegar(n));
}

function pantallaJuego(n) {
  const e = EXPEDIENTES[n];
  pintar(`
    ${cabecera(n)}
    <div class="titulo" style="font-size:20px;margin:4px 0">${e.titulo}</div>
    <div class="zona" id="zona"></div>
    <div class="abajo"><button class="btn ia" id="ia">${e.ia}</button></div>`);
  const zona = document.getElementById("zona");
  const botonIA = document.getElementById("ia");
  botonIA.addEventListener("click", () => delegar(n));

  const api = {
    sonar, vibrar, aviso,
    sacudir() { app.classList.remove("sacude"); void app.offsetWidth; app.classList.add("sacude"); },
    tentar() {
      botonIA.classList.add("tienta");
      botonIA.textContent = "✦ ¿Lo dejas en mis manos?";
    },
    ganar() { if (detenerJuego) { detenerJuego(); detenerJuego = null; } resolverSola(n); },
    perder(motivo) {
      if (detenerJuego) { detenerJuego(); detenerJuego = null; }
      api.tentar();
      const capa = document.createElement("div");
      capa.className = "falla";
      capa.innerHTML = `
        <div class="centro" style="font-size:44px">✖</div>
        <div class="titulo centro">Expediente sin resolver</div>
        <p class="texto centro">${motivo}</p>
        <button class="btn borde" id="reintentar">Intentarlo otra vez</button>`;
      zona.appendChild(capa);
      capa.querySelector("#reintentar").addEventListener("click", () => { activarAudio(); pantallaJuego(n); });
    },
  };
  detenerJuego = e.juego(zona, api, { casos: estado.casos });
}

function resolverSola(n) {
  estado.propias++;
  estado.racha++;
  const bono = estado.racha > 1 ? 50 * (estado.racha - 1) : 0;
  estado.puntos += 100 + bono;
  estado.casos[n] = "propio";
  enviar({ tipo: "propio", n: n + 1 });
  sonar("sello"); vibrar(80);
  const e = EXPEDIENTES[n];
  pintar(`
    ${cabecera(n)}
    <div class="crece">
      <div class="centro" style="margin-top:26px"><span class="sello">RESUELTO</span></div>
      <div class="centro puntos">+100 puntos de criterio${bono ? ` · +${bono} por racha 🔥` : ""}</div>
      <div class="caja" style="margin-top:16px"><b>Lo que pasó de verdad:</b> ${e.revelacion}</div>
      ${e.siguiente ? `<div class="caja pista"><b style="color:#f5a524">Siguiente expediente:</b> ${e.siguiente}</div>` : ""}
      <div class="abajo"><button class="btn blanco" id="seguir">${n < 4 ? "Abrir expediente " + (n + 2) : "Ver el último expediente"}</button></div>
    </div>`);
  document.getElementById("seguir").addEventListener("click", () => (n < 4 ? pantallaAlerta(n + 1) : pantallaFinal()));
}

function delegar(n) {
  if (detenerJuego) { detenerJuego(); detenerJuego = null; }
  activarAudio();
  sonar("ia");
  const capa = document.getElementById("cargandoIA");
  capa.classList.remove("oculto", "activo");
  void capa.offsetWidth;
  capa.classList.add("activo");
  setTimeout(() => {
    capa.classList.add("oculto");
    capa.classList.remove("activo");
    pantallaDelegado(n);
  }, 950);
}

function pantallaDelegado(n) {
  const perdioRacha = estado.racha > 0;
  estado.racha = 0;
  estado.delegaciones++;
  estado.casos[n] = "ia";
  const rasgo = RASGOS[Math.min(estado.delegaciones, 5) - 1];
  enviar({ tipo: "delegado", n: n + 1 });
  vibrar(200);
  const e = EXPEDIENTES[n];
  pintar(`
    ${cabecera(n)}
    <div class="crece" style="background:radial-gradient(circle at 50% 30%, rgba(245,165,36,.22), transparent 60%)">
      <div class="centro" style="font-size:56px;color:#f5a524;margin-top:26px">✦</div>
      <div class="titulo centro">Listo. La IA lo resolvió por ti.</div>
      <p class="texto centro">Expediente cerrado en <b>0,8 segundos</b>.${perdioRacha ? "<br>Perdiste la racha." : ""}</p>
      <div class="centro" style="margin-top:12px"><span class="pastilla" style="background:#3a1d22;color:#ff8a8a">Tu reflejo perdió ${rasgo}</span></div>
      <div class="caja" style="margin-top:16px;color:#9aa6c4">🔒 <b style="color:#c3cbe0">Lo que pasó de verdad</b> quedó en manos de la IA. No investigaste este caso, así que no lo viste.</div>
      ${e.siguiente ? `<div class="caja pista"><b style="color:#f5a524">Siguiente expediente:</b> ${e.siguiente}</div>` : ""}
      <p class="texto centro" style="font-size:14px">Mira el espejo.</p>
      <div class="abajo"><button class="btn blanco" id="seguir">${n < 4 ? "Abrir expediente " + (n + 2) : "Ver mi resultado"}</button></div>
    </div>`);
  document.getElementById("seguir").addEventListener("click", () => (n < 4 ? pantallaAlerta(n + 1) : pantallaFinal()));
}

function pantallaFinal() {
  const m = MEDALLAS.find((x) => estado.delegaciones <= x.max);
  enviar({ tipo: "fin", delegaciones: estado.delegaciones, propias: estado.propias });
  sonar("sello");
  pintar(`
    <div class="crece">
      <div class="centro archivo" style="margin-top:30px">EXPEDIENTE 6</div>
      <div class="interrogante">?</div>
      <div class="titulo centro" style="font-size:28px;margin-top:14px">El siguiente caso<br>eres tú.</div>
      <div class="centro"><span class="medalla">🏅 ${m.nombre}</span></div>
      <p class="texto centro">${m.texto}</p>
      ${candados(true)}
      <p class="texto centro">Investigaste tú: <b style="color:#6ee7a2">${estado.propias}</b> · Delegaste: <b style="color:#ff8a8a">${estado.delegaciones}</b><br>Puntos de criterio: <b style="color:#ffd76a">${estado.puntos}</b></p>
      <div class="abajo centro"><div class="titulo" style="font-size:20px">⟵ Ahora mira la pantalla</div></div>
    </div>`);
}

// ------------------------------------------------------------
//  Arranque
// ------------------------------------------------------------
(async function iniciar() {
  if (SESION) {
    try {
      canal = await Canal.abrir(SESION);
      enviar({ tipo: "conectado" });
    } catch (e) {
      console.warn("No se pudo conectar con el espejo", e);
    }
  }
  pantallaBienvenida();
})();

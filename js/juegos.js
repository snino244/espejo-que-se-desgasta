// ============================================================
//  LOS 5 JUEGOS
//  Cada juego recibe:
//    zona -> el elemento donde se dibuja
//    api  -> { ganar(), perder(motivo), tentar(), sonar(tipo), vibrar(ms), aviso(texto, tipo), sacudir() }
//  y devuelve una función para detenerlo (limpia timers y eventos).
// ============================================================

const azar = (a, b) => a + Math.random() * (b - a);
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

// Bucle de animación con tiempo (dt en segundos)
function bucle(fn) {
  let vivo = true, antes = performance.now();
  function paso(ahora) {
    if (!vivo) return;
    const dt = Math.min((ahora - antes) / 1000, 0.1);
    antes = ahora;
    fn(dt);
    requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
  return () => { vivo = false; };
}

// ------------------------------------------------------------
//  EXPEDIENTE 1 · Toma el control (Air France 447)
//  Inclinar el celular (o mover el deslizador) para nivelar el avión.
// ------------------------------------------------------------
function juegoAvion(zona, api) {
  const META = 15;      // segundos con el avión derecho
  const DERECHO = 12;   // grados de tolerancia
  const STALL = 35;     // grados a partir de los cuales el avión pierde sustentación
  zona.innerHTML = `
    <div class="alerta-roja">⚠ PILOTO AUTOMÁTICO DESCONECTADO</div>
    <div class="horizonte">
      <div class="mundo"></div>
      <div class="zona-ok"></div>
      <div class="avion" id="avion"></div>
      <div class="flecha izq oculto">⟵</div><div class="flecha der oculto">⟶</div>
      <div class="stall oculto">STALL</div>
    </div>
    <div class="centro texto" id="instr">Endereza el avión: inclina el celular (o mueve la barra) hacia donde indique la flecha.</div>
    <input type="range" class="deslizador" min="-60" max="60" value="0" step="1" aria-label="Control del avión">
    <div class="medidor">Avión derecho <span id="seg" style="float:right">0 / ${META} s</span><div class="riel"><div id="barraControl"></div></div></div>
    <div class="medidor">Sustentación<div class="riel"><div id="barraSust" style="width:100%;background:#6ee7a2"></div></div></div>`;
  const avion = zona.querySelector("#avion");
  const stall = zona.querySelector(".stall");
  const desl = zona.querySelector(".deslizador");
  const flechaIzq = zona.querySelector(".flecha.izq");
  const flechaDer = zona.querySelector(".flecha.der");
  const barraC = zona.querySelector("#barraControl");
  const barraS = zona.querySelector("#barraSust");
  const seg = zona.querySelector("#seg");

  // inclinación del avión = turbulencia + lo que haga la persona
  let deriva = azar(-6, 6), a = 0, nivelado = 0, sust = 100;
  let inclinacion = 0, barra = 0, teclas = 0;
  let base = null, minG = Infinity, maxG = -Infinity, sensorVivo = false;
  let tiempoAlarma = 0, tiempoRafaga = azar(2.5, 4), tentado = false, fin = false;

  // Sensor del celular: solo se usa si de verdad se mueve (algunos computadores reportan un sensor quieto).
  function alInclinar(e) {
    if (e.gamma == null) return;
    if (base === null) base = e.gamma;
    minG = Math.min(minG, e.gamma); maxG = Math.max(maxG, e.gamma);
    if (maxG - minG > 3) sensorVivo = true;
    inclinacion = limitar((e.gamma - base) * 1.4, -70, 70);
  }
  window.addEventListener("deviceorientation", alInclinar);
  desl.addEventListener("input", () => { barra = +desl.value; });
  // Teclado (para probar en el computador): flechas izquierda/derecha
  const abajo = (e) => { if (e.key === "ArrowLeft") teclas = -1; if (e.key === "ArrowRight") teclas = 1; };
  const arriba = (e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") teclas = 0; };
  window.addEventListener("keydown", abajo);
  window.addEventListener("keyup", arriba);

  const parar = bucle((dt) => {
    if (fin) return;
    // El avión es inestable: mientras está inclinado, se inclina cada vez más.
    // (La inestabilidad depende de la inclinación real, así que corregirla a tiempo siempre funciona.)
    deriva += (azar(-34, 34) + a * 1.0 - deriva * 0.08) * dt;
    tiempoRafaga -= dt;
    if (tiempoRafaga <= 0) { deriva += azar(-22, 22); tiempoRafaga = azar(2.5, 4); api.vibrar(60); }
    deriva = limitar(deriva, -55, 55);
    if (teclas) { barra = limitar(barra + teclas * 70 * dt, -60, 60); desl.value = barra; }

    const control = (sensorVivo ? inclinacion : 0) + barra;
    a = limitar(deriva + control, -90, 90);   // positivo = ala derecha abajo
    avion.style.transform = `translate(-50%, -50%) rotate(${a}deg)`;
    const abs = Math.abs(a);

    // La flecha dice hacia dónde corregir: si el avión cae a la derecha, se corrige hacia la izquierda.
    flechaIzq.classList.toggle("oculto", a < DERECHO * 0.6);
    flechaDer.classList.toggle("oculto", a > -DERECHO * 0.6);

    if (abs < DERECHO) { nivelado += dt; sust = Math.min(100, sust + 15 * dt); stall.classList.add("oculto"); }
    else if (abs > STALL) {
      sust -= 26 * dt;
      stall.classList.remove("oculto");
      tiempoAlarma -= dt;
      if (tiempoAlarma <= 0) { api.sonar("stall"); api.vibrar(120); tiempoAlarma = 0.6; }
      if (!tentado && sust < 60) { tentado = true; api.tentar(); }
    } else { sust -= 5 * dt; stall.classList.add("oculto"); }

    barraC.style.width = Math.min(100, (nivelado / META) * 100) + "%";
    barraS.style.width = Math.max(0, sust) + "%";
    barraS.style.background = sust > 60 ? "#6ee7a2" : sust > 30 ? "#f5a524" : "#ff5a5a";
    seg.textContent = Math.floor(nivelado) + " / " + META + " s";

    if (nivelado >= META) { fin = true; api.ganar(); }
    else if (sust <= 0) { fin = true; api.perder("El avión entró en pérdida y cayó. Así terminó el vuelo 447."); }
  });

  return () => {
    parar();
    window.removeEventListener("deviceorientation", alInclinar);
    window.removeEventListener("keydown", abajo);
    window.removeEventListener("keyup", arriba);
  };
}

// ------------------------------------------------------------
//  EXPEDIENTE 2 · Aterrizaje manual (Asiana 214, San Francisco 2013)
//  Mantener presionado ACELERAR para que la velocidad quede en la zona verde
//  hasta tocar la pista.
// ------------------------------------------------------------
function juegoAterrizaje(zona, api) {
  const DURACION = 22;           // segundos hasta tocar la pista
  const MIN = 37, MAX = 63;      // zona verde de velocidad (0–100)
  const LIMITE = 1.9;            // segundos seguidos fuera de la zona verde para perder
  zona.innerHTML = `
    <div class="cabina">
      <svg class="escena" viewBox="0 0 300 190">
        <defs><linearGradient id="cieloAt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3a35c"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient></defs>
        <rect width="300" height="190" fill="url(#cieloAt)"/>
        <rect y="140" width="300" height="50" fill="#2f5d7c"/>
        <rect x="196" y="134" width="104" height="10" fill="#4b4f57"/>
        <rect x="200" y="138" width="96" height="2" fill="#fff" opacity=".8"/>
        <rect x="186" y="128" width="10" height="16" fill="#8a8f99"/>
        <text x="183" y="138" font-size="9" fill="#5a2a1a" text-anchor="end">muro</text>
        <line x1="24" y1="34" x2="210" y2="132" stroke="#fff" stroke-dasharray="4 4" opacity=".6"/>
        <g id="avionAt"><path d="M-14 0 L10 -2 L14 0 L10 2 Z M-4 -1 L-8 -9 L-3 -9 L3 -1 Z M-4 1 L-8 9 L-3 9 L3 1 Z M-14 0 L-16 -5 L-12 -5 L-10 -1 Z" fill="#1d2433"/></g>
      </svg>
      <div class="athr">A/THR <b>HOLD</b></div>
      <div class="peligro oculto" id="peligro"></div>
    </div>
    <div class="medidor">Velocidad <span style="float:right" id="falta">${DURACION} s para la pista</span></div>
    <div class="velocimetro">
      <div class="zona-lenta"></div><div class="zona-verde"></div><div class="zona-rapida"></div>
      <div class="aguja-v" id="agujaV"></div>
      <span class="et izq">muy lento</span><span class="et der">muy rápido</span>
    </div>
    <button class="btn blanco acelerar" id="acelerar">▲ ACELERAR<br><small>mantén presionado</small></button>`;

  const avion = zona.querySelector("#avionAt");
  const aguja = zona.querySelector("#agujaV");
  const aviso = zona.querySelector("#peligro");
  const falta = zona.querySelector("#falta");
  const boton = zona.querySelector("#acelerar");

  let v = 52, t = 0, fuera = 0, presionado = false, rafaga = 0, tiempoRafaga = azar(2, 3.5), alarma = 0, tentado = false, fin = false;

  const bajar = (e) => { e.preventDefault(); presionado = true; boton.classList.add("presionado"); };
  const subir = () => { presionado = false; boton.classList.remove("presionado"); };
  boton.addEventListener("pointerdown", bajar);
  window.addEventListener("pointerup", subir);
  boton.addEventListener("pointerleave", subir);
  boton.addEventListener("contextmenu", (e) => e.preventDefault());
  const teclaAbajo = (e) => { if (e.code === "Space" || e.key === "ArrowUp") { e.preventDefault(); presionado = true; boton.classList.add("presionado"); } };
  const teclaArriba = (e) => { if (e.code === "Space" || e.key === "ArrowUp") subir(); };
  window.addEventListener("keydown", teclaAbajo);
  window.addEventListener("keyup", teclaArriba);

  const parar = bucle((dt) => {
    if (fin) return;
    t += dt;
    // Sin acelerar, el avión pierde velocidad (el sistema automático NO la está cuidando).
    v += (presionado ? 21 : -12) * dt;
    tiempoRafaga -= dt;
    if (tiempoRafaga <= 0) { rafaga = azar(-11, 11); tiempoRafaga = azar(2, 3.5); }
    v += rafaga * dt;
    v = limitar(v, 0, 100);

    // Avión bajando hacia la pista
    const p = Math.min(1, t / DURACION);
    const x = 24 + p * 186, y = 34 + p * 98 + (v < MIN ? (MIN - v) * 0.5 * p : 0);
    avion.setAttribute("transform", `translate(${x} ${y}) rotate(${28 - (v - 50) * 0.3}) scale(1.7)`);
    aguja.style.left = `calc(${v}% - 3px)`;
    falta.textContent = Math.max(0, Math.ceil(DURACION - t)) + " s para la pista";

    const lento = v < MIN, rapido = v > MAX;
    if (lento || rapido) {
      fuera += dt;
      aviso.classList.remove("oculto");
      aviso.textContent = lento ? "⚠ VELOCIDAD BAJA" : "⚠ DEMASIADO RÁPIDO";
      alarma -= dt;
      if (alarma <= 0) { api.sonar("stall"); api.vibrar(100); alarma = 0.6; }
      if (!tentado && fuera > 1) { tentado = true; api.tentar(); }
    } else {
      fuera = Math.max(0, fuera - dt * 0.7);
      aviso.classList.add("oculto");
    }

    if (fuera >= LIMITE) {
      fin = true;
      api.perder(lento
        ? "El avión iba demasiado lento y golpeó el muro antes de la pista. Así terminó el vuelo 214."
        : "Venías demasiado rápido y te saliste de la pista. Hay que mirar la velocidad todo el tiempo.");
    } else if (t >= DURACION) {
      fin = true;
      api.ganar();
    }
  });

  return () => {
    parar();
    window.removeEventListener("pointerup", subir);
    window.removeEventListener("keydown", teclaAbajo);
    window.removeEventListener("keyup", teclaArriba);
  };
}

// Banco de casos para el expediente 3 (Therac-25)
function generarPacientes() {
  const elegir = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const mezclar = (lista) => lista.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
  const NOMBRES = [
    ["A. GÓMEZ", "A. GÓMES"], ["C. ROJAS", "C. ROZAS"], ["L. PÉREZ", "L. PAREZ"], ["M. RUIZ", "M. RUÍS"],
    ["J. DÍAZ", "J. DÍAS"], ["S. MORA", "S. MOTA"], ["P. LÓPEZ", "P. LÓPES"], ["D. CASTRO", "D. CASTO"],
    ["V. ROMERO", "V. ROMEO"], ["N. TORRES", "N. TORREZ"], ["E. VARGAS", "E. VERGAS"], ["R. MEDINA", "R. MEDIAN"],
  ];
  const MODOS = ["ELECTRONES", "RAYOS X"];
  const ERRORES = [
    { motivo: "el modo no coincidía", aplicar: (r, m) => { m[2] = r[2] === "ELECTRONES" ? "RAYOS X" : "ELECTRONES"; } },
    { motivo: "la dosis era diez veces mayor", aplicar: (r, m, d) => { m[1] = d * 10 + " cGy"; } },
    { motivo: "la dosis era cien veces mayor", aplicar: (r, m, d) => { m[1] = d * 100 + " cGy"; } },
    { motivo: "la dosis no coincidía con la receta", aplicar: (r, m, d) => { const s = String(d), inv = s[1] + s[0] + s.slice(2); m[1] = (inv === s || inv[0] === "0" ? d + 30 : +inv) + " cGy"; } },
    { motivo: "la máquina mostró un error sin explicación", estado: "MALFUNCTION 54" },
    { motivo: "la máquina mostró un error sin explicación", estado: "MALFUNCTION 26" },
    { motivo: "era otro paciente", aplicar: (r, m, d, n) => { m[0] = n[1]; } },
  ];
  const nombres = mezclar(NOMBRES).slice(0, 6);
  const errores = mezclar(ERRORES).slice(0, 4);
  const casos = nombres.map((n, k) => {
    const dosis = elegir([120, 140, 150, 160, 180, 200, 210, 240, 250]);
    const receta = [n[0], dosis + " cGy", k < 4 ? elegir(MODOS) : "ELECTRONES"];
    const maquina = receta.slice();
    if (k >= 4) return { receta, maquina, estado: "LISTO", seguro: true };
    const e = errores[k];
    if (e.aplicar) e.aplicar(receta, maquina, dosis, n);
    return { receta, maquina, estado: e.estado || "LISTO", seguro: false, motivo: e.motivo };
  });
  return mezclar(casos);
}
// ------------------------------------------------------------
//  EXPEDIENTE 3 · Malfunction 54 (Therac-25)
//  Decidir con cada paciente si se aplica o se detiene el tratamiento.
// ------------------------------------------------------------
function juegoTherac(zona, api) {
  // Cada partida arma 6 casos nuevos: 2 seguros y 4 con un error distinto,
  // con nombres y dosis al azar, en orden aleatorio.
  const PACIENTES = generarPacientes();  const TIEMPO = 10;
  const APROBAR = 5;
  let i = 0, aciertos = 0, errores = 0, resto = TIEMPO, fin = false, bloqueado = false;

  function pintar() {
    const p = PACIENTES[i];
    zona.innerHTML = `
      <div class="consola">
        <div>THERAC-25 · TRATAMIENTO</div>
        <div class="fila"><span>TURNO</span><span>0${i + 1} / 0${PACIENTES.length}</span></div>
        <div style="color:#2fae66;margin-top:6px">— RECETA DEL MÉDICO —</div>
        <div class="fila"><span>PACIENTE</span><span>${p.receta[0]}</span></div>
        <div class="fila"><span>DOSIS</span><span>${p.receta[1]}</span></div>
        <div class="fila"><span>MODO</span><span>${p.receta[2]}</span></div>
        <div style="color:#2fae66;margin-top:6px">— PANTALLA DE LA MÁQUINA —</div>
        <div class="fila"><span>PACIENTE</span><span>${p.maquina[0]}</span></div>
        <div class="fila"><span>DOSIS</span><span>${p.maquina[1]}</span></div>
        <div class="fila"><span>MODO</span><span>${p.maquina[2]}</span></div>
        <div class="fila"><span>ESTADO</span>${p.estado === "LISTO" ? "<span>LISTO</span>" : '<span class="error">' + p.estado + "</span>"}</div>
      </div>
      <div class="medidor">Tiempo para decidir<div class="riel"><div id="reloj" style="width:100%;background:#5cff9d"></div></div></div>
      <div class="decidir">
        <button class="aplicar">${p.estado === "LISTO" ? "APLICAR" : "P · CONTINUAR"}</button>
        <button class="detener">DETENER</button>
      </div>
      <div class="sala">Sala de espera: ${"🧑 ".repeat(PACIENTES.length - i - 1) || "vacía"} · Aciertos: ${aciertos}</div>`;
    zona.querySelector(".aplicar").addEventListener("click", () => decidir(true));
    zona.querySelector(".detener").addEventListener("click", () => decidir(false));
    resto = TIEMPO;
    bloqueado = false;
  }

  function decidir(aplicar) {
    if (fin || bloqueado) return;
    bloqueado = true;
    const p = PACIENTES[i];
    const bien = aplicar === p.seguro;
    if (bien) { aciertos++; api.aviso(aplicar ? "✔ Tratamiento correcto" : "✔ Bien visto: " + p.motivo.toLowerCase(), "bien"); api.sonar("bien"); }
    else {
      errores++;
      if (aplicar) { api.aviso("☢ Sobredosis de radiación", "mal"); api.sonar("alarma"); api.vibrar([100, 60, 200]); api.sacudir(); }
      else { api.aviso("Detuviste un tratamiento seguro", "mal"); api.sonar("error"); }
      api.tentar();
    }
    setTimeout(siguiente, 1100);
  }

  function siguiente() {
    if (fin) return;
    i++;
    if (i >= PACIENTES.length) {
      fin = true;
      if (aciertos >= APROBAR) api.ganar();
      else api.perder(`Acertaste ${aciertos} de ${PACIENTES.length} (necesitabas ${APROBAR}). Los operadores de la Therac-25 también confiaban en la pantalla.`);
      return;
    }
    pintar();
  }

  pintar();
  const parar = bucle((dt) => {
    if (fin || bloqueado) return;
    resto -= dt;
    const r = zona.querySelector("#reloj");
    if (r) { r.style.width = Math.max(0, (resto / TIEMPO) * 100) + "%"; r.style.background = resto < 4 ? "#ff6b6b" : "#5cff9d"; }
    if (resto <= 0) {
      bloqueado = true; errores++;
      api.aviso("El paciente esperó demasiado", "mal");
      api.sonar("error");
      setTimeout(siguiente, 1100);
    }
  });
  return parar;
}

// ------------------------------------------------------------
//  EXPEDIENTE 4 · Ojos en el camino (Uber, Tempe 2018)
//  Frenar a tiempo mientras las notificaciones tapan la vía.
// ------------------------------------------------------------
function juegoCamino(zona, api) {
  const META = 6;
  const NOTIS = [
    ["💬 Grupo del parcial", "¿Alguien hizo el taller? 😩"],
    ["❤️ Instagram", "A Sofi le gustó tu foto"],
    ["📺 Nuevo video", "10 trucos que nadie te contó…"],
    ["💬 Mamá", "¿Ya llegaste?"],
    ["🔔 Recordatorio", "Entrega del proyecto: mañana"],
    ["🎵 Música", "Tu playlist de la semana está lista"],
    ["📦 Pedido", "Tu paquete va en camino"],
    ["💬 Juan", "jajaja mira esto 😂😂"],
    ["🎮 Juego", "¡Tus vidas se recargaron!"],
  ];
  const OBST = ["🚲", "🚶", "🐕", "🚲", "🛴"];
  const ORILLA = ["🌳", "🌲", "🪧", "🌳", "🗑️"];   // cosas al borde del camino: NO hay que frenar
  zona.innerHTML = `
    <div class="camino"><canvas></canvas><div class="notis"></div></div>
    <div class="contador">${"<span></span>".repeat(META)}</div>
    <button class="frenar">FRENAR</button>`;
  const lienzo = zona.querySelector("canvas");
  const ctx = lienzo.getContext("2d");
  const notis = zona.querySelector(".notis");
  const puntos = zona.querySelectorAll(".contador span");

  let ok = 0, desplaz = 0, obst = null, esperaObst = 2.2, esperaNoti = 1.2, fin = false, tentado = false;

  function ajustar() {
    const r = lienzo.getBoundingClientRect();
    lienzo.width = r.width * devicePixelRatio;
    lienzo.height = r.height * devicePixelRatio;
  }
  ajustar();
  window.addEventListener("resize", ajustar);

  function nuevaNoti() {
    if (notis.children.length >= 3) return;
    const [t, m] = NOTIS[Math.floor(Math.random() * NOTIS.length)];
    const d = document.createElement("div");
    d.className = "noti";
    d.innerHTML = `<div><b>${t}</b>${m}</div><button class="x">✕</button>`;
    d.querySelector(".x").addEventListener("click", () => d.remove());
    notis.appendChild(d);
    api.vibrar(40);
    api.sonar("noti");
  }

  // Frenar sin motivo bloquea el freno un momento (así no sirve tocarlo sin parar).
  const freno = zona.querySelector(".frenar");
  let bloqueo = 0, falsos = 0;
  freno.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (fin || bloqueo > 0) return;
    if (obst && !obst.orilla && obst.z > 0.45) {
      ok++;
      puntos[ok - 1].classList.add("ok");
      api.aviso("✔ Frenaste a tiempo", "bien");
      api.sonar("bien");
      obst = null;
      esperaObst = azar(2, 3.4);
      if (ok >= META) { fin = true; setTimeout(api.ganar, 500); }
    } else {
      falsos++;
      if (falsos >= 3) {
        fin = true;
        api.perder("Frenaste de golpe demasiadas veces sin motivo. Manejar exige mirar el camino, no adivinar.");
        return;
      }
      bloqueo = 1.2;
      freno.disabled = true;
      api.aviso((obst && !obst.orilla ? "Frenaste muy pronto" : obst ? "Eso estaba fuera de la vía" : "No había nada en la vía") + ` (${falsos}/2)`, "mal");
      api.sonar("error");
    }
  });

  const parar = bucle((dt) => {
    if (fin) return;
    if (bloqueo > 0) { bloqueo -= dt; if (bloqueo <= 0) freno.disabled = false; }
    zona.dataset.z = obst ? obst.z.toFixed(2) : "";   // (para pruebas automáticas)
    zona.dataset.orilla = obst && obst.orilla ? "1" : "";
    const W = lienzo.width, H = lienzo.height, hz = H * 0.3;
    desplaz = (desplaz + dt * 1.6) % 1;

    esperaNoti -= dt;
    if (esperaNoti <= 0) { nuevaNoti(); esperaNoti = azar(1.4, 2.4); }

    if (!obst) {
      esperaObst -= dt;
      if (esperaObst <= 0) {
        const orilla = Math.random() < 0.5;
        obst = orilla
          ? { z: 0, x: (Math.random() < 0.5 ? -1 : 1) * azar(0.75, 0.95), e: ORILLA[Math.floor(Math.random() * ORILLA.length)], v: azar(0.28, 0.36), orilla: true }
          : { z: 0, x: azar(-0.25, 0.25), e: OBST[Math.floor(Math.random() * OBST.length)], v: azar(0.28, 0.36) };
      }
    } else {
      obst.z += obst.v * dt * (1 + ok * 0.12);
      if (!tentado && !obst.orilla && obst.z > 0.8) { tentado = true; api.tentar(); }
      if (obst.orilla && obst.z >= 1) { obst = null; esperaObst = azar(0.6, 1.6); }
      if (obst && !obst.orilla && obst.z >= 0.95) { fin = true; api.sonar("choque"); api.vibrar([200, 80, 300]); api.perder("No frenaste a tiempo. En Tempe, la persona de respaldo iba mirando su celular."); }
    }

    // Dibujo
    ctx.fillStyle = "#0c0f18"; ctx.fillRect(0, 0, W, H);
    const cielo = ctx.createLinearGradient(0, 0, 0, hz);
    cielo.addColorStop(0, "#0a0d16"); cielo.addColorStop(1, "#1b2238");
    ctx.fillStyle = cielo; ctx.fillRect(0, 0, W, hz);
    ctx.fillStyle = "#2a2e38";
    ctx.beginPath(); ctx.moveTo(W * 0.47, hz); ctx.lineTo(W * 0.53, hz); ctx.lineTo(W * 1.05, H); ctx.lineTo(-W * 0.05, H); ctx.closePath(); ctx.fill();
    // luces del carro
    const luz = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, H * 0.75);
    luz.addColorStop(0, "rgba(255,240,190,.28)"); luz.addColorStop(1, "rgba(255,240,190,0)");
    ctx.fillStyle = luz; ctx.fillRect(0, hz, W, H - hz);
    // líneas del carril
    ctx.fillStyle = "#ffd76a";
    for (let k = 0; k < 8; k++) {
      const z0 = ((k + desplaz) / 8), z1 = z0 + 0.05;
      const y0 = hz + z0 * z0 * (H - hz), y1 = hz + Math.min(1, z1) ** 2 * (H - hz);
      const w0 = 1 + z0 * 7 * devicePixelRatio;
      ctx.fillRect(W / 2 - w0 / 2, y0, w0, Math.max(1, y1 - y0));
    }
    // obstáculo
    if (obst) {
      const y = hz + obst.z * obst.z * (H - hz);
      const tam = (20 + obst.z * 80) * devicePixelRatio;
      const x = W / 2 + obst.x * obst.z * W;
      ctx.font = tam + "px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(obst.e, x, y);
    }
  });

  return () => { parar(); window.removeEventListener("resize", ajustar); };
}

// ------------------------------------------------------------
//  EXPEDIENTE 5 · El examen sin ayuda (final)
//  Preguntas sobre "lo que pasó de verdad" en cada caso. Quien delegó
//  un caso nunca vio su revelación… y ahora lo nota.
// ------------------------------------------------------------
function juegoExamen(zona, api, contexto) {
  const APROBAR = 4;
  const TIEMPO = 15;
  const PREGUNTAS = [
    { caso: 0, nombre: "AF 447", p: "¿Qué falló primero en el vuelo 447?", ok: "Los sensores de velocidad se congelaron",
      no: ["Se apagaron los dos motores", "Un rayo dañó la cabina", "Se acabó el combustible"] },
    { caso: 1, nombre: "Asiana 214", p: "¿Qué creían los pilotos del vuelo 214?", ok: "Que la máquina estaba cuidando la velocidad",
      no: ["Que la pista estaba cerrada", "Que el avión tenía una falla en las ruedas", "Que la torre los guiaba por radio"] },
    { caso: 2, nombre: "Therac-25", p: "Cuando la Therac-25 mostraba “Malfunction 54”, los operadores…", ok: "Confiaban en la máquina y seguían",
      no: ["Llamaban siempre al técnico", "Apagaban la máquina de inmediato", "Leían el manual, que lo explicaba"] },
    { caso: 3, nombre: "Tempe", p: "¿Qué hacía la persona de respaldo del carro autónomo?", ok: "Miraba un video en su celular",
      no: ["Manejaba con las dos manos", "Estaba dormida", "Hablaba con la peatona"] },
    { caso: -1, nombre: "Todos", p: "¿Qué tienen en común los cuatro accidentes?", ok: "Confiaron tanto en la máquina que dejaron de estar atentos",
      no: ["Fueron culpa del mal clima", "Las máquinas eran muy viejas", "Fue pura mala suerte"] },
  ];
  const casos = (contexto && contexto.casos) || [];
  let i = 0, aciertos = 0, resto = TIEMPO, bloqueado = false, fin = false, tentado = false;

  function pintar() {
    const q = PREGUNTAS[i];
    const opciones = [q.ok, ...q.no].sort(() => Math.random() - 0.5);
    const delegado = q.caso >= 0 && casos[q.caso] === "ia";
    zona.innerHTML = `
      <div class="examen-top"><span>Pregunta ${i + 1} de ${PREGUNTAS.length}</span><span>Aciertos: ${aciertos}</span></div>
      <div class="medidor" style="margin-top:4px"><div class="riel"><div id="relojEx" style="width:100%;background:#6ee7a2"></div></div></div>
      <div class="caja" style="margin-top:10px"><span class="pastilla" style="background:#2a2140;color:#c9b6ff;font-size:11px">Caso ${q.nombre}</span>
        ${delegado ? '<span class="pastilla" style="background:#3a1d22;color:#ff8a8a;font-size:11px">✦ Este caso lo resolvió la IA</span>' : ""}
        <div class="pregunta">${q.p}</div></div>
      <div class="opciones">${opciones.map((o) => `<button class="opcion">${o}</button>`).join("")}</div>
      <div class="sala">Necesitas ${APROBAR} de ${PREGUNTAS.length} para aprobar.</div>`;
    zona.querySelectorAll(".opcion").forEach((b) => b.addEventListener("click", () => responder(b, b.textContent === q.ok)));
    resto = TIEMPO;
    bloqueado = false;
  }

  function responder(boton, bien) {
    if (fin || bloqueado) return;
    bloqueado = true;
    const q = PREGUNTAS[i];
    zona.querySelectorAll(".opcion").forEach((b) => { if (b.textContent === q.ok) b.classList.add("correcta"); });
    if (bien) { aciertos++; api.sonar("bien"); }
    else {
      if (boton) boton.classList.add("incorrecta");
      api.sonar("error"); api.vibrar(120);
      if (!tentado) { tentado = true; api.tentar(); }
    }
    setTimeout(siguiente, 1300);
  }

  function siguiente() {
    if (fin) return;
    i++;
    if (i >= PREGUNTAS.length) {
      fin = true;
      if (aciertos >= APROBAR) api.ganar();
      else api.perder(`Acertaste ${aciertos} de ${PREGUNTAS.length}. Lo que no investigas por tu cuenta, no lo aprendes.`);
      return;
    }
    pintar();
  }

  pintar();
  const parar = bucle((dt) => {
    if (fin || bloqueado) return;
    resto -= dt;
    const r = zona.querySelector("#relojEx");
    if (r) { r.style.width = Math.max(0, (resto / TIEMPO) * 100) + "%"; r.style.background = resto < 5 ? "#ff6b6b" : "#6ee7a2"; }
    if (resto <= 0) { api.aviso("Se acabó el tiempo", "mal"); responder(null, false); }
  });
  return parar;
}

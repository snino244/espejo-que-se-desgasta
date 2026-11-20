// ============================================================
//  EXPEDIENTE 2 en 3D (PlayCanvas)
//  Mismas reglas que juegoAterrizaje: mantener ACELERAR para que
//  la velocidad quede en la zona verde hasta tocar la pista.
//  Se carga solo si el navegador soporta WebGL; si no, usa la versión 2D.
// ============================================================
function juegoAterrizaje3D(zona, api) {
  const DURACION = 22, MIN = 37, MAX = 63, LIMITE = 1.9;

  // Si no hay WebGL o no cargó PlayCanvas, se usa la versión 2D (antes de montar nada)
  const hayWebGL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
  if (typeof pc === "undefined" || !hayWebGL) return juegoAterrizaje(zona, api);

  zona.innerHTML = `
    <div class="cabina3d"><canvas id="pc3d"></canvas>
      <div class="peligro oculto" id="peligro"></div>
      <div class="athr">A/THR <b>HOLD</b></div>
    </div>
    <div class="medidor">Velocidad <span style="float:right" id="falta">${DURACION} s para la pista</span></div>
    <div class="velocimetro">
      <div class="zona-lenta"></div><div class="zona-verde"></div><div class="zona-rapida"></div>
      <div class="aguja-v" id="agujaV"></div>
      <span class="et izq">muy lento</span><span class="et der">muy rápido</span>
    </div>
    <button class="btn blanco acelerar" id="acelerar">ACELERAR<br><small>mantén presionado</small></button>`;

  const lienzo = zona.querySelector("#pc3d");
  const aguja = zona.querySelector("#agujaV");
  const aviso = zona.querySelector("#peligro");
  const falta = zona.querySelector("#falta");
  const boton = zona.querySelector("#acelerar");

  // --- estado del juego (igual que la versión 2D) ---
  let v = 52, t = 0, fuera = 0, presionado = false, rafaga = 0, tiempoRafaga = azar(2, 3.5), alarma = 0, tentado = false, fin = false;
  let parar = () => {};

  const bajar = (e) => { e.preventDefault(); presionado = true; boton.classList.add("presionado"); };
  const subir = () => { presionado = false; boton.classList.remove("presionado"); };
  boton.addEventListener("pointerdown", bajar);
  window.addEventListener("pointerup", subir);
  boton.addEventListener("pointerleave", subir);
  const teclaAbajo = (e) => { if (e.code === "Space" || e.key === "ArrowUp") { e.preventDefault(); presionado = true; boton.classList.add("presionado"); } };
  const teclaArriba = (e) => { if (e.code === "Space" || e.key === "ArrowUp") subir(); };
  window.addEventListener("keydown", teclaAbajo);
  window.addEventListener("keyup", teclaArriba);

  function logica(dt) {
    if (fin) return;
    t += dt;
    v += (presionado ? 21 : -12) * dt;
    tiempoRafaga -= dt;
    if (tiempoRafaga <= 0) { rafaga = azar(-11, 11); tiempoRafaga = azar(2, 3.5); }
    v += rafaga * dt;
    v = limitar(v, 0, 100);
    aguja.style.left = `calc(${v}% - 3px)`;
    falta.textContent = Math.max(0, Math.ceil(DURACION - t)) + " s para la pista";

    const lento = v < MIN, rapido = v > MAX;
    if (lento || rapido) {
      fuera += dt;
      aviso.classList.remove("oculto");
      aviso.textContent = lento ? "VELOCIDAD BAJA" : "DEMASIADO RÁPIDO";
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
  }

  // --- escena 3D ---
  // Si no hay WebGL o no carga PlayCanvas, se usa la versión 2D.
  const app = new pc.Application(lienzo, { mouse: new pc.Mouse(lienzo), touch: new pc.TouchDevice(lienzo) });
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.start();

  // cámara desde la cabina, mirando hacia la pista
  const camara = new pc.Entity("camara");
  camara.addComponent("camera", { clearColor: new pc.Color(0.45, 0.7, 0.95), fov: 62 });
  app.root.addChild(camara);

  // luz de sol baja
  const sol = new pc.Entity("sol");
  sol.addComponent("light", { type: "directional", color: new pc.Color(1, 0.95, 0.85), intensity: 1.1 });
  sol.setEulerAngles(45, 30, 0);
  app.root.addChild(sol);

  // mar
  const mar = new pc.Entity("mar");
  mar.addComponent("render", { type: "plane" });
  mar.setLocalScale(400, 1, 400);
  mar.setPosition(0, -0.02, -120);
  const matMar = new pc.StandardMaterial();
  matMar.diffuse = new pc.Color(0.1, 0.35, 0.6);
  matMar.metalness = 0.1; matMar.gloss = 0.8; matMar.update();
  mar.render.material = matMar;
  app.root.addChild(mar);

  // pista + muro
  const pista = new pc.Entity("pista");
  pista.addComponent("render", { type: "box" });
  pista.setLocalScale(14, 0.3, 300);
  pista.setPosition(0, -0.15, -150);
  const matPista = new pc.StandardMaterial();
  matPista.diffuse = new pc.Color(0.25, 0.27, 0.3); matPista.update();
  pista.render.material = matPista;
  app.root.addChild(pista);

  const muro = new pc.Entity("muro");
  muro.addComponent("render", { type: "box" });
  muro.setLocalScale(22, 1.2, 1.2);
  muro.setPosition(0, 0.6, -2);
  const matMuro = new pc.StandardMaterial();
  matMuro.diffuse = new pc.Color(0.55, 0.57, 0.6); matMuro.update();
  muro.render.material = matMuro;
  app.root.addChild(muro);

  // nubes: esferas blancas suaves que pasan
  const nubes = [];
  const matNube = new pc.StandardMaterial();
  matNube.diffuse = new pc.Color(1, 1, 1); matNube.emissive = new pc.Color(0.9, 0.95, 1); matNube.emissiveIntensity = 0.4; matNube.update();
  for (let k = 0; k < 9; k++) {
    const n = new pc.Entity("nube" + k);
    n.addComponent("render", { type: "sphere" });
    const s = azar(12, 26);
    n.setLocalScale(s, s * 0.45, s * 0.7);
    n.render.material = matNube;
    n.setPosition(azar(-120, 120), azar(60, 110), azar(-260, -40));
    app.root.addChild(n);
    nubes.push({ n, x: n.getPosition().x, vel: azar(2, 5) });
  }

  // avión visto desde atrás: fuselaje + alas, siguiendo la inclinación de la aguja
  const avion = new pc.Entity("avion");
  app.root.addChild(avion);
  const matAvion = new pc.StandardMaterial();
  matAvion.diffuse = new pc.Color(0.94, 0.95, 0.97); matAvion.metalness = 0.2; matAvion.gloss = 0.6; matAvion.update();
  const matAzul = new pc.StandardMaterial();
  matAzul.diffuse = new pc.Color(0.1, 0.35, 0.65); matAzul.update();
  const parte = (nombre, tipo, escala, pos, mat) => {
    const e = new pc.Entity(nombre);
    e.addComponent("render", { type: tipo });
    e.setLocalScale(...escala);
    e.setLocalPosition(...pos);
    e.render.material = mat;
    avion.addChild(e);
    return e;
  };
  parte("fuselaje", "capsule", [2.2, 6, 2.2], [0, 0, 0], matAvion).setEulerAngles(90, 0, 0);
  parte("ala", "box", [14, 0.15, 2.5], [0, -0.2, 0.8], matAvion);
  parte("cola", "box", [4, 0.15, 1.6], [0, 0.4, -2.6], matAvion);
  parte("deriva", "box", [0.15, 2.6, 1.6], [0, 1.4, -2.6], matAzul);

  // cámara detrás del avión, un poco arriba
  function colocarCamara() {
    camara.setPosition(0, 4.2, 12);
    camara.lookAt(0, 0.5, -20);
  }
  colocarCamara();

  // al aterrizar, el avión baja hacia la pista y se acerca al muro
  app.on("update", (dt) => {
    lograr(dt);
  });

  function lograr(dt) {
    logica(dt);
    if (fin) { app.off("update"); return; }
    const p = Math.min(1, t / DURACION);
    // la velocidad lenta hace que el avión caiga más; la rápida lo hace pasar
    const bajada = (v < MIN ? (MIN - v) * 0.05 : 0);
    avion.setPosition(0, 3 + (1 - p) * 4 - p * 2 - bajada * p, -2 - p * 22);
    avion.setEulerAngles(-8 - (v - 50) * 0.12, 0, 0);
    // la cámara sigue un poco el movimiento
    camara.setPosition(Math.sin(p * 3) * 0.6, 4.2 + (1 - p) * 0.8, 12);
    camara.lookAt(0, 0.5, -20);
    for (const q of nubes) {
      q.x += q.vel * dt * (1 + p);
      if (q.x > 140) q.x = -140;
      q.n.setPosition(q.x, q.n.getPosition().y, q.n.getPosition().z);
    }
    // el muro se vuelve más grande a medida que el avión se acerca
    muro.setPosition(0, 0.6, -2 + p * 0.2);
  }

  parar = () => {
    app.off("update");
    try { app.destroy(); } catch (e) {}
    window.removeEventListener("pointerup", subir);
    window.removeEventListener("keydown", teclaAbajo);
    window.removeEventListener("keyup", teclaArriba);
  };
  return () => parar();
}

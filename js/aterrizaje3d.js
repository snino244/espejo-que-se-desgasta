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
  const hayWebGL2 = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch (e) { return false; } })();
  const app = new pc.Application(lienzo, { mouse: new pc.Mouse(lienzo), touch: new pc.TouchDevice(lienzo) });
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.scene.ambientLight = new pc.Color(0.55, 0.6, 0.7);
  app.start();

  const mat = (color, extra = {}) => {
    const m = new pc.StandardMaterial();
    m.diffuse = new pc.Color(...color);
    if (extra.emissive) { m.emissive = new pc.Color(...extra.emissive); m.emissiveIntensity = extra.ei || 1; }
    m.gloss = extra.gloss ?? 0.3; m.metalness = 0;
    m.update();
    return m;
  };
  const caja = (nombre, [x, y, z], [sx, sy, sz], material, padre = app.root) => {
    const e = new pc.Entity(nombre);
    e.addComponent("render", { type: "box" });
    e.setLocalScale(sx, sy, sz); e.setLocalPosition(x, y, z);
    e.render.material = material;
    padre.addChild(e);
    return e;
  };
  const esfera = (nombre, [x, y, z], [sx, sy, sz], material, padre = app.root) => {
    const e = new pc.Entity(nombre);
    e.addComponent("render", { type: "sphere" });
    e.setLocalScale(sx, sy, sz); e.setLocalPosition(x, y, z);
    e.render.material = material;
    padre.addChild(e);
    return e;
  };

  // cámara detrás del avión
  const camara = new pc.Entity("camara");
  camara.addComponent("camera", { clearColor: new pc.Color(0.42, 0.68, 0.96), fov: 60, nearClip: 0.5, farClip: 800 });
  app.root.addChild(camara);

  // sol: luz direccional cálida + disco brillante
  const sol = new pc.Entity("sol");
  sol.addComponent("light", { type: "directional", color: new pc.Color(1, 0.93, 0.8), intensity: 1.25 });
  sol.setEulerAngles(35, 25, 0);
  app.root.addChild(sol);
  const matSol = mat([1, 0.95, 0.7], { emissive: [1, 0.92, 0.6], ei: 3 });
  esfera("disco-sol", [60, 95, -260], [26, 26, 26], matSol).render.castShadows = false;
  const halo = esfera("halo-sol", [60, 95, -262], [70, 70, 70], mat([1, 0.9, 0.6], { emissive: [1, 0.85, 0.5], ei: 0.5 }));

  // mar con dos tonos y espuma que se mueve
  caja("mar", [0, -0.6, -150], [500, 1, 500], mat([0.12, 0.38, 0.62], { gloss: 0.8 }));
  const espuma = [];
  const matEspuma = mat([0.9, 0.97, 1], { emissive: [0.9, 0.97, 1], ei: 0.6 });
  for (let k = 0; k < 26; k++) {
    const z = -azar(4, 200);
    espuma.push({ e: caja("espuma" + k, [azar(-60, 60), -0.1, z], [azar(3, 9), 0.08, azar(0.25, 0.5)], matEspuma), z, vel: azar(0.4, 1) });
  }

  // pista con luces de borde y línea central
  caja("pista", [0, 0, -150], [16, 0.4, 320], mat([0.22, 0.24, 0.28], { gloss: 0.2 }));
  const luces = [];
  const matLuz = mat([1, 0.95, 0.6], { emissive: [1, 0.9, 0.5], ei: 2 });
  for (let k = 0; k < 40; k++) {
    const z0 = -k * 8;
    luces.push({ e: caja("luzA" + k, [-8.2, 0.25, z0], [0.5, 0.3, 0.5], matLuz), z0 });
    luces.push({ e: caja("luzB" + k, [8.2, 0.25, z0], [0.5, 0.3, 0.5], matLuz), z0 });
  }
  const matBlanco = mat([0.95, 0.95, 0.95], { emissive: [0.9, 0.9, 0.9], ei: 0.25 });
  const rayas = [];
  for (let k = 0; k < 30; k++) rayas.push({ e: caja("raya" + k, [0, 0.03, -k * 10], [0.5, 0.05, 4], matBlanco), z0: -k * 10 });

  // muro de contención, con franjas
  caja("muro", [0, 0.9, -4], [26, 1.8, 1.4], mat([0.6, 0.62, 0.66]));
  for (let k = -5; k <= 5; k++) caja("franja" + k, [k * 2.4, 1.85, -4], [1.2, 0.05, 1.5], mat([0.95, 0.6, 0.15]));

  // nubes: racimos de esferas blancas
  const matNube = mat([1, 1, 1], { emissive: [0.92, 0.96, 1], ei: 0.35, gloss: 0 });
  const nubes = [];
  for (let k = 0; k < 10; k++) {
    const grupo = new pc.Entity("nube" + k);
    app.root.addChild(grupo);
    const piezas = 4 + Math.floor(Math.random() * 3);
    for (let j = 0; j < piezas; j++) {
      const s = azar(10, 20);
      esfera("p" + j, [azar(-14, 14), azar(-3, 3), azar(-4, 4)], [s, s * 0.55, s * 0.8], matNube, grupo);
    }
    grupo.setLocalPosition(azar(-150, 150), azar(45, 105), azar(-260, -50));
    nubes.push({ g: grupo, x: grupo.getLocalPosition().x, vel: azar(2, 5) });
  }

  // avión visto desde atrás: fuselaje blanco, franja azul, alas, motores y cola
  const avion = new pc.Entity("avion");
  app.root.addChild(avion);
  const matFuselaje = mat([0.96, 0.97, 0.99], { gloss: 0.7 });
  const matAzul = mat([0.1, 0.36, 0.7], { gloss: 0.6 });
  const matMotor = mat([0.55, 0.58, 0.63], { gloss: 0.5 });
  const matOscuro = mat([0.2, 0.22, 0.26]);
  const cuerpo = new pc.Entity("cuerpo"); avion.addChild(cuerpo);
  const cil = (nombre, [x, y, z], [sx, sy, sz], rot, m, padre) => {
    const e = new pc.Entity(nombre);
    e.addComponent("render", { type: "capsule" });
    e.setLocalScale(sx, sy, sz); e.setLocalPosition(x, y, z); e.setEulerAngles(...rot);
    e.render.material = m; padre.addChild(e); return e;
  };
  cil("fuselaje", [0, 0, 0], [2.2, 4.2, 2.2], [90, 0, 0], matFuselaje, cuerpo);
  caja("franjaFuse", [0, 0.1, 1.0], [1.4, 0.35, 2.4], matAzul, cuerpo);
  caja("ala", [0, -0.45, 0.5], [13, 0.12, 2.6], matFuselaje, cuerpo);
  caja("alaSombra", [0, -0.52, 0.5], [13, 0.05, 2.6], matOscuro, cuerpo);
  cil("motorI", [-3.8, -0.9, 0.7], [0.9, 1.2, 0.9], [90, 0, 0], matMotor, cuerpo);
  cil("motorD", [3.8, -0.9, 0.7], [0.9, 1.2, 0.9], [90, 0, 0], matMotor, cuerpo);
  caja("cola", [0, 0.6, -2.4], [3.8, 0.12, 1.4], matFuselaje, cuerpo);
  caja("deriva", [0, 1.8, -2.6], [0.14, 2.4, 1.5], matAzul, cuerpo);

  // cámara detrás del avión, un poco arriba
  camara.setPosition(0, 4.2, 12);
  camara.lookAt(0, 0.5, -20);

  app.on("update", (dt) => {
    logica(dt);
    if (fin) return;
    const p = Math.min(1, t / DURACION);
    // el avión baja hacia la pista; la velocidad lenta lo hace caer más
    const bajada = (v < MIN ? (MIN - v) * 0.05 : 0);
    avion.setPosition(0, 3 + (1 - p) * 4 - p * 2 - bajada * p, -2 - p * 22);
    avion.setEulerAngles(-8 - (v - 50) * 0.12, 0, (rafaga * 0.15) * Math.sin(t * 2));
    camara.setPosition(Math.sin(p * 3) * 0.6, 4.2 + (1 - p) * 0.8, 12);
    camara.lookAt(0, 0.5, -20);
    // luces y líneas de pista pasan hacia la cámara
    const avance = (t * 22) % 8;
    for (const l of luces) { const z = l.z0 + avance; l.e.setLocalPosition(l.e.getLocalPosition().x, 0.25, z > 12 ? z - 320 : z); }
    for (const r of rayas) { const z = r.z0 + avance; r.e.setLocalPosition(0, 0.03, z > 12 ? z - 300 : z); }
    // espuma del mar
    for (const f of espuma) { f.z += f.vel * dt * (1 + p); if (f.z > 12) f.z -= 200; f.e.setLocalPosition(f.e.getLocalPosition().x, -0.1, f.z); }
    // nubes
    for (const q of nubes) {
      q.x += q.vel * dt * (1 + p);
      if (q.x > 160) q.x = -160;
      q.g.setLocalPosition(q.x, q.g.getLocalPosition().y, q.g.getLocalPosition().z);
    }
    // el muro y el sol siguen la cámara para que se vea siempre
    halo.setLocalScale(70 + Math.sin(t * 1.2) * 4, 70 + Math.sin(t * 1.2) * 4, 70);
  });

  parar = () => {
    app.off("update");
    try { app.destroy(); } catch (e) {}
    window.removeEventListener("pointerup", subir);
    window.removeEventListener("keydown", teclaAbajo);
    window.removeEventListener("keyup", teclaArriba);
  };
  return () => parar();
}

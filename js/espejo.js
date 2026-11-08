// ============================================================
//  EL ESPEJO (computador)
//  1. Muestra el QR y espera al celular.
//  2. Recibe la foto tomada en el celular y detecta el rostro una sola vez.
//  3. Con cada delegación borra un rasgo: cejas → ojos → nariz → boca → rostro.
// ============================================================

const RASGOS = ["las cejas", "los ojos", "la nariz", "la boca", "todo el rostro"];
const FINALES = [
  { max: 0, bueno: true,  titulo: "Todo lo que ves es tuyo.", texto: "Resolviste los cinco expedientes por tu cuenta. Pensar cuesta, y aun así lo elegiste.", cierre: "Sigue siendo el piloto de tu propia cabeza." },
  { max: 2, bueno: true,  titulo: "Todavía te reconoces.", texto: "Usaste la máquina como apoyo, no como reemplazo. Tu reflejo perdió poco.", cierre: "La clave es no soltar el control del todo." },
  { max: 4, bueno: false, titulo: "Cada atajo se llevó algo.", texto: "Delegaste casi todo, y tu reflejo ya no se parece a ti. ¿Cuánto más vas a dejar ir?", cierre: "Confiar a ciegas → dejar de practicar → no saber reaccionar." },
  { max: 5, bueno: false, titulo: "Batería agotada.", texto: "Los pilotos del vuelo 447 tampoco sabían volar cuando la máquina se apagó. Hoy le entregamos a la IA nuestras tareas, resúmenes y decisiones.", cierre: "No seamos dependientes." },
];

// Puntos de MediaPipe FaceMesh (índices de los 468 puntos del rostro)
const PUNTOS = {
  cejas: [[70, 63, 105, 66, 107, 55, 65, 52, 53, 46], [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]],
  ojos:  [[33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246], [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]],
  nariz: [[168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 98, 327, 129, 358, 49, 279, 48, 278]],
  boca:  [[61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]],
  ovalo: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
          152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  piel:  [50, 280, 101, 330, 151, 199],
};

const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo");
const ctx = lienzo.getContext("2d");

let sesion = null, canal = null;
let conectado = false, terminado = false;
let delegaciones = 0, propias = 0;
let brillo = 0, falla = 0;
let foto = null;          // canvas con la foto original (720 x 960)
let parches = [];         // 5 canvases: lo que tapa cada rasgo
let visibles = [0, 0, 0, 0, 0];  // opacidad animada de cada parche
let caraDetectada = false;

// ------------------------------------------------------------
//  Modelo de detección (se carga en segundo plano al abrir)
// ------------------------------------------------------------
let modelo = null, modeloListo = false;
try {
  modelo = ml5.faceMesh({ maxFaces: 1, refineLandmarks: false, flipped: false }, () => { modeloListo = true; });
} catch (e) {
  console.warn("FaceMesh no disponible; se usará la posición del óvalo.", e);
}

function esperar(cond, ms) {
  return new Promise((ok) => {
    const t0 = Date.now();
    (function revisar() { if (cond() || Date.now() - t0 > ms) ok(cond()); else setTimeout(revisar, 150); })();
  });
}

async function detectarRostro(imagen) {
  if (!modelo) return null;
  if (!(await esperar(() => modeloListo, 20000))) return null;
  return new Promise((ok) => {
    let listo = false;
    const fin = (r) => { if (!listo) { listo = true; ok(r); } };
    setTimeout(() => fin(null), 10000);
    try {
      modelo.detect(imagen, (resultados) => {
        const c = resultados && resultados[0];
        fin(c && c.keypoints && c.keypoints.length >= 468 ? c : null);
      });
    } catch (e) { console.warn(e); fin(null); }
  });
}

// ------------------------------------------------------------
//  Sesión, QR y mensajes del celular
// ------------------------------------------------------------
async function nuevaSesion() {
  if (canal) canal.cerrar();
  sesion = Canal.nuevaSesion();
  const cfg = window.CONFIG || {};
  const base = cfg.urlBase || location.href.replace(/[^/]*([?#].*)?$/, "");
  const url = base + "celular.html?s=" + sesion;
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  $("qr").innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  $("codigo").textContent = "SESIÓN " + sesion;
  canal = await Canal.abrir(sesion, recibir);
  $("modoPrueba").innerHTML = canal.modo === "local"
    ? 'Modo prueba (sin Firebase):<br><a href="' + url + '" target="_blank" rel="noopener">abre el celular en otra pestaña</a>'
    : "";
}

function recibir(msg) {
  if (!msg || !msg.tipo) return;
  switch (msg.tipo) {
    case "conectado": alConectar(); break;
    case "foto":      recibirFoto(msg.datos); break;
    case "abrir":     $("expediente").textContent = "Expediente " + msg.n + " de 5 · " + (msg.titulo || ""); break;
    case "propio":    alResolverSola(); break;
    case "delegado":  alDelegar(); break;
    case "fin":       setTimeout(mostrarFinal, 1800); break;
  }
}

function mostrarEtapa(id) {
  ["inicio", "esperaFoto", "analizando"].forEach((x) => $(x).classList.toggle("oculto", x !== id));
}

function alConectar() {
  if (conectado) return;
  conectado = true;
  if (!foto) mostrarEtapa("esperaFoto");
  avisar("Celular conectado", "info");
}

async function recibirFoto(datos) {
  if (!conectado) alConectar();
  mostrarEtapa("analizando");
  const img = new Image();
  img.src = datos;
  await img.decode().catch(() => {});
  const c = document.createElement("canvas");
  c.width = FOTO.ancho; c.height = FOTO.alto;
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);

  const cara = await detectarRostro(c);
  caraDetectada = !!cara;
  if (!cara) console.info("No se detectó el rostro; se usa la posición del óvalo guía.");
  parches = crearParches(c, cara);
  foto = c;
  visibles = visibles.map((_, i) => (i < delegaciones ? 1 : 0));
  mostrarEtapa(null);
  $("bateria").classList.add("visible");
  avisar("Este es tu reflejo", "info");
}

function alResolverSola() {
  if (!conectado) alConectar();
  propias++;
  brillo = 1.8;
  avisar("¡Lo hiciste tú!", "bien");
}

function alDelegar() {
  if (!conectado) alConectar();
  if (delegaciones >= 5) return;
  delegaciones++;
  falla = 1.1;
  avisar("Tu reflejo perdió " + RASGOS[delegaciones - 1], "mal");
  actualizarBateria();
}

function actualizarBateria() {
  const nivel = Math.max(0, 100 - delegaciones * 20);
  const barra = $("nivelBateria");
  barra.style.width = nivel + "%";
  barra.style.background = nivel > 60 ? "var(--verde)" : nivel > 20 ? "var(--naranja)" : "var(--rojo)";
  $("etiquetaBateria").textContent = nivel === 0 ? "AGOTADA 0 %" : "Identidad " + nivel + " %";
  $("bateria").classList.toggle("agotada", nivel === 0);
  const perdidos = RASGOS.slice(0, delegaciones);
  $("perdidos").innerHTML = perdidos.length ? "Rasgos perdidos:<br><b>" + perdidos.join(" · ") + "</b>" : "";
}

let temporizadorAviso = null;
function avisar(texto, tipo) {
  const el = $("aviso");
  el.textContent = texto;
  el.className = "capa visible " + tipo;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => el.classList.remove("visible"), 2600);
}

function mostrarFinal() {
  if (terminado) return;
  terminado = true;
  const f = FINALES.find((x) => delegaciones <= x.max);
  $("finalTitulo").textContent = f.titulo;
  $("finalTexto").textContent = f.texto;
  $("finalCierre").textContent = f.cierre;
  $("finalCifras").textContent = "Investigaste tú: " + propias + " · Delegaste a la IA: " + delegaciones;
  $("final").classList.toggle("bueno", f.bueno);
  $("final").classList.add("visible");
  $("expediente").textContent = "";
}

async function reiniciar() {
  conectado = false; terminado = false;
  delegaciones = 0; propias = 0; brillo = 0; falla = 0;
  foto = null; parches = []; visibles = [0, 0, 0, 0, 0];
  $("final").classList.remove("visible");
  $("bateria").classList.remove("visible");
  $("expediente").textContent = "";
  mostrarEtapa("inicio");
  actualizarBateria();
  await nuevaSesion();
}
$("reiniciar").addEventListener("click", reiniciar);

// ------------------------------------------------------------
//  Zonas del rostro y parches de piel
// ------------------------------------------------------------
function elipseDe(cara, indices, fx, fy, pad) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of indices) {
    const p = cara.keypoints[i];
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: ((x1 - x0) / 2) * fx + pad, ry: ((y1 - y0) / 2) * fy + pad };
}

// Zonas a partir de los puntos detectados, o del óvalo guía si no hubo detección.
function zonas(cara) {
  if (cara) {
    const ov = elipseDe(cara, PUNTOS.ovalo, 1, 1, 0);
    const pad = ov.rx * 0.05;
    return {
      cejas: PUNTOS.cejas.map((p) => elipseDe(cara, p, 1.2, 2.4, pad)),
      ojos:  PUNTOS.ojos.map((p) => elipseDe(cara, p, 1.3, 2.1, pad)),
      nariz: PUNTOS.nariz.map((p) => elipseDe(cara, p, 1.45, 1.25, pad)),
      boca:  PUNTOS.boca.map((p) => elipseDe(cara, p, 1.2, 1.7, pad)),
      contorno: PUNTOS.ovalo.map((i) => cara.keypoints[i]),
      ovalo: ov,
      piel: PUNTOS.piel.map((i) => cara.keypoints[i]),
    };
  }
  const o = FOTO.ovalo, W = FOTO.ancho, H = FOTO.alto;
  const X = (f) => (o.x + o.w * f) * W, Y = (f) => (o.y + o.h * f) * H;
  const ew = o.w * W, eh = o.h * H;
  return {
    cejas: [{ cx: X(0.3), cy: Y(0.34), rx: ew * 0.15, ry: eh * 0.05 }, { cx: X(0.7), cy: Y(0.34), rx: ew * 0.15, ry: eh * 0.05 }],
    ojos:  [{ cx: X(0.31), cy: Y(0.43), rx: ew * 0.14, ry: eh * 0.055 }, { cx: X(0.69), cy: Y(0.43), rx: ew * 0.14, ry: eh * 0.055 }],
    nariz: [{ cx: X(0.5), cy: Y(0.56), rx: ew * 0.12, ry: eh * 0.11 }],
    boca:  [{ cx: X(0.5), cy: Y(0.75), rx: ew * 0.2, ry: eh * 0.065 }],
    contorno: null,
    ovalo: { cx: X(0.5), cy: Y(0.5), rx: ew * 0.48, ry: eh * 0.5 },
    piel: [{ x: X(0.25), y: Y(0.62) }, { x: X(0.75), y: Y(0.62) }, { x: X(0.5), y: Y(0.2) }, { x: X(0.5), y: Y(0.88) }],
  };
}

// Promedio del color de la piel (ignora puntos muy oscuros o muy claros).
function colorDePiel(fuente, puntos) {
  const c = fuente.getContext("2d");
  let r = 0, g = 0, b = 0, n = 0;
  for (const p of puntos) {
    const x = Math.round(p.x) - 4, y = Math.round(p.y) - 4;
    if (x < 0 || y < 0 || x + 9 > fuente.width || y + 9 > fuente.height) continue;
    const d = c.getImageData(x, y, 9, 9).data;
    for (let k = 0; k < d.length; k += 4) {
      const lum = 0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2];
      if (lum < 40 || lum > 245) continue;
      r += d[k]; g += d[k + 1]; b += d[k + 2]; n++;
    }
  }
  return n ? [r / n, g / n, b / n] : [200, 160, 135];
}

function rutaElipses(c, elipses, escala = 1) {
  c.beginPath();
  for (const e of elipses) { c.moveTo(e.cx + e.rx * escala, e.cy); c.ellipse(e.cx, e.cy, e.rx * escala, e.ry * escala, 0, 0, Math.PI * 2); }
}

function crearParches(fuente, cara) {
  const z = zonas(cara);
  const piel = colorDePiel(fuente, z.piel);
  const rgb = `rgb(${piel.map(Math.round).join(",")})`;
  const tam = z.ovalo.rx;
  const nuevo = () => { const c = document.createElement("canvas"); c.width = fuente.width; c.height = fuente.height; return c; };

  function parche(elipses) {
    const c = nuevo(), x = c.getContext("2d");
    // 1) piel lisa con bordes suaves
    x.filter = `blur(${Math.max(6, tam * 0.07)}px)`;
    x.fillStyle = rgb;
    rutaElipses(x, elipses, 1);
    x.fill();
    x.filter = `blur(${Math.max(4, tam * 0.04)}px)`;
    rutaElipses(x, elipses, 0.8);
    x.fill();
    // 2) un poco de la luz original muy difuminada, para que no se vea plano
    x.save();
    rutaElipses(x, elipses, 0.75);
    x.clip();
    x.filter = `blur(${Math.max(10, tam * 0.12)}px)`;
    x.globalAlpha = 0.18;
    x.drawImage(fuente, 0, 0);
    x.restore();
    return c;
  }

  function parcheRostro() {
    const c = nuevo(), x = c.getContext("2d");
    x.filter = `blur(${Math.max(10, tam * 0.1)}px)`;
    x.fillStyle = rgb;
    x.beginPath();
    if (z.contorno) { z.contorno.forEach((p, k) => (k ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.closePath(); }
    else x.ellipse(z.ovalo.cx, z.ovalo.cy, z.ovalo.rx, z.ovalo.ry, 0, 0, Math.PI * 2);
    x.fill();
    x.save();
    x.beginPath();
    x.ellipse(z.ovalo.cx, z.ovalo.cy, z.ovalo.rx * 0.8, z.ovalo.ry * 0.85, 0, 0, Math.PI * 2);
    x.clip();
    x.filter = `blur(${Math.max(16, tam * 0.2)}px)`;
    x.globalAlpha = 0.14;
    x.drawImage(fuente, 0, 0);
    x.restore();
    return c;
  }

  return [parche(z.cejas), parche(z.ojos), parche(z.nariz), parche(z.boca), parcheRostro()];
}

// ------------------------------------------------------------
//  Dibujo
// ------------------------------------------------------------
function ajustarLienzo() {
  const dpr = window.devicePixelRatio || 1;
  lienzo.width = innerWidth * dpr;
  lienzo.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", ajustarLienzo);
ajustarLienzo();

function marcoDeFoto() {
  const h = Math.min(innerHeight * 0.82, innerWidth * 0.7 * (FOTO.alto / FOTO.ancho));
  const w = h * (FOTO.ancho / FOTO.alto);
  return { x: (innerWidth - w) / 2, y: (innerHeight - h) / 2 + 10, w, h };
}

let antes = performance.now();
function dibujar(ahora) {
  const dt = Math.min((ahora - antes) / 1000, 0.1);
  antes = ahora;
  ctx.fillStyle = "#0b0e15";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  if (foto) {
    const m = marcoDeFoto();
    // brillo detrás del marco cuando la persona lo hizo sola
    if (brillo > 0) {
      const a = Math.min(1, brillo);
      const g = ctx.createRadialGradient(m.x + m.w / 2, m.y + m.h / 2, m.w * 0.3, m.x + m.w / 2, m.y + m.h / 2, m.w * 1.1);
      g.addColorStop(0, `rgba(255,215,106,${0.55 * a})`);
      g.addColorStop(1, "rgba(255,215,106,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, innerWidth, innerHeight);
    }
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(m.x, m.y, m.w, m.h, 22);
    ctx.clip();
    ctx.drawImage(foto, m.x, m.y, m.w, m.h);
    for (let i = 0; i < 5; i++) {
      const meta = i < delegaciones ? 1 : 0;
      visibles[i] += Math.sign(meta - visibles[i]) * Math.min(Math.abs(meta - visibles[i]), dt * 0.9);
      if (visibles[i] > 0.001 && parches[i]) {
        ctx.globalAlpha = visibles[i];
        ctx.drawImage(parches[i], m.x, m.y, m.w, m.h);
        ctx.globalAlpha = 1;
      }
    }
    if (brillo > 0) {
      ctx.fillStyle = `rgba(255,240,190,${0.18 * Math.min(1, brillo)})`;
      ctx.fillRect(m.x, m.y, m.w, m.h);
    }
    ctx.restore();
    ctx.lineWidth = 6;
    ctx.strokeStyle = brillo > 0 ? "#ffd76a" : "#2a2f3a";
    ctx.beginPath();
    ctx.roundRect(m.x, m.y, m.w, m.h, 22);
    ctx.stroke();
  }

  if (falla > 0) dibujarFalla(Math.min(1, falla));
  if (terminado) { ctx.fillStyle = "rgba(11,14,21,.5)"; ctx.fillRect(0, 0, innerWidth, innerHeight); }

  brillo = Math.max(0, brillo - dt);
  falla = Math.max(0, falla - dt);
  requestAnimationFrame(dibujar);
}

// Efecto de "falla": franjas desplazadas y tinte rojo.
function dibujarFalla(a) {
  const dpr = window.devicePixelRatio || 1;
  for (let i = 0; i < 8; i++) {
    const y = Math.random() * innerHeight, h = 6 + Math.random() * 36, dx = (Math.random() - 0.5) * 80 * a;
    ctx.drawImage(lienzo, 0, y * dpr, lienzo.width, h * dpr, dx, y, innerWidth, h);
  }
  ctx.fillStyle = `rgba(255,40,60,${0.22 * a})`;
  ctx.fillRect(0, 0, innerWidth, innerHeight);
}

requestAnimationFrame(dibujar);

// ------------------------------------------------------------
//  Teclas de prueba
// ------------------------------------------------------------
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "c") alConectar();
  else if (k === "p") alResolverSola();
  else if (k === "d") alDelegar();
  else if (k === "f") mostrarFinal();
  else if (k === "r") reiniciar();
  else if (k === "h") $("ayuda").classList.toggle("oculto");
});

actualizarBateria();
mostrarEtapa("inicio");
nuevaSesion();

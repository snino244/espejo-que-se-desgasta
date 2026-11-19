// ============================================================
//  FONDO "SIN SEÑAL"
//  Estática blanca con líneas entrecortadas, compartida por el
//  celular y el espejo.
//    Estatica.nitidez(v)      -> 0 = pura estática, 1 = blanco limpio
//    Estatica.distorsionar(f) -> sacudida de interferencia (delegar a la IA)
//    Estatica.serpentinas()   -> lluvia de serpentinas (todo lo hizo la persona)
// ============================================================
(function () {
  const lienzo = document.createElement("canvas");
  lienzo.id = "estatica";
  lienzo.setAttribute("aria-hidden", "true");
  Object.assign(lienzo.style, { position: "fixed", inset: "0", width: "100%", height: "100%", zIndex: "-1", pointerEvents: "none" });
  const ctx = lienzo.getContext("2d");
  const buf = document.createElement("canvas");
  const bctx = buf.getContext("2d");

  let ruido = 1, objetivo = 1;   // cantidad de estática (1 = máxima)
  let distorsion = 0;            // interferencia fuerte, decae sola
  let progreso = 0;              // 0 = pura estática, 1 = nítido (sube con cada acierto)
  let claridad = 0;              // destello de nitidez momentáneo (acierto)
  let barra = Math.random();     // franja que baja por la pantalla
  let cintas = [], lluvia = 0;
  const COLORES = ["#ff4d6d", "#ffb703", "#3a86ff", "#2ec27e", "#9b5de5", "#ff7b00", "#00b4d8"];

  function ajustar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = innerWidth * dpr;
    lienzo.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", ajustar);

  function nuevaCinta(arriba) {
    return {
      x: Math.random() * innerWidth,
      y: arriba ? -40 - Math.random() * innerHeight * 0.6 : Math.random() * innerHeight,
      vy: 70 + Math.random() * 120,
      vx: (Math.random() - 0.5) * 30,
      amp: 6 + Math.random() * 10,
      fase: Math.random() * 6.28,
      giro: 3 + Math.random() * 4,
      largo: 40 + Math.random() * 50,
      ancho: 4 + Math.random() * 4,
      color: COLORES[Math.floor(Math.random() * COLORES.length)],
    };
  }

  let antes = performance.now(), acumulado = 0;
  function paso(ahora) {
    requestAnimationFrame(paso);
    const dt = Math.min((ahora - antes) / 1000, 0.1);
    antes = ahora;
    acumulado += dt;
    // la estática se mueve a ~24 cuadros por segundo; las serpentinas, a la velocidad de la pantalla
    const tocaEstatica = acumulado >= 1 / 24;
    if (!tocaEstatica && !cintas.length) return;
    if (tocaEstatica) acumulado = 0;

    ruido += (objetivo - ruido) * Math.min(1, dt * 1.5);
    distorsion = Math.max(0, distorsion - dt * 0.7);
    claridad = Math.max(0, claridad - dt * 0.8);
    barra = (barra + dt * 0.18) % 1.2;
    const W = innerWidth, H = innerHeight;
    const nivel = Math.max(0, Math.min(1, ruido + distorsion * 0.8) - claridad);

    {
      if (nivel < 0.01) {
        ctx.fillStyle = "#fbfbfb";
        ctx.fillRect(0, 0, W, H);
      } else {
        // 1) estática: más pixelada mientras hay interferencia
        const px = 3 + Math.round(distorsion * 12);
        const bw = Math.ceil(W / px), bh = Math.ceil(H / px);
        if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh; }
        const img = bctx.createImageData(bw, bh);
        const d = img.data;
        const amp = 120 * nivel;
        const yBarra = barra * bh;
        for (let y = 0; y < bh; y++) {
          // franja que baja (más clara) y líneas de barrido
          const enBarra = Math.abs(y - yBarra) < bh * 0.06 ? 0.45 : 1;
          const linea = y % 2 ? 0.92 : 1;
          for (let x = 0; x < bw; x++) {
            const r = Math.random();
            const v = 255 - r * r * amp * enBarra * linea;
            const k = (y * bw + x) * 4;
            d[k] = d[k + 1] = d[k + 2] = v;
            d[k + 3] = 255;
          }
        }
        bctx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(buf, 0, 0, W, H);

        // 2) líneas entrecortadas
        const lineas = Math.round(4 + nivel * 10);
        for (let i = 0; i < lineas; i++) {
          const y = Math.random() * H;
          let x = -Math.random() * 60;
          ctx.fillStyle = `rgba(30,30,36,${0.12 + nivel * 0.35})`;
          const alto = 1 + Math.random() * 2.5;
          while (x < W) {
            const largo = 20 + Math.random() * 140;
            if (Math.random() < 0.7) ctx.fillRect(x, y, largo, alto);
            x += largo + 6 + Math.random() * 40;
          }
        }

        // 3) interferencia: franjas corridas y separación de color
        if (distorsion > 0.02) {
          const n = Math.round(4 + distorsion * 14);
          for (let i = 0; i < n; i++) {
            const y = Math.random() * H, h = 4 + Math.random() * 40 * distorsion, dx = (Math.random() - 0.5) * 140 * distorsion;
            ctx.drawImage(lienzo, 0, y * (lienzo.height / H), lienzo.width, h * (lienzo.height / H), dx, y, W, h);
          }
          ctx.globalCompositeOperation = "multiply";
          for (let i = 0; i < n / 2; i++) {
            ctx.fillStyle = Math.random() < 0.5 ? `rgba(255,60,90,${0.35 * distorsion})` : `rgba(40,200,255,${0.35 * distorsion})`;
            ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 10);
          }
          ctx.globalCompositeOperation = "source-over";
        }
      }
    }

    // 4) serpentinas
    if (lluvia > 0) {
      lluvia -= dt;
      const nuevas = Math.round(dt * 26);
      for (let i = 0; i < nuevas; i++) cintas.push(nuevaCinta(true));
    }
    if (cintas.length) {
      ctx.lineCap = "round";
      for (const c of cintas) {
        c.y += c.vy * dt; c.x += c.vx * dt; c.fase += c.giro * dt;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = c.ancho;
        ctx.beginPath();
        for (let s = 0; s <= 10; s++) {
          const t = s / 10;
          const yy = c.y - t * c.largo;
          const xx = c.x + Math.sin(c.fase + t * 5) * c.amp;
          s ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
      cintas = cintas.filter((c) => c.y - c.largo < H + 20);
    }
  }

  function fijar() { objetivo = Math.pow(1 - progreso, 1.4); }

  function montar() {
    document.body.prepend(lienzo);
    ajustar();
    requestAnimationFrame(paso);
  }
  if (document.body) montar(); else addEventListener("DOMContentLoaded", montar);

  window.Estatica = {
    // curva marcada: cada acierto se nota
    nitidez(v) { progreso = Math.max(progreso, Math.min(1, v)); fijar(); claridad = 0.6; },
    // cada acierto deja el fondo un poco menos distorsionado (y no vuelve atrás)
    mejorar(d = 0.035) { progreso = Math.min(1, progreso + d); fijar(); claridad = Math.max(claridad, 0.3); },
    // delegar a la IA lo empeora un poco
    empeorar(d = 0.08) { progreso = Math.max(0, progreso - d); fijar(); },
    destello() { this.mejorar(); },
    distorsionar(f = 1) { distorsion = Math.min(1.4, distorsion + f); },
    serpentinas(seg = 6) { lluvia = seg; for (let i = 0; i < 40; i++) cintas.push(nuevaCinta(false)); },
    reiniciar() { progreso = 0; objetivo = 1; ruido = 1; distorsion = 0; claridad = 0; cintas = []; lluvia = 0; },
  };
})();

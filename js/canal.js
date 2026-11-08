// ============================================================
//  CANAL: conecta el celular con el espejo.
//  - Con Firebase: cada sesión es una carpeta "sesiones/<id>/eventos"
//    en la Realtime Database. El celular escribe, el espejo escucha.
//  - Sin Firebase (modo prueba): usa BroadcastChannel, que conecta
//    dos pestañas del mismo navegador.
// ============================================================
(function () {
  const cfg = window.CONFIG || {};
  const VERSION_FIREBASE = "10.12.2";
  let firebaseListo = null;

  function cargarScript(src) {
    return new Promise((ok, error) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = ok;
      s.onerror = () => error(new Error("No se pudo cargar " + src));
      document.head.appendChild(s);
    });
  }

  function iniciarFirebase() {
    if (!cfg.firebase) return Promise.resolve(null);
    if (!firebaseListo) {
      firebaseListo = (async () => {
        const base = "https://www.gstatic.com/firebasejs/" + VERSION_FIREBASE;
        await cargarScript(base + "/firebase-app-compat.js");
        await cargarScript(base + "/firebase-database-compat.js");
        firebase.initializeApp(cfg.firebase);
        return firebase.database();
      })();
    }
    return firebaseListo;
  }

  // Tamaño de la foto y posición del óvalo guía (en proporción de la foto).
  // El celular dibuja el óvalo en este lugar, y el espejo lo usa como
  // respaldo si no logra detectar el rostro.
  window.FOTO = { ancho: 720, alto: 960, ovalo: { x: 0.19, y: 0.14, w: 0.62, h: 0.68 } };

  window.Canal = {
    usaFirebase: !!cfg.firebase,

    nuevaSesion() {
      return Math.random().toString(36).slice(2, 8).toUpperCase();
    },

    // Abre el canal de una sesión. Si se pasa "alRecibir", escucha los mensajes.
    async abrir(sesion, alRecibir) {
      let db = null;
      try {
        db = await iniciarFirebase();
      } catch (e) {
        console.warn("Firebase no disponible; se usa el modo prueba.", e);
      }

      if (db) {
        const ref = db.ref("sesiones/" + sesion + "/eventos");
        let oyente = null;
        if (alRecibir) oyente = ref.on("child_added", (snap) => alRecibir(snap.val()));
        return {
          modo: "firebase",
          enviar: (msg) => ref.push(Object.assign({}, msg, { t: Date.now() })),
          cerrar: () => { if (oyente) ref.off("child_added", oyente); },
        };
      }

      const bc = new BroadcastChannel("espejo-" + sesion);
      if (alRecibir) bc.onmessage = (e) => alRecibir(e.data);
      return {
        modo: "local",
        enviar: (msg) => bc.postMessage(Object.assign({}, msg, { t: Date.now() })),
        cerrar: () => bc.close(),
      };
    },
  };
})();

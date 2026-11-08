// ============================================================
//  CONFIGURACIÓN DEL PROYECTO "El espejo que se desgasta"
// ============================================================
//
//  1) FIREBASE (para conectar el celular real con el computador)
//     - Entra a https://console.firebase.google.com y crea un proyecto.
//     - Crea una "Realtime Database" (modo de prueba).
//     - En Configuración del proyecto → Tus apps → Web (</>), copia el
//       objeto firebaseConfig y pégalo abajo en lugar de null.
//
//     Mientras esté en null, el proyecto funciona en "modo prueba":
//     el espejo y el celular se conectan entre dos pestañas del mismo
//     navegador (sirve para probar sin internet ni cuentas).
//
//  2) URL BASE (opcional)
//     Dirección pública donde publicaste las páginas, por ejemplo
//     "https://tu-usuario.github.io/espejo-que-se-desgasta/".
//     Si se deja vacía, se usa la misma carpeta donde está espejo.html.
// ============================================================

window.CONFIG = {
  firebase: {
    apiKey: "AIzaSyDqDGuzDtk3387GDToGrhyNxGaURcfSCvY",
    authDomain: "espejo-desgasta.firebaseapp.com",
    databaseURL: "https://espejo-desgasta-default-rtdb.firebaseio.com",
    projectId: "espejo-desgasta",
    storageBucket: "espejo-desgasta.firebasestorage.app",
    messagingSenderId: "530260416183",
    appId: "1:530260416183:web:4df02bfdb5d0912c885f32"
  },
  /* Ejemplo:
  firebase: {
    apiKey: "...",
    authDomain: "tu-proyecto.firebaseapp.com",
    databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "...",
    appId: "..."
  },
  */
  urlBase: ""
};

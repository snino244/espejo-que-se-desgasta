# El espejo que se desgasta

Instalación interactiva con dos interfaces:

- **`celular.html`** (celular): la persona se toma una foto del rostro (con cuenta regresiva y óvalo guía) y luego juega 5 expedientes de accidentes tecnológicos reales como investigador/a, o deja que "la IA" los resuelva.
- **`espejo.html`** (computador): recibe la foto y la muestra como el reflejo de la persona. Detecta el rostro **una sola vez** sobre la foto, y cada vez que la persona delega un expediente, su reflejo pierde un rasgo (cejas → ojos → nariz → boca → todo el rostro) y la batería de identidad baja. El computador **no usa la cámara**.

## Cómo funciona

1. El computador muestra un QR. La persona lo escanea con su celular.
2. El celular muestra su cámara frontal con un óvalo: "ubica tu rostro aquí". Cuenta 3, 2, 1 y toma la foto. Si no hay permiso de cámara, puede elegir una foto de su galería.
3. La foto viaja al computador, que la muestra en grande y detecta los rasgos (ml5 FaceMesh). Si no logra detectarlos, usa la posición del óvalo guía.
4. Empiezan los expedientes. Cada delegación borra un rasgo de la foto.

## Archivos

| Archivo | Qué hace |
|---|---|
| `espejo.html`, `js/espejo.js`, `css/espejo.css` | Espejo: QR, foto, detección del rostro, borrado de rasgos, batería y finales |
| `celular.html` | Página del celular |
| `js/celular.js` | Flujo: inicio → alerta → juego → resultado → final, textos de los expedientes |
| `js/juegos.js` | Los 5 minijuegos |
| `js/canal.js` | Conexión entre el celular y el espejo (Firebase o modo prueba) |
| `css/celular.css` | Diseño del celular |
| `config.js` | **Aquí se pega la configuración de Firebase** |

## 1. Probarlo en tu computador (sin Firebase)

Abre las páginas desde `localhost`, no con doble clic. Así funcionan la cámara de la pestaña del celular y la conexión entre pestañas. En una terminal, dentro de esta carpeta:

```bash
python -m http.server 8000
```

1. Abre `http://localhost:8000/espejo.html`.
2. En el panel del QR, haz clic en **"abre el celular en otra pestaña"**.
3. En esa pestaña, tómate la foto con la cámara del computador (o elige una imagen) y juega. Puedes achicar la ventana para que parezca un celular. El espejo reacciona en la otra pestaña.

**Teclas de prueba en el espejo:** `C` conectar · `P` lo hizo sola · `D` delegar · `F` final · `R` reiniciar · `H` ocultar la ayuda.
**En el expediente 1 desde el computador:** usa las flechas ← → del teclado o la barra.

## 2. Conectar un celular real (con Firebase)

1. Entra a <https://console.firebase.google.com> y crea un proyecto (es gratis).
2. Menú **Compilación → Realtime Database → Crear base de datos** y elige **modo de prueba**.
3. **Configuración del proyecto → Tus apps → Web (`</>`)**: registra una app y copia el objeto `firebaseConfig`.
4. Pégalo en `config.js`, en lugar de `firebase: null`. Debe incluir `databaseURL`.

Reglas sugeridas para la base de datos (pestaña **Reglas**), que solo permiten escribir eventos de sesiones:

```json
{
  "rules": {
    "sesiones": {
      "$sesion": {
        ".read": true,
        "eventos": { ".write": true }
      }
    }
  }
}
```

## 3. Publicarlo en internet (GitHub Pages)

1. Crea un repositorio en GitHub y sube **el contenido de esta carpeta**.
2. **Settings → Pages → Branch: main / root → Save**.
3. Tu espejo quedará en `https://TU-USUARIO.github.io/NOMBRE-REPO/espejo.html`.
4. Ábrelo en el computador y escanea el QR con el celular.

## Notas

- **La cámara del celular solo funciona con `https`** (por ejemplo, GitHub Pages). Si el celular abre la página por `http`, puede usar la opción "elige una foto de tu galería".
- **Expediente 1:** se juega inclinando el celular o moviendo la barra, siempre hacia donde indique la flecha. En iPhone, el navegador pide permiso al tocar "Abrir expediente 1".
- **Dificultad:** sube del expediente 1 al 4. Medida con jugadores simulados, un jugador "normal" gana aproximadamente: avión 100 %, aterrizaje 89 %, carretera 68 %. El Therac-25 depende de leer con atención, así que no se simuló.
- **Expediente 3:** cada partida arma 6 casos nuevos al azar (nombres, dosis y tipo de error), en orden aleatorio. Hay 10 segundos por paciente y se necesitan 5 de 6.
- **Expediente 4:** hay que frenar a tiempo 6 veces. Lo que aparece en la orilla (árboles, letreros) no requiere frenar. Frenar sin motivo bloquea el freno un momento, y al tercer frenazo innecesario se pierde.
- **Las respuestas de la "IA"** están programadas dentro del código; no se usa una IA real.
- **El espejo necesita internet** para cargar ml5 y el modelo de detección de rostro.
- **Para la mejor foto:** buena luz de frente, sin gafas oscuras y la cara dentro del óvalo.

## Evidencias sugeridas por módulo

- **M1 Espejo:** capturas con 0, 1, 2, 3, 4 y 5 delegaciones (usa la tecla `D`) y un video corto.
- **M2 Sesión y QR:** captura con el QR y captura después de conectar.
- **M3 Celular:** capturas del inicio, una alerta, un resultado y el final.
- **M4 Conexión:** captura de la Realtime Database con los eventos y un video con los dos dispositivos.
- **M5 Expedientes:** captura de cada juego y un video jugando uno.
- **M6 Cierre:** captura de los finales del espejo (0, 1–2, 3–4 y 5 delegaciones).

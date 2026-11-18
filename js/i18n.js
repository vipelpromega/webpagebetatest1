// Idioma (es / en). El texto de la página está en español; si el idioma es inglés,
// se traduce por diccionario (también el contenido que se crea después).
(function () {
  var KEY = "idioma";
  var root = document.documentElement;

  function leer() {
    try { var v = localStorage.getItem(KEY); if (v === "es" || v === "en") return v; } catch (e) { /* nada */ }
    return "es";
  }
  var lang = leer();
  root.setAttribute("lang", lang);

  var EN = {
    // Barra y páginas
    "Expandir": "Expand", "Contraer": "Collapse", "Expandir barra": "Expand sidebar", "Contraer barra": "Collapse sidebar",
    "Principal": "Home", "Casa": "Home", "Temporizador": "Timer", "Configuración": "Settings", "Navegación principal": "Main navigation",
    "Usa la barra de la izquierda para moverte entre páginas": "Use the sidebar on the left to move between pages",
    "Esta es la página principal. Pronto agregaremos más funciones.": "This is the main page. More features are coming soon.",
    "invitado": "guest", "Personaliza la página": "Customize the page", "Cuenta regresiva simple": "Simple countdown",
    // Principal
    "Hora": "Time", "Clima": "Weather", "Hora y fecha de tu dispositivo": "Your device's time and date",
    "Usar mi ubicación": "Use my location", "Buscar": "Search", "Ciudad": "City", "Busca una ciudad": "Search for a city",
    "Tu ubicación": "Your location", "Cargando el clima…": "Loading weather…", "Sensación": "Feels like", "Humedad": "Humidity",
    "Viento": "Wind", "Elige una ubicación para ver el clima.": "Choose a location to see the weather.",
    "No se encontró esa ciudad.": "City not found.", "No se pudo obtener el clima.": "Couldn't get the weather.",
    "No se pudo obtener tu ubicación.": "Couldn't get your location.", "Escribe una ciudad.": "Enter a city.",
    "Despejado": "Clear", "Mayormente despejado": "Mostly clear", "Parcialmente nublado": "Partly cloudy", "Nublado": "Overcast",
    "Niebla": "Fog", "Llovizna": "Drizzle", "Lluvia": "Rain", "Lluvia fuerte": "Heavy rain", "Nieve": "Snow", "Aguanieve": "Sleet",
    "Chubascos": "Showers", "Tormenta": "Thunderstorm", "Tormenta con granizo": "Thunderstorm with hail", "Lluvia helada": "Freezing rain",
    "Datos del clima: Open-Meteo": "Weather data: Open-Meteo",
    // Acceso
    "Acceso": "Access", "Crea tu cuenta": "Create your account", "Crear cuenta": "Create account", "Iniciar sesión": "Sign in",
    "Registrarse": "Sign up", "Registrarse o iniciar sesión": "Sign up or sign in", "Ya tengo cuenta": "I already have an account",
    "Entrar como invitado": "Continue as guest", "Elegir imagen": "Choose image", "Quitar": "Remove", "Cancelar": "Cancel",
    "Para poder registrarse se necesita un código proveniente de un administrador:": "To sign up you need a code from an administrator:",
    "Nombre de usuario:": "Username:", "Nombre de visualización:": "Display name:", "Contraseña:": "Password:",
    "Foto de perfil (opcional):": "Profile photo (optional):", "Foto de perfil": "Profile photo",
    "Puede cambiarlo más adelante": "You can change it later", "Puede cambiarlo cuando quiera": "You can change it whenever you want",
    "De 3 a 20 caracteres: letras, números, punto, guion o guion bajo.": "3 to 20 characters: letters, numbers, dot, hyphen or underscore.",
    "Si no eliges una, se usa la primera letra de tu nombre de usuario. Puedes cambiarla después.": "If you don't choose one, the first letter of your username is used. You can change it later.",
    "Si no eliges una, se usa la primera letra de tu usuario": "If you don't choose one, the first letter of your username is used",
    "Mínimo 8 caracteres.": "At least 8 characters.", "Solo para usuarios registrados": "Registered users only",
    "Como invitado no puedes usar esta sección. Regístrate con un código de administrador o inicia sesión.": "As a guest you can't use this section. Sign up with an administrator code or sign in.",
    "Ajusta tu foto": "Adjust your photo", "Recortar foto de perfil": "Crop profile photo", "Usar esta foto": "Use this photo", "Acercar": "Zoom",
    "Arrastra para moverla y usa el control para acercarla.": "Drag to move it and use the slider to zoom.",
    "Foto: arrastra para moverla; usa el control para acercar": "Photo: drag to move it; use the slider to zoom",
    "código": "code", "contraseña": "password", "texto": "text",
    // Errores
    "Código no válido.": "Invalid code.", "Escribe el código.": "Enter the code.", "Escribe tu contraseña actual.": "Enter your current password.",
    "Escribe tu usuario y tu contraseña.": "Enter your username and password.", "Ese nombre de usuario ya está en uso.": "That username is already taken.",
    "Elige una imagen PNG, JPG o WebP.": "Choose a PNG, JPG or WebP image.", "La imagen no es válida o es demasiado grande.": "The image is invalid or too large.",
    "El nombre de usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo.": "The username must be 3 to 20 characters: letters, numbers, dot, hyphen or underscore.",
    "El nombre de visualización debe tener entre 1 y 30 caracteres.": "The display name must be 1 to 30 characters.",
    "La contraseña debe tener entre 8 y 72 caracteres.": "The password must be 8 to 72 characters.",
    "La contraseña actual no es correcta.": "The current password is incorrect.", "Usuario o contraseña incorrectos.": "Wrong username or password.",
    "Tu sesión expiró. Vuelve a iniciar sesión.": "Your session expired. Please sign in again.",
    "Tu sesión se cerró (la cuenta ya no existe o expiró).": "Your session was closed (the account no longer exists or it expired).",
    "No tienes permiso para hacer esto.": "You don't have permission to do this.", "Ocurrió un error. Inténtalo de nuevo.": "Something went wrong. Please try again.",
    "No se pudo conectar con el servidor. Revisa tu conexión.": "Couldn't reach the server. Check your connection.",
    "El servidor no está listo: falta ejecutar el script supabase/schema.sql.": "The server isn't ready: supabase/schema.sql hasn't been run.",
    "La página aún no está conectada al servidor.": "The page isn't connected to the server yet.",
    "La clave pública del servidor no es válida.": "The server's public key isn't valid.",
    "No se pudo guardar la sesión en este navegador.": "Couldn't save the session in this browser.",
    "La cuenta se creó, pero no se pudo guardar la sesión en este navegador. Inicia sesión.": "The account was created, but the session couldn't be saved in this browser. Please sign in.",
    "Las contraseñas nuevas no coinciden.": "The new passwords don't match.", "La contraseña nueva debe ser distinta de la actual.": "The new password must be different from the current one.",
    // Temporizador
    "Iniciar": "Start", "Pausar": "Pause", "Reiniciar": "Reset", "Continuar": "Resume", "En marcha…": "Running…", "En pausa": "Paused",
    "Ingresa un tiempo mayor a cero.": "Enter a time greater than zero.", "¡Tiempo terminado!": "Time's up!",
    // Configuración
    "Apariencia": "Appearance", "Cuenta": "Account", "Secciones de configuración": "Settings sections", "Personalización": "Personalization",
    "Elige tu modo": "Choose your mode", "Se guarda en este navegador": "Saved in this browser", "Oscuro": "Dark", "Claro": "Light", "Tema": "Theme",
    "Color de acento": "Accent color", "Elige un color sólido o un degradado": "Choose a solid color or a gradient",
    "Recomendados": "Recommended", "Sólido": "Solid", "Degradado": "Gradient", "Personalizado": "Custom", "Color": "Color", "Primer color": "First color",
    "Segundo color": "Second color", "Dirección": "Direction", "Restablecer": "Reset", "Predeterminado": "Default",
    "Azul": "Blue", "Violeta": "Violet", "Rosa": "Pink", "Rojo": "Red", "Naranja": "Orange", "Verde": "Green", "Turquesa": "Teal", "Dorado": "Gold",
    "Océano": "Ocean", "Atardecer": "Sunset", "Aurora": "Aurora", "Neón": "Neon", "Fuego": "Fire", "Bosque": "Forest", "Caramelo": "Candy",
    "Idioma": "Language", "Elige el idioma de la página": "Choose the page language", "Español": "Español", "English": "English",
    "Sesión": "Session", "Cambiar": "Change", "Guardar": "Save", "Nombre actualizado.": "Name updated.", "Foto actualizada.": "Photo updated.",
    "Se usará la letra de tu usuario.": "Your username's letter will be used.",
    "Contraseña": "Password", "Cámbiala cuando quieras; se cerrarán tus otras sesiones": "Change it whenever you want; your other sessions will be closed",
    "Cambiar contraseña": "Change password", "Contraseña actual:": "Current password:", "Contraseña nueva:": "New password:",
    "Repite la contraseña nueva:": "Repeat the new password:", "Guardar contraseña": "Save password",
    "Contraseña actualizada. Se cerraron tus otras sesiones.": "Password updated. Your other sessions were closed.",
    "Mostrar contraseña": "Show password", "Ocultar contraseña": "Hide password", "Mostrar código": "Show code", "Ocultar código": "Hide code",
    "Cerrar sesión": "Sign out", "Volverás a la pantalla de acceso": "You'll return to the sign-in screen",
    "Estás como invitado": "You're a guest", "Algunas secciones están limitadas": "Some sections are limited",
    "Sesiones activas": "Active sessions", "Dispositivos con la sesión de tu cuenta abierta": "Devices where your account is signed in",
    "Este dispositivo": "This device", "Cerrar las demás": "Sign out of all others", "Cerrar": "Close", "Actualizar": "Refresh",
    "No hay otras sesiones activas.": "There are no other active sessions.", "Cargando…": "Loading…",
    "No se pudieron cargar las sesiones.": "Couldn't load the sessions.", "Sesión cerrada.": "Session closed.",
    "Se cerraron las demás sesiones.": "Other sessions were closed.", "Navegador desconocido": "Unknown browser", "Sistema desconocido": "Unknown system",
    "ahora": "just now", "Iniciada": "Started", "Última actividad": "Last activity", "Cuenta (menú)": "Account (menu)",
    "Cambiar foto de perfil": "Change profile photo", "Más secciones": "More sections"
  };

  var PATRONES = [
    [/^Demasiados intentos\. Espera (\d+) s\.$/, "Too many attempts. Wait $1 s."],
    [/^Sesión iniciada como @(.+)\.$/, "Signed in as @$1."],
    [/^Nombre de identificación: (.*)$/, "Identification name: $1"],
    [/^(.*) \(requiere cuenta\)$/, function (m) { return tr(m[1]) + " (account required)"; }],
    [/^(.*) · cuenta$/, "$1 · account"],
    [/^Mostrar (.+)$/, function (m) { return "Show " + tr(m[1]); }],
    [/^Ocultar (.+)$/, function (m) { return "Hide " + tr(m[1]); }],
    [/^Bienvenido, (.*)$/, "Welcome, $1"],
    [/^hace (\d+) min$/, "$1 min ago"], [/^hace (\d+) h$/, "$1 h ago"], [/^hace (\d+) d$/, "$1 d ago"]
  ];

  function tr(t) {
    if (lang !== "en" || !t) return t;
    var corto = t.trim();
    if (!corto) return t;
    var pre = t.slice(0, t.indexOf(corto)), post = t.slice(pre.length + corto.length);
    var r = EN[corto];
    if (r === undefined) {
      for (var i = 0; i < PATRONES.length; i++) {
        var m = PATRONES[i][0].exec(corto);
        if (m) { r = typeof PATRONES[i][1] === "function" ? PATRONES[i][1](m) : corto.replace(PATRONES[i][0], PATRONES[i][1]); break; }
      }
    }
    return r === undefined ? t : pre + r + post;
  }

  var ATTRS = ["aria-label", "data-tooltip", "placeholder", "title", "alt"];
  var previo = new WeakMap();

  function nodoTexto(n) {
    var v = n.nodeValue;
    if (previo.get(n) === v) return;
    var t = tr(v);
    if (t !== v) { n.nodeValue = t; }
    previo.set(n, n.nodeValue);
  }
  function elemento(el) {
    if (el.nodeType === 3) { nodoTexto(el); return; }
    if (el.nodeType !== 1) return;
    var tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE") return;
    ATTRS.forEach(function (a) {
      if (el.hasAttribute && el.hasAttribute(a)) {
        var v = el.getAttribute(a), t = tr(v);
        if (t !== v) el.setAttribute(a, t);
      }
    });
    for (var c = el.firstChild; c; c = c.nextSibling) elemento(c);
  }

  function traducirTodo() {
    if (lang !== "en") return;
    var t = tr(document.title);
    if (t !== document.title) document.title = t;
    if (document.body) elemento(document.body);
  }

  function iniciar() {
    if (lang === "en") {
      traducirTodo();
      new MutationObserver(function (lista) {
        lista.forEach(function (m) {
          if (m.type === "characterData") nodoTexto(m.target);
          else if (m.type === "attributes") { var v = m.target.getAttribute(m.attributeName), t = tr(v); if (t !== v) m.target.setAttribute(m.attributeName, t); }
          else m.addedNodes.forEach(elemento);
        });
      }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }
    root.classList.remove("i18n-pend");
  }

  if (lang === "en") root.classList.add("i18n-pend");
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();

  function poner(nuevo) {
    if (nuevo !== "es" && nuevo !== "en") return;
    try { localStorage.setItem(KEY, nuevo); } catch (e) { /* nada */ }
    location.reload();
  }
  window.I18n = { lang: lang, get: function () { return lang; }, set: poner, t: tr, locale: function () { return lang === "en" ? "en-US" : "es-ES"; } };
})();

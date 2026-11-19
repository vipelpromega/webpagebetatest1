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
    "Contraseñas": "Passwords", "Genera contraseñas seguras y mide la fuerza de las tuyas": "Generate strong passwords and check how strong yours are",
    "Generador": "Generator", "Copiar": "Copy", "¡Copiada!": "Copied!", "Generar otra": "Generate another", "Longitud:": "Length:",
    "Mayúsculas (A-Z)": "Uppercase (A-Z)", "Minúsculas (a-z)": "Lowercase (a-z)", "Números (0-9)": "Numbers (0-9)", "Símbolos (!@#$…)": "Symbols (!@#$…)",
    "Evitar caracteres ambiguos (I l 1 O 0 o)": "Avoid ambiguous characters (I l 1 O 0 o)",
    "Elige al menos un tipo de carácter.": "Choose at least one character type.",
    "No se pudo copiar. Selecciónala y cópiala a mano.": "Couldn't copy. Select it and copy it by hand.",
    "Se genera en tu dispositivo con el generador aleatorio del navegador. Nada se envía ni se guarda.": "It's generated on your device with the browser's random generator. Nothing is sent or saved.",
    "Medidor de seguridad": "Strength meter", "Escribe una contraseña para medirla": "Type a password to measure it", "Contraseña a medir": "Password to measure",
    "La contraseña que escribes aquí no sale de esta página.": "The password you type here never leaves this page.",
    "Muy débil": "Very weak", "Débil": "Weak", "Media": "Fair", "Fuerte": "Strong", "Muy fuerte": "Very strong", "Fuerza de la contraseña": "Password strength",
    "Repite muchos caracteres.": "It repeats many characters.", "Contiene una secuencia fácil (como abcd o 1234).": "It contains an easy sequence (like abcd or 1234).",
    "Contiene una contraseña muy común.": "It contains a very common password.", "Solo tiene números.": "It only has numbers.", "Solo tiene letras.": "It only has letters.",
    "Usa 12 caracteres o más.": "Use 12 characters or more.", "Mezcla mayúsculas, minúsculas, números y símbolos.": "Mix uppercase, lowercase, numbers and symbols.",
    "Fondo de la página": "Page background", "Degradados, patrones o una imagen tuya": "Gradients, patterns or an image of your own",
    "Restablecer a normal": "Reset to normal", "Elegir imagen…": "Choose image…", "Fondos": "Backgrounds",
    "La imagen se guarda solo en este dispositivo; el resto de fondos viaja con tu cuenta.": "The image is saved only on this device; the other backgrounds travel with your account.",
    "Normal": "Normal", "Atardecer": "Sunset", "Cuadrícula": "Grid", "Líneas": "Lines", "Puntos": "Dots", "Noche": "Night", "Mi imagen": "My image",
    "La imagen es demasiado grande.": "The image is too large.", "La imagen es demasiado grande para guardarla en este navegador.": "The image is too large to save in this browser.",
    "Preferencias de la cuenta": "Account preferences", "Sincronizar ahora": "Sync now", "Sincronizando…": "Syncing…",
    "Inicia sesión para que tus preferencias viajen contigo": "Sign in so your preferences travel with you",
    "Tu tema, color de acento, idioma y fondo se guardan en tu cuenta y se aplican en tus otros dispositivos": "Your theme, accent color, language and background are saved to your account and applied on your other devices",
    "No se pudieron sincronizar. Se reintentará al cambiar algo": "Couldn't sync. It will retry when you change something",
    "Sistema": "System", "\"Sistema\" sigue el modo de tu dispositivo. Se guarda en este navegador": "\"System\" follows your device's mode. Saved in this browser",
    "Historial de inicios de sesión": "Sign-in history", "Tus últimos accesos e intentos fallidos": "Your latest sign-ins and failed attempts",
    "Inicio de sesión": "Sign-in", "Cuenta creada": "Account created", "Intento fallido": "Failed attempt",
    "Intento con cuenta suspendida": "Attempt with suspended account", "No se pudo cargar el historial.": "Couldn't load the history.",
    "Tu cuenta está suspendida. Contacta a un administrador.": "Your account is suspended. Contact an administrator.",
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
    var ir = function () { location.reload(); };
    var g = window.Preferencias && window.Preferencias.guardarYa ? window.Preferencias.guardarYa() : null;
    if (g) Promise.race([g, new Promise(function (r) { setTimeout(r, 1500); })]).then(ir, ir); else ir();
  }
  window.I18n = { lang: lang, get: function () { return lang; }, set: poner, t: tr, locale: function () { return lang === "en" ? "en-US" : "es-ES"; } };
})();

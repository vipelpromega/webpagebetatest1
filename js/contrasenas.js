// Generador de contraseñas y medidor de seguridad. Todo ocurre en el navegador.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var CLASES = {
    may: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", min: "abcdefghijklmnopqrstuvwxyz",
    num: "0123456789", sim: "!@#$%^&*()-_=+[]{};:,.?/~"
  };
  var AMBIGUOS = /[Il1O0o]/g;

  // Entero uniforme en [0, n) sin sesgo
  function aleatorio(n) {
    var lim = Math.floor(4294967296 / n) * n, b = new Uint32Array(1);
    do { crypto.getRandomValues(b); } while (b[0] >= lim);
    return b[0] % n;
  }

  function generar(largo, activas, sinAmbiguos) {
    var grupos = activas.map(function (k) {
      var g = CLASES[k]; return sinAmbiguos ? g.replace(AMBIGUOS, "") : g;
    });
    if (!grupos.length || largo < grupos.length) return null;
    var todos = grupos.join("");
    var r = grupos.map(function (g) { return g.charAt(aleatorio(g.length)); }); // al menos uno de cada tipo
    while (r.length < largo) r.push(todos.charAt(aleatorio(todos.length)));
    for (var i = r.length - 1; i > 0; i--) { var j = aleatorio(i + 1), t = r[i]; r[i] = r[j]; r[j] = t; }
    return r.join("");
  }

  /* ---------- Medidor ---------- */
  var COMUNES = ["password", "contraseña", "contrasena", "123456", "12345678", "123456789", "qwerty", "qwertyuiop", "abc123", "111111",
    "iloveyou", "admin", "welcome", "letmein", "monkey", "dragon", "football", "baseball", "master", "login", "princess", "sunshine",
    "passw0rd", "p@ssw0rd", "123123", "000000", "654321", "1q2w3e4r", "zaq12wsx", "bienvenido", "hola123", "teamo", "futbol", "123qwe"];
  var TECLADOS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "qazwsxedc", "abcdefghijklmnopqrstuvwxyz"];

  function evaluar(p) {
    if (!p) return null;
    var pool = 0;
    if (/[a-z]/.test(p)) pool += 26; if (/[A-Z]/.test(p)) pool += 26;
    if (/[0-9]/.test(p)) pool += 10; if (/[^A-Za-z0-9]/.test(p)) pool += 32;
    var bits = p.length * Math.log2(Math.max(pool, 2));
    var notas = [], minus = p.toLowerCase();
    // caracteres repetidos y secuencias
    var distintos = new Set(p.split("")).size;
    if (distintos < p.length * .6) { bits *= Math.max(.4, distintos / p.length + .2); notas.push("Repite muchos caracteres."); }
    var seq = false;
    TECLADOS.forEach(function (fila) {
      var inv = fila.split("").reverse().join("");
      for (var i = 0; i + 4 <= fila.length; i++) {
        if (minus.indexOf(fila.substr(i, 4)) >= 0 || minus.indexOf(inv.substr(i, 4)) >= 0) seq = true;
      }
    });
    if (seq) { bits -= 14; notas.push("Contiene una secuencia fácil (como abcd o 1234)."); }
    var comun = COMUNES.some(function (c) { return minus.indexOf(c) >= 0; });
    if (comun) { bits = Math.min(bits, 20); notas.push("Contiene una contraseña muy común."); }
    if (/^[0-9]+$/.test(p)) notas.push("Solo tiene números.");
    if (/^[a-zA-Z]+$/.test(p)) notas.push("Solo tiene letras.");
    if (p.length < 12) notas.push("Usa 12 caracteres o más.");
    if (pool < 62) notas.push("Mezcla mayúsculas, minúsculas, números y símbolos.");
    bits = Math.max(0, bits);
    var nivel = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
    return { bits: Math.round(bits), nivel: nivel, notas: notas.slice(0, 3), tiempo: tiempo(bits) };
  }
  // Tiempo medio de adivinación a 10 mil millones de intentos por segundo (ataque sin conexión)
  function tiempo(bits) {
    var s = Math.pow(2, bits) / 2 / 1e10;
    if (s < 1) return "al instante";
    var u = [[60, "segundos"], [60, "minutos"], [24, "horas"], [365, "días"], [100, "años"], [10, "siglos"]];
    var v = s, i = 0;
    for (; i < u.length - 1 && v >= u[i][0]; i++) v /= u[i][0];
    if (v >= 1e4 && i === u.length - 1) return "más que la edad del universo";
    if (v > 1e6) return "millones de siglos";
    return "unos " + (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + " " + u[i][1];
  }

  var NOMBRES = ["Muy débil", "Débil", "Media", "Fuerte", "Muy fuerte"];
  function pintar(caja, r) {
    caja.replaceChildren();
    if (!r) { return; }
    var barra = document.createElement("div"); barra.className = "cs-barra n" + r.nivel;
    barra.setAttribute("role", "meter"); barra.setAttribute("aria-valuemin", "0"); barra.setAttribute("aria-valuemax", "4");
    barra.setAttribute("aria-valuenow", String(r.nivel)); barra.setAttribute("aria-label", "Fuerza de la contraseña");
    for (var i = 0; i < 5; i++) { var s = document.createElement("span"); if (i <= r.nivel) s.className = "on"; barra.appendChild(s); }
    var tit = document.createElement("div"); tit.className = "cs-nivel n" + r.nivel; tit.textContent = NOMBRES[r.nivel];
    var det = document.createElement("div"); det.className = "cs-detalle";
    det.textContent = "≈ " + r.bits + " bits de entropía · Se adivinaría en " + r.tiempo;
    caja.append(barra, tit, det);
    if (r.notas.length) {
      var ul = document.createElement("ul"); ul.className = "cs-notas";
      r.notas.forEach(function (n) { var li = document.createElement("li"); li.textContent = n; ul.appendChild(li); });
      caja.appendChild(ul);
    }
  }

  /* ---------- Generador (interfaz) ---------- */
  var clave = $("cs-clave"), largo = $("cs-largo"), err = $("cs-error");
  function actual() {
    var act = ["may", "min", "num", "sim"].filter(function (k) { return $("cs-" + k).checked; });
    $("cs-largo-v").textContent = largo.value;
    var p = generar(Number(largo.value), act, $("cs-amb").checked);
    if (!p) { clave.textContent = ""; err.textContent = "Elige al menos un tipo de carácter."; pintar($("cs-medidor-gen"), null); return; }
    err.textContent = ""; clave.textContent = p; pintar($("cs-medidor-gen"), evaluar(p));
    $("cs-copiar").textContent = "Copiar";
  }
  $("cs-generar").addEventListener("click", actual);
  ["cs-largo", "cs-may", "cs-min", "cs-num", "cs-sim", "cs-amb"].forEach(function (id) { $(id).addEventListener("input", actual); });
  $("cs-copiar").addEventListener("click", function () {
    var t = clave.textContent; if (!t) return;
    var ok = function () { $("cs-copiar").textContent = "¡Copiada!"; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { err.textContent = "No se pudo copiar. Selecciónala y cópiala a mano."; });
    else err.textContent = "No se pudo copiar. Selecciónala y cópiala a mano.";
  });

  /* ---------- Medidor (interfaz) ---------- */
  var prueba = $("cs-probar");
  prueba.addEventListener("input", function () { pintar($("cs-medidor-med"), evaluar(prueba.value)); });
  $("cs-ver").addEventListener("change", function () { prueba.type = $("cs-ver").checked ? "text" : "password"; });

  actual();
  window.ContrasenasTest = { evaluar: evaluar, generar: generar };
})();

// Tema (oscuro/claro) y color de acento. Se carga en <head> para aplicarse antes de pintar.
(function () {
  var KEY = "tema";
  var KEY_ACENTO = "acento";
  var DEFAULT = "auto";
  var root = document.documentElement;

  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

  // Modo elegido: "auto" (sigue al sistema), "light" u "dark"
  function read() {
    try {
      var v = localStorage.getItem(KEY);
      return v === "light" || v === "dark" || v === "oled" || v === "auto" ? v : DEFAULT;
    } catch (e) {
      return DEFAULT;
    }
  }

  function efectivo() {
    var m = read();
    if (m === "oled") return "dark";
    return m === "auto" ? (mq && mq.matches ? "light" : "dark") : m;
  }

  function apply() {
    root.setAttribute("data-theme", efectivo());
    root.setAttribute("data-modo", read());
    if (read() === "oled") root.setAttribute("data-oled", ""); else root.removeAttribute("data-oled");
  }

  function set(theme) {
    if (theme !== "light" && theme !== "dark" && theme !== "oled" && theme !== "auto") return;
    try { localStorage.setItem(KEY, theme); } catch (e) { /* sin almacenamiento */ }
    apply();
    aplicarAcento(leerAcento());
    avisar();
  }

  function avisar() { try { window.dispatchEvent(new Event("prefs-cambio")); } catch (e) { /* nada */ } }

  if (mq && mq.addEventListener) mq.addEventListener("change", function () { apply(); aplicarAcento(leerAcento()); });

  /* ---------- Color de acento ---------- */
  var PROPS = ["--accent", "--accent-2", "--accent-3", "--on-accent", "--accent-bg", "--accent-bg-2", "--accent-bg-3",
               "--mica-1", "--mica-2", "--gate-bg"];

  function hex(c) { return /^#[0-9a-f]{6}$/i.test(c || ""); }
  function rgb(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function aHex(r) {
    return "#" + r.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }).join("");
  }
  function mezcla(c, con, t) { var a = rgb(c), b = rgb(con); return aHex([0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * t; })); }
  function lum(c) {
    var v = rgb(c).map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function contraste(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  // Ajusta el color para que se lea como texto/línea sobre el fondo del tema (mín. 3:1)
  function legible(c, oscuro) {
    var fondo = oscuro ? (root.hasAttribute("data-oled") ? "#0b0b0b" : "#2b2b2b") : "#ffffff", i = 0;
    while (contraste(c, fondo) < 3 && i++ < 20) c = mezcla(c, oscuro ? "#ffffff" : "#000000", 0.1);
    return c;
  }
  function mejorTexto(cs) {
    var minB = Math.min.apply(null, cs.map(function (c) { return contraste(c, "#000000"); }));
    var minW = Math.min.apply(null, cs.map(function (c) { return contraste(c, "#ffffff"); }));
    return minB >= minW ? "#000000" : "#ffffff";
  }
  function relleno(cs, ang, t, con) {
    var m = cs.map(function (c) { return t ? mezcla(c, con, t) : c; });
    return m.length === 1 ? m[0] : "linear-gradient(" + ang + "deg, " + m[0] + ", " + m[1] + ")";
  }

  function leerAcento() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY_ACENTO) || "null");
      if (a && hex(a.c1) && (a.tipo === "solido" || (a.tipo === "degradado" && hex(a.c2)))) {
        a.ang = [90, 135, 180, 45].indexOf(Number(a.ang)) >= 0 ? Number(a.ang) : 135;
        return a;
      }
    } catch (e) { /* nada */ }
    return null;
  }

  function aplicarAcento(a) {
    var st = root.style;
    if (!a) { PROPS.forEach(function (p) { st.removeProperty(p); }); return; }
    var oscuro = root.getAttribute("data-theme") !== "light";
    var cs = a.tipo === "degradado" ? [a.c1, a.c2] : [a.c1];
    var base = cs[0];
    var hov = oscuro ? ["#000000", 0.1] : ["#ffffff", 0.12];
    var act = oscuro ? ["#000000", 0.2] : ["#ffffff", 0.24];
    var enTexto = legible(base, oscuro);
    st.setProperty("--accent", enTexto);
    st.setProperty("--accent-2", mezcla(enTexto, hov[0], hov[1]));
    st.setProperty("--accent-3", mezcla(enTexto, act[0], act[1]));
    st.setProperty("--accent-bg", relleno(cs, a.ang, 0, "#000000"));
    st.setProperty("--accent-bg-2", relleno(cs, a.ang, hov[1], hov[0]));
    st.setProperty("--accent-bg-3", relleno(cs, a.ang, act[1], act[0]));
    st.setProperty("--on-accent", mejorTexto(cs));
    var c2 = cs[1] || mezcla(base, "#8b5cf6", 0.45);
    var rg = function (c, o) { var r = rgb(c); return "rgba(" + r[0] + "," + r[1] + "," + r[2] + "," + o + ")"; };
    st.setProperty("--mica-1", rg(base, 0.08));
    st.setProperty("--mica-2", rg(c2, 0.07));
    st.setProperty("--gate-bg", "radial-gradient(70% 90% at 15% 15%, " + rg(base, 0.5) + ", transparent 65%), radial-gradient(60% 80% at 90% 85%, " + rg(c2, 0.42) + ", transparent 65%), " + (oscuro ? (root.hasAttribute("data-oled") ? "#000000" : "#14161c") : "#e9edf5"));
  }

  function setAcento(a) {
    try {
      if (a) localStorage.setItem(KEY_ACENTO, JSON.stringify(a)); else localStorage.removeItem(KEY_ACENTO);
    } catch (e) { /* sin almacenamiento */ }
    aplicarAcento(leerAcento());
    avisar();
  }

  /* ---------- Difuminado (blur) de las tarjetas: activado por defecto ---------- */
  var KEY_BLUR = "blur";
  function leerBlur() { try { return localStorage.getItem(KEY_BLUR) !== "0"; } catch (e) { return true; } }
  function aplicarBlur() { if (leerBlur()) root.removeAttribute("data-blur"); else root.setAttribute("data-blur", "off"); }
  function setBlur(on) {
    try { localStorage.setItem(KEY_BLUR, on ? "1" : "0"); } catch (e) { /* sin almacenamiento */ }
    aplicarBlur();
    avisar();
  }

  apply();
  aplicarBlur();
  aplicarAcento(leerAcento());
  window.Theme = { get: read, set: set, getAccent: leerAcento, setAccent: setAcento, getBlur: leerBlur, setBlur: setBlur };
})();

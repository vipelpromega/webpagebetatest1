// Página Principal: reloj y clima (Open-Meteo, sin clave de API).
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var loc = function () { return window.I18n ? window.I18n.locale() : "es-ES"; };
  var idioma = function () { return window.I18n ? window.I18n.get() : "es"; };

  /* ---------- Reloj ---------- */
  var reloj = $("reloj"), fecha = $("fecha");
  var ultimaFecha = "";
  function tic() {
    var d = new Date();
    reloj.textContent = d.toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    var f = d.toLocaleDateString(loc(), { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (f !== ultimaFecha) { ultimaFecha = f; fecha.textContent = f.charAt(0).toUpperCase() + f.slice(1); }
    setTimeout(tic, 1000 - (Date.now() % 1000) + 5);
  }
  tic();

  /* ---------- Clima ---------- */
  var KEY = "clima";
  var msg = $("clima-msg"), caja = $("clima"), form = $("clima-form"), ciudad = $("clima-ciudad");
  var BASE = "https://api.open-meteo.com/v1/forecast";
  var GEO = "https://geocoding-api.open-meteo.com/v1/search";

  var SVG = {
    sol: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="8"/><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M11.3 36.7l3.5-3.5M33.2 14.8l3.5-3.5"/></svg>',
    luna: '<svg viewBox="0 0 48 48"><path d="M36 28A14 14 0 0 1 20 12a14 14 0 1 0 16 16z"/></svg>',
    parcial: '<svg viewBox="0 0 48 48"><circle cx="17" cy="16" r="6"/><path d="M17 4v3M5 16h3M8.5 7.5l2 2M25.5 7.5l-2 2"/><path d="M16 40h18a7 7 0 0 0 .7-14A10 10 0 0 0 15 28a6 6 0 0 0 1 12z"/></svg>',
    nube: '<svg viewBox="0 0 48 48"><path d="M13 38h22a8 8 0 0 0 .8-16A12 12 0 0 0 12.6 24 7 7 0 0 0 13 38z"/></svg>',
    lluvia: '<svg viewBox="0 0 48 48"><path d="M13 30h22a8 8 0 0 0 .8-16A12 12 0 0 0 12.6 16 7 7 0 0 0 13 30z"/><path d="M16 36l-2 6M24 36l-2 6M32 36l-2 6"/></svg>',
    nieve: '<svg viewBox="0 0 48 48"><path d="M13 30h22a8 8 0 0 0 .8-16A12 12 0 0 0 12.6 16 7 7 0 0 0 13 30z"/><path d="M16 37v.1M24 40v.1M32 37v.1M20 43v.1M28 43v.1"/></svg>',
    tormenta: '<svg viewBox="0 0 48 48"><path d="M13 28h22a8 8 0 0 0 .8-16A12 12 0 0 0 12.6 14 7 7 0 0 0 13 28z"/><path d="M25 28l-5 8h6l-4 8"/></svg>',
    niebla: '<svg viewBox="0 0 48 48"><path d="M8 18h32M12 25h28M8 32h32M14 39h20"/></svg>'
  };

  function condicion(c, dia) {
    if (c === 0) return [dia ? "sol" : "luna", "Despejado"];
    if (c === 1) return [dia ? "sol" : "luna", "Mayormente despejado"];
    if (c === 2) return ["parcial", "Parcialmente nublado"];
    if (c === 3) return ["nube", "Nublado"];
    if (c === 45 || c === 48) return ["niebla", "Niebla"];
    if (c === 56 || c === 57 || c === 66 || c === 67) return ["lluvia", "Lluvia helada"];
    if (c >= 51 && c <= 55) return ["lluvia", "Llovizna"];
    if (c === 65) return ["lluvia", "Lluvia fuerte"];
    if (c === 61 || c === 63) return ["lluvia", "Lluvia"];
    if (c >= 80 && c <= 82) return ["lluvia", "Chubascos"];
    if (c === 96 || c === 99) return ["tormenta", "Tormenta con granizo"];
    if (c === 95) return ["tormenta", "Tormenta"];
    if (c >= 71 && c <= 77 || c === 85 || c === 86) return ["nieve", "Nieve"];
    return ["nube", "Nublado"];
  }

  function guardado() {
    try {
      var g = JSON.parse(localStorage.getItem(KEY) || "null");
      if (g && isFinite(g.lat) && isFinite(g.lon) && Math.abs(g.lat) <= 90 && Math.abs(g.lon) <= 180) return g;
    } catch (e) { /* nada */ }
    return null;
  }
  function guardar(g) { try { localStorage.setItem(KEY, JSON.stringify(g)); } catch (e) { /* nada */ } }

  function aviso(texto) { msg.textContent = texto || ""; }

  var pedido = 0;
  function cargar(g) {
    var mio = ++pedido;
    aviso("Cargando el clima…");
    var url = BASE + "?latitude=" + encodeURIComponent(g.lat) + "&longitude=" + encodeURIComponent(g.lon) +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&timezone=auto";
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("http"); return r.json(); }).then(function (d) {
      if (mio !== pedido) return;
      var c = d && d.current;
      if (!c || typeof c.temperature_2m !== "number") throw new Error("datos");
      var k = condicion(Number(c.weather_code), c.is_day === 1);
      $("clima-icono").innerHTML = SVG[k[0]];
      $("clima-temp").textContent = Math.round(c.temperature_2m) + "°C";
      $("clima-cond").textContent = k[1];
      $("clima-lugar").textContent = g.nombre;
      $("clima-sens").textContent = Math.round(c.apparent_temperature) + "°C";
      $("clima-hum").textContent = Math.round(c.relative_humidity_2m) + " %";
      $("clima-viento").textContent = Math.round(c.wind_speed_10m) + " km/h";
      caja.hidden = false;
      aviso("");
    }).catch(function () {
      if (mio !== pedido) return;
      aviso("No se pudo obtener el clima.");
    });
  }

  function elegir(g) { guardar(g); return cargar(g); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = ciudad.value.trim();
    if (!q) { aviso("Escribe una ciudad."); return; }
    aviso("Cargando…");
    fetch(GEO + "?name=" + encodeURIComponent(q) + "&count=1&language=" + idioma() + "&format=json")
      .then(function (r) { if (!r.ok) throw new Error("http"); return r.json(); })
      .then(function (d) {
        var p = d && d.results && d.results[0];
        if (!p) { aviso("No se encontró esa ciudad."); return; }
        var nombre = p.name + (p.admin1 && p.admin1 !== p.name ? ", " + p.admin1 : "") + (p.country ? ", " + p.country : "");
        return elegir({ nombre: nombre, lat: p.latitude, lon: p.longitude });
      })
      .catch(function () { aviso("No se pudo obtener el clima."); });
  });

  $("clima-gps").addEventListener("click", function () {
    if (!navigator.geolocation) { aviso("No se pudo obtener tu ubicación."); return; }
    aviso("Cargando…");
    navigator.geolocation.getCurrentPosition(function (p) {
      elegir({ nombre: "Tu ubicación", lat: Math.round(p.coords.latitude * 1000) / 1000, lon: Math.round(p.coords.longitude * 1000) / 1000 });
    }, function () { aviso("No se pudo obtener tu ubicación."); }, { timeout: 10000, maximumAge: 600000 });
  });

  var g0 = guardado();
  if (g0) cargar(g0); else aviso("Elige una ubicación para ver el clima.");
  setInterval(function () { var g = guardado(); if (g && !document.hidden) cargar(g); }, 10 * 60 * 1000);

  /* ---------- Usuarios registrados (foto, nombre y estado) ---------- */
  (function () {
    var lista = $("usuarios-lista"), vacio = $("usuarios-vacio"), resumen = $("usuarios-resumen");
    if (!lista || !window.Auth) return;
    var t = function (x) { return window.I18n && window.I18n.t ? window.I18n.t(x) : x; };
    var filas = {}, ids = "", temporizador = null;

    function avatar(u) {
      var a = document.createElement("span"); a.className = "u-avatar"; a.setAttribute("aria-hidden", "true");
      if (typeof u.avatar === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(u.avatar)) {
        var img = document.createElement("img"); img.alt = ""; img.src = u.avatar; img.draggable = false; a.appendChild(img);
      } else {
        a.textContent = (u.nombre || "?").trim().charAt(0).toUpperCase() || "?";
        a.classList.add("inicial");
      }
      return a;
    }
    function pintarEstado(fila, estado) {
      var punto = fila.querySelector(".u-punto"), txt = fila.querySelector(".u-estado");
      var on = estado === "online";
      fila.classList.toggle("online", on);
      if (punto) punto.hidden = !on;
      if (txt) txt.textContent = on ? t("En línea") : "";
      fila.dataset.estado = estado || "";
    }
    // Los usuarios en línea van arriba; al cambiar el orden las filas se deslizan a su nuevo lugar
    var reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    function ordenar(animar) {
      var items = Array.prototype.slice.call(lista.children);
      var nuevo = items.slice().sort(function (a, b) {
        var d = (b.classList.contains("online") ? 1 : 0) - (a.classList.contains("online") ? 1 : 0);
        return d || a.dataset.nombre.localeCompare(b.dataset.nombre);
      });
      if (nuevo.every(function (x, i) { return x === items[i]; })) return;
      var antes = new Map();
      if (animar) items.forEach(function (x) { antes.set(x, x.getBoundingClientRect().top); });
      nuevo.forEach(function (x) { lista.appendChild(x); });
      if (!animar || (reducido && reducido.matches) || !items[0].animate) return;
      nuevo.forEach(function (x) {
        var dy = antes.get(x) - x.getBoundingClientRect().top;
        if (Math.abs(dy) < 1) return;
        x.animate([{ transform: "translateY(" + dy + "px)" }, { transform: "translateY(0)" }], { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" });
      });
    }
    function contar() {
      var n = Object.keys(filas).length, on = lista.querySelectorAll(".online").length;
      resumen.textContent = n + (n === 1 ? " " + t("usuario") : " " + t("usuarios")) + (lista.querySelector("[data-estado]:not([data-estado=''])") ? " · " + on + " " + t("en línea") : "");
    }
    function construir(r) {
      while (lista.firstChild) lista.removeChild(lista.firstChild);
      filas = {};
      r.usuarios.forEach(function (u) {
        var li = document.createElement("li"); li.className = "u-fila" + (u.yo ? " yo" : "");
        var caja = document.createElement("span"); caja.className = "u-foto";
        caja.appendChild(avatar(u));
        var punto = document.createElement("span"); punto.className = "u-punto"; punto.hidden = true; punto.setAttribute("role", "img"); punto.setAttribute("aria-label", t("En línea"));
        caja.appendChild(punto);
        var datos = document.createElement("span"); datos.className = "u-datos";
        var nom = document.createElement("span"); nom.className = "u-nombre";
        var nomT = document.createElement("span"); nomT.className = "u-nombre-t"; nomT.textContent = u.nombre + (u.yo ? " (" + t("tú") + ")" : "");
        nom.appendChild(nomT);
        if (u.admin && window.Auth.iconoAdmin) nom.appendChild(window.Auth.iconoAdmin());
        if (u.mejor && window.Auth.iconoMejor) nom.appendChild(window.Auth.iconoMejor());
        var sub = document.createElement("span"); sub.className = "u-estado";
        datos.appendChild(nom); datos.appendChild(sub);
        // Cada usuario es un enlace a la página de su cuenta
        var enlace = document.createElement("a"); enlace.className = "u-enlace"; enlace.href = "perfil.html?id=" + encodeURIComponent(u.id);
        enlace.setAttribute("aria-label", t("Ver perfil de") + " " + u.nombre);
        enlace.appendChild(caja); enlace.appendChild(datos);
        li.appendChild(enlace); li.dataset.nombre = (u.nombre || "").toLowerCase();
        lista.appendChild(li); filas[u.id] = li;
        pintarEstado(li, u.estado);
      });
      ids = r.usuarios.map(function (u) { return u.id; }).join(",");
      ordenar(false);
      vacio.hidden = r.usuarios.length > 0;
      if (!r.usuarios.length) vacio.textContent = r.miembro ? t("Todavía no hay usuarios registrados.") : t("Nadie ha activado ser visible para invitados.");
      contar();
    }
    function cargar() {
      return window.Auth.listaUsuarios().then(function (r) {
        if (!r.ok) { resumen.textContent = ""; vacio.hidden = false; vacio.textContent = t("No se pudo cargar la lista de usuarios."); return; }
        construir(r);
      });
    }
    function refrescar() {
      if (document.hidden) return;
      window.Auth.estadosUsuarios().then(function (r) {
        if (!r.ok) return;
        var nuevos = r.estados.map(function (x) { return x.id; }).join(",");
        // Si cambió quién aparece en la lista (altas, bajas o cambios de visibilidad), se vuelve a cargar completa
        var mismos = nuevos.split(",").sort().join(",") === ids.split(",").sort().join(",");
        if (!mismos) { cargar(); return; }
        r.estados.forEach(function (x) { if (filas[x.id]) pintarEstado(filas[x.id], x.estado); });
        ordenar(true);
        contar();
      });
    }
    document.addEventListener("DOMContentLoaded", function () {
      var st = window.Auth.estado();
      if (!st) return;
      cargar();
      temporizador = setInterval(refrescar, 2000);
      window.addEventListener("storage", function (e) { if (e.key === "vis-cambio") refrescar(); });
      document.addEventListener("visibilitychange", function () { if (!document.hidden) refrescar(); });
    });
  })();
})();

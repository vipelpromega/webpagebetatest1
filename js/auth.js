// Sistema de acceso: código de administrador -> registro, inicio de sesión e invitado.
//
// IMPORTANTE: esta página es estática (no hay servidor). Las cuentas se guardan en el
// navegador de cada persona (localStorage) y los códigos se comprueban en el propio
// navegador. Sirve para controlar el acceso de forma básica, pero NO es seguridad real:
// para eso hace falta un servidor. Ver README.md.
(function () {
  "use strict";

  var K_USUARIOS = "usuarios";
  var K_SESION = "sesion";
  var K_INVITADO = "invitado";
  var K_BLOQUEO = "bloqueoAuth";
  var MAX_INTENTOS = 5;
  var BLOQUEO_MS = 30000;
  var ITERACIONES = 100000;
  var MSG_CRYPTO = "Este navegador no permite el registro seguro. Abre la página desde https o localhost.";
  var MSG_ERROR = "Ocurrió un error. Inténtalo de nuevo.";

  var root = document.documentElement;
  var enc = new TextEncoder();

  /* ---------- Almacenamiento ---------- */
  function leer(clave, porDefecto) {
    try {
      var v = localStorage.getItem(clave);
      return v ? JSON.parse(v) : porDefecto;
    } catch (e) { return porDefecto; }
  }
  function guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); return true; }
    catch (e) { return false; }
  }
  function esInvitado() {
    try { return sessionStorage.getItem(K_INVITADO) === "1"; } catch (e) { return false; }
  }
  function usuarios() { return leer(K_USUARIOS, {}); }

  function usuarioActual() {
    var s = leer(K_SESION, null);
    if (!s || !s.usuario) return null;
    var u = usuarios()[s.usuario];
    return u ? { usuario: u.usuario, nombre: u.nombre } : null;
  }

  function estado() {
    if (usuarioActual()) return "usuario";
    if (esInvitado()) return "invitado";
    return null;
  }

  // Se aplica antes de pintar la página (este script va en <head>).
  var estadoInicial = estado();
  if (!estadoInicial) root.classList.add("gate-open");
  if (estadoInicial === "invitado") root.classList.add("guest");
  if (estadoInicial === "usuario") root.classList.add("member");

  /* ---------- Criptografía ---------- */
  function tieneCrypto() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
  }
  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }
  function aB64(buf) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
  }
  function deB64(s) {
    var bin = atob(s), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function sha256Hex(texto) {
    return crypto.subtle.digest("SHA-256", enc.encode(texto)).then(hex);
  }
  function derivar(clave, sal) {
    return crypto.subtle.importKey("raw", enc.encode(clave), "PBKDF2", false, ["deriveBits"])
      .then(function (k) {
        return crypto.subtle.deriveBits(
          { name: "PBKDF2", salt: sal, iterations: ITERACIONES, hash: "SHA-256" }, k, 256);
      })
      .then(aB64);
  }

  /* ---------- Límite de intentos ---------- */
  function segundosBloqueado() {
    var b = leer(K_BLOQUEO, { n: 0, hasta: 0 });
    var r = Math.ceil((b.hasta - Date.now()) / 1000);
    return r > 0 ? r : 0;
  }
  function registrarFallo() {
    var b = leer(K_BLOQUEO, { n: 0, hasta: 0 });
    b.n = (b.n || 0) + 1;
    if (b.n >= MAX_INTENTOS) { b.n = 0; b.hasta = Date.now() + BLOQUEO_MS; }
    guardar(K_BLOQUEO, b);
  }
  function limpiarFallos() { guardar(K_BLOQUEO, { n: 0, hasta: 0 }); }

  /* ---------- Lógica de cuentas ---------- */
  function validarCodigo(texto) {
    var norm = String(texto || "").trim().toUpperCase();
    if (!norm) return Promise.resolve(false);
    var cfg = window.AUTH_CONFIG || {};
    return sha256Hex(norm).then(function (h) {
      return (cfg.codigos || []).some(function (c) { return String(c).toLowerCase() === h; });
    });
  }

  function registrar(d) {
    var nombre = String(d.nombre || "").trim();
    var usuario = String(d.usuario || "").trim().toLowerCase();
    var clave = String(d.clave || "");

    if (nombre.length < 1 || nombre.length > 30)
      return Promise.resolve({ ok: false, error: "El nombre de visualización debe tener entre 1 y 30 caracteres." });
    if (!/^[a-z0-9._-]{3,20}$/.test(usuario))
      return Promise.resolve({ ok: false, error: "El nombre de usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo." });
    if (clave.length < 8 || clave.length > 128)
      return Promise.resolve({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." });

    var todos = usuarios();
    if (todos[usuario])
      return Promise.resolve({ ok: false, error: "Ese nombre de usuario ya está en uso." });

    var sal = crypto.getRandomValues(new Uint8Array(16));
    return derivar(clave, sal).then(function (hash) {
      todos[usuario] = { usuario: usuario, nombre: nombre, sal: aB64(sal), hash: hash };
      if (!guardar(K_USUARIOS, todos) || !guardar(K_SESION, { usuario: usuario }))
        return { ok: false, error: "No se pudo guardar la cuenta en este navegador." };
      try { sessionStorage.removeItem(K_INVITADO); } catch (e) { /* nada */ }
      return { ok: true };
    });
  }

  function iniciarSesion(usuario, clave) {
    var key = String(usuario || "").trim().toLowerCase();
    var u = usuarios()[key];
    var fallo = { ok: false, error: "Usuario o contraseña incorrectos." };
    if (!u) { registrarFallo(); return Promise.resolve(fallo); }
    return derivar(String(clave || ""), deB64(u.sal)).then(function (hash) {
      if (hash !== u.hash) { registrarFallo(); return fallo; }
      limpiarFallos();
      guardar(K_SESION, { usuario: key });
      try { sessionStorage.removeItem(K_INVITADO); } catch (e) { /* nada */ }
      return { ok: true };
    });
  }

  function cambiarNombre(nuevo) {
    var nombre = String(nuevo || "").trim();
    if (nombre.length < 1 || nombre.length > 30)
      return { ok: false, error: "El nombre debe tener entre 1 y 30 caracteres." };
    var s = leer(K_SESION, null);
    var todos = usuarios();
    if (!s || !todos[s.usuario]) return { ok: false, error: "No hay una sesión iniciada." };
    todos[s.usuario].nombre = nombre;
    if (!guardar(K_USUARIOS, todos)) return { ok: false, error: "No se pudo guardar el cambio." };
    return { ok: true, nombre: nombre };
  }

  function cerrarSesion() {
    try { localStorage.removeItem(K_SESION); } catch (e) { /* nada */ }
    try { sessionStorage.removeItem(K_INVITADO); } catch (e) { /* nada */ }
    location.reload();
  }

  window.Auth = {
    estado: estado,
    usuario: usuarioActual,
    cambiarNombre: cambiarNombre,
    cerrarSesion: cerrarSesion,
    abrirRegistro: cerrarSesion
  };

  /* ---------- Interfaz ---------- */
  var ICONO_OJO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICONO_OJO_TACHADO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.1A10.6 10.6 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9"/><path d="M6.6 6.7C3.7 8.4 2 12 2 12s3.5 6 10 6c1.6 0 3-.3 4.3-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  var ICONO_CANDADO = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  function el(tag, props) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (k === "class") n.className = v;
      else if (k.indexOf("on") === 0 && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return n;
  }

  // Casilla estilo Windows 11, con botón opcional para mostrar/ocultar el texto.
  function campo(o) {
    var id = "auth-" + o.id;
    var input = el("input", {
      id: id, class: "f-input", type: o.oculto ? "password" : "text",
      autocomplete: o.autocomplete || "off", spellcheck: "false", autocapitalize: "off"
    });
    if (o.max) input.maxLength = o.max;
    if (o.labelledby) input.setAttribute("aria-labelledby", o.labelledby);

    var caja = el("div", { class: "f-box" }, input);
    if (o.oculto) {
      var ver = el("button", {
        type: "button", class: "f-reveal", "aria-pressed": "false",
        "aria-label": "Mostrar " + (o.queOcultar || "texto")
      });
      ver.innerHTML = ICONO_OJO;
      ver.addEventListener("click", function () {
        var visible = input.type === "password";
        input.type = visible ? "text" : "password";
        ver.setAttribute("aria-pressed", String(visible));
        ver.setAttribute("aria-label", (visible ? "Ocultar " : "Mostrar ") + (o.queOcultar || "texto"));
        ver.innerHTML = visible ? ICONO_OJO_TACHADO : ICONO_OJO;
        input.focus();
      });
      caja.appendChild(ver);
    }

    var grupo = el("div", { class: "f-group" });
    if (o.etiqueta) grupo.appendChild(el("label", { class: "f-label", "for": id }, o.etiqueta));
    grupo.appendChild(caja);
    if (o.ayuda) grupo.appendChild(el("p", { class: "f-hint" }, o.ayuda));
    return { grupo: grupo, input: input };
  }

  function construirGate() {
    var vistas = {};
    var tarjeta = el("div", { class: "gate-card" });
    var gate = el("div", { class: "gate", role: "dialog", "aria-modal": "true", "aria-label": "Acceso" }, tarjeta);
    var codigoOk = false;

    function mostrar(nombre) {
      Object.keys(vistas).forEach(function (k) { vistas[k].seccion.hidden = k !== nombre; });
      var v = vistas[nombre];
      v.error.textContent = "";
      var primero = v.seccion.querySelector("input");
      if (primero) primero.focus();
    }

    function enlace(texto, alHacerClic) {
      return el("button", { type: "button", class: "gate-link", onclick: alHacerClic }, texto);
    }

    function nuevaVista(nombre, hijos) {
      var error = el("p", { class: "f-error", role: "alert" });
      var boton = el("button", { type: "submit", class: "gate-btn" });
      var form = el("form", { novalidate: "novalidate" });
      var seccion = el("section", {}, form);
      hijos(form, error, boton);
      seccion.hidden = true;
      tarjeta.appendChild(seccion);
      vistas[nombre] = { seccion: seccion, error: error, boton: boton, form: form };
      return vistas[nombre];
    }

    function conCrypto(error) {
      if (!tieneCrypto()) { error.textContent = MSG_CRYPTO; return false; }
      var espera = segundosBloqueado();
      if (espera) { error.textContent = "Demasiados intentos. Espera " + espera + " s."; return false; }
      return true;
    }

    /* Vista 1: código de administrador */
    var fCodigo = campo({
      id: "codigo", oculto: true, queOcultar: "código", labelledby: "gate-prompt", max: 64
    });
    var vCodigo = nuevaVista("codigo", function (form, error, boton) {
      boton.textContent = "Registrarse";
      form.appendChild(el("h1", { class: "gate-prompt", id: "gate-prompt" },
        "Para poder registrarse se necesita un código proveniente de un administrador:"));
      form.appendChild(fCodigo.grupo);
      form.appendChild(error);
      form.appendChild(boton);
      form.appendChild(enlace("Ya tengo cuenta", function () { mostrar("login"); }));
      form.appendChild(el("div", { class: "gate-sep" },
        enlace("Entrar como invitado", function () {
          try { sessionStorage.setItem(K_INVITADO, "1"); } catch (e) { /* nada */ }
          location.reload();
        })));
    });
    vCodigo.form.addEventListener("submit", function (e) {
      e.preventDefault();
      vCodigo.error.textContent = "";
      if (!conCrypto(vCodigo.error)) return;
      vCodigo.boton.disabled = true;
      validarCodigo(fCodigo.input.value).then(function (ok) {
        vCodigo.boton.disabled = false;
        if (ok) {
          limpiarFallos();
          codigoOk = true;
          fCodigo.input.value = "";
          mostrar("registro");
        } else {
          registrarFallo();
          vCodigo.error.textContent = "Código no válido.";
          fCodigo.input.select();
        }
      }).catch(function () {
        vCodigo.boton.disabled = false;
        vCodigo.error.textContent = MSG_ERROR;
      });
    });

    /* Vista 2: datos de la cuenta */
    var fNombre = campo({
      id: "nombre", etiqueta: "Nombre de visualización:", ayuda: "Puede cambiarlo más adelante", max: 30,
      autocomplete: "nickname"
    });
    var fUsuario = campo({
      id: "usuario", etiqueta: "Nombre de usuario:", max: 20, autocomplete: "username",
      ayuda: "De 3 a 20 caracteres: letras, números, punto, guion o guion bajo."
    });
    var fClave = campo({
      id: "clave", etiqueta: "Contraseña:", oculto: true, queOcultar: "contraseña", max: 128,
      autocomplete: "new-password", ayuda: "Mínimo 8 caracteres."
    });
    var vRegistro = nuevaVista("registro", function (form, error, boton) {
      boton.textContent = "Crear cuenta";
      form.appendChild(el("h1", { class: "gate-prompt" }, "Crea tu cuenta"));
      form.appendChild(fNombre.grupo);
      form.appendChild(fUsuario.grupo);
      form.appendChild(fClave.grupo);
      form.appendChild(error);
      form.appendChild(boton);
      form.appendChild(enlace("← Volver", function () { mostrar("codigo"); }));
    });
    vRegistro.form.addEventListener("submit", function (e) {
      e.preventDefault();
      vRegistro.error.textContent = "";
      if (!codigoOk) { mostrar("codigo"); return; }
      if (!tieneCrypto()) { vRegistro.error.textContent = MSG_CRYPTO; return; }
      vRegistro.boton.disabled = true;
      registrar({
        nombre: fNombre.input.value, usuario: fUsuario.input.value, clave: fClave.input.value
      }).then(function (r) {
        if (r.ok) { location.reload(); return; }
        vRegistro.boton.disabled = false;
        vRegistro.error.textContent = r.error;
      }).catch(function () {
        vRegistro.boton.disabled = false;
        vRegistro.error.textContent = MSG_ERROR;
      });
    });

    /* Vista 3: iniciar sesión */
    var lUsuario = campo({ id: "login-usuario", etiqueta: "Nombre de usuario:", max: 20, autocomplete: "username" });
    var lClave = campo({
      id: "login-clave", etiqueta: "Contraseña:", oculto: true, queOcultar: "contraseña", max: 128,
      autocomplete: "current-password"
    });
    var vLogin = nuevaVista("login", function (form, error, boton) {
      boton.textContent = "Iniciar sesión";
      form.appendChild(el("h1", { class: "gate-prompt" }, "Iniciar sesión"));
      form.appendChild(lUsuario.grupo);
      form.appendChild(lClave.grupo);
      form.appendChild(error);
      form.appendChild(boton);
      form.appendChild(enlace("← Volver", function () { mostrar("codigo"); }));
    });
    vLogin.form.addEventListener("submit", function (e) {
      e.preventDefault();
      vLogin.error.textContent = "";
      if (!conCrypto(vLogin.error)) return;
      vLogin.boton.disabled = true;
      iniciarSesion(lUsuario.input.value, lClave.input.value).then(function (r) {
        if (r.ok) { location.reload(); return; }
        vLogin.boton.disabled = false;
        vLogin.error.textContent = r.error;
        lClave.input.select();
      }).catch(function () {
        vLogin.boton.disabled = false;
        vLogin.error.textContent = MSG_ERROR;
      });
    });

    document.body.appendChild(gate);
    mostrar("codigo");
  }

  function aplicarRestriccionesDeInvitado() {
    // Candado en los botones de la barra que requieren cuenta
    document.querySelectorAll('.side-btn[data-acceso="miembro"]').forEach(function (a) {
      a.classList.add("locked");
      var texto = (a.getAttribute("aria-label") || "") + " (requiere cuenta)";
      a.setAttribute("aria-label", texto);
      a.setAttribute("data-tooltip", texto);
      var candado = el("span", { class: "lock", "aria-hidden": "true" });
      candado.innerHTML = ICONO_CANDADO;
      a.appendChild(candado);
    });

    // Aviso en lugar del contenido de las páginas restringidas
    if (document.body.getAttribute("data-acceso") === "miembro") {
      var pagina = document.querySelector(".page");
      var principal = pagina && pagina.querySelector("main");
      if (pagina && principal) {
        var aviso = el("div", { class: "locked-main" },
          el("section", { class: "card" },
            el("h2", {}, "🔒 Solo para usuarios registrados"),
            el("p", { class: "locked-text" },
              "Como invitado no puedes usar esta sección. Regístrate con un código de administrador o inicia sesión."),
            el("button", { type: "button", class: "btn", onclick: cerrarSesion }, "Registrarse o iniciar sesión")));
        pagina.insertBefore(aviso, principal);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var st = estado();
    var u = usuarioActual();
    document.querySelectorAll("[data-user-name]").forEach(function (n) {
      n.textContent = u ? u.nombre : "invitado";
    });
    if (!st) construirGate();
    else if (st === "invitado") aplicarRestriccionesDeInvitado();
  });
})();

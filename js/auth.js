// Sistema de acceso: código de administrador -> registro, inicio de sesión e invitado.
//
// Las cuentas, los códigos (de un solo uso) y las sesiones viven en el servidor (Supabase):
// ver supabase/schema.sql. Esta página solo muestra la interfaz y habla con las funciones
// del servidor con la clave pública. Las secciones "solo para registrados" se ocultan en la
// página, pero lo que de verdad protege los datos es el servidor.
(function () {
  "use strict";

  var K_SESION = "sesion";
  var K_INVITADO = "invitado";
  var ESPERA_MS = 15000;

  var root = document.documentElement;
  var cfg = window.SUPABASE_CONFIG || {};
  var CONFIGURADO = !!(cfg.url && cfg.clave);

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
  function quitar(clave) {
    try { localStorage.removeItem(clave); } catch (e) { /* nada */ }
  }
  function esInvitado() {
    try { return sessionStorage.getItem(K_INVITADO) === "1"; } catch (e) { return false; }
  }

  // Datos de la versión anterior (cuentas guardadas solo en el navegador): ya no se usan.
  quitar("usuarios");
  quitar("bloqueoAuth");

  // Sesión guardada: { token, expira, perfil: { usuario, nombre, rol } }
  function leerSesion() {
    var s = leer(K_SESION, null);
    if (!s) return null;
    var valida = typeof s.token === "string" && s.token &&
      s.perfil && typeof s.perfil.usuario === "string";
    var exp = Date.parse(s.expira);
    if (!valida || (!isNaN(exp) && exp <= Date.now())) {
      quitar(K_SESION);
      return null;
    }
    return s;
  }

  function usuarioActual() {
    var s = leerSesion();
    if (!s) return null;
    return { usuario: s.perfil.usuario, nombre: s.perfil.nombre, rol: s.perfil.rol };
  }

  function estado() {
    if (leerSesion()) return "usuario";
    if (esInvitado()) return "invitado";
    return null;
  }

  // Se aplica antes de pintar la página (este script va en <head>).
  var estadoInicial = estado();
  if (!estadoInicial) root.classList.add("gate-open");
  if (estadoInicial === "invitado") root.classList.add("guest");
  if (estadoInicial === "usuario") root.classList.add("member");

  /* ---------- Comunicación con el servidor ---------- */
  // Siempre devuelve un objeto { ok, ... }; nunca lanza errores.
  function rpc(nombre, args) {
    if (!CONFIGURADO) return Promise.resolve({ ok: false, error: "sin_config" });

    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var temporizador = ctl ? setTimeout(function () { ctl.abort(); }, ESPERA_MS) : null;
    var fin = function (x) { if (temporizador) clearTimeout(temporizador); return x; };

    return fetch(String(cfg.url).replace(/\/+$/, "") + "/rest/v1/rpc/" + nombre, {
      method: "POST",
      headers: { "apikey": cfg.clave, "Content-Type": "application/json" },
      body: JSON.stringify(args || {}),
      signal: ctl ? ctl.signal : undefined
    }).then(function (resp) {
      return resp.json().catch(function () { return null; }).then(function (datos) {
        if (resp.ok && datos && typeof datos === "object" && "ok" in datos) return fin(datos);
        if (resp.status === 401 || resp.status === 403) return fin({ ok: false, error: "clave" });
        if (resp.status === 404 || (datos && datos.code === "PGRST202")) return fin({ ok: false, error: "sin_script" });
        return fin({ ok: false, error: "servidor" });
      });
    }, function () {
      return fin({ ok: false, error: "red" });
    });
  }

  function mensaje(r) {
    switch (r && r.error) {
      case "codigo_invalido": return "Código no válido.";
      case "espera": return "Demasiados intentos. Espera " + (r.segundos || 30) + " s.";
      case "nombre_formato": return "El nombre de visualización debe tener entre 1 y 30 caracteres.";
      case "usuario_formato": return "El nombre de usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo.";
      case "clave_formato": return "La contraseña debe tener entre 8 y 72 caracteres.";
      case "usuario_en_uso": return "Ese nombre de usuario ya está en uso.";
      case "credenciales": return "Usuario o contraseña incorrectos.";
      case "sesion": return "Tu sesión expiró. Vuelve a iniciar sesión.";
      case "permiso": return "No tienes permiso para hacer esto.";
      case "red": return "No se pudo conectar con el servidor. Revisa tu conexión.";
      case "sin_config": return "La página aún no está conectada al servidor.";
      case "sin_script": return "El servidor no está listo: falta ejecutar el script supabase/schema.sql.";
      case "clave": return "La clave pública del servidor no es válida.";
      default: return "Ocurrió un error. Inténtalo de nuevo.";
    }
  }

  /* ---------- Validación previa (el servidor vuelve a validar todo) ---------- */
  function validarRegistro(d) {
    var nombre = String(d.nombre || "").trim();
    var usuario = String(d.usuario || "").trim().toLowerCase();
    var bytes = new TextEncoder().encode(String(d.clave || "")).length;
    if (nombre.length < 1 || nombre.length > 30) return "nombre_formato";
    if (!/^[a-z0-9._-]{3,20}$/.test(usuario)) return "usuario_formato";
    if (bytes < 8 || bytes > 72) return "clave_formato";
    return null;
  }

  /* ---------- Sesión ---------- */
  function iniciarSesionLocal(r) {
    var ok = guardar(K_SESION, { token: r.token, expira: r.expira, perfil: r.perfil });
    if (ok) {
      try { sessionStorage.removeItem(K_INVITADO); } catch (e) { /* nada */ }
    }
    return ok;
  }

  function actualizarNombres() {
    var u = usuarioActual();
    document.querySelectorAll("[data-user-name]").forEach(function (n) {
      n.textContent = u ? u.nombre : "invitado";
    });
  }

  function aplicarRol() {
    var u = usuarioActual();
    var esAdmin = !!u && u.rol === "admin";
    document.querySelectorAll("[data-solo-admin]").forEach(function (n) { n.hidden = !esAdmin; });
  }

  function cambiarNombre(nuevo) {
    var nombre = String(nuevo || "").trim();
    if (nombre.length < 1 || nombre.length > 30)
      return Promise.resolve({ ok: false, error: mensaje({ error: "nombre_formato" }) });
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: mensaje({ error: "sesion" }) });

    return rpc("cambiar_nombre", { p_token: s.token, p_nombre: nombre }).then(function (r) {
      if (r.ok) {
        s.perfil.nombre = r.nombre;
        guardar(K_SESION, s);
        actualizarNombres();
        return { ok: true, nombre: r.nombre };
      }
      if (r.error === "sesion") { quitar(K_SESION); location.reload(); }
      return { ok: false, error: mensaje(r) };
    });
  }

  function cerrarSesion() {
    var s = leerSesion();
    quitar(K_SESION);
    try { sessionStorage.removeItem(K_INVITADO); } catch (e) { /* nada */ }
    var recargar = function () { location.reload(); };
    if (!s) { recargar(); return; }
    // Avisa al servidor para invalidar la sesión, pero sin quedarse esperando demasiado
    Promise.race([
      rpc("salir", { p_token: s.token }),
      new Promise(function (res) { setTimeout(res, 1500); })
    ]).then(recargar, recargar);
  }

  function salirDeInvitado() {
    try { sessionStorage.removeItem(K_INVITADO); } catch (e) { /* nada */ }
    location.reload();
  }

  // Solo administradores (el servidor lo comprueba)
  function llamadaAdmin(nombre) {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: mensaje({ error: "sesion" }) });
    return rpc(nombre, { p_token: s.token }).then(function (r) {
      if (r.ok) return r;
      return { ok: false, error: mensaje(r) };
    });
  }

  window.Auth = {
    estado: estado,
    usuario: usuarioActual,
    cambiarNombre: cambiarNombre,
    cerrarSesion: cerrarSesion,
    salirDeInvitado: salirDeInvitado,
    crearCodigo: function () { return llamadaAdmin("crear_codigo"); },
    listarCodigos: function () { return llamadaAdmin("listar_codigos"); }
  };

  // Comprueba en segundo plano que la sesión sigue siendo válida en el servidor
  function validarSesionEnSegundoPlano() {
    var s = leerSesion();
    if (!s) return;
    rpc("yo", { p_token: s.token }).then(function (r) {
      if (r.ok) {
        s.perfil = r.perfil;
        guardar(K_SESION, s);
        actualizarNombres();
        aplicarRol();
        document.dispatchEvent(new CustomEvent("auth:perfil"));
      } else if (r.error === "sesion") {
        quitar(K_SESION);
        location.reload();
      }
      // Si no hay conexión u ocurre otro error, se conserva la sesión guardada.
    });
  }

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
    var codigoValidado = ""; // el código aprobado por el servidor, solo en memoria

    function mostrar(nombre, textoError) {
      Object.keys(vistas).forEach(function (k) { vistas[k].seccion.hidden = k !== nombre; });
      var v = vistas[nombre];
      v.error.textContent = textoError || "";
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

    // Ejecuta una acción con el botón bloqueado y textos de error uniformes
    function enviar(vista, tarea) {
      vista.error.textContent = "";
      vista.boton.disabled = true;
      var libre = function () { vista.boton.disabled = false; };
      Promise.resolve().then(tarea).then(libre, function () {
        libre();
        vista.error.textContent = mensaje({});
      });
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
      var codigo = fCodigo.input.value;
      if (!codigo.trim()) { vCodigo.error.textContent = "Escribe el código."; return; }
      enviar(vCodigo, function () {
        return rpc("verificar_codigo", { p_codigo: codigo }).then(function (r) {
          if (r.ok) {
            codigoValidado = codigo;
            fCodigo.input.value = "";
            mostrar("registro");
          } else {
            vCodigo.error.textContent = mensaje(r);
            if (r.error === "codigo_invalido") fCodigo.input.select();
          }
        });
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
      id: "clave", etiqueta: "Contraseña:", oculto: true, queOcultar: "contraseña", max: 72,
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
      if (!codigoValidado) { mostrar("codigo"); return; }
      var datos = { nombre: fNombre.input.value, usuario: fUsuario.input.value, clave: fClave.input.value };
      var falla = validarRegistro(datos);
      if (falla) { vRegistro.error.textContent = mensaje({ error: falla }); return; }
      enviar(vRegistro, function () {
        return rpc("registrar", {
          p_codigo: codigoValidado, p_nombre: datos.nombre, p_usuario: datos.usuario, p_clave: datos.clave
        }).then(function (r) {
          if (r.ok) {
            if (iniciarSesionLocal(r)) { location.reload(); return; }
            vRegistro.error.textContent = "La cuenta se creó, pero no se pudo guardar la sesión en este navegador. Inicia sesión.";
            return;
          }
          if (r.error === "codigo_invalido") {
            codigoValidado = "";
            mostrar("codigo", mensaje(r));
            return;
          }
          vRegistro.error.textContent = mensaje(r);
        });
      });
    });

    /* Vista 3: iniciar sesión */
    var lUsuario = campo({ id: "login-usuario", etiqueta: "Nombre de usuario:", max: 20, autocomplete: "username" });
    var lClave = campo({
      id: "login-clave", etiqueta: "Contraseña:", oculto: true, queOcultar: "contraseña", max: 72,
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
      if (!lUsuario.input.value.trim() || !lClave.input.value) {
        vLogin.error.textContent = "Escribe tu usuario y tu contraseña.";
        return;
      }
      enviar(vLogin, function () {
        return rpc("entrar", { p_usuario: lUsuario.input.value, p_clave: lClave.input.value }).then(function (r) {
          if (r.ok) {
            if (iniciarSesionLocal(r)) { location.reload(); return; }
            vLogin.error.textContent = "No se pudo guardar la sesión en este navegador.";
            return;
          }
          vLogin.error.textContent = mensaje(r);
          if (r.error === "credenciales") lClave.input.select();
        });
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
            el("h2", {}, "Solo para usuarios registrados"),
            el("p", { class: "locked-text" },
              "Como invitado no puedes usar esta sección. Regístrate con un código de administrador o inicia sesión."),
            el("button", { type: "button", class: "btn", onclick: salirDeInvitado }, "Registrarse o iniciar sesión")));
        pagina.insertBefore(aviso, principal);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var st = estado();
    actualizarNombres();
    aplicarRol();
    if (!st) construirGate();
    else if (st === "invitado") aplicarRestriccionesDeInvitado();
    else validarSesionEnSegundoPlano();
  });
})();

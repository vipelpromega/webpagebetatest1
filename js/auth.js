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
    return { usuario: s.perfil.usuario, nombre: s.perfil.nombre, rol: s.perfil.rol, avatar: s.perfil.avatar || null };
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
  function rpc(nombre, args, opciones) {
    if (!CONFIGURADO) return Promise.resolve({ ok: false, error: "sin_config" });

    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var temporizador = ctl ? setTimeout(function () { ctl.abort(); }, ESPERA_MS) : null;
    var fin = function (x) { if (temporizador) clearTimeout(temporizador); return x; };

    return fetch(String(cfg.url).replace(/\/+$/, "") + "/rest/v1/rpc/" + nombre, {
      method: "POST",
      headers: { "apikey": cfg.clave, "Content-Type": "application/json" },
      body: JSON.stringify(args || {}),
      keepalive: !!(opciones && opciones.keepalive),
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
      case "clave_actual": return "La contraseña actual no es correcta.";
      case "avatar_formato": return "La imagen no es válida o es demasiado grande.";
      case "imagen_tipo": return "Elige una imagen PNG, JPG o WebP.";
      case "espera": return "Demasiados intentos. Espera " + (r.segundos || 30) + " s.";
      case "nombre_formato": return "El nombre de visualización debe tener entre 1 y 30 caracteres.";
      case "usuario_formato": return "El nombre de usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo.";
      case "clave_formato": return "La contraseña debe tener entre 8 y 72 caracteres.";
      case "usuario_en_uso": return "Ese nombre de usuario ya está en uso.";
      case "suspendida": return "Tu cuenta está suspendida. Contacta a un administrador.";
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

  // Foto de perfil: la imagen si hay; si no, la primera letra del nombre de usuario.
  function rellenarAvatar(nodo, perfil, grande) {
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
    nodo.className = "avatar" + (grande ? " grande" : "");
    var inicial = String((perfil && perfil.usuario) || "?").charAt(0).toUpperCase() || "?";
    if (perfil && perfil.avatar) {
      var img = document.createElement("img");
      img.alt = "";
      img.src = perfil.avatar;
      nodo.appendChild(img);
    } else {
      nodo.appendChild(document.createTextNode(inicial));
    }
  }

  // Editor de recorte: el usuario mueve y acerca la foto dentro de un círculo.
  // Devuelve (promesa) la imagen final 160×160 en texto, o null si cancela.
  function abrirRecorte(file) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) return rej("imagen_tipo");
      var fr = new FileReader();
      fr.onerror = function () { rej("imagen_tipo"); };
      fr.onload = function () {
        var img = new Image();
        img.onerror = function () { rej("imagen_tipo"); };
        img.onload = function () { montar(img); };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);

      function montar(img) {
        var S = 260, M = 6, C = S - 2 * M;           // lienzo, margen y lado del recorte
        var escMin = C / Math.min(img.width, img.height);
        var esc = escMin, ox = M + (C - img.width * esc) / 2, oy = M + (C - img.height * esc) / 2;
        var previo = document.activeElement;

        var canvas = el("canvas", { class: "recorte-lienzo", width: String(S), height: String(S), tabindex: "0",
          role: "img", "aria-label": "Foto: arrastra para moverla; usa el control para acercar" });
        var zoom = el("input", { type: "range", min: "100", max: "400", value: "100", class: "recorte-zoom", "aria-label": "Acercar" });
        var cancelar = el("button", { type: "button", class: "btn secondary" }, "Cancelar");
        var guardar = el("button", { type: "button", class: "btn" }, "Usar esta foto");
        var fondo = el("div", { class: "recorte-fondo" },
          el("div", { class: "recorte", role: "dialog", "aria-modal": "true", "aria-label": "Recortar foto de perfil" },
            el("h2", { class: "gate-prompt" }, "Ajusta tu foto"),
            el("p", { class: "f-hint" }, "Arrastra para moverla y usa el control para acercarla."),
            canvas,
            el("div", { class: "recorte-zoom-fila" }, el("span", { "aria-hidden": "true" }, "−"), zoom, el("span", { "aria-hidden": "true" }, "+")),
            el("div", { class: "recorte-botones" }, cancelar, guardar)));
        var ctx = canvas.getContext("2d");

        function limitar() {
          var w = img.width * esc, h = img.height * esc;
          ox = Math.min(M, Math.max(M + C - w, ox));
          oy = Math.min(M, Math.max(M + C - h, oy));
        }
        function dibujar() {
          limitar();
          ctx.clearRect(0, 0, S, S);
          ctx.drawImage(img, ox, oy, img.width * esc, img.height * esc);
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,.55)";
          ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.arc(S / 2, S / 2, C / 2, 0, Math.PI * 2);
          ctx.fill("evenodd");
          ctx.restore();
          ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(S / 2, S / 2, C / 2, 0, Math.PI * 2); ctx.stroke();
        }
        function acercar(nuevo) {                      // mantiene fijo el centro del círculo
          nuevo = Math.min(escMin * 4, Math.max(escMin, nuevo));
          var cx = (S / 2 - ox) / esc, cy = (S / 2 - oy) / esc;
          esc = nuevo; ox = S / 2 - cx * esc; oy = S / 2 - cy * esc;
          zoom.value = String(Math.round(esc / escMin * 100));
          dibujar();
        }
        var arrastre = null;
        canvas.addEventListener("pointerdown", function (e) {
          arrastre = { x: e.clientX, y: e.clientY, ox: ox, oy: oy };
          canvas.setPointerCapture(e.pointerId); canvas.classList.add("moviendo"); canvas.focus();
        });
        canvas.addEventListener("pointermove", function (e) {
          if (!arrastre) return;
          var k = S / canvas.getBoundingClientRect().width;
          ox = arrastre.ox + (e.clientX - arrastre.x) * k; oy = arrastre.oy + (e.clientY - arrastre.y) * k;
          dibujar();
        });
        var soltar = function () { arrastre = null; canvas.classList.remove("moviendo"); };
        canvas.addEventListener("pointerup", soltar);
        canvas.addEventListener("pointercancel", soltar);
        canvas.addEventListener("wheel", function (e) { e.preventDefault(); acercar(esc * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
        zoom.addEventListener("input", function () { acercar(escMin * Number(zoom.value) / 100); });
        canvas.addEventListener("keydown", function (e) {
          var paso = 10, usado = true;
          if (e.key === "ArrowLeft") ox -= paso; else if (e.key === "ArrowRight") ox += paso;
          else if (e.key === "ArrowUp") oy -= paso; else if (e.key === "ArrowDown") oy += paso;
          else if (e.key === "+" || e.key === "=") { acercar(esc * 1.08); return e.preventDefault(); }
          else if (e.key === "-") { acercar(esc / 1.08); return e.preventDefault(); }
          else usado = false;
          if (usado) { e.preventDefault(); dibujar(); }
        });

        function cerrar(valor) {
          document.removeEventListener("keydown", tecla, true);
          fondo.remove();
          if (previo && previo.focus) previo.focus();
          res(valor);
        }
        function tecla(e) { if (e.key === "Escape") { e.stopPropagation(); cerrar(null); } }
        document.addEventListener("keydown", tecla, true);
        cancelar.addEventListener("click", function () { cerrar(null); });
        guardar.addEventListener("click", function () {
          var T = 160, out = document.createElement("canvas");
          out.width = out.height = T;
          var sx = (M - ox) / esc, sy = (M - oy) / esc, lado = C / esc;
          out.getContext("2d").drawImage(img, sx, sy, lado, lado, 0, 0, T, T);
          var d = out.toDataURL("image/webp", 0.85);
          if (d.indexOf("data:image/webp") !== 0) d = out.toDataURL("image/jpeg", 0.85);
          if (d.length > 40000) d = out.toDataURL("image/jpeg", 0.6);
          if (d.length > 40000) { cerrar(null); rej("imagen_tipo"); return; }
          cerrar(d);
        });

        document.body.appendChild(fondo);
        dibujar();
        canvas.focus();
      }
    });
  }

  function cambiarClave(actual, nueva) {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: mensaje({ error: "sesion" }) });
    if (String(actual || "") === "") return Promise.resolve({ ok: false, error: "Escribe tu contraseña actual." });
    var bytes = new TextEncoder().encode(String(nueva || "")).length;
    if (bytes < 8 || bytes > 72) return Promise.resolve({ ok: false, error: mensaje({ error: "clave_formato" }) });
    return rpc("cambiar_clave", { p_token: s.token, p_actual: actual, p_nueva: nueva }).then(function (r) {
      if (r.ok) return { ok: true };
      if (r.error === "sesion") { quitar(K_SESION); location.reload(); }
      return { ok: false, error: mensaje(r) };
    });
  }

  function cambiarAvatar(file) {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: mensaje({ error: "sesion" }) });
    var preparar = file ? abrirRecorte(file) : Promise.resolve(null);
    return preparar.then(function (datos) {
      if (file && datos === null) return { ok: true, cancelado: true };
      return rpc("cambiar_avatar", { p_token: s.token, p_avatar: datos }).then(function (r) {
        if (r.ok) {
          s.perfil.avatar = r.avatar || null;
          guardar(K_SESION, s);
          actualizarNombres();
          return { ok: true };
        }
        if (r.error === "sesion") { quitar(K_SESION); location.reload(); }
        return { ok: false, error: mensaje(r) };
      });
    }, function (codigo) { return { ok: false, error: mensaje({ error: codigo }) }; });
  }

  function actualizarNombres() {
    var u = usuarioActual();
    var lateral = document.querySelector(".side-btn .avatar-barra");
    if (lateral && u) {
      var bt = lateral.closest(".side-btn");
      var tt = u.nombre + " · cuenta";
      bt.setAttribute("aria-label", tt); bt.setAttribute("data-tooltip", tt);
      var lb = bt.querySelector(".label"); if (lb) lb.textContent = u.nombre;
    }
    document.querySelectorAll("[data-user-avatar]").forEach(function (n) {
      var barra = n.classList.contains("avatar-barra");
      if (u) { rellenarAvatar(n, u, !barra); if (barra) n.classList.add("avatar-barra"); n.hidden = false; } else n.hidden = true;
    });
    document.querySelectorAll("[data-user-name]").forEach(function (n) {
      n.textContent = u ? u.nombre : "invitado";
    });
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

  // Sesiones activas de la cuenta
  function sesionesActivas() {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: mensaje({ error: "sesion" }) });
    return rpc("mis_sesiones", { p_token: s.token }).then(function (r) {
      if (r.ok) return { ok: true, sesiones: r.sesiones || [] };
      if (r.error === "sesion") { quitar(K_SESION); location.reload(); }
      return { ok: false, error: mensaje(r) };
    });
  }
  function cerrarSesionPorId(id) {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: mensaje({ error: "sesion" }) });
    return rpc("cerrar_sesion", { p_token: s.token, p_id: id }).then(function (r) {
      return r.ok ? { ok: true } : { ok: false, error: mensaje(r) };
    });
  }
  function cerrarOtrasSesiones() {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: mensaje({ error: "sesion" }) });
    return rpc("cerrar_otras_sesiones", { p_token: s.token }).then(function (r) {
      return r.ok ? { ok: true, cerradas: r.cerradas || 0 } : { ok: false, error: mensaje(r) };
    });
  }

  function historialDeAcceso() {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: mensaje({ error: "sesion" }) });
    return rpc("mi_historial", { p_token: s.token }).then(function (r) {
      if (r.ok) return { ok: true, eventos: r.eventos || [] };
      if (r.error === "sesion") { quitar(K_SESION); location.reload(); }
      return { ok: false, error: mensaje(r) };
    });
  }

  // Preferencias de la cuenta (tema, acento, idioma, fondo)
  function preferenciasDeCuenta() {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: "sin_sesion" });
    return rpc("mis_preferencias", { p_token: s.token }).then(function (r) {
      return r.ok ? { ok: true, preferencias: r.preferencias || {} } : { ok: false, error: r.error || "error" };
    });
  }
  function guardarPreferenciasDeCuenta(prefs) {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: "sin_sesion" });
    return rpc("guardar_preferencias", { p_token: s.token, p_prefs: prefs }).then(function (r) {
      return r.ok ? { ok: true, preferencias: r.preferencias || {} } : { ok: false, error: r.error || "error" };
    });
  }

  /* ---------- Presencia y visibilidad ---------- */
  function latido() {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: "sin_sesion" });
    return rpc("latido", { p_token: s.token });
  }
  // Al cerrar la página: aviso inmediato (keepalive permite que la petición salga aunque la página se cierre)
  function desconectando() {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: "sin_sesion" });
    return rpc("desconectando", { p_token: s.token }, { keepalive: true });
  }
  function perfilUsuario(id) {
    var s = leerSesion();
    return rpc("perfil_usuario", { p_token: s ? s.token : null, p_id: id || null }).then(function (r) {
      return r.ok ? { ok: true, miembro: !!r.miembro, perfil: r.perfil } : { ok: false, error: r.error || "error" };
    });
  }
  function seguir(id, sigo) {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: "sin_sesion" });
    return rpc("seguir", { p_token: s.token, p_id: id, p_seguir: !!sigo }).then(function (r) {
      return r.ok ? { ok: true, sigo: !!r.sigo, seguidores: Number(r.seguidores) || 0 } : { ok: false, error: r.error || "error" };
    });
  }
  function amistad(id, accion) {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: "sin_sesion" });
    return rpc("amistad", { p_token: s.token, p_id: id, p_accion: accion }).then(function (r) {
      if (!r.ok) return { ok: false, error: r.error || "error" };
      return { ok: true, amigo: !!r.amigo, mejor: !!r.mejor, amigos: Number(r.amigos) || 0,
        amigo_enviada: !!r.amigo_enviada, amigo_recibida: !!r.amigo_recibida, mejor_enviada: !!r.mejor_enviada, mejor_recibida: !!r.mejor_recibida };
    });
  }
  // Notificaciones: por ahora, solicitudes de amistad / de mejor amigo pendientes
  function notificacionesCantidad() {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false });
    return rpc("notificaciones_cantidad", { p_token: s.token }).then(function (r) {
      return r.ok ? { ok: true, total: Number(r.total) || 0 } : { ok: false };
    });
  }
  function notificaciones() {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false });
    return rpc("notificaciones", { p_token: s.token }).then(function (r) {
      return r.ok ? { ok: true, total: Number(r.total) || 0, items: Array.isArray(r.items) ? r.items : [] } : { ok: false };
    });
  }
  // Iconos con el estilo de Windows 11 (Fluent): contorno redondeado y de trazo fino
  var ICONOS = {
    campana: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v3.2c0 .5-.2 1-.5 1.4L4.6 15.4c-.5.7 0 1.6.8 1.6h13.2c.8 0 1.3-.9.8-1.6L18 13.6c-.3-.4-.5-.9-.5-1.4V9A5.5 5.5 0 0 0 12 3.5z"/><path d="M9.7 19.8a2.5 2.5 0 0 0 4.6 0"/></svg>',
    persona: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.5" r="3.5"/><path d="M5.5 19.5v-.6a3.9 3.9 0 0 1 3.9-3.9h5.2a3.9 3.9 0 0 1 3.9 3.9v.6"/></svg>',
    personas: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M2.8 19.3v-.5a3.8 3.8 0 0 1 3.8-3.8h4.8a3.8 3.8 0 0 1 3.8 3.8v.5"/><path d="M15.6 5.1a3.1 3.1 0 0 1 0 5.8"/><path d="M18.2 15.2a3.6 3.6 0 0 1 3 3.6v.5"/></svg>',
    personaMas: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9.5" cy="7.5" r="3.5"/><path d="M3 19.5v-.6A3.9 3.9 0 0 1 6.9 15h5.2a3.9 3.9 0 0 1 2.4.8"/><path d="M18 14.5v6M15 17.5h6"/></svg>',
    personaFlecha: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9.5" cy="7.5" r="3.5"/><path d="M3 19.5v-.6A3.9 3.9 0 0 1 6.9 15h4.7"/><path d="M15 18h6M18.5 15.5L21 18l-2.5 2.5"/></svg>',
    personaCheck: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9.5" cy="7.5" r="3.5"/><path d="M3 19.5v-.6A3.9 3.9 0 0 1 6.9 15h4.7"/><path d="M14.5 18l2.2 2.2 4-4.4"/></svg>',
    personaCorazon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9.5" cy="7.5" r="3.5"/><path d="M3 19.5v-.6A3.9 3.9 0 0 1 6.9 15h3.8"/><path d="M17.8 20.8s-3.3-1.9-3.3-4.2a1.9 1.9 0 0 1 3.3-1.2 1.9 1.9 0 0 1 3.3 1.2c0 2.3-3.3 4.2-3.3 4.2z"/></svg>',
    personaMenos: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9.5" cy="7.5" r="3.5"/><path d="M3 19.5v-.6A3.9 3.9 0 0 1 6.9 15h5.2a3.9 3.9 0 0 1 2.4.8"/><path d="M15 17.5h6"/></svg>',
    reloj: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cerrar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  // «Mejor amigo»: dos personas doradas (relleno, como los iconos «llenos» de Windows 11)
  var DOS_PERSONAS_ORO = '<svg viewBox="0 0 24 24" aria-hidden="true"><g class="atras"><circle cx="17.2" cy="8.8" r="2.7"/><path d="M16.8 14.3c2.7.1 4.7 1.9 4.7 4.4 0 1-.7 1.8-1.7 1.8h-2.6c.3-.5.4-1 .4-1.6 0-1.8-.8-3.4-2.1-4.4.4-.1.8-.2 1.3-.2z"/></g><circle cx="9" cy="8" r="3.5"/><path d="M2.5 19.1c0-2.7 2.2-4.8 4.9-4.8h3.2c2.7 0 4.9 2.1 4.9 4.8 0 .8-.6 1.4-1.4 1.4H3.9c-.8 0-1.4-.6-1.4-1.4z"/></svg>';
  function iconoMejor() {
    var e = document.createElement("span");
    e.className = "mejor-ico"; e.setAttribute("role", "img");
    var tt = window.I18n && window.I18n.t ? window.I18n.t("Mejor amigo") : "Mejor amigo";
    e.setAttribute("aria-label", tt); e.title = tt; e.innerHTML = DOS_PERSONAS_ORO;
    return e;
  }
  function listaUsuarios() {
    var s = leerSesion();
    return rpc("lista_usuarios", { p_token: s ? s.token : null }).then(function (r) {
      return r.ok ? { ok: true, miembro: !!r.miembro, usuarios: r.usuarios || [] } : { ok: false, error: r.error || "error" };
    });
  }
  function estadosUsuarios() {
    var s = leerSesion();
    return rpc("estados_usuarios", { p_token: s ? s.token : null }).then(function (r) {
      return r.ok ? { ok: true, estados: r.estados || [] } : { ok: false, error: r.error || "error" };
    });
  }
  function miVisibilidad() {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: "sin_sesion" });
    return rpc("mi_visibilidad", { p_token: s.token }).then(function (r) {
      return r.ok ? { ok: true, visibilidades: r.visibilidades || ["todos"], invitados: !!r.invitados, estado: r.estado || "en_linea", seguim: r.seguim || ["todos"] } : { ok: false, error: r.error || "error" };
    });
  }
  function guardarEstado(estado) {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: "sin_sesion" });
    return rpc("guardar_estado", { p_token: s.token, p_estado: estado }).then(function (r) {
      return r.ok ? { ok: true, estado: r.estado } : { ok: false, error: r.error || "error" };
    });
  }
  function guardarVisibilidadSeguim(modos) {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: "sin_sesion" });
    return rpc("guardar_visibilidad_seguim", { p_token: s.token, p_modos: modos }).then(function (r) {
      return r.ok ? { ok: true, seguim: r.seguim || [] } : { ok: false, error: r.error || "error" };
    });
  }
  function listaSeguimiento(id, tipo) {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: "sin_sesion" });
    return rpc("lista_seguimiento", { p_token: s.token, p_id: id, p_tipo: tipo }).then(function (r) {
      return r.ok ? { ok: true, usuarios: r.usuarios || [] } : { ok: false, error: r.error || "error" };
    });
  }
  function guardarVisibilidad(modos, invitados) {
    var s = leerSesion();
    if (!s) return Promise.resolve({ ok: false, error: "sin_sesion" });
    return rpc("guardar_visibilidad", { p_token: s.token, p_modos: modos, p_invitados: !!invitados }).then(function (r) {
      return r.ok ? { ok: true, visibilidades: r.visibilidades || [], invitados: !!r.invitados } : { ok: false, error: r.error || "error" };
    });
  }

  window.Auth = {
    latido: latido,
    desconectando: desconectando,
    perfilUsuario: perfilUsuario,
    seguir: seguir,
    amistad: amistad,
    notificacionesCantidad: notificacionesCantidad,
    notificaciones: notificaciones,
    refrescarNotificaciones: function () { refrescarNotif(); },
    iconos: ICONOS,
    dosPersonasOro: DOS_PERSONAS_ORO,
    iconoMejor: iconoMejor,
    listaUsuarios: listaUsuarios,
    estadosUsuarios: estadosUsuarios,
    miVisibilidad: miVisibilidad,
    guardarEstado: guardarEstado,
    guardarVisibilidad: guardarVisibilidad,
    guardarVisibilidadSeguim: guardarVisibilidadSeguim,
    listaSeguimiento: listaSeguimiento,
    preferenciasDeCuenta: preferenciasDeCuenta,
    guardarPreferenciasDeCuenta: guardarPreferenciasDeCuenta,
    historialDeAcceso: historialDeAcceso,
    sesionesActivas: sesionesActivas,
    cerrarSesionPorId: cerrarSesionPorId,
    cerrarOtrasSesiones: cerrarOtrasSesiones,
    estado: estado,
    usuario: usuarioActual,
    cambiarNombre: cambiarNombre,
    cambiarAvatar: cambiarAvatar,
    cambiarClave: cambiarClave,
    cerrarSesion: cerrarSesion,
    salirDeInvitado: salirDeInvitado
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
      } else if (r.error === "sesion") {
        quitar(K_SESION);
        try { sessionStorage.setItem("aviso", "Tu sesión se cerró (la cuenta ya no existe o expiró)."); } catch (e) { /* nada */ }
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
      id: "codigo", oculto: true, queOcultar: "código", labelledby: "gate-prompt", max: 128
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
            etiquetaClave.textContent = r.etiqueta ? "Nombre de identificación: " + r.etiqueta : "";
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
    var etiquetaClave = el("p", { class: "f-hint gate-etiqueta" });
    var medidorClave = el("div", { class: "cs-medidor", "aria-live": "polite" });
    fClave.grupo.appendChild(medidorClave);
    fClave.input.addEventListener("input", function () {
      if (window.Fuerza) window.Fuerza.pintar(medidorClave, window.Fuerza.evaluar(fClave.input.value));
    });

    // Foto de perfil (opcional)
    var avatarElegido = null;
    var avatarVista = el("span", { class: "avatar grande" });
    var avatarArchivo = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", class: "sr-only", tabindex: "-1", "aria-hidden": "true" });
    var avatarError = el("p", { class: "f-error", role: "alert" });
    var avatarQuitar = el("button", { type: "button", class: "gate-link" }, "Quitar");
    avatarQuitar.hidden = true;
    function pintarAvatar() {
      rellenarAvatar(avatarVista, { usuario: fUsuario.input.value.trim() || "?", avatar: avatarElegido }, true);
      avatarQuitar.hidden = !avatarElegido;
    }
    var avatarElegir = el("button", { type: "button", class: "btn secondary" }, "Elegir imagen");
    avatarElegir.addEventListener("click", function () { avatarArchivo.click(); });
    avatarQuitar.addEventListener("click", function () { avatarElegido = null; avatarArchivo.value = ""; pintarAvatar(); });
    avatarArchivo.addEventListener("change", function () {
      avatarError.textContent = "";
      var f = avatarArchivo.files && avatarArchivo.files[0];
      if (!f) return;
      abrirRecorte(f).then(function (d) { if (d) { avatarElegido = d; pintarAvatar(); } avatarArchivo.value = ""; },
        function (c) { avatarError.textContent = mensaje({ error: c }); });
    });
    fUsuario.input.addEventListener("input", pintarAvatar);
    pintarAvatar();
    var grupoAvatar = el("div", { class: "f-group avatar-grupo" },
      el("div", { class: "f-label" }, "Foto de perfil (opcional):"),
      el("div", { class: "avatar-fila" }, avatarVista, el("div", { class: "avatar-botones" }, avatarElegir, avatarQuitar)),
      el("p", { class: "f-hint" }, "Si no eliges una, se usa la primera letra de tu nombre de usuario. Puedes cambiarla después."),
      avatarArchivo, avatarError);

    var vRegistro = nuevaVista("registro", function (form, error, boton) {
      boton.textContent = "Crear cuenta";
      form.appendChild(el("h1", { class: "gate-prompt" }, "Crea tu cuenta"));
      form.appendChild(etiquetaClave);
      form.appendChild(fNombre.grupo);
      form.appendChild(fUsuario.grupo);
      form.appendChild(fClave.grupo);
      form.appendChild(grupoAvatar);
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
          p_codigo: codigoValidado, p_nombre: datos.nombre, p_usuario: datos.usuario, p_clave: datos.clave,
          p_avatar: avatarElegido
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
    var aviso = "";
    try { aviso = sessionStorage.getItem("aviso") || ""; sessionStorage.removeItem("aviso"); } catch (e) { /* nada */ }
    mostrar("codigo", aviso);
  }

  function aplicarRestriccionesDeInvitado() {
    // Candado en los botones de la barra que requieren cuenta
    document.querySelectorAll('.side-btn[data-acceso="miembro"]').forEach(function (a) {
      a.classList.add("locked");
      // Bloqueado de verdad: sin enlace, no se puede pulsar ni enfocar
      a.removeAttribute("href");
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("tabindex", "-1");
      a.addEventListener("click", function (e) { e.preventDefault(); });
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

  var ICONO_AJUSTES = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  var ICONO_SALIR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>';

  // ---------- Notificaciones (botón de la barra, encima de la foto de perfil) ----------
  // Por ahora avisan de las solicitudes de amistad y de mejor amigo; desde aquí se pueden aceptar o rechazar.
  var RE_AVATAR = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
  var refrescarNotif = function () { /* hasta que se crea el botón */ };
  function iniciarNotificaciones(cuentaBtn) {
    var tr = function (x) { return window.I18n && window.I18n.t ? window.I18n.t(x) : x; };
    var btn = el("button", { type: "button", class: "side-btn notif-btn", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-label": "Notificaciones", "data-tooltip": "Notificaciones" });
    var ic = el("span", { class: "notif-ico", "aria-hidden": "true" });
    ic.innerHTML = ICONOS.campana;
    var badge = el("span", { class: "notif-badge", "aria-hidden": "true" });
    badge.hidden = true;
    ic.appendChild(badge);
    btn.appendChild(ic);
    btn.appendChild(el("span", { class: "label" }, "Notificaciones"));
    cuentaBtn.parentNode.insertBefore(btn, cuentaBtn);

    var total = -1, panel = null, lista = null;
    function poner(n) {
      var antes = total; total = Math.max(0, n);
      badge.textContent = total > 9 ? "9+" : String(total);
      badge.hidden = total === 0;
      var t = tr("Notificaciones") + (total ? " (" + total + ")" : "");
      btn.setAttribute("aria-label", t); btn.setAttribute("data-tooltip", t);
      if (antes !== -1 && antes !== total) {
        try { window.dispatchEvent(new Event("notif-cambio")); } catch (e) { /* nada */ }
      }
    }
    function contar() {
      if (document.hidden) return;
      notificacionesCantidad().then(function (r) { if (r.ok) poner(r.total); });
    }
    poner(0); total = -1;
    contar();
    refrescarNotif = function () { notificacionesCantidad().then(function (r) { if (r.ok) poner(r.total); }); };
    setInterval(contar, 10000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) contar(); });

    function cerrar(devolverFoco) {
      if (!panel) return;
      panel.remove(); panel = null; lista = null;
      btn.setAttribute("aria-expanded", "false"); btn.classList.remove("abierto");
      document.removeEventListener("pointerdown", fuera, true);
      document.removeEventListener("keydown", teclas, true);
      if (devolverFoco) btn.focus();
    }
    function fuera(e) { if (panel && !panel.contains(e.target) && !btn.contains(e.target)) cerrar(false); }
    function teclas(e) { if (e.key === "Escape") { e.preventDefault(); cerrar(true); } }
    function vacio(texto) { lista.textContent = ""; lista.appendChild(el("p", { class: "notif-vacio" }, texto)); }
    function fila(it) {
      var mejor = it.tipo === "mejor";
      var av = el("a", { class: "notif-av", href: "perfil.html?id=" + encodeURIComponent(it.id), "aria-hidden": "true", tabindex: "-1" });
      var a = el("span", {});
      rellenarAvatar(a, { usuario: it.usuario || it.nombre, avatar: typeof it.avatar === "string" && RE_AVATAR.test(it.avatar) ? it.avatar : null }, false);
      av.appendChild(a);
      var nombre = el("a", { class: "notif-nombre", href: "perfil.html?id=" + encodeURIComponent(it.id) }, String(it.nombre));
      var txt = el("span", { class: "notif-txt" }, mejor ? "quiere ser tu mejor amigo" : "te envió una solicitud de amistad");
      var ok = el("button", { type: "button", class: "btn notif-acepta" }, mejor ? "Aceptar mejor amigo" : "Aceptar amigo");
      var no = el("button", { type: "button", class: "btn secondary notif-rechaza" }, "Rechazar");
      var msg = el("p", { class: "f-error notif-msg", role: "alert" });
      var f = el("div", { class: "notif-fila" }, av,
        el("div", { class: "notif-cuerpo" }, el("div", { class: "notif-linea" }, nombre, document.createTextNode(" "), txt),
          el("div", { class: "notif-botones" }, ok, no), msg));
      function resolver(accion) {
        ok.disabled = no.disabled = true; msg.textContent = "";
        amistad(it.id, accion).then(function (r) {
          if (!r.ok) { ok.disabled = no.disabled = false; msg.textContent = tr("No se pudo actualizar la amistad."); return; }
          f.classList.add("sale");
          setTimeout(function () {
            f.remove();
            if (lista && !lista.querySelector(".notif-fila")) vacio(tr("No tienes notificaciones."));
          }, 260);
          poner(total - 1); contar();
        });
      }
      ok.addEventListener("click", function () { resolver(mejor ? "aceptar_mejor" : "aceptar"); });
      no.addEventListener("click", function () { resolver(mejor ? "rechazar_mejor" : "rechazar"); });
      return f;
    }
    function abrir() {
      document.dispatchEvent(new CustomEvent("barra-menu", { detail: "notif" }));
      lista = el("div", { class: "notif-lista" });
      panel = el("div", { class: "cuenta-menu notif-menu", role: "dialog", "aria-label": "Notificaciones" },
        el("div", { class: "notif-tit" }, "Notificaciones"), lista);
      vacio(tr("Cargando…"));
      document.body.appendChild(panel);
      var r = btn.getBoundingClientRect();
      panel.style.left = Math.round(r.right + 14) + "px";
      panel.style.bottom = Math.max(8, Math.round(window.innerHeight - r.bottom)) + "px";
      btn.setAttribute("aria-expanded", "true"); btn.classList.add("abierto");
      document.addEventListener("pointerdown", fuera, true);
      document.addEventListener("keydown", teclas, true);
      var mio = panel;
      notificaciones().then(function (r) {
        if (panel !== mio) return;
        if (!r.ok) { vacio(tr("No se pudieron cargar las notificaciones.")); return; }
        poner(r.total);
        if (!r.items.length) { vacio(tr("No tienes notificaciones.")); return; }
        lista.textContent = "";
        r.items.forEach(function (it) { lista.appendChild(fila(it)); });
      });
    }
    btn.addEventListener("click", function () { if (panel) cerrar(false); else abrir(); });
    document.addEventListener("barra-menu", function (e) { if (e.detail !== "notif") cerrar(false); });
    window.addEventListener("resize", function () { cerrar(false); });
  }

  // En la barra, el botón de "Configuración" pasa a ser la foto del usuario;
  // al pulsarla se abre un menú con las secciones de la cuenta.
  function convertirBotonDeCuenta() {
    var btn = document.querySelector('.side-btn.bottom[href="configuracion.html"]');
    var u = usuarioActual();
    if (!btn || !u) return;
    var yaEstaEnConfig = btn.getAttribute("aria-current") === "page";
    var icono = btn.querySelector("svg");
    var avatar = el("span", {});
    rellenarAvatar(avatar, u, false);
    avatar.setAttribute("data-user-avatar", "");
    avatar.classList.add("avatar-barra");
    if (icono) btn.replaceChild(avatar, icono); else btn.insertBefore(avatar, btn.firstChild);
    var etiqueta = btn.querySelector(".label");
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    var poner = function () {
      var t = u.nombre + " · cuenta";
      btn.setAttribute("aria-label", t); btn.setAttribute("data-tooltip", t);
      if (etiqueta) etiqueta.textContent = usuarioActual().nombre;
    };
    poner();

    var menu = null;
    function cerrar(devolverFoco) {
      if (!menu) return;
      menu.remove(); menu = null;
      btn.setAttribute("aria-expanded", "false");
      btn.classList.remove("abierto");
      document.removeEventListener("pointerdown", fuera, true);
      document.removeEventListener("keydown", teclas, true);
      if (devolverFoco) btn.focus();
    }
    function fuera(e) { if (menu && !menu.contains(e.target) && !btn.contains(e.target)) cerrar(false); }
    function teclas(e) {
      if (!menu) return;
      if (e.key === "Escape") { e.preventDefault(); cerrar(true); return; }
      var items = Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'));
      var i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === "Tab") cerrar(false);
    }
    function abrir() {
      document.dispatchEvent(new CustomEvent("barra-menu", { detail: "cuenta" }));
      var actual = usuarioActual() || u;
      // Al pulsar la foto y el nombre se va a la página de la cuenta (perfil)
      var cab = el("a", { class: "cuenta-cab", role: "menuitem", href: "perfil.html", "aria-label": "Ir a mi perfil" }, (function () { var a = el("span", {}); rellenarAvatar(a, actual, true); return a; })(),
        el("div", { class: "cuenta-datos" }, el("strong", {}, actual.nombre), el("span", {}, "@" + actual.usuario)));
      // Estado de la cuenta
      var ESTADOS = [["en_linea", "En línea"], ["no_molestar", "No molestar"], ["desconectado", "Desconectado"]];
      var botonesEstado = {};
      var grupoEstado = el("div", { class: "cuenta-estado", role: "group", "aria-label": "Estado de tu cuenta" });
      function marcarEstado(e) { Object.keys(botonesEstado).forEach(function (k) { var on = k === e; botonesEstado[k].classList.toggle("sel", on); botonesEstado[k].setAttribute("aria-checked", String(on)); }); }
      ESTADOS.forEach(function (par) {
        var b = el("button", { type: "button", class: "cuenta-est e-" + par[0], role: "menuitemradio", "aria-checked": "false" },
          el("span", { class: "est-punto", "aria-hidden": "true" }), par[1]);
        b.addEventListener("click", function () {
          marcarEstado(par[0]);
          guardarEstado(par[0]).then(function (r) { if (!r.ok) miVisibilidad().then(function (v) { if (v.ok) marcarEstado(v.estado); }); });
        });
        botonesEstado[par[0]] = b; grupoEstado.appendChild(b);
      });
      miVisibilidad().then(function (v) { if (v.ok && menu) marcarEstado(v.estado); });
      function item(texto, icono, accion, href) {
        var n = href ? el("a", { class: "cuenta-item", role: "menuitem", href: href }) : el("button", { type: "button", class: "cuenta-item", role: "menuitem" });
        var i = el("span", { class: "cuenta-icono", "aria-hidden": "true" });
        i.innerHTML = icono;
        n.appendChild(i); n.appendChild(document.createTextNode(texto));
        if (accion) n.addEventListener("click", accion);
        return n;
      }
      menu = el("div", { class: "cuenta-menu", role: "menu", "aria-label": "Cuenta" }, cab,
        el("div", { class: "cuenta-est-titulo" }, "Estado"), grupoEstado,
        el("div", { class: "side-divider", role: "separator" }),
        item("Configuración", ICONO_AJUSTES, null, "configuracion.html"),
        el("div", { class: "side-divider", role: "separator" }),
        item("Cerrar sesión", ICONO_SALIR, function () { cerrar(false); cerrarSesion(); }));
      document.body.appendChild(menu);
      var r = btn.getBoundingClientRect();
      menu.style.left = Math.round(r.right + 14) + "px";
      menu.style.bottom = Math.max(8, Math.round(window.innerHeight - r.bottom)) + "px";
      btn.setAttribute("aria-expanded", "true");
      btn.classList.add("abierto");
      document.addEventListener("pointerdown", fuera, true);
      document.addEventListener("keydown", teclas, true);
      menu.querySelector('[role="menuitem"]').focus();
    }
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      if (menu) cerrar(false); else abrir();
    });
    btn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp" && !menu) { e.preventDefault(); abrir(); }
    });
    window.addEventListener("resize", function () { cerrar(false); });
    document.addEventListener("barra-menu", function (e) { if (e.detail !== "cuenta") cerrar(false); });
    if (yaEstaEnConfig) btn.classList.add("actual");
    iniciarNotificaciones(btn);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var st = estado();
    actualizarNombres();
    if (!st) construirGate();
    else if (st === "invitado") aplicarRestriccionesDeInvitado();
    else {
      convertirBotonDeCuenta();
      validarSesionEnSegundoPlano();
      // Si un administrador borra la cuenta, la sesión se cierra sola en pocos segundos
      setInterval(function () { if (!document.hidden) validarSesionEnSegundoPlano(); }, 20000);
      document.addEventListener("visibilitychange", function () { if (!document.hidden) validarSesionEnSegundoPlano(); });
    }
  });
})();

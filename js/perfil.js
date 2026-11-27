// Página de perfil: muestra la cuenta de un usuario (la propia o la de otro) con su estado en vivo.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var t = function (x) { return window.I18n && window.I18n.t ? window.I18n.t(x) : x; };
  var A = window.Auth;
  if (!A) return;
  var id = null;
  try { var q = new URLSearchParams(location.search).get("id"); if (q && /^[0-9a-f-]{36}$/i.test(q)) id = q.toLowerCase(); } catch (e) { /* nada */ }

  function mostrarMsg(txt) { var m = $("perfil-msg"); m.textContent = txt; m.hidden = !txt; }
  function pintarAvatar(a, p) {
    while (a.firstChild) a.removeChild(a.firstChild);
    a.classList.remove("inicial");
    if (typeof p.avatar === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(p.avatar)) {
      var img = document.createElement("img"); img.alt = ""; img.src = p.avatar; img.draggable = false; a.appendChild(img);
    } else {
      a.textContent = (p.nombre || "?").trim().charAt(0).toUpperCase() || "?";
      a.classList.add("inicial");
    }
  }
  var ultimo = "", idPerfil = null, miembro = false, ocupado = false, verLista = false, nombrePerfil = "";
  function pintarSeguim(p) {
    var ns = p.seguidores || 0, ng = p.siguiendo || 0;
    $("perfil-seguidores-n").textContent = ns; $("perfil-seguidores-t").textContent = t(ns === 1 ? "seguidor" : "seguidores");
    $("perfil-siguiendo-n").textContent = ng; $("perfil-siguiendo-t").textContent = t("siguiendo");
    var na = p.amigos || 0;
    $("perfil-amigos-n").textContent = na; $("perfil-amigos-t").textContent = t(na === 1 ? "amigo" : "amigos");
    // La lista solo se puede abrir si su dueño la comparte con quien mira (los invitados no la ven)
    verLista = !!p.ver_seguim;
    [["perfil-seguidores-btn", "seguidores"], ["perfil-siguiendo-btn", "siguiendo"], ["perfil-amigos-btn", "amigos"]].forEach(function (x) {
      var btn = $(x[0]);
      btn.disabled = !verLista;
      btn.classList.toggle("privada", !verLista);
      var txt = (x[1] === "seguidores" ? (ns === 1 ? t("seguidor") : t("seguidores")) : x[1] === "amigos" ? (na === 1 ? t("amigo") : t("amigos")) : t("siguiendo"));
      btn.setAttribute("aria-label", verLista ? t("Ver la lista") + ": " + txt : txt + " (" + t("Lista privada") + ")");
      btn.title = verLista ? "" : t("Este usuario no comparte esta lista.");
    });
    var m = miembro && !p.yo;
    var ic = A.iconos || {};
    // Pone icono y texto a un botón (el texto va en su propio <span> para poder traducirlo)
    function boton(btn, icono, texto, secundario, accion) {
      btn.querySelector(".btn-ico").innerHTML = icono || "";
      btn.querySelector(".btn-txt").textContent = t(texto);   // texto solo para lectores de pantalla
      btn.setAttribute("data-tooltip", t(texto));              // y como tooltip al pasar el cursor o enfocar
      btn.classList.toggle("secondary", !!secundario);
      if (accion) btn.dataset.accion = accion;
    }
    var b = $("perfil-seguir");
    b.hidden = !m;
    b.dataset.sigo = p.sigo ? "1" : "";
    b.setAttribute("aria-pressed", String(!!p.sigo));
    boton(b, p.sigo ? ic.personaCheck : ic.personaFlecha, p.sigo ? "Dejar de seguir" : "Seguir", !!p.sigo);
    // Amigos: se envía una solicitud y la otra persona debe aceptarla
    var ba = $("perfil-amigo"), br = $("perfil-rechazar"), bm = $("perfil-mejor"), bmr = $("perfil-rechazar-mejor");
    ba.hidden = !m;
    br.hidden = !(m && !p.amigo && p.amigo_recibida);
    ba.setAttribute("aria-pressed", String(!!p.amigo));
    if (p.amigo) boton(ba, ic.personaMenos, "Quitar amigo", true, "quitar");
    else if (p.amigo_recibida) boton(ba, ic.personaCheck, "Aceptar amigo", false, "aceptar");
    else if (p.amigo_enviada) boton(ba, ic.reloj, "Cancelar solicitud", true, "cancelar");
    else if (p.amigo_espera > 0) boton(ba, ic.reloj, "Espera " + Math.ceil(p.amigo_espera / 60) + " min para volver a enviar", true, "agregar");
    else boton(ba, ic.personaMas, "Agregar amigo", false, "agregar");
    ba.disabled = !p.amigo && !p.amigo_recibida && !p.amigo_enviada && p.amigo_espera > 0;
    boton(br, ic.cerrar, "Rechazar", true, "rechazar");
    // Mejor amigo: el botón solo aparece si ya son amigos
    bm.hidden = !(m && p.amigo);
    bmr.hidden = !(m && p.amigo && !p.mejor && p.mejor_recibida);
    var oro = '<span class="mejor-ico">' + (A.dosPersonasOro || "") + "</span>";
    bm.setAttribute("aria-pressed", String(!!p.mejor));
    if (p.mejor) boton(bm, oro, "Quitar de mejores amigos", true, "no_mejor");
    else if (p.mejor_recibida) boton(bm, oro, "Aceptar mejor amigo", false, "aceptar_mejor");
    else if (p.mejor_enviada) boton(bm, ic.reloj, "Cancelar solicitud de mejor amigo", true, "cancelar_mejor");
    else if (p.mejor_espera > 0) boton(bm, ic.reloj, "Espera " + Math.ceil(p.mejor_espera / 60) + " min para volver a enviar", true, "mejor");
    else boton(bm, oro, "Mejor amigo", true, "mejor");
    bm.disabled = !p.mejor && !p.mejor_recibida && !p.mejor_enviada && p.mejor_espera > 0;
    boton(bmr, ic.cerrar, "Rechazar", true, "rechazar_mejor");
  }
  function pintar(r) {
    var p = r.perfil; idPerfil = p.id; nombrePerfil = p.nombre;
    $("perfil-cab").hidden = false;
    var firma = [p.nombre, p.avatar ? p.avatar.length : 0, p.usuario].join("|");
    if (firma !== ultimo) { pintarAvatar($("perfil-avatar"), p); ultimo = firma; }
    var hn = $("perfil-nombre"); hn.textContent = p.nombre;
    var ir = A.iconoRol && A.iconoRol(p); if (ir) hn.appendChild(ir);
    if (p.mejor && A.iconoMejor) hn.appendChild(A.iconoMejor());
    $("perfil-usuario").textContent = p.usuario ? "@" + p.usuario : "";
    var on = p.estado === "online";
    $("perfil-punto").hidden = !on;
    var e = $("perfil-estado"); e.textContent = on ? t("En línea") : t("Desconectado"); e.classList.toggle("online", on);
    document.title = p.nombre + " · " + t("Perfil");
    $("perfil-sub").textContent = p.yo ? t("Tu cuenta") : t("Información de la cuenta");
    var extra = $("perfil-extra");
    if (p.desde) {
      var f = new Date(p.desde);
      $("perfil-desde").textContent = isNaN(f) ? "" : f.toLocaleDateString(window.I18n ? window.I18n.locale() : "es-ES", { year: "numeric", month: "long", day: "numeric" });
      extra.hidden = false;
    } else extra.hidden = true;
    $("perfil-editar").hidden = !p.yo;
    $("perfil-editar").setAttribute("data-tooltip", t("Editar mi perfil"));
    pintarSeguim(p);
    pintarRoles(p);
    pintarDescripcion(p);
    mostrarMsg("");
  }

  // Roles: solo iconos (con tooltip); cada uno lleva a la página «Roles» donde se explican
  function pintarRoles(p) {
    var caja = $("perfil-roles"), fila = $("perfil-roles-fila");
    var roles = A.rolesDe ? A.rolesDe(p) : [];
    fila.textContent = "";
    caja.hidden = !roles.length;
    roles.forEach(function (r) {
      var a = document.createElement("a"); a.className = "perfil-rol-btn"; a.href = "roles.html#" + r.id;
      a.setAttribute("data-tooltip", t(r.nombre)); a.setAttribute("aria-label", t(r.nombre)); a.setAttribute("role", "listitem");
      var ico = A.iconoDeRol(r); ico.removeAttribute("title"); ico.removeAttribute("role"); ico.removeAttribute("aria-label");
      a.appendChild(ico); fila.appendChild(a);
    });
  }

  // Descripción: la ve cualquiera; solo el dueño la edita
  var editandoDesc = false, descActual = "";
  function pintarDescripcion(p) {
    if (editandoDesc) return;
    descActual = p.descripcion || "";
    var caja = $("perfil-desc"), tx = $("perfil-desc-texto");
    tx.textContent = descActual; tx.hidden = !descActual;
    $("perfil-desc-editar").hidden = !(p.yo && descActual);
    $("perfil-desc-agregar").hidden = !(p.yo && !descActual);
    $("perfil-desc-form").hidden = true;
    caja.hidden = !(descActual || p.yo);
  }
  function abrirEdicionDesc(abrir) {
    editandoDesc = abrir;
    var form = $("perfil-desc-form");
    form.hidden = !abrir;
    $("perfil-desc-texto").hidden = abrir || !descActual;
    $("perfil-desc-editar").hidden = abrir || !descActual;
    $("perfil-desc-agregar").hidden = abrir || !!descActual;
    $("perfil-desc-error").textContent = "";
    if (abrir) {
      var inp = $("perfil-desc-input"); inp.value = descActual; contarDesc(); inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    } else if (!descActual) $("perfil-desc-agregar").hidden = false;
  }
  function contarDesc() { $("perfil-desc-cont").textContent = $("perfil-desc-input").value.length + " / 300"; }

  // Lista de seguidores / seguidos en una tarjeta flotante; cada fila lleva al perfil de esa persona
  function abrirLista(tipo) {
    if (!idPerfil || !verLista) return;
    var cont = document.createElement("div"); cont.className = "seg-lista-caja";
    var ul = document.createElement("ul"); ul.className = "seg-lista"; ul.setAttribute("aria-label", t(tipo === "seguidores" ? "Seguidores" : tipo === "amigos" ? "Amigos" : "Siguiendo"));
    var vacio = document.createElement("p"); vacio.className = "nota"; vacio.textContent = t("Cargando…");
    var cerrar = document.createElement("button"); cerrar.type = "button"; cerrar.className = "btn secondary"; cerrar.textContent = t("Cerrar");
    var fila = document.createElement("div"); fila.className = "clave-botones"; fila.appendChild(cerrar);
    cont.append(vacio, ul, fila);
    var titulo = t(tipo === "seguidores" ? "Seguidores" : tipo === "amigos" ? "Amigos" : "Siguiendo") + " · " + nombrePerfil;
    var tj = window.Tarjeta.abrir(titulo, cont, cerrar);
    cerrar.addEventListener("click", tj.cerrar);
    A.listaSeguimiento(idPerfil, tipo).then(function (r) {
      if (!r.ok) { vacio.textContent = r.error === "privado" ? t("Este usuario no comparte esta lista.") : t("No se pudo cargar la lista."); return; }
      if (!r.usuarios.length) { vacio.textContent = t(tipo === "seguidores" ? "Todavía no tiene seguidores." : tipo === "amigos" ? "Todavía no tiene amigos." : "Todavía no sigue a nadie."); return; }
      vacio.hidden = true;
      r.usuarios.forEach(function (u) {
        var li = document.createElement("li");
        var a = document.createElement("a"); a.className = "seg-fila"; a.href = "perfil.html?id=" + encodeURIComponent(u.id);
        var av = document.createElement("span"); av.className = "u-avatar seg-avatar"; av.setAttribute("aria-hidden", "true"); pintarAvatar(av, u);
        var tx = document.createElement("span"); tx.className = "seg-texto";
        var n = document.createElement("span"); n.className = "seg-nombre"; n.textContent = u.nombre; var ir2 = A.iconoRol && A.iconoRol(u); if (ir2) n.appendChild(ir2); if (u.mejor && A.iconoMejor) n.appendChild(A.iconoMejor());
        var us = document.createElement("span"); us.className = "seg-usuario"; us.textContent = u.usuario ? "@" + u.usuario : "";
        tx.append(n, us); a.append(av, tx); li.appendChild(a); ul.appendChild(li);
      });
    });
  }
  function cargar() {
    return A.perfilUsuario(id).then(function (r) {
      if (!r.ok) {
        $("perfil-cab").hidden = true; $("perfil-extra").hidden = true; $("perfil-editar").hidden = true; $("perfil-seguir").hidden = true; $("perfil-amigo").hidden = true; $("perfil-mejor").hidden = true; $("perfil-rechazar").hidden = true; $("perfil-rechazar-mejor").hidden = true;
        mostrarMsg(r.error === "no_existe" ? t("Este perfil no existe o no está disponible.") : t("No se pudo cargar el perfil."));
        return;
      }
      miembro = r.miembro; pintar(r);
    });
  }
  // Cada 2 s solo se consulta el estado (ligero); si la persona deja de ser visible se vuelve a cargar todo
  function refrescarEstado() {
    if (document.hidden) return;
    if (!idPerfil) { cargar(); return; }
    A.estadosUsuarios().then(function (r) {
      if (!r.ok) return;
      var x = r.estados.filter(function (e) { return e.id === idPerfil; })[0];
      if (!x) { cargar(); return; }
      var on = x.estado === "online";
      $("perfil-punto").hidden = !on;
      var e = $("perfil-estado"); e.textContent = on ? t("En línea") : t("Desconectado"); e.classList.toggle("online", on);
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    if (!A.estado()) return;
    $("perfil-seguidores-btn").addEventListener("click", function () { abrirLista("seguidores"); });
    $("perfil-siguiendo-btn").addEventListener("click", function () { abrirLista("siguiendo"); });
    $("perfil-amigos-btn").addEventListener("click", function () { abrirLista("amigos"); });
    function accion(btn, acc) {
      if (ocupado || !idPerfil || btn.disabled) return;
      ocupado = true; btn.disabled = true;
      A.amistad(idPerfil, acc).then(function (r) {
        ocupado = false; btn.disabled = false;
        if (!r.ok && r.error === "demasiadas") {
          // Insistió demasiado tras rechazos: sub-notificación y botón desactivado (espera de 30 min)
          A.toast({ icono: A.iconos.reloj, tipo: "aviso", ms: 4000, texto: t("Has enviado demasiadas solicitudes en poco tiempo. Podrás volver a intentarlo en") + " " + Math.max(1, Math.ceil((r.espera || 1800) / 60)) + " min." });
          mostrarMsg(""); cargar(); return;
        }
        if (!r.ok) { mostrarMsg(t("No se pudo actualizar la amistad.")); return; }
        mostrarMsg(""); cargar();
        if (A.refrescarNotificaciones) A.refrescarNotificaciones();   // el contador de la barra se actualiza al momento
      });
    }
    $("perfil-desc-editar").addEventListener("click", function () { abrirEdicionDesc(true); });
    $("perfil-desc-agregar").addEventListener("click", function () { abrirEdicionDesc(true); });
    $("perfil-desc-cancelar").addEventListener("click", function () { abrirEdicionDesc(false); pintarDescripcion({ yo: true, descripcion: descActual }); });
    $("perfil-desc-input").addEventListener("input", contarDesc);
    $("perfil-desc-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var g = $("perfil-desc-guardar"), err = $("perfil-desc-error");
      g.disabled = true; err.textContent = "";
      A.guardarDescripcion($("perfil-desc-input").value).then(function (r) {
        g.disabled = false;
        if (!r.ok) { err.textContent = t(r.error === "larga" ? "La descripción es demasiado larga (máx. 300 caracteres)." : "No se pudo guardar la descripción."); return; }
        descActual = r.descripcion; editandoDesc = false;
        pintarDescripcion({ yo: true, descripcion: descActual });
      });
    });
    ["perfil-amigo", "perfil-rechazar", "perfil-mejor", "perfil-rechazar-mejor"].forEach(function (bid) {
      $(bid).addEventListener("click", function () { accion(this, this.dataset.accion); });
    });
    $("perfil-seguir").addEventListener("click", function () {
      if (ocupado || !idPerfil) return;
      var b = this, quiere = b.dataset.sigo !== "1";
      ocupado = true; b.disabled = true;
      A.seguir(idPerfil, quiere).then(function (r) {
        ocupado = false; b.disabled = false;
        if (!r.ok) { mostrarMsg(t("No se pudo actualizar el seguimiento.")); return; }
        mostrarMsg("");
        cargar(); // actualiza botón, contadores y estado
      });
    }); // sin sesión ni modo invitado se muestra el acceso
    cargar();
    setInterval(refrescarEstado, 2000);
    // Solicitudes aceptadas, rechazadas o recibidas: el perfil se actualiza solo
    window.addEventListener("notif-cambio", function () { if (!ocupado) cargar(); });
    setInterval(function () { if (!document.hidden && !ocupado && idPerfil) cargar(); }, 10000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) cargar(); });
  });
})();

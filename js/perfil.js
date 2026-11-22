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
    // La lista solo se puede abrir si su dueño la comparte con quien mira (los invitados no la ven)
    verLista = !!p.ver_seguim;
    [["perfil-seguidores-btn", "seguidores"], ["perfil-siguiendo-btn", "siguiendo"]].forEach(function (x) {
      var btn = $(x[0]);
      btn.disabled = !verLista;
      btn.classList.toggle("privada", !verLista);
      var txt = (x[1] === "seguidores" ? (ns === 1 ? t("seguidor") : t("seguidores")) : t("siguiendo"));
      btn.setAttribute("aria-label", verLista ? t("Ver la lista") + ": " + txt : txt + " (" + t("Lista privada") + ")");
      btn.title = verLista ? "" : t("Este usuario no comparte esta lista.");
    });
    var b = $("perfil-seguir");
    b.hidden = !(miembro && !p.yo);
    b.dataset.sigo = p.sigo ? "1" : "";
    b.setAttribute("aria-pressed", String(!!p.sigo));
    b.textContent = p.sigo ? t("Dejar de seguir") : t("Seguir");
    b.classList.toggle("secondary", !!p.sigo);
  }
  function pintar(r) {
    var p = r.perfil; idPerfil = p.id; nombrePerfil = p.nombre;
    $("perfil-cab").hidden = false;
    var firma = [p.nombre, p.avatar ? p.avatar.length : 0, p.usuario].join("|");
    if (firma !== ultimo) { pintarAvatar($("perfil-avatar"), p); ultimo = firma; }
    $("perfil-nombre").textContent = p.nombre;
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
    pintarSeguim(p);
    mostrarMsg("");
  }

  // Lista de seguidores / seguidos en una tarjeta flotante; cada fila lleva al perfil de esa persona
  function abrirLista(tipo) {
    if (!idPerfil || !verLista) return;
    var cont = document.createElement("div"); cont.className = "seg-lista-caja";
    var ul = document.createElement("ul"); ul.className = "seg-lista"; ul.setAttribute("aria-label", t(tipo === "seguidores" ? "Seguidores" : "Siguiendo"));
    var vacio = document.createElement("p"); vacio.className = "nota"; vacio.textContent = t("Cargando…");
    var cerrar = document.createElement("button"); cerrar.type = "button"; cerrar.className = "btn secondary"; cerrar.textContent = t("Cerrar");
    var fila = document.createElement("div"); fila.className = "clave-botones"; fila.appendChild(cerrar);
    cont.append(vacio, ul, fila);
    var titulo = t(tipo === "seguidores" ? "Seguidores" : "Siguiendo") + " · " + nombrePerfil;
    var tj = window.Tarjeta.abrir(titulo, cont, cerrar);
    cerrar.addEventListener("click", tj.cerrar);
    A.listaSeguimiento(idPerfil, tipo).then(function (r) {
      if (!r.ok) { vacio.textContent = r.error === "privado" ? t("Este usuario no comparte esta lista.") : t("No se pudo cargar la lista."); return; }
      if (!r.usuarios.length) { vacio.textContent = t(tipo === "seguidores" ? "Todavía no tiene seguidores." : "Todavía no sigue a nadie."); return; }
      vacio.hidden = true;
      r.usuarios.forEach(function (u) {
        var li = document.createElement("li");
        var a = document.createElement("a"); a.className = "seg-fila"; a.href = "perfil.html?id=" + encodeURIComponent(u.id);
        var av = document.createElement("span"); av.className = "u-avatar seg-avatar"; av.setAttribute("aria-hidden", "true"); pintarAvatar(av, u);
        var tx = document.createElement("span"); tx.className = "seg-texto";
        var n = document.createElement("span"); n.className = "seg-nombre"; n.textContent = u.nombre;
        var us = document.createElement("span"); us.className = "seg-usuario"; us.textContent = u.usuario ? "@" + u.usuario : "";
        tx.append(n, us); a.append(av, tx); li.appendChild(a); ul.appendChild(li);
      });
    });
  }
  function cargar() {
    return A.perfilUsuario(id).then(function (r) {
      if (!r.ok) {
        $("perfil-cab").hidden = true; $("perfil-extra").hidden = true; $("perfil-editar").hidden = true; $("perfil-seguir").hidden = true;
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
    document.addEventListener("visibilitychange", function () { if (!document.hidden) cargar(); });
  });
})();

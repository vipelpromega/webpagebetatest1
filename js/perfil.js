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
  var ultimo = "", idPerfil = null;
  function pintar(r) {
    var p = r.perfil; idPerfil = p.id;
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
    mostrarMsg("");
  }
  function cargar() {
    return A.perfilUsuario(id).then(function (r) {
      if (!r.ok) {
        $("perfil-cab").hidden = true; $("perfil-extra").hidden = true; $("perfil-editar").hidden = true;
        mostrarMsg(r.error === "no_existe" ? t("Este perfil no existe o no está disponible.") : t("No se pudo cargar el perfil."));
        return;
      }
      pintar(r);
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
    if (!A.estado()) return; // sin sesión ni modo invitado se muestra el acceso
    cargar();
    setInterval(refrescarEstado, 2000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) cargar(); });
  });
})();

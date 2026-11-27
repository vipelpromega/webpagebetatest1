// Página «Roles»: explica cada rol (insignia) de la página
(function () {
  "use strict";
  var A = window.Auth;
  var t = function (x) { return window.I18n && window.I18n.t ? window.I18n.t(x) : x; };
  var ul = document.getElementById("roles-lista");
  if (!A || !A.todosRoles || !ul) return;
  A.todosRoles().forEach(function (r) {
    var li = document.createElement("li"); li.className = "roles-pag-item"; li.id = r.id;
    var ico = A.iconoDeRol(r); ico.removeAttribute("title");
    var tx = document.createElement("div"); tx.className = "roles-pag-texto";
    var n = document.createElement("h2"); n.textContent = t(r.nombre);
    var d = document.createElement("p"); d.textContent = t(r.desc);
    var pr = document.createElement("span"); pr.className = "roles-pag-prio"; pr.textContent = t("Prioridad") + " " + r.prioridad;
    tx.append(n, d, pr); li.append(ico, tx); ul.appendChild(li);
  });
  function resaltar() {
    var prev = ul.querySelector(".destacado"); if (prev) prev.classList.remove("destacado");
    var h = (location.hash || "").slice(1), el = h && document.getElementById(h);
    if (el && el.parentNode === ul) { el.classList.add("destacado"); el.scrollIntoView({ block: "center" }); }
  }
  window.addEventListener("hashchange", resaltar); resaltar();
})();

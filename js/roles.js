// Página «Roles»: explica cada rol (insignia) de la página
(function () {
  "use strict";
  var A = window.Auth;
  var t = function (x) { return window.I18n && window.I18n.t ? window.I18n.t(x) : x; };
  var ul = document.getElementById("roles-lista");
  if (!A || !A.todosRoles || !ul) return;
  A.todosRoles().then(function (roles) { roles.forEach(function (r) {
    var li = document.createElement("li"); li.className = "roles-pag-item"; li.id = r.id;
    var ico = A.iconoDeRol(r); ico.removeAttribute("title");
    var tx = document.createElement("div"); tx.className = "roles-pag-texto";
    var n = document.createElement("h2"); n.textContent = t(r.nombre);
    var d = document.createElement("p"); d.textContent = r.descripcion ? t(r.descripcion) : ""; d.hidden = !r.descripcion;
    tx.append(n, d); li.append(ico, tx); ul.appendChild(li);
  }); resaltar(); });
  function resaltar() {
    var prev = ul.querySelector(".destacado"); if (prev) prev.classList.remove("destacado");
    var h = (location.hash || "").slice(1), el = h && document.getElementById(h);
    if (el && el.parentNode === ul) { el.classList.add("destacado"); el.scrollIntoView({ block: "center" }); }
  }
  window.addEventListener("hashchange", resaltar);
})();

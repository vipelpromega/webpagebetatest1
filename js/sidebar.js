// Barra lateral expandible. Se carga en <head>: el estado guardado se aplica
// antes de pintar la página para evitar parpadeos.
(function () {
  var KEY = "barra";
  var root = document.documentElement;

  try {
    if (localStorage.getItem(KEY) === "1") root.classList.add("sb-open");
  } catch (e) { /* sin almacenamiento */ }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("sidebar-toggle");
    if (!btn) return;
    var label = btn.querySelector(".label");

    function sync() {
      var open = root.classList.contains("sb-open");
      var text = open ? "Contraer barra" : "Expandir barra";
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", text);
      btn.setAttribute("data-tooltip", text);
      if (label) label.textContent = open ? "Contraer" : "Expandir";
    }

    btn.addEventListener("click", function () {
      var open = root.classList.toggle("sb-open");
      try { localStorage.setItem(KEY, open ? "1" : "0"); } catch (e) { /* sin almacenamiento */ }
      sync();
    });

    sync();
  });
})();

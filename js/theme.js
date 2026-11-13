// Aplica el tema guardado lo antes posible (se carga en <head>) para evitar parpadeos.
(function () {
  var KEY = "tema";
  var DEFAULT = "dark";

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : DEFAULT;
    } catch (e) {
      return DEFAULT;
    }
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function set(theme) {
    if (theme !== "light" && theme !== "dark") return;
    apply(theme);
    try { localStorage.setItem(KEY, theme); } catch (e) { /* sin almacenamiento */ }
  }

  apply(read());
  window.Theme = { get: read, set: set };
})();

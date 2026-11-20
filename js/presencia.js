// Presencia: mientras la página está abierta y visible, avisa al servidor que estás en línea.
(function () {
  var PERIODO = 20000, ultimo = 0;
  function enviar() {
    if (!window.Auth || window.Auth.estado() !== "usuario" || document.hidden) return;
    if (Date.now() - ultimo < 8000) return;
    ultimo = Date.now();
    window.Auth.latido();
  }
  document.addEventListener("DOMContentLoaded", function () {
    enviar();
    setInterval(enviar, PERIODO);
    document.addEventListener("visibilitychange", enviar);
    window.addEventListener("focus", enviar);
  });
})();

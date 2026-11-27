// Presencia: mientras la página está abierta y visible, avisa al servidor que estás en línea.
// Al cerrarla avisa para que los demás te vean desconectado al momento (salvo que haya otra pestaña abierta).
(function () {
  var PERIODO = 20000, ultimo = 0;
  var KT = "presencia-pestanas", ID = Math.random().toString(36).slice(2);
  function activo() { return window.Auth && window.Auth.estado() === "usuario"; }
  function enviar() {
    if (!activo()) return;   // también con la pestaña en segundo plano: cambiar de pestaña no te desconecta
    if (Date.now() - ultimo < 10000) return;
    ultimo = Date.now();
    window.Auth.latido();
  }
  // Registro de pestañas abiertas (para no marcar desconectado si queda otra)
  function leerPestanas() { try { return JSON.parse(localStorage.getItem(KT) || "{}") || {}; } catch (e) { return {}; } }
  function guardarPestanas(o) { try { localStorage.setItem(KT, JSON.stringify(o)); } catch (e) { /* nada */ } }
  function marcar() {
    var o = leerPestanas(), ahora = Date.now();
    Object.keys(o).forEach(function (k) { if (ahora - o[k] > 90000) delete o[k]; });
    o[ID] = ahora; guardarPestanas(o);
  }
  var salio = false;
  function saliendo() {
    if (salio || !activo()) return;
    var o = leerPestanas(), ahora = Date.now();
    delete o[ID]; guardarPestanas(o);
    var otras = Object.keys(o).some(function (k) { return ahora - o[k] < 90000; });
    if (otras) return;
    salio = true;
    window.Auth.desconectando();
  }
  document.addEventListener("DOMContentLoaded", function () {
    marcar(); enviar();
    setInterval(marcar, 5000);
    setInterval(enviar, PERIODO);
    document.addEventListener("visibilitychange", function () { salio = false; enviar(); });
    window.addEventListener("focus", function () { salio = false; enviar(); });
    window.addEventListener("pageshow", function () { salio = false; marcar(); ultimo = 0; enviar(); });
    window.addEventListener("pagehide", saliendo);
  });
})();

// Fondo de la página: ninguno (normal), degradados, patrones o una imagen propia (solo este dispositivo).
(function () {
  var KEY = "fondo", KEY_IMG = "fondo-img";
  var root = document.documentElement;
  var PRESETS = ["ninguno", "aurora", "atardecer", "oceano", "bosque", "noche"];

  function imagen() {
    try { var v = localStorage.getItem(KEY_IMG); return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(v || "") ? v : null; } catch (e) { return null; }
  }
  function leer() {
    var v = "ninguno";
    try { v = localStorage.getItem(KEY) || "ninguno"; } catch (e) { /* nada */ }
    if (v === "imagen") return imagen() ? "imagen" : "ninguno";
    return PRESETS.indexOf(v) >= 0 ? v : "ninguno";
  }
  function aplicar() {
    var v = leer();
    if (v === "ninguno") { root.removeAttribute("data-fondo"); root.style.removeProperty("--fondo-img"); return; }
    root.setAttribute("data-fondo", v);
    if (v === "imagen") root.style.setProperty("--fondo-img", 'url("' + imagen() + '")'); else root.style.removeProperty("--fondo-img");
  }
  function avisar() { try { window.dispatchEvent(new Event("prefs-cambio")); } catch (e) { /* nada */ } }
  function poner(v, silencioso) {
    if (v !== "imagen" && PRESETS.indexOf(v) < 0) return false;
    try { localStorage.setItem(KEY, v); } catch (e) { return false; }
    aplicar(); if (!silencioso) avisar();
    return true;
  }
  function ponerImagen(url) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(url)) return false;
    try { localStorage.setItem(KEY_IMG, url); localStorage.setItem(KEY, "imagen"); } catch (e) { return false; } // sin espacio
    aplicar(); avisar();
    return true;
  }
  function restablecer() {
    try { localStorage.removeItem(KEY); localStorage.removeItem(KEY_IMG); } catch (e) { /* nada */ }
    aplicar(); avisar();
  }
  aplicar();
  window.Fondo = { get: leer, set: poner, setImagen: ponerImagen, restablecer: restablecer, hayImagen: function () { return !!imagen(); }, PRESETS: PRESETS };
})();

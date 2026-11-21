// Preferencias que viajan con la cuenta: tema, color de acento, idioma, fondo (preset) y difuminado.
// Con la sesión iniciada se guardan en el servidor y se aplican en cualquier dispositivo.
(function () {
  if (!window.Auth || !window.Theme) return;
  var K = "prefs-sync";
  var aplicando = false, temporizador = null, estado = "sin-cuenta";
  var oyentes = [];

  function avisar(e) { estado = e; oyentes.forEach(function (f) { try { f(e); } catch (x) { /* nada */ } }); }

  function local() {
    var p = { tema: window.Theme.get(), acento: window.Theme.getAccent() || null, blur: window.Theme.getBlur() };
    if (window.I18n) p.idioma = window.I18n.get();
    if (window.Fondo && window.Fondo.get() !== "imagen") p.fondo = window.Fondo.get();
    return p;
  }
  function firma(p) {
    return JSON.stringify([p.tema || null, p.acento ? [p.acento.tipo, p.acento.c1, p.acento.c2 || null, Number(p.acento.ang) || 135] : null, p.idioma || null, p.fondo || null, p.blur === false ? 0 : 1]);
  }
  function leerSync() { try { return JSON.parse(localStorage.getItem(K) || "null"); } catch (e) { return null; } }
  function ponerSync(u, f) { try { localStorage.setItem(K, JSON.stringify({ u: u, f: f })); } catch (e) { /* nada */ } }
  function usuario() { var u = window.Auth.usuario ? window.Auth.usuario() : null; return u ? u.usuario : null; }

  function guardarYa() {
    clearTimeout(temporizador); temporizador = null;
    var u = usuario(); if (!u) return null;
    var p = local();
    avisar("guardando");
    return window.Auth.guardarPreferenciasDeCuenta(p).then(function (r) {
      if (r.ok) { ponerSync(u, firma(p)); avisar("guardado"); } else avisar("error");
    }, function () { avisar("error"); });
  }
  function programar() {
    if (aplicando || !usuario()) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(guardarYa, 700);
  }
  window.addEventListener("prefs-cambio", programar);

  // Aplica lo que viene del servidor; devuelve true si hay que recargar (cambió el idioma)
  function aplicarRemotas(r) {
    var recargar = false;
    aplicando = true;
    if (r.tema && r.tema !== window.Theme.get()) window.Theme.set(r.tema);
    var ac = r.acento || null, ca = window.Theme.getAccent();
    if (JSON.stringify(ac) !== JSON.stringify(ca ? { tipo: ca.tipo, c1: ca.c1, c2: ca.c2, ang: Number(ca.ang) } : null)) window.Theme.setAccent(ac);
    if (typeof r.blur === "boolean" && r.blur !== window.Theme.getBlur()) window.Theme.setBlur(r.blur);
    if (window.Fondo && r.fondo && window.Fondo.get() !== "imagen" && r.fondo !== window.Fondo.get()) window.Fondo.set(r.fondo, true);
    if (window.I18n && r.idioma && r.idioma !== window.I18n.get()) { try { localStorage.setItem("idioma", r.idioma); } catch (e) { /* nada */ } recargar = true; }
    aplicando = false;
    return recargar;
  }

  function sincronizar() {
    var u = usuario();
    if (!u) { avisar("sin-cuenta"); return; }
    avisar("guardando");
    window.Auth.preferenciasDeCuenta().then(function (r) {
      if (!r.ok) { avisar("error"); return; }
      var remotas = r.preferencias, vacia = Object.keys(remotas).length === 0;
      var s = leerSync(), p = local();
      var cambioLocal = !s || s.u !== u ? vacia : s.f !== firma(p);   // cambió algo aquí sin guardar
      if (vacia || cambioLocal) {
        guardarYa();
        return;
      }
      var recargar = aplicarRemotas(remotas);
      ponerSync(u, firma(local()));
      if (recargar) { location.reload(); return; }
      avisar("guardado");
    }, function () { avisar("error"); });
  }

  window.Preferencias = {
    guardarYa: guardarYa,
    estado: function () { return estado; },
    alCambiar: function (f) { oyentes.push(f); f(estado); },
    sincronizar: sincronizar
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sincronizar); else sincronizar();
})();

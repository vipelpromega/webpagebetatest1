// Tarjeta flotante (ventana sobre la página), compartida por Configuración y Perfil.
// Window.Tarjeta.abrir(titulo, elemento, elementoConFoco, alCerrar) -> { cerrar }.
// Escape, clic fuera o cerrar() la cierran; el foco se queda dentro y vuelve al botón que la abrió.
(function () {
  "use strict";
  function abrirTarjeta(titulo, contenido, foco, alCerrar) {
    const abridor = document.activeElement;
    const id = "tarjeta-titulo-" + Math.random().toString(36).slice(2, 7);
    const h2 = document.createElement("h2"); h2.id = id; h2.textContent = window.I18n ? window.I18n.t(titulo) : titulo;
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-flotante"; tarjeta.setAttribute("role", "dialog");
    tarjeta.setAttribute("aria-modal", "true"); tarjeta.setAttribute("aria-labelledby", id);
    tarjeta.append(h2, contenido);
    const fondo = document.createElement("div"); fondo.className = "tarjeta-fondo"; fondo.appendChild(tarjeta);
    const cerrar = () => {
      window.removeEventListener("keydown", tecla, true);
      fondo.remove();
      if (alCerrar) alCerrar();
      if (abridor && abridor.focus && document.body.contains(abridor)) abridor.focus();
    };
    function tecla(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); }
      else if (e.key === "Tab") {
        const f = [...tarjeta.querySelectorAll("input,button,select")].filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    }
    window.addEventListener("keydown", tecla, true);
    fondo.addEventListener("pointerdown", (e) => { if (e.target === fondo) cerrar(); });
    document.body.appendChild(fondo);
    if (foco) foco.focus();
    return { cerrar };
  }
  window.Tarjeta = { abrir: abrirTarjeta };
})();

// Listas desplegables con el estilo de la página: cada <select> dentro de .desplegable se muestra como un botón
// y una lista flotante propia. El <select> original sigue siendo la fuente de verdad (valor, evento "change"),
// así que el resto del código no cambia. Teclado: flechas, Inicio/Fin, Enter/Espacio, Escape y escribir para saltar.
(function () {
  "use strict";
  var abierta = null; // { cerrar }
  var descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");

  function mejorar(caja) {
    var sel = caja.querySelector("select");
    if (!sel || caja.classList.contains("desplegable-lista")) return;
    caja.classList.add("desplegable-lista");
    sel.classList.add("desplegable-nativo");
    sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true");

    var boton = document.createElement("button");
    boton.type = "button"; boton.className = "desplegable-boton";
    boton.setAttribute("role", "combobox"); boton.setAttribute("aria-haspopup", "listbox"); boton.setAttribute("aria-expanded", "false");
    var etiqueta = sel.getAttribute("aria-label");
    if (etiqueta) boton.setAttribute("aria-label", etiqueta);
    var texto = document.createElement("span"); texto.className = "desplegable-texto";
    boton.appendChild(texto);
    caja.insertBefore(boton, sel);

    function sincronizar() {
      var o = sel.options[sel.selectedIndex];
      texto.textContent = o ? o.textContent : "";
    }
    // Si otro código cambia sel.value, el botón se actualiza solo
    Object.defineProperty(sel, "value", {
      configurable: true,
      get: function () { return descriptor.get.call(this); },
      set: function (v) { descriptor.set.call(this, v); sincronizar(); }
    });
    sel.addEventListener("change", sincronizar);
    sincronizar();

    var lista = null, activa = -1, busca = "", tBusca = 0;
    function opciones() { return Array.prototype.slice.call(sel.options); }
    function marcar(i, desplazar) {
      var items = lista.children;
      if (activa >= 0 && items[activa]) items[activa].classList.remove("activa");
      activa = Math.max(0, Math.min(items.length - 1, i));
      var it = items[activa];
      it.classList.add("activa");
      boton.setAttribute("aria-activedescendant", it.id);
      if (desplazar !== false && it.scrollIntoView) it.scrollIntoView({ block: "nearest" });
    }
    function colocar() {
      var r = boton.getBoundingClientRect();
      var alto = Math.min(lista.scrollHeight, 280);
      var abajo = window.innerHeight - r.bottom - 8, arriba = r.top - 8;
      var haciaArriba = abajo < alto && arriba > abajo;
      lista.style.minWidth = r.width + "px";
      lista.style.maxHeight = Math.max(120, Math.min(280, haciaArriba ? arriba : abajo)) + "px";
      lista.style.left = Math.max(8, Math.min(r.left, window.innerWidth - lista.offsetWidth - 8)) + "px";
      if (haciaArriba) { lista.style.top = ""; lista.style.bottom = (window.innerHeight - r.top + 4) + "px"; lista.classList.add("arriba"); }
      else { lista.style.bottom = ""; lista.style.top = (r.bottom + 4) + "px"; lista.classList.remove("arriba"); }
    }
    function elegir(i) {
      var cambio = sel.selectedIndex !== i;
      sel.selectedIndex = i; sincronizar();
      cerrar(true);
      if (cambio) sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    function abrir() {
      if (sel.disabled) return;
      if (abierta) abierta.cerrar(false);
      lista = document.createElement("ul");
      lista.className = "desplegable-menu"; lista.setAttribute("role", "listbox");
      if (etiqueta) lista.setAttribute("aria-label", etiqueta);
      opciones().forEach(function (o, i) {
        var li = document.createElement("li");
        li.className = "desplegable-op"; li.setAttribute("role", "option"); li.id = (sel.id || "dsp") + "-op" + i;
        li.setAttribute("aria-selected", String(o.selected));
        if (o.selected) li.classList.add("elegida");
        li.textContent = o.textContent;
        li.addEventListener("pointerdown", function (e) { e.preventDefault(); });
        li.addEventListener("click", function () { elegir(i); });
        li.addEventListener("pointermove", function () { if (activa !== i) marcar(i, false); });
        lista.appendChild(li);
      });
      document.body.appendChild(lista);
      boton.setAttribute("aria-expanded", "true"); caja.classList.add("abierta");
      colocar(); marcar(sel.selectedIndex, true);
      window.addEventListener("resize", alMover); window.addEventListener("scroll", alMover, true);
      document.addEventListener("pointerdown", fuera, true);
      abierta = { cerrar: cerrar };
    }
    function alMover(e) { if (e && e.target && lista && lista.contains(e.target)) return; colocar(); }
    function fuera(e) { if (lista && !lista.contains(e.target) && !boton.contains(e.target)) cerrar(false); }
    function cerrar(enfocar) {
      if (!lista) return;
      window.removeEventListener("resize", alMover); window.removeEventListener("scroll", alMover, true);
      document.removeEventListener("pointerdown", fuera, true);
      lista.remove(); lista = null; activa = -1; abierta = null;
      boton.setAttribute("aria-expanded", "false"); boton.removeAttribute("aria-activedescendant"); caja.classList.remove("abierta");
      if (enfocar) boton.focus();
    }
    boton.addEventListener("click", function () { if (lista) cerrar(false); else abrir(); });
    boton.addEventListener("keydown", function (e) {
      var k = e.key, n = sel.options.length;
      if (!lista) {
        if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") { e.preventDefault(); abrir(); }
        return;
      }
      if (k === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(true); }
      else if (k === "ArrowDown") { e.preventDefault(); marcar((activa + 1) % n); }
      else if (k === "ArrowUp") { e.preventDefault(); marcar((activa - 1 + n) % n); }
      else if (k === "Home") { e.preventDefault(); marcar(0); }
      else if (k === "End") { e.preventDefault(); marcar(n - 1); }
      else if (k === "Enter" || k === " ") { e.preventDefault(); elegir(activa); }
      else if (k === "Tab") { cerrar(false); }
      else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        clearTimeout(tBusca); busca += k.toLowerCase(); tBusca = setTimeout(function () { busca = ""; }, 700);
        var ops = opciones();
        for (var j = 0; j < ops.length; j++) { if (ops[j].textContent.toLowerCase().indexOf(busca) === 0) { marcar(j); break; } }
      }
    });
  }

  function iniciar() { Array.prototype.forEach.call(document.querySelectorAll(".desplegable"), mejorar); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();

// Selector de color propio (reemplaza al del navegador): cuadro de saturación/brillo, barra de tono, código #rrggbb y paleta.
// SelectorColor.crear(inicial, etiqueta, alCambiar) -> nodo con .valor, .poner(hex) (avisa) y .fijar(hex) (no avisa).
(function () {
  "use strict";
  var PALETA = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#1d8cf8", "#6366f1", "#8b5cf6", "#a259ff", "#d946ef", "#ec4899", "#f43f5e", "#ffffff", "#cbd5e1", "#64748b", "#1e293b", "#000000"];
  function el(tag, cls, attrs) {
    var n = document.createElement(tag); if (cls) n.className = cls;
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    for (var i = 3; i < arguments.length; i++) if (arguments[i]) n.appendChild(arguments[i]);
    return n;
  }
  function hexARgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function rgbAHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, mx ? d / mx : 0, mx];
  }
  function hsvAHex(h, sa, v) {
    var f = function (n) { var k = (n + h / 60) % 6; return v - v * sa * Math.max(0, Math.min(k, 4 - k, 1)); };
    return "#" + [f(5), f(3), f(1)].map(function (x) { var n = Math.round(x * 255).toString(16); return n.length < 2 ? "0" + n : n; }).join("");
  }
  var RE = /^#[0-9a-fA-F]{6}$/;
  function crear(inicial, etiqueta, alCambiar) {
    var hex = RE.test(inicial || "") ? inicial : "#0078d4", hsv = rgbAHsv.apply(null, hexARgb(hex));
    var txt = el("span", "cp-hex-txt");
    var muestra = el("button", "cp-muestra", { type: "button", "aria-label": etiqueta, "aria-haspopup": "dialog", "aria-expanded": "false" }, el("span", "cp-color"), txt);
    var punto = el("span", "cp-punto");
    var area = el("div", "cp-area", { tabindex: "0", role: "slider", "aria-label": "Saturación y brillo" }, punto);
    var tono = el("input", "cp-tono", { type: "range", min: "0", max: "360", step: "1", "aria-label": "Tono" });
    var campo = el("input", "f-input cp-hex", { maxlength: "7", spellcheck: "false", autocomplete: "off", "aria-label": "Código del color" });
    var paleta = el("div", "cp-paleta");
    var pop = el("div", "cp-pop", { role: "dialog", "aria-label": etiqueta }, area, tono, el("div", "cp-fila", {}, campo), paleta);
    pop.hidden = true;
    var raiz = el("span", "cp", {}, muestra, pop);
    function pintar(sinCampo) {
      hex = hsvAHex(hsv[0], hsv[1], hsv[2]);
      raiz.style.setProperty("--cp", hex);
      area.style.setProperty("--tono", "hsl(" + Math.round(hsv[0]) + ",100%,50%)");
      punto.style.left = (hsv[1] * 100) + "%"; punto.style.top = ((1 - hsv[2]) * 100) + "%";
      tono.value = Math.round(hsv[0]);
      txt.textContent = hex.toUpperCase();
      if (!sinCampo) campo.value = hex;
      raiz.valor = hex;
    }
    function aviso() { if (alCambiar) alCambiar(hex); }
    function elegir(h, avisar) { hsv = rgbAHsv.apply(null, hexARgb(h)); pintar(); if (avisar !== false) aviso(); }
    PALETA.forEach(function (c) {
      var b = el("button", "cp-p", { type: "button", "aria-label": c, title: c }); b.style.background = c;
      b.addEventListener("click", function () { elegir(c); });
      paleta.appendChild(b);
    });
    function arrastre(e) {
      var r = area.getBoundingClientRect();
      hsv[1] = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      hsv[2] = 1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      pintar(); aviso();
    }
    area.addEventListener("pointerdown", function (e) { area.setPointerCapture(e.pointerId); arrastre(e); area.onpointermove = arrastre; });
    area.addEventListener("pointerup", function () { area.onpointermove = null; });
    area.addEventListener("keydown", function (e) {
      var d = { ArrowLeft: [-.03, 0], ArrowRight: [.03, 0], ArrowUp: [0, .03], ArrowDown: [0, -.03] }[e.key];
      if (!d) return; e.preventDefault();
      hsv[1] = Math.min(1, Math.max(0, hsv[1] + d[0])); hsv[2] = Math.min(1, Math.max(0, hsv[2] + d[1]));
      pintar(); aviso();
    });
    tono.addEventListener("input", function () { hsv[0] = +tono.value; if (!hsv[1]) hsv[1] = 1; if (!hsv[2]) hsv[2] = 1; pintar(); aviso(); });
    campo.addEventListener("input", function () {
      var v = campo.value.trim(); if (v[0] !== "#") v = "#" + v;
      if (RE.test(v)) { hsv = rgbAHsv.apply(null, hexARgb(v)); pintar(true); aviso(); campo.classList.remove("malo"); }
      else campo.classList.add("malo");
    });
    // El panel se cuelga del <body> mientras está abierto (position: fixed) para que ninguna tarjeta con overflow lo recorte
    function colocar() {
      var r = muestra.getBoundingClientRect(), w = pop.offsetWidth || 236, h = pop.offsetHeight || 300;
      var izq = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      var abajo = r.bottom + 6, arriba = r.top - h - 6;
      pop.style.left = izq + "px"; pop.style.top = (abajo + h > window.innerHeight - 8 && arriba > 8 ? arriba : abajo) + "px";
    }
    function abrir(si) {
      if (si === !pop.hidden) return;
      muestra.setAttribute("aria-expanded", String(si));
      if (si) {
        document.body.appendChild(pop); pop.hidden = false; pop.classList.add("cp-flota"); campo.value = hex; colocar();
        document.addEventListener("pointerdown", fuera, true); document.addEventListener("keydown", tecla, true);
        window.addEventListener("resize", colocar); window.addEventListener("scroll", colocar, true);
      } else {
        pop.hidden = true; pop.classList.remove("cp-flota"); raiz.appendChild(pop);
        document.removeEventListener("pointerdown", fuera, true); document.removeEventListener("keydown", tecla, true);
        window.removeEventListener("resize", colocar); window.removeEventListener("scroll", colocar, true);
      }
    }
    function fuera(e) { if (!pop.contains(e.target) && !muestra.contains(e.target)) abrir(false); }
    function tecla(e) { if (e.key === "Escape") { e.stopPropagation(); abrir(false); muestra.focus(); } }
    muestra.addEventListener("click", function () { abrir(pop.hidden); });
    raiz.poner = function (h) { elegir(h); };
    raiz.fijar = function (h) { if (RE.test(h || "")) elegir(h, false); };
    pintar();
    return raiz;
  }
  window.SelectorColor = { crear: crear };
})();

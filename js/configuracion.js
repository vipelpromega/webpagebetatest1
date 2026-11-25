(() => {
  // ---------- Tarjetas plegables (Fondo, Color de acento, Sesiones activas): solo una flecha al costado ----------
  document.querySelectorAll("[data-plegable]").forEach((tarjeta) => {
    const cab = tarjeta.querySelector(".vis-cab"), cuerpo = tarjeta.querySelector(".vis-despl");
    cab.addEventListener("click", () => {
      const abrir = !tarjeta.classList.contains("abierta");
      tarjeta.classList.toggle("abierta", abrir); cab.setAttribute("aria-expanded", String(abrir));
      if (abrir) cuerpo.removeAttribute("inert"); else cuerpo.setAttribute("inert", "");
    });
  });

  // ---------- Tema ----------
  const temaSel = document.getElementById("tema-select");
  const refresh = () => { temaSel.value = window.Theme.get(); };
  temaSel.addEventListener("change", () => { window.Theme.set(temaSel.value); refresh(); });
  refresh();

  // ---------- Difuminado de las tarjetas ----------
  const blurChk = document.getElementById("blur-chk");
  const refreshBlur = () => { blurChk.checked = window.Theme.getBlur(); };
  blurChk.addEventListener("change", () => window.Theme.setBlur(blurChk.checked));
  refreshBlur();
  // Si las preferencias de la cuenta cambian algo al cargar, los controles lo reflejan
  window.addEventListener("prefs-cambio", () => { refresh(); refreshBlur(); });

  // ---------- Idioma ----------
  const idiomaSel = document.getElementById("idioma-select");
  if (idiomaSel && window.I18n) {
    idiomaSel.value = window.I18n.get();
    idiomaSel.addEventListener("change", () => { if (idiomaSel.value !== window.I18n.get()) window.I18n.set(idiomaSel.value); });
  }

  // ---------- Color de acento ----------
  const RECOM = [
    { n: "Azul", t: "solido", c1: "#0078d4" }, { n: "Violeta", t: "solido", c1: "#8764b8" },
    { n: "Rosa", t: "solido", c1: "#e3008c" }, { n: "Rojo", t: "solido", c1: "#e81123" },
    { n: "Naranja", t: "solido", c1: "#f7630c" }, { n: "Dorado", t: "solido", c1: "#ffb900" },
    { n: "Verde", t: "solido", c1: "#10893e" }, { n: "Turquesa", t: "solido", c1: "#00b7c3" },
    { n: "Océano", t: "degradado", c1: "#0078d4", c2: "#00b7c3", ang: 135 },
    { n: "Atardecer", t: "degradado", c1: "#f7630c", c2: "#e3008c", ang: 135 },
    { n: "Neón", t: "degradado", c1: "#8764b8", c2: "#00b7c3", ang: 135 },
    { n: "Fuego", t: "degradado", c1: "#ffb900", c2: "#e81123", ang: 90 },
    { n: "Bosque", t: "degradado", c1: "#10893e", c2: "#00b7c3", ang: 180 },
    { n: "Caramelo", t: "degradado", c1: "#e3008c", c2: "#8764b8", ang: 45 }
  ];
  const fondo = (a) => a.t === "degradado" || a.tipo === "degradado"
    ? `linear-gradient(${a.ang || 135}deg, ${a.c1}, ${a.c2})` : a.c1;
  const recom = document.getElementById("acento-recom");
  const c1 = document.getElementById("acento-c1");
  const c2 = document.getElementById("acento-c2");
  const c2caja = document.getElementById("acento-c2-caja");
  const vista = document.getElementById("acento-vista");
  const tipoBtns = document.querySelectorAll("[data-acento-tipo]");
  const angSel = document.getElementById("acento-ang-select");
  const angCaja = document.getElementById("acento-ang");
  let actual = window.Theme.getAccent() || { tipo: "solido", c1: "#0078d4", c2: "#00b7c3", ang: 135 };
  const muestras = RECOM.map((r) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "muestra";
    b.setAttribute("aria-label", r.n); b.setAttribute("data-tooltip", r.n); b.setAttribute("aria-pressed", "false");
    b.style.background = fondo(r);
    b.addEventListener("click", () => aplicar({ tipo: r.t, c1: r.c1, c2: r.c2 || r.c1, ang: r.ang || 135 }));
    recom.appendChild(b);
    return b;
  });
  function pintarAcento() {
    const grad = actual.tipo === "degradado";
    tipoBtns.forEach((b) => { const a = b.dataset.acentoTipo === actual.tipo; b.classList.toggle("selected", a); b.setAttribute("aria-pressed", String(a)); });
    angSel.value = String(Number(actual.ang) || 135);
    c2caja.hidden = !grad; angCaja.hidden = !grad;
    c1.value = actual.c1; c2.value = actual.c2 || actual.c1;
    vista.style.background = fondo(actual);
    const guardada = window.Theme.getAccent();
    muestras.forEach((m, i) => {
      const r = RECOM[i];
      const igual = !!guardada && guardada.tipo === r.t && guardada.c1.toLowerCase() === r.c1 &&
        (r.t === "solido" || (guardada.c2.toLowerCase() === r.c2 && Number(guardada.ang) === r.ang));
      m.classList.toggle("selected", igual); m.setAttribute("aria-pressed", String(igual));
    });
  }
  function aplicar(a) { actual = a; window.Theme.setAccent(a); pintarAcento(); }
  tipoBtns.forEach((b) => b.addEventListener("click", () => aplicar(Object.assign({}, actual, { tipo: b.dataset.acentoTipo, c2: actual.c2 || actual.c1 }))));
  angSel.addEventListener("change", () => aplicar(Object.assign({}, actual, { ang: Number(angSel.value) })));
  c1.addEventListener("input", () => aplicar(Object.assign({}, actual, { c1: c1.value })));
  c2.addEventListener("input", () => aplicar(Object.assign({}, actual, { c2: c2.value })));
  document.getElementById("acento-reset").addEventListener("click", () => {
    window.Theme.setAccent(null);
    actual = { tipo: "solido", c1: "#0078d4", c2: "#00b7c3", ang: 135 };
    pintarAcento();
  });
  pintarAcento();


  // ---------- Fondo ----------
  const NOMBRES_FONDO = { ninguno: "Normal", aurora: "Aurora", atardecer: "Atardecer", oceano: "Océano", bosque: "Bosque", noche: "Noche" };
  const fondosCaja = document.getElementById("fondos");
  const fondoMsg = document.getElementById("fondo-msg");
  const opciones = [];
  function crearOpcion(id, etiqueta) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "fondo-op"; b.dataset.fondoId = id; b.setAttribute("aria-pressed", "false");
    // Miniatura al estilo de Windows 11: el fondo y, encima, una ventanita con la barra del color de acento
    const v = document.createElement("span"); v.className = "fondo-vista";
    const papel = document.createElement("span"); papel.className = "papel"; papel.setAttribute("aria-hidden", "true");
    if (id !== "ninguno") papel.setAttribute("data-fondo-vista", id);
    const ven = document.createElement("span"); ven.className = "mini-ventana"; ven.setAttribute("aria-hidden", "true");
    const barra = document.createElement("span"); barra.className = "mini-barra";
    ven.appendChild(barra); v.append(papel, ven);
    const t = document.createElement("span"); t.className = "fondo-nombre"; t.textContent = etiqueta;
    b.append(v, t);
    b.addEventListener("click", () => { fondoMsg.textContent = ""; Fondo.set(id); pintarFondo(); });
    fondosCaja.appendChild(b); opciones.push(b);
    return b;
  }
  window.Fondo.PRESETS.forEach((id) => crearOpcion(id, NOMBRES_FONDO[id]));
  const opImg = crearOpcion("imagen", "Mi imagen");
  function pintarFondo() {
    const a = Fondo.get();
    opciones.forEach((b) => { const s = b.dataset.fondoId === a; b.classList.toggle("selected", s); b.setAttribute("aria-pressed", String(s)); });
    opImg.hidden = !Fondo.hayImagen();
    // La miniatura de «Mi imagen» usa la foto guardada aunque ahora esté elegido otro fondo
    try { const im = localStorage.getItem("fondo-img"); if (im && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(im)) opImg.querySelector(".papel").style.setProperty("--fondo-img", 'url("' + im + '")'); } catch (e) { /* nada */ }
    document.getElementById("fondo-reset").disabled = a === "ninguno" && !Fondo.hayImagen();
  }
  document.getElementById("fondo-reset").addEventListener("click", () => { fondoMsg.textContent = ""; Fondo.restablecer(); pintarFondo(); });
  const fondoArchivo = document.getElementById("fondo-archivo");
  document.getElementById("fondo-subir").addEventListener("click", () => fondoArchivo.click());
  // Reduce la imagen para que quepa en el navegador (máx. 1600 px, JPEG)
  function reducir(archivo) {
    return new Promise((ok, mal) => {
      if (!/^image\/(png|jpeg|webp)$/.test(archivo.type)) { mal(new Error("tipo")); return; }
      const lector = new FileReader();
      lector.onerror = () => mal(new Error("lectura"));
      lector.onload = () => {
        const img = new Image();
        img.onerror = () => mal(new Error("imagen"));
        img.onload = () => {
          const esc = Math.min(1, 1600 / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * esc)); c.height = Math.max(1, Math.round(img.height * esc));
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          let q = 0.82, url = c.toDataURL("image/jpeg", q);
          while (url.length > 1200000 && q > 0.4) { q -= 0.1; url = c.toDataURL("image/jpeg", q); }
          url.length > 1200000 ? mal(new Error("grande")) : ok(url);
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  }
  fondoArchivo.addEventListener("change", async () => {
    const f = fondoArchivo.files && fondoArchivo.files[0];
    fondoArchivo.value = "";
    if (!f) return;
    fondoMsg.textContent = "";
    try {
      const url = await reducir(f);
      if (!Fondo.setImagen(url)) fondoMsg.textContent = "La imagen es demasiado grande para guardarla en este navegador.";
    } catch (e) { fondoMsg.textContent = e.message === "grande" ? "La imagen es demasiado grande." : "Elige una imagen PNG, JPG o WebP."; }
    pintarFondo();
  });
  pintarFondo();

  // ---------- Subsecciones (Apariencia / Cuenta) ----------
  const tabs = Array.from(document.querySelectorAll("[data-tab]"));
  function mostrarTab(nombre, enfocar) {
    tabs.forEach((t) => {
      const activa = t.dataset.tab === nombre;
      t.setAttribute("aria-selected", String(activa));
      t.tabIndex = activa ? 0 : -1;
      const panel = document.getElementById("panel-" + t.dataset.tab);
      if (panel) panel.hidden = !activa;
      if (activa && enfocar) t.focus();
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => {
      mostrarTab(t.dataset.tab);
      try { history.replaceState(null, "", "#" + t.dataset.tab); } catch (e) { /* nada */ }
    });
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const sig = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      mostrarTab(sig.dataset.tab, true);
    });
  });
  function segunHash() {
    const hash = location.hash.replace("#", "");
    if (hash === "cuenta" || hash === "foto") mostrarTab("cuenta");
    else if (hash === "visibilidad") mostrarTab("visibilidad");
    else if (hash === "apariencia") mostrarTab("apariencia");
    if (hash === "foto") setTimeout(() => { const f = document.getElementById("foto"); if (f) f.scrollIntoView({ block: "center" }); }, 50);
  }
  segunHash();
  window.addEventListener("hashchange", segunHash);


  // ---------- Visibilidad del estado (varias opciones; se guarda sola al elegir) ----------
  (function () {
    const A = window.Auth;
    const bloque = document.getElementById("vis-miembro"), invitado = document.getElementById("vis-invitado");
    if (!A || !bloque) return;
    if (A.estado() !== "usuario") { invitado.hidden = false; return; }
    bloque.hidden = false;
    // Tarjeta plegable: se abre/cierra con la flecha; tras cambiar una opción se cierra sola (con calma, por si eliges varias)
    function plegable(pid) {
      const cab = document.getElementById(pid + "-cab"), cuerpo = document.getElementById(pid + "-cuerpo"), tarjeta = cab.closest(".vis-card");
      let t = 0;
      const poner = (abierta) => {
        tarjeta.classList.toggle("abierta", abierta); cab.setAttribute("aria-expanded", String(abierta));
        if (abierta) cuerpo.removeAttribute("inert"); else cuerpo.setAttribute("inert", "");
      };
      cab.addEventListener("click", () => { clearTimeout(t); poner(!tarjeta.classList.contains("abierta")); });
      return { cerrarPronto() { clearTimeout(t); t = setTimeout(() => poner(false), 900); }, cerrar() { clearTimeout(t); poner(false); } };
    }
    const plegEstado = plegable("vis-estado"), plegSeg = plegable("vis-seg");
    // Un bloque de casillas que se guarda solo
    function bloqueModos(nombre, plegado, msgEl, guardarFn, extra) {
      const cajas = Array.from(document.querySelectorAll('input[name="' + nombre + '"]'));
      let modos = ["todos"], cargado = false, ocupado = false, pendiente = false;
      function pintar() {
        cajas.forEach((c) => { c.checked = modos.indexOf(c.value) >= 0; });
        if (extra && extra.pintar) extra.pintar(modos);
      }
      async function guardar() {
        if (!cargado) return;
        if (ocupado) { pendiente = true; return; }
        ocupado = true; msgEl.textContent = "";
        const r = await guardarFn(modos);
        ocupado = false;
        if (!r.ok) msgEl.textContent = "No se pudo guardar. Inténtalo de nuevo.";
        else { try { localStorage.setItem("vis-cambio", String(Date.now())); } catch (e) { /* nada */ } }
        if (pendiente) { pendiente = false; guardar(); }
      }
      cajas.forEach((c) => c.addEventListener("change", () => {
        if (c.checked) modos = c.value === "nadie" ? ["nadie"] : modos.filter((m) => m !== "nadie").concat(c.value);
        else modos = modos.filter((m) => m !== c.value);
        if (!modos.length) modos = ["nadie"];            // sin ninguna opción equivale a «Nadie»
        if (extra && extra.alCambiar) extra.alCambiar(modos);
        pintar(); guardar(); plegado.cerrarPronto();
      }));
      cajas.forEach((c) => { c.disabled = true; });
      pintar();
      return {
        cargar(valor, ok) { if (ok) { modos = valor; cargado = true; } else msgEl.textContent = "No se pudo cargar tu visibilidad."; cajas.forEach((x) => { x.disabled = !cargado; }); pintar(); },
        guardar
      };
    }
    const caja = document.getElementById("vis-invitados-caja"), chk = document.getElementById("vis-invitados");
    const estadoBloque = bloqueModos("visibilidad", plegEstado, document.getElementById("vis-msg"),
      (m) => A.guardarVisibilidad(m, m.indexOf("todos") >= 0 && chk.checked),
      { pintar: (m) => { caja.hidden = m.indexOf("todos") < 0; }, alCambiar: (m) => { if (m.indexOf("todos") < 0) chk.checked = false; } });
    const segBloque = bloqueModos("vis-seg", plegSeg, document.getElementById("vis-seg-msg"),
      (m) => A.guardarVisibilidadSeguim(m));
    chk.addEventListener("change", () => { estadoBloque.guardar(); plegEstado.cerrarPronto(); });
    chk.disabled = true;
    A.miVisibilidad().then((r) => {
      if (r.ok) chk.checked = r.invitados;
      chk.disabled = !r.ok;
      estadoBloque.cargar(r.visibilidades, r.ok);
      segBloque.cargar(r.seguim, r.ok);
    });
  })();

  const abrirTarjeta = window.Tarjeta.abrir; // tarjeta flotante compartida (js/tarjeta.js)

  // ---------- Cuenta ----------
  const Auth = window.Auth;
  if (!Auth) return;

  const info = document.getElementById("cuenta-info");
  const bloqueMiembro = document.getElementById("cuenta-miembro");
  const bloqueInvitado = document.getElementById("cuenta-invitado");
  const msg = document.getElementById("cuenta-msg");

  const estado = Auth.estado();

  if (estado === "usuario") {
    const u = Auth.usuario();
    info.textContent = `Sesión iniciada como @${u.usuario}.`;
    bloqueMiembro.hidden = false;

    const nombreAbrir = document.getElementById("nombre-abrir");
    nombreAbrir.addEventListener("click", () => {
      const T = (s) => (window.I18n ? window.I18n.t(s) : s);
      const campo = document.createElement("input");
      campo.className = "f-input"; campo.type = "text"; campo.id = "nuevo-nombre"; campo.maxLength = 30;
      campo.autocomplete = "off"; campo.value = Auth.usuario().nombre;
      const caja = document.createElement("div"); caja.className = "f-box"; caja.appendChild(campo);
      const etiqueta = document.createElement("label"); etiqueta.className = "f-label"; etiqueta.htmlFor = "nuevo-nombre"; etiqueta.textContent = T("Nombre de visualización:");
      const error = document.createElement("p"); error.className = "f-error"; error.setAttribute("role", "alert");
      const guardar = document.createElement("button"); guardar.type = "submit"; guardar.className = "btn"; guardar.id = "guardar-nombre"; guardar.textContent = T("Guardar");
      const cancelar = document.createElement("button"); cancelar.type = "button"; cancelar.className = "btn secondary"; cancelar.textContent = T("Cancelar");
      const botones = document.createElement("div"); botones.className = "clave-botones"; botones.append(guardar, cancelar);
      const f = document.createElement("form"); f.className = "tarjeta-form"; f.noValidate = true; f.autocomplete = "off";
      f.append(etiqueta, caja, error, botones);
      const t = abrirTarjeta("Cambiar nombre", f, campo);
      campo.setSelectionRange(campo.value.length, campo.value.length);
      cancelar.addEventListener("click", t.cerrar);
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        error.textContent = ""; guardar.disabled = true;
        const r = await Auth.cambiarNombre(campo.value);
        guardar.disabled = false;
        if (!r.ok) { error.textContent = r.error; campo.focus(); return; }
        t.cerrar();
        msg.classList.add("ok"); msg.textContent = T("Nombre actualizado.");
      });
    });

    const fotoMsg = document.getElementById("foto-msg");
    const fotoArchivo = document.getElementById("foto-archivo");
    const fotoCambiar = document.getElementById("foto-cambiar");
    const fotoQuitar = document.getElementById("foto-quitar");
    const aplicarFoto = async (archivo) => {
      fotoCambiar.disabled = fotoQuitar.disabled = true;
      fotoMsg.classList.remove("ok");
      fotoMsg.textContent = "";
      const r = await Auth.cambiarAvatar(archivo);
      fotoCambiar.disabled = fotoQuitar.disabled = false;
      if (r.cancelado) return;
      fotoMsg.classList.toggle("ok", r.ok);
      fotoMsg.textContent = r.ok ? (archivo ? "Foto actualizada." : "Se usará la letra de tu usuario.") : r.error;
    };
    fotoCambiar.addEventListener("click", () => fotoArchivo.click());
    fotoArchivo.addEventListener("change", () => {
      const f = fotoArchivo.files && fotoArchivo.files[0];
      fotoArchivo.value = "";
      if (f) aplicarFoto(f);
    });
    fotoQuitar.addEventListener("click", () => aplicarFoto(null));

    // Cambiar contraseña
    const OJO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const OJO_NO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.1A10.6 10.6 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9"/><path d="M6.6 6.7C3.7 8.4 2 12 2 12s3.5 6 10 6c1.6 0 3-.3 4.3-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
    const form = document.getElementById("clave-form");
    const abrir = document.getElementById("clave-abrir");
    const claveMsg = document.getElementById("clave-msg");
    const formMsg = document.getElementById("clave-form-msg");
    const campos = ["clave-actual", "clave-nueva", "clave-repetir"].map((id) => document.getElementById(id));
    campos.forEach((input) => {
      const ver = document.createElement("button");
      ver.type = "button"; ver.className = "f-reveal"; ver.setAttribute("aria-pressed", "false");
      ver.setAttribute("aria-label", "Mostrar contraseña"); ver.innerHTML = OJO;
      ver.addEventListener("click", () => {
        const visible = input.type === "password";
        input.type = visible ? "text" : "password";
        ver.setAttribute("aria-pressed", String(visible));
        ver.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
        ver.innerHTML = visible ? OJO_NO : OJO;
        input.focus();
      });
      input.parentElement.appendChild(ver);
    });
    const marcador = document.createComment("clave-form");
    form.parentNode.insertBefore(marcador, form);
    let tarjetaClave = null;
    const cerrarForm = () => {
      if (tarjetaClave) { const t = tarjetaClave; tarjetaClave = null; t.cerrar(); }
    };
    const limpiarForm = () => {
      form.hidden = true; form.reset(); formMsg.textContent = "";
      campos.forEach((i) => { i.type = "password"; });
      marcador.parentNode.insertBefore(form, marcador.nextSibling);
    };
    abrir.addEventListener("click", () => {
      claveMsg.textContent = ""; claveMsg.classList.remove("ok");
      form.hidden = false;
      tarjetaClave = abrirTarjeta("Cambiar contraseña", form, campos[0], () => { tarjetaClave = null; limpiarForm(); });
    });
    document.getElementById("clave-cancelar").addEventListener("click", cerrarForm);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      formMsg.textContent = "";
      if (campos[1].value !== campos[2].value) { formMsg.textContent = "Las contraseñas nuevas no coinciden."; return; }
      if (campos[1].value === campos[0].value) { formMsg.textContent = "La contraseña nueva debe ser distinta de la actual."; return; }
      const guardar = document.getElementById("clave-guardar");
      guardar.disabled = true;
      const r = await Auth.cambiarClave(campos[0].value, campos[1].value);
      guardar.disabled = false;
      if (!r.ok) { formMsg.textContent = r.error; return; }
      cerrarForm();
      claveMsg.classList.add("ok");
      claveMsg.textContent = "Contraseña actualizada. Se cerraron tus otras sesiones.";
    });


    // Sesiones activas
    const sesLista = document.getElementById("sesiones-lista");
    const sesMsg = document.getElementById("sesiones-msg");
    const sesOtras = document.getElementById("sesiones-otras");
    const sesAct = document.getElementById("sesiones-actualizar");
    const ingles = window.I18n && window.I18n.get() === "en";
    const loc = window.I18n ? window.I18n.locale() : "es-ES";
    const ICON_PC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>';
    const ICON_TEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>';
    function dispositivo(ua) {
      ua = String(ua || "");
      const nav = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
        : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : null;
      const so = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS"
        : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : null;
      const movil = /Android|iPhone|iPad|iPod|Mobile/.test(ua);
      const a = nav || (window.I18n ? window.I18n.t("Navegador desconocido") : "Navegador desconocido");
      const b = so || (window.I18n ? window.I18n.t("Sistema desconocido") : "Sistema desconocido");
      return { texto: a + (ingles ? " on " : " en ") + b, movil };
    }
    function hace(f) {
      const min = Math.max(0, Math.round((Date.now() - new Date(f).getTime()) / 60000));
      if (min < 1) return "ahora";
      if (min < 60) return "hace " + min + " min";
      if (min < 1440) return "hace " + Math.round(min / 60) + " h";
      return "hace " + Math.round(min / 1440) + " d";
    }
    function sesMensaje(t, ok) { sesMsg.classList.toggle("ok", !!ok); sesMsg.textContent = t || ""; }
    async function cargarSesiones(conservarMsg) {
      if (!conservarMsg) sesMensaje("");
      sesAct.disabled = true;
      const r = await Auth.sesionesActivas();
      sesAct.disabled = false;
      if (!r.ok) { sesMensaje("No se pudieron cargar las sesiones."); return; }
      sesLista.replaceChildren();
      sesOtras.hidden = r.sesiones.length < 2;
      r.sesiones.forEach((x) => {
        const d = dispositivo(x.dispositivo);
        const li = document.createElement("li");
        li.className = "sesion" + (x.actual ? " actual" : "");
        const ic = document.createElement("span"); ic.className = "sesion-icono"; ic.innerHTML = d.movil ? ICON_TEL : ICON_PC;
        const tx = document.createElement("div"); tx.className = "sesion-texto";
        const t1 = document.createElement("div"); t1.className = "sesion-titulo";
        t1.textContent = d.texto;
        if (x.actual) { const ins = document.createElement("span"); ins.className = "insignia"; ins.textContent = "Este dispositivo"; t1.appendChild(ins); }
        const t2 = document.createElement("div"); t2.className = "sesion-detalle";
        t2.textContent = (x.ip && x.ip !== "desconocida" ? x.ip + " · " : "") + hace(x.ultima);
        tx.append(t1, t2);
        li.append(ic, tx);
        if (!x.actual) {
          const bt = document.createElement("button");
          bt.type = "button"; bt.className = "btn secondary"; bt.textContent = "Cerrar";
          bt.addEventListener("click", async () => {
            bt.disabled = true;
            const c = await Auth.cerrarSesionPorId(x.id);
            if (!c.ok) { bt.disabled = false; sesMensaje(c.error); return; }
            sesMensaje("Sesión cerrada.", true);
            cargarSesiones(true);
          });
          li.appendChild(bt);
        }
        sesLista.appendChild(li);
      });
    }
    sesAct.addEventListener("click", () => cargarSesiones());
    sesOtras.addEventListener("click", async () => {
      sesOtras.disabled = true;
      const c = await Auth.cerrarOtrasSesiones();
      sesOtras.disabled = false;
      if (!c.ok) { sesMensaje(c.error); return; }
      sesMensaje("Se cerraron las demás sesiones.", true);
      cargarSesiones(true);
    });
    cargarSesiones();

    // Historial de inicios de sesión
    const hisLista = document.getElementById("historial-lista");
    const hisMsg = document.getElementById("historial-msg");
    const hisAct = document.getElementById("historial-actualizar");
    const ETIQ = { ingreso: ["Inicio de sesión", "ok"], registro: ["Cuenta creada", "nuevo"], fallo: ["Intento fallido", "mal"], suspendida: ["Intento con cuenta suspendida", "mal"],
      cambio_nombre: ["Nombre cambiado", "nuevo"], cambio_foto: ["Foto de perfil cambiada", "nuevo"], cambio_clave: ["Contraseña cambiada", "nuevo"],
      clave_restablecida: ["Contraseña restablecida por un administrador", "nuevo"], cierre_sesion: ["Sesión cerrada", "ok"], cierre_otras: ["Otras sesiones cerradas", "ok"] };
    async function cargarHistorial() {
      hisMsg.textContent = "";
      hisAct.disabled = true;
      const r = await Auth.historialDeAcceso();
      hisAct.disabled = false;
      if (!r.ok) { hisMsg.textContent = "No se pudo cargar el historial."; return; }
      hisLista.replaceChildren();
      r.eventos.forEach((x) => {
        const d = dispositivo(x.dispositivo);
        const et = ETIQ[x.evento] || [x.evento, "ok"];
        const li = document.createElement("li");
        li.className = "sesion";
        const p = document.createElement("span"); p.className = "punto " + et[1];
        const tx = document.createElement("div"); tx.className = "sesion-texto";
        const t1 = document.createElement("div"); t1.className = "sesion-titulo"; t1.textContent = et[0];
        const t2 = document.createElement("div"); t2.className = "sesion-detalle";
        t2.textContent = d.texto + (x.ip && x.ip !== "desconocida" ? " · " + x.ip : "");
        tx.append(t1, t2);
        const f = document.createElement("span"); f.className = "sesion-fecha";
        f.textContent = new Date(x.fecha).toLocaleString(loc, { dateStyle: "medium", timeStyle: "short" });
        li.append(p, tx, f);
        hisLista.appendChild(li);
      });
    }
    hisAct.addEventListener("click", cargarHistorial);
    cargarHistorial();

    document.getElementById("cerrar-sesion").addEventListener("click", () => {
      Auth.cerrarSesion();
    });
  } else if (estado === "invitado") {
    document.getElementById("cuenta-sesion").hidden = true;
    bloqueInvitado.hidden = false;
    document.getElementById("ir-registro").addEventListener("click", () => {
      Auth.salirDeInvitado();
    });
  }
})();

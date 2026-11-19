(() => {
  // ---------- Tema ----------
  const buttons = document.querySelectorAll("[data-theme-option]");

  function refresh() {
    const current = window.Theme.get();
    buttons.forEach((btn) => {
      const active = btn.dataset.themeOption === current;
      btn.setAttribute("aria-pressed", String(active));
      btn.classList.toggle("selected", active);
    });
  }

  buttons.forEach((btn) =>
    btn.addEventListener("click", () => {
      window.Theme.set(btn.dataset.themeOption);
      refresh();
    })
  );

  refresh();

  // ---------- Idioma ----------
  const idiomaBtns = document.querySelectorAll("[data-idioma]");
  idiomaBtns.forEach((btn) => {
    const act = window.I18n && btn.dataset.idioma === window.I18n.get();
    btn.classList.toggle("selected", !!act);
    btn.setAttribute("aria-pressed", String(!!act));
    btn.addEventListener("click", () => { if (window.I18n && btn.dataset.idioma !== window.I18n.get()) window.I18n.set(btn.dataset.idioma); });
  });

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
  const angBtns = document.querySelectorAll("[data-acento-ang]");
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
    angBtns.forEach((b) => { const a = Number(b.dataset.acentoAng) === Number(actual.ang); b.classList.toggle("selected", a); b.setAttribute("aria-pressed", String(a)); });
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
  angBtns.forEach((b) => b.addEventListener("click", () => aplicar(Object.assign({}, actual, { ang: Number(b.dataset.acentoAng) }))));
  c1.addEventListener("input", () => aplicar(Object.assign({}, actual, { c1: c1.value })));
  c2.addEventListener("input", () => aplicar(Object.assign({}, actual, { c2: c2.value })));
  document.getElementById("acento-reset").addEventListener("click", () => {
    window.Theme.setAccent(null);
    actual = { tipo: "solido", c1: "#0078d4", c2: "#00b7c3", ang: 135 };
    pintarAcento();
  });
  pintarAcento();


  // ---------- Fondo ----------
  const NOMBRES_FONDO = { ninguno: "Normal", aurora: "Aurora", atardecer: "Atardecer", oceano: "Océano", bosque: "Bosque", noche: "Noche", puntos: "Puntos", cuadricula: "Cuadrícula", diagonal: "Líneas" };
  const fondosCaja = document.getElementById("fondos");
  const fondoMsg = document.getElementById("fondo-msg");
  const opciones = [];
  function crearOpcion(id, etiqueta) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "fondo-op"; b.dataset.fondoId = id; b.setAttribute("aria-pressed", "false");
    const v = document.createElement("span"); v.className = "fondo-vista" + (id === "ninguno" ? " fondo-sin-vista" : "");
    if (id === "ninguno") v.textContent = "—"; else v.setAttribute("data-fondo-vista", id);
    const t = document.createElement("span"); t.textContent = etiqueta;
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

  // ---------- Preferencias de la cuenta ----------
  const prefsEstado = document.getElementById("prefs-estado");
  const prefsAhora = document.getElementById("prefs-ahora");
  const TEXTOS_PREFS = {
    "sin-cuenta": "Inicia sesión para que tus preferencias viajen contigo",
    guardando: "Sincronizando…",
    guardado: "Tu tema, color de acento, idioma y fondo se guardan en tu cuenta y se aplican en tus otros dispositivos",
    error: "No se pudieron sincronizar. Se reintentará al cambiar algo"
  };
  if (window.Preferencias) {
    window.Preferencias.alCambiar((e) => { prefsEstado.textContent = TEXTOS_PREFS[e] || TEXTOS_PREFS["sin-cuenta"]; prefsAhora.hidden = e === "sin-cuenta"; });
    prefsAhora.addEventListener("click", () => window.Preferencias.guardarYa());
  }

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
    else if (hash === "apariencia") mostrarTab("apariencia");
    if (hash === "foto") setTimeout(() => { const f = document.getElementById("foto"); if (f) f.scrollIntoView({ block: "center" }); }, 50);
  }
  segunHash();
  window.addEventListener("hashchange", segunHash);

  // ---------- Cuenta ----------
  const Auth = window.Auth;
  if (!Auth) return;

  const info = document.getElementById("cuenta-info");
  const bloqueMiembro = document.getElementById("cuenta-miembro");
  const bloqueInvitado = document.getElementById("cuenta-invitado");
  const inputNombre = document.getElementById("nuevo-nombre");
  const msg = document.getElementById("cuenta-msg");

  const estado = Auth.estado();

  if (estado === "usuario") {
    const u = Auth.usuario();
    info.textContent = `Sesión iniciada como @${u.usuario}.`;
    inputNombre.value = u.nombre;
    bloqueMiembro.hidden = false;

    const guardarBtn = document.getElementById("guardar-nombre");
    guardarBtn.addEventListener("click", async () => {
      guardarBtn.disabled = true;
      msg.classList.remove("ok");
      msg.textContent = "";
      const r = await Auth.cambiarNombre(inputNombre.value);
      guardarBtn.disabled = false;
      msg.classList.toggle("ok", r.ok);
      msg.textContent = r.ok ? "Nombre actualizado." : r.error;
      if (r.ok) inputNombre.value = r.nombre;
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
    const cerrarForm = () => {
      form.hidden = true; form.reset(); formMsg.textContent = "";
      campos.forEach((i) => { i.type = "password"; });
      abrir.setAttribute("aria-expanded", "false");
    };
    abrir.addEventListener("click", () => {
      if (!form.hidden) { cerrarForm(); return; }
      claveMsg.textContent = ""; claveMsg.classList.remove("ok");
      form.hidden = false; abrir.setAttribute("aria-expanded", "true");
      campos[0].focus();
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
    const ETIQ = { ingreso: ["Inicio de sesión", "ok"], registro: ["Cuenta creada", "nuevo"], fallo: ["Intento fallido", "mal"], suspendida: ["Intento con cuenta suspendida", "mal"] };
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

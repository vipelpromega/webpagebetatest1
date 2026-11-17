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

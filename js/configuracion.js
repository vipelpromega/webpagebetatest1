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

  // ---------- Administración (solo administradores) ----------
  const resumen = document.getElementById("codigos-resumen");
  const msgCodigos = document.getElementById("codigos-msg");
  const generar = document.getElementById("generar-codigo");
  const bloqueNuevo = document.getElementById("codigo-nuevo");
  const valorCodigo = document.getElementById("codigo-valor");
  const copiar = document.getElementById("copiar-codigo");
  let adminIniciado = false;

  function esAdmin() {
    const u = Auth.usuario();
    return !!u && u.rol === "admin";
  }

  async function cargarResumen() {
    const r = await Auth.listarCodigos();
    resumen.textContent = r.ok
      ? `${r.sin_usar} sin usar · ${r.usados} usados`
      : r.error;
  }

  function iniciarAdmin() {
    if (adminIniciado || !esAdmin() || !generar) return;
    adminIniciado = true;
    cargarResumen();
  }

  if (generar) {
    generar.addEventListener("click", async () => {
      generar.disabled = true;
      msgCodigos.textContent = "";
      const r = await Auth.crearCodigo();
      generar.disabled = false;
      if (r.ok) {
        valorCodigo.textContent = r.codigo;
        bloqueNuevo.hidden = false;
        copiar.textContent = "Copiar";
        cargarResumen();
      } else {
        msgCodigos.textContent = r.error;
      }
    });

    copiar.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(valorCodigo.textContent);
        copiar.textContent = "Copiado";
        setTimeout(() => { copiar.textContent = "Copiar"; }, 1500);
      } catch (e) {
        // Sin permiso de portapapeles: se deja el código seleccionado para copiarlo a mano
        const rango = document.createRange();
        rango.selectNodeContents(valorCodigo);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(rango);
        msgCodigos.textContent = "Copia el código seleccionado (Ctrl+C).";
      }
    });
  }

  document.addEventListener("auth:perfil", iniciarAdmin);
  iniciarAdmin();
})();

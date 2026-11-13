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

    document.getElementById("guardar-nombre").addEventListener("click", () => {
      const r = Auth.cambiarNombre(inputNombre.value);
      msg.classList.toggle("ok", r.ok);
      msg.textContent = r.ok ? "Nombre actualizado." : r.error;
      if (r.ok) inputNombre.value = r.nombre;
    });

    document.getElementById("cerrar-sesion").addEventListener("click", () => {
      Auth.cerrarSesion();
    });
  } else if (estado === "invitado") {
    info.textContent = "Entraste como invitado.";
    bloqueInvitado.hidden = false;
    document.getElementById("ir-registro").addEventListener("click", () => {
      Auth.abrirRegistro();
    });
  }
})();

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

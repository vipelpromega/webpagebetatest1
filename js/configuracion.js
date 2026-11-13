(() => {
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
})();

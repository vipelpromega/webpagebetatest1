(() => {
  const $ = (id) => document.getElementById(id);
  const hEl = $("h"), mEl = $("m"), sEl = $("s");
  const display = $("display"), statusEl = $("status");
  const startBtn = $("start"), pauseBtn = $("pause"), resetBtn = $("reset");

  let remainingMs = 0;
  let endTime = 0;
  let intervalId = null;
  let running = false;

  const pad = (n) => String(n).padStart(2, "0");

  function clamp(el, max) {
    let v = parseInt(el.value, 10);
    if (isNaN(v) || v < 0) v = 0;
    if (v > max) v = max;
    el.value = v;
    return v;
  }

  function readInputsMs() {
    const h = clamp(hEl, 99), m = clamp(mEl, 59), s = clamp(sEl, 59);
    return ((h * 60 + m) * 60 + s) * 1000;
  }

  function render(ms) {
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    display.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    document.title = running ? `${display.textContent} · Temporizador` : "Temporizador";
  }

  function setInputsDisabled(disabled) {
    [hEl, mEl, sEl].forEach((el) => (el.disabled = disabled));
  }

  function tick() {
    remainingMs = endTime - Date.now();
    if (remainingMs <= 0) return finish();
    render(remainingMs);
  }

  function finish() {
    clearInterval(intervalId);
    intervalId = null;
    running = false;
    remainingMs = 0;
    render(0);
    display.classList.add("finished");
    statusEl.textContent = "¡Tiempo terminado!";
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    beep();
  }

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      [0, 0.35, 0.7].forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.2;
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.25);
      });
    } catch (e) { /* sin audio disponible */ }
  }

  startBtn.addEventListener("click", () => {
    if (running) return;
    if (remainingMs <= 0) remainingMs = readInputsMs();
    if (remainingMs <= 0) {
      statusEl.textContent = "Ingresa un tiempo mayor a cero.";
      return;
    }
    display.classList.remove("finished");
    statusEl.textContent = "En marcha…";
    endTime = Date.now() + remainingMs;
    running = true;
    setInputsDisabled(true);
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    intervalId = setInterval(tick, 200);
    tick();
  });

  pauseBtn.addEventListener("click", () => {
    if (!running) return;
    clearInterval(intervalId);
    intervalId = null;
    running = false;
    remainingMs = Math.max(0, endTime - Date.now());
    render(remainingMs);
    statusEl.textContent = "En pausa";
    startBtn.disabled = false;
    startBtn.textContent = "Continuar";
    pauseBtn.disabled = true;
  });

  resetBtn.addEventListener("click", () => {
    clearInterval(intervalId);
    intervalId = null;
    running = false;
    remainingMs = 0;
    display.classList.remove("finished");
    statusEl.textContent = "";
    startBtn.textContent = "Iniciar";
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    setInputsDisabled(false);
    render(readInputsMs());
  });

  [hEl, mEl, sEl].forEach((el) =>
    el.addEventListener("input", () => {
      if (!running && remainingMs <= 0) render(readInputsMs());
    })
  );

  render(readInputsMs());
})();

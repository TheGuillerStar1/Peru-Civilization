// Paso del tiempo: al terminar el turno, una banda sobre el mapa muestra el sol avanzando y el año
// que corre del turno que acaba al que empieza (como el cambio de turno de Civilization).
// No bloquea nada: es solo un adorno que se retira solo. Respeta «reducir movimiento».
(function (PC) {
  'use strict';
  const UI = PC.UI;
  let el = null, raf = 0, hideT = 0;
  const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  function mount() {
    if (el) return el;
    el = document.createElement('div');
    el.id = 'timelapse'; el.setAttribute('aria-live', 'polite'); el.hidden = true;
    el.innerHTML = '<div class="tl-track"><i class="tl-sun"></i></div><div class="tl-text"><span class="tl-turn"></span><b class="tl-year"></b><small class="tl-era"></small></div>';
    document.body.appendChild(el);
    return el;
  }
  UI.timeLapse = function (from, to) {
    if (!UI.pref('animacionTiempo', true)) return;
    const box = mount(), q = (s) => box.querySelector(s);
    cancelAnimationFrame(raf); clearTimeout(hideT);
    const era = PC.ERAS && PC.player ? (PC.ERAS[PC.eraOf(PC.player())] || {}).name : '';
    q('.tl-turn').textContent = `Turno ${from.turn} → ${to.turn}`;
    q('.tl-era').textContent = era || '';
    q('.tl-year').textContent = PC.fmtYear(from.year);
    box.hidden = false; box.classList.remove('out'); box.classList.remove('run'); void box.offsetWidth; box.classList.add('run');
    const dur = reduced() ? 300 : 1300, t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      q('.tl-year').textContent = PC.fmtYear(Math.round(from.year + (to.year - from.year) * e));
      if (k < 1) raf = requestAnimationFrame(tick);
      else hideT = setTimeout(() => { box.classList.add('out'); setTimeout(() => { box.hidden = true; }, 400); }, 450);
    };
    raf = requestAnimationFrame(tick);
  };
  window.addEventListener('DOMContentLoaded', () => { mount(); UI.addOption('animacionTiempo', 'Animación del paso del tiempo al terminar el turno', true); });
})(window.PC);

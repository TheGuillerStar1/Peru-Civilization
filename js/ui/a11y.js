// Accesibilidad: desplazar el mapa con el teclado (flechas o I/J/K/L, Mayús para ir más rápido;
// Inicio centra la capital) y bordes con patrón para daltonismo.
(function (PC) {
  'use strict';
  const UI = PC.UI, R = PC.R;
  // Tecla → dirección (dx, dy) en píxeles de arrastre; mismo sentido que arrastrar el mapa.
  const DIRS = { arrowleft: [1, 0], j: [1, 0], arrowright: [-1, 0], l: [-1, 0], arrowup: [0, 1], i: [0, 1], arrowdown: [0, -1], k: [0, -1] };
  const held = new Set();
  let fast = false, last = 0, raf = 0;
  const playing = () => PC.G && !PC.G.preview && !UI.modal && !document.querySelector('#hud').hidden;
  const typing = (e) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);

  function step(now) {
    raf = 0;
    if (!held.size || !playing()) { held.clear(); return; }
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    let dx = 0, dy = 0;
    held.forEach((k) => { dx += DIRS[k][0]; dy += DIRS[k][1]; });
    const v = (fast ? 2200 : 900) * dt;
    if (dx || dy) R.pan(dx * v, dy * v);
    raf = requestAnimationFrame(step);
  }
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!playing() || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    fast = e.shiftKey;
    if (DIRS[k]) {
      e.preventDefault();
      if (!held.has(k)) { held.add(k); R.pan(DIRS[k][0] * 40, DIRS[k][1] * 40); if (!raf) { last = 0; raf = requestAnimationFrame(step); } } // un toque corto también mueve
    } else if (k === 'home') {
      const p = PC.player(), c = PC.cityById(p.capitalId) || PC.civCities(p)[0];
      if (c) { R.centerOn(PC.tile(c.t)); e.preventDefault(); }
    }
  });
  document.addEventListener('keyup', (e) => { held.delete(e.key.toLowerCase()); fast = e.shiftKey; });
  window.addEventListener('blur', () => held.clear());

  // Bordes con patrón: cada civilización se distingue por su trazo, no solo por el color.
  function applyBorders(on) { R.patternBorders = on; if (PC.G && !PC.G.preview && R.refresh) R.refresh(); }
  window.addEventListener('DOMContentLoaded', () => {
    R.patternBorders = UI.pref('bordesPatron', false);
    UI.addOption('bordesPatron', 'Fronteras con patrón (discontinuas, punteadas o dobles) para daltonismo', false, applyBorders);
    const help = document.querySelector('#scr-options ul.help');
    if (help) help.insertAdjacentHTML('beforeend', '<li>Flechas o <kbd>I</kbd>/<kbd>J</kbd>/<kbd>K</kbd>/<kbd>L</kbd>: desplazar el mapa (<kbd>Mayús</kbd> más rápido) · <kbd>Inicio</kbd> capital · <kbd>M</kbd> minimapa.</li>');
  });
})(globalThis.PC = globalThis.PC || {});

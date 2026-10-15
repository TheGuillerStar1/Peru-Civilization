// Minimapa: lienzo 2D en una esquina del HUD con terrenos, fronteras, niebla y el recuadro de la vista.
// Un clic (o arrastrar) centra la cámara. Sirve para los tres mapas: Perú, Sudamérica y América.
(function (PC) {
  'use strict';
  const UI = PC.UI, R = PC.R;
  const SQ3 = Math.sqrt(3);
  const EDGE_DIR = [0, 5, 4, 3, 2, 1]; // índice de vecino → lado del hexágono (como en render3d.js)
  const MAX_W = 210, MAX_H = 200, PAD = 4;
  const M = UI.minimap = { el: null, cv: null, base: null, mapRef: null, fit: null, dirty: true };

  // Encaje del mapa en el lienzo: escala y desplazamiento según el tamaño de cada fase.
  function computeFit() {
    const ts = PC.G.map.tiles.filter(Boolean);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    ts.forEach((t) => { const [x, z] = R.tileXZ(t); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
    x0 -= 1; x1 += 1; z0 -= 1; z1 += 1;
    const s = Math.min((MAX_W - PAD * 2) / (x1 - x0), (MAX_H - PAD * 2) / (z1 - z0));
    const w = Math.ceil((x1 - x0) * s + PAD * 2), h = Math.ceil((z1 - z0) * s + PAD * 2);
    M.fit = { s, x0, z0, w, h, tiles: ts };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    [M.cv, M.base].forEach((c) => { c.width = w * dpr; c.height = h * dpr; });
    M.cv.style.width = w + 'px'; M.cv.style.height = h + 'px';
    M.dpr = dpr;
  }
  const toMini = (x, z) => [(x - M.fit.x0) * M.fit.s + PAD, (z - M.fit.z0) * M.fit.s + PAD];
  const toWorld = (mx, my) => [(mx - PAD) / M.fit.s + M.fit.x0, (my - PAD) / M.fit.s + M.fit.z0];
  function corner(cx, cz, k, r) { const a = Math.PI / 180 * (60 * k - 30); return toMini(cx + r * Math.cos(a), cz + r * Math.sin(a)); }

  // Capa base (terrenos, dueños, ciudades y niebla); se rehace al refrescar la interfaz.
  function drawBase() {
    const g = PC.G, ctx = M.base.getContext('2d');
    ctx.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
    ctx.fillStyle = '#0b1022'; ctx.fillRect(0, 0, M.fit.w, M.fit.h);
    const hex = (t, r) => { const [cx, cz] = R.tileXZ(t); ctx.beginPath(); for (let k = 0; k < 6; k++) { const [px, py] = corner(cx, cz, k, r); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); };
    M.fit.tiles.forEach((t) => {
      if (!PC.isExplored(t.i)) return;
      hex(t, 1.04);
      ctx.fillStyle = (PC.TERRAIN[t.terrain] || {}).color || '#555'; ctx.fill();
      if (t.owner) { ctx.globalAlpha = 0.42; ctx.fillStyle = PC.civ(t.owner).color; ctx.fill(); ctx.globalAlpha = 1; }
      if (!PC.isVisible(t.i)) { ctx.globalAlpha = 0.32; ctx.fillStyle = '#0b1022'; ctx.fill(); ctx.globalAlpha = 1; }
    });
    // Fronteras: el lado de cada casilla que limita con otro dueño.
    ctx.lineWidth = Math.max(1, M.fit.s * 0.35); ctx.lineCap = 'round';
    M.fit.tiles.forEach((t) => {
      if (!t.owner || !PC.isExplored(t.i)) return;
      const [cx, cz] = R.tileXZ(t);
      ctx.strokeStyle = PC.civ(t.owner).color; ctx.beginPath();
      PC.hexNeighborsCR(t.c, t.r).forEach(([c, r], j) => {
        const n = PC.tileCR(c, r);
        if (n && n.owner === t.owner) return;
        const k = EDGE_DIR[j], [ax, ay] = corner(cx, cz, k, 0.9), [bx, by] = corner(cx, cz, k + 1, 0.9);
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      });
      ctx.stroke();
    });
    // Ciudades: cuadros con el color de su dueño; las tuyas con borde qolli.
    const sz = Math.max(3, M.fit.s * 1.4);
    g.cities.forEach((c) => {
      const t = PC.tile(c.t); if (!PC.isExplored(t.i)) return;
      const [x, y] = toMini(...R.tileXZ(t));
      ctx.fillStyle = PC.civ(c.civ).color; ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      ctx.lineWidth = 1; ctx.strokeStyle = c.civ === g.playerId ? '#f3c85e' : '#0b1022'; ctx.strokeRect(x - sz / 2, y - sz / 2, sz, sz);
    });
    // Unidades enemigas en guerra a la vista: puntos cinabrio.
    g.units.forEach((u) => {
      if (u.civ === g.playerId || !PC.isVisible(u.t) || !PC.atWar(g.playerId, u.civ)) return;
      const [x, y] = toMini(...R.tileXZ(PC.tile(u.t)));
      ctx.fillStyle = '#f07257'; ctx.beginPath(); ctx.arc(x, y, Math.max(1.6, M.fit.s * 0.5), 0, Math.PI * 2); ctx.fill();
    });
    M.dirty = false;
  }
  // Capa de la vista: se dibuja cada pocos fotogramas sobre la base.
  function drawView() {
    const ctx = M.cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, M.cv.width, M.cv.height);
    ctx.drawImage(M.base, 0, 0);
    const vc = R.viewCorners && R.viewCorners();
    if (!vc) return;
    ctx.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
    ctx.beginPath();
    vc.forEach(([x, z], k) => { const [px, py] = toMini(x, z); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    ctx.closePath();
    ctx.fillStyle = 'rgba(243,200,94,0.10)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#f3c85e'; ctx.stroke();
  }
  const active = () => M.el && PC.G && !PC.G.preview && !document.querySelector('#hud').hidden && UI.pref('minimap', true);
  function update() {
    if (!M.el) return;
    M.el.hidden = !active();
    if (M.el.hidden) return;
    if (M.mapRef !== PC.G.map) { M.mapRef = PC.G.map; computeFit(); }
    drawBase(); drawView();
  }
  M.update = update;

  // La casilla más cercana a un punto del minimapa.
  function tileAtMini(mx, my) {
    const [x, z] = toWorld(mx, my);
    let best = null, bd = Infinity;
    M.fit.tiles.forEach((t) => { const [tx, tz] = R.tileXZ(t); const d = (tx - x) * (tx - x) + (tz - z) * (tz - z); if (d < bd) { bd = d; best = t; } });
    return best;
  }
  function mount() {
    const hud = document.querySelector('#hud');
    if (!hud || M.el) return;
    hud.insertAdjacentHTML('beforeend', `<div id="minimap" hidden><div class="mm-head"><span>Mapa</span><button type="button" class="mm-x" title="Ocultar el minimapa (M)" aria-label="Ocultar el minimapa">${PC.icon('cerrar')}</button></div>
      <canvas aria-label="Minimapa: haz clic para centrar la vista" role="img"></canvas></div>`);
    M.el = document.querySelector('#minimap'); M.cv = M.el.querySelector('canvas'); M.base = document.createElement('canvas');
    let down = false;
    const go = (e) => {
      const r = M.cv.getBoundingClientRect(), t = tileAtMini((e.clientX - r.left) * M.fit.w / r.width, (e.clientY - r.top) * M.fit.h / r.height);
      if (t) { R.centerOn(t, true); drawView(); }
    };
    M.cv.addEventListener('pointerdown', (e) => { down = true; try { M.cv.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ } go(e); });
    M.cv.addEventListener('pointermove', (e) => { if (down) go(e); });
    M.cv.addEventListener('pointerup', () => { down = false; });
    M.el.querySelector('.mm-x').onclick = () => toggle(false);
    setInterval(() => { if (active() && M.fit && !document.hidden) drawView(); }, 120);
  }
  function toggle(on) {
    UI.prefs.minimap = on === undefined ? !UI.pref('minimap', true) : on; UI.savePrefs();
    const box = document.querySelector('#opt-minimap'); if (box) box.checked = UI.prefs.minimap;
    update();
    if (!UI.prefs.minimap) UI.toast('Minimapa oculto. Pulsa M para mostrarlo.', 'info');
  }
  M.toggle = toggle;

  UI.on('start', () => { M.mapRef = null; update(); });
  UI.on('refresh', update);
  UI.on('turn', update);
  UI.on('menu', () => { if (M.el) M.el.hidden = !active(); });
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'm' || e.ctrlKey || e.metaKey || e.altKey || !PC.G || PC.G.preview || UI.modal || document.querySelector('#hud').hidden) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    toggle();
  });
  window.addEventListener('DOMContentLoaded', () => { mount(); UI.addOption('minimap', 'Mostrar el minimapa (tecla M)', true, update); });
})(globalThis.PC = globalThis.PC || {});

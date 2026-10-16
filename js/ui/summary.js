// Resumen de turno: al empezar cada turno, un aviso compacto con lo terminado en las ciudades,
// las unidades sin órdenes y las amenazas cercanas. Usa los avisos del motor (g.notices) de tipo ciudad.
(function (PC) {
  'use strict';
  const UI = PC.UI, R = PC.R;
  const DONE = /\b(entrena|construye|completa la maravilla)\b/;
  const S = UI.summary = { el: null, timer: null, threats: [] };

  function collect() {
    const g = PC.G, p = PC.player();
    // Lo terminado en las ciudades sale de los avisos y no se repite como notificación suelta.
    const done = [];
    g.notices = g.notices.filter((n) => {
      if (n.type === 'city' && DONE.test(n.text)) { done.push(n.text); return false; }
      if (n.type === 'history' && n.text.startsWith(p.name + ' completa la maravilla')) done.push(n.text); // la maravilla sigue también como aviso
      return true;
    });
    const idle = PC.civUnits(p).filter(UI.needsOrders);
    const threats = UI.threats ? UI.threats() : [];
    return { done, idle, threats };
  }
  function show(info) {
    const g = PC.G, esc = UI.esc;
    const rows = [];
    const cityName = (txt) => PC.civCities(PC.player()).find((c) => txt.startsWith(c.name + ' ') || txt.includes(' en ' + c.name));
    info.done.slice(0, 5).forEach((t) => { const c = cityName(t); rows.push(`<li>${PC.icon('produccion')}${c ? `<button type="button" class="ts-link" data-ts-city="${c.id}">${esc(t)}</button>` : `<span>${esc(t)}</span>`}</li>`); });
    if (info.done.length > 5) rows.push(`<li class="muted">${PC.icon('produccion')}<span>y ${info.done.length - 5} más en la crónica.</span></li>`);
    if (info.idle.length) rows.push(`<li>${PC.icon('movimiento')}<button type="button" class="ts-link" data-ts-act="idle">${info.idle.length === 1 ? '1 unidad espera órdenes' : info.idle.length + ' unidades esperan órdenes'} <kbd>N</kbd></button></li>`);
    S.threats = info.threats;
    info.threats.forEach((th, k) => rows.push(`<li class="ts-war">${PC.icon('alerta')}<button type="button" class="ts-link" data-ts-threat="${k}">${th.foes.length === 1 ? '1 unidad' : th.foes.length + ' unidades'} de ${esc(th.civ.name)} cerca de ${esc(th.city.name)}</button></li>`));
    if (!rows.length) { hide(); return; } // sin nada que contar no se muestra: el enlace solo acompaña
    // Registro de avisos con filtros (js/ui/chronicle_ui.js): enlace a la crónica completa.
    if (UI.chronicle) rows.push(`<li>${PC.icon('cronica')}<button type="button" class="ts-link" data-ts-act="chronicle">Ver en la Crónica</button></li>`);
    S.el.innerHTML = `<div class="ts-head"><b>${PC.fmtYear(g.year)} · turno ${g.turn}</b><button type="button" class="ts-x" data-ts-act="close" aria-label="Cerrar el resumen">${PC.icon('cerrar')}</button></div><ul>${rows.join('')}</ul>`;
    S.el.hidden = false;
    clearTimeout(S.timer);
    S.timer = setTimeout(() => { if (!S.el.matches(':hover')) hide(); }, 14000);
  }
  function hide() { if (S.el) S.el.hidden = true; clearTimeout(S.timer); }

  function mount() {
    const hud = document.querySelector('#hud');
    if (!hud || S.el) return;
    hud.insertAdjacentHTML('beforeend', '<div id="turn-summary" role="status" aria-live="polite" hidden></div>');
    S.el = document.querySelector('#turn-summary');
    S.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ts-city], [data-ts-act], [data-ts-threat]'); if (!b) return;
      if (b.dataset.tsCity) { const c = PC.cityById(+b.dataset.tsCity) || PC.cityById(b.dataset.tsCity); if (c) { R.centerOn(PC.tile(c.t)); UI.selectCity(c.id); } }
      if (b.dataset.tsAct === 'idle') UI.nextUnit();
      if (b.dataset.tsThreat) { const th = S.threats[+b.dataset.tsThreat]; if (th) R.centerOn(th.tile); }
      if (b.dataset.tsAct === 'close') hide();
      if (b.dataset.tsAct === 'chronicle' && UI.chronicle) UI.chronicle.open();
    });
    S.el.addEventListener('mouseleave', () => { clearTimeout(S.timer); S.timer = setTimeout(hide, 5000); });
  }
  UI.on('turn', () => { if (!S.el || !UI.pref('resumen', true) || PC.G.gameOver) return; show(collect()); });
  UI.on('start', hide);
  UI.on('menu', hide);
  window.addEventListener('DOMContentLoaded', () => { mount(); UI.addOption('resumen', 'Resumen al empezar cada turno', true, (on) => { if (!on) hide(); }); });
})(globalThis.PC = globalThis.PC || {});

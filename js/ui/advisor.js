// Consejero: consejos breves en los primeros turnos y avisos de amenazas cerca de tus ciudades.
// Se desactiva en Opciones › Ayudas y accesibilidad. Lo ya aconsejado se guarda en la partida (g.consejero).
(function (PC) {
  'use strict';
  const UI = PC.UI, R = PC.R;
  const TIP_TURNS = 30;
  const A = UI.advisor = { el: null, cur: null };

  // Amenazas: unidades militares enemigas a la vista a 3 casillas o menos de una ciudad tuya.
  UI.threats = function () {
    const g = PC.G, p = PC.player(), out = [];
    PC.civCities(p).forEach((city) => {
      const ct = PC.tile(city.t);
      const foes = g.units.filter((u) => u.civ !== p.id && PC.isMil(u) && PC.isVisible(u.t) && PC.atWar(p.id, u.civ) && PC.dist(PC.tile(u.t), ct) <= 3);
      if (foes.length) out.push({ city, foes, civ: PC.civ(foes[0].civ), tile: PC.tile(foes[0].t) });
    });
    return out;
  };

  const kbd = (k) => `<kbd>${k}</kbd>`;
  // Consejos en orden de prioridad: cada uno se muestra una sola vez por partida.
  const TIPS = [
    { id: 'fundar', when: (g, p) => !PC.civCities(p).length && PC.civUnits(p).some((u) => u.type === 'colono'),
      text: () => `Funda tu primera ciudad: selecciona al colono y pulsa ${kbd('B')} sobre una casilla con agua, comida y altura. La costa y los valles rinden bien al comienzo.`,
      tile: (g, p) => { const u = PC.civUnits(p).find((x) => x.type === 'colono'); return u && PC.tile(u.t); } },
    { id: 'investigar', when: (g, p) => !p.research && PC.availableTechs(p).length,
      text: () => `Elige qué investigar con ${kbd('T')}. Agricultura y alfarería sostienen el crecimiento; el bronce y la metalurgia, la defensa.` },
    { id: 'producir', when: (g, p) => PC.civCities(p).length > 0,
      text: () => 'Selecciona tu ciudad para decidir qué produce. Un explorador primero, luego guerreros y un colono para ganar provincias.',
      tile: (g, p) => PC.tile(PC.civCities(p)[0].t) },
    { id: 'explorar', when: (g, p) => g.turn >= 3 && PC.civUnits(p).some((u) => u.type === 'explorador' || PC.isMil(u)),
      text: () => 'Explora: las nubes esconden provincias, recursos y vecinos. Usa el botón Explorar de la unidad o muévela tú; el minimapa muestra lo que falta.' },
    { id: 'turno', when: (g) => g.turn >= 4,
      text: () => `${kbd('N')} salta a la siguiente unidad sin órdenes, ${kbd('Espacio')} la deja quieta este turno y ${kbd('Enter')} termina el turno. Las flechas o ${kbd('I')}${kbd('J')}${kbd('K')}${kbd('L')} desplazan el mapa.` },
    { id: 'defender', when: (g, p) => g.turn >= 6 && PC.civCities(p).some((c) => !g.units.some((u) => u.t === c.t && u.civ === p.id && PC.isMil(u))),
      text: () => `Deja una unidad militar en cada ciudad y pulsa ${kbd('F')} para fortificarla. Las ciudades vacías son presa fácil de saqueadores y vecinos.`,
      tile: (g, p) => { const c = PC.civCities(p).find((x) => !g.units.some((u) => u.t === x.t && u.civ === p.id && PC.isMil(u))); return c && PC.tile(c.t); } },
    { id: 'diplomacia', when: (g, p) => g.turn >= 8 && g.civs.some((c) => c.alive && c.id !== p.id && !PC.atWar(p.id, c.id) && PC.civCities(c).some((x) => PC.isExplored(x.t))),
      text: () => `Ya conoces a tus vecinos. Abre la diplomacia con ${kbd('D')}: un pacto de fronteras o una alianza vale más que una guerra temprana.` },
    { id: 'provincias', when: (g) => g.turn >= 12,
      text: () => `Controla ${PC.phaseNeed()} de ${PC.G.map.regions.length} provincias para pasar a la siguiente fase. Consulta cuáles te faltan con ${kbd('P')}.` },
    { id: 'cohesion', when: (g, p) => g.turn >= 16 && p.stability < 45,
      text: () => 'Tu cohesión está baja: los templos, la cultura y la paz la recuperan. Si cae demasiado, las provincias pueden rebelarse.' },
    { id: 'cronica', when: (g) => g.turn >= 20,
      text: () => `La crónica (${kbd('C')}) compara tu partida con la historia real y anota cada divergencia.` }
  ];

  function show(item) {
    A.cur = item;
    A.el.innerHTML = `<div class="adv-ico">${PC.icon(item.threat ? 'alerta' : 'cronica')}</div>
      <div class="adv-body"><b>${item.threat ? 'Amenaza' : 'Consejero'}</b><p>${item.html}</p>
      <div class="adv-acts">${item.tile ? '<button type="button" class="btn" data-adv="ver">Ver</button>' : ''}<button type="button" class="btn primary" data-adv="ok">Entendido</button>
      ${item.threat ? '' : '<button type="button" class="btn ghost" data-adv="off">No más consejos</button>'}</div></div>`;
    A.el.className = item.threat ? 'threat' : '';
    A.el.hidden = false;
  }
  function hide() { A.cur = null; if (A.el) A.el.hidden = true; }
  const enabled = () => UI.pref('consejero', true);
  function state() { const g = PC.G; if (!g.consejero) g.consejero = { seen: {}, shown: {}, threats: {} }; if (!g.consejero.shown) g.consejero.shown = {}; return g.consejero; }

  // Busca qué decir: primero amenazas nuevas, luego un consejo pendiente.
  function check() {
    if (!A.el) return;
    const g = PC.G;
    if (!g || g.preview || g.gameOver || document.querySelector('#hud').hidden || !enabled()) { hide(); return; }
    if (A.cur) { if (!A.cur.threat && A.cur.still && !A.cur.still()) hide(); else return; }
    const p = PC.player(), st = state();
    for (const th of UI.threats()) {
      const key = th.city.id + ':' + th.civ.id;
      if (st.threats[key] && g.turn - st.threats[key] < 5) continue;
      st.threats[key] = g.turn;
      const n = th.foes.length;
      show({ threat: true, tile: th.tile, html: `${n === 1 ? 'Una unidad' : n + ' unidades'} de ${UI.esc(th.civ.name)} ${n === 1 ? 'se acerca' : 'se acercan'} a ${UI.esc(th.city.name)}. Refuerza la guarnición o fortifícala.` });
      return;
    }
    if (g.turn > TIP_TURNS) return;
    for (const tip of TIPS) {
      // Visto = aceptado por el jugador o mostrado durante 3 turnos sin respuesta.
      if (st.seen[tip.id] || (st.shown[tip.id] && g.turn - st.shown[tip.id] >= 3) || !tip.when(g, p)) continue;
      if (!st.shown[tip.id]) st.shown[tip.id] = g.turn;
      show({ id: tip.id, html: tip.text(), tile: tip.tile ? tip.tile(g, p) : null, still: () => tip.when(PC.G, PC.player()) });
      return;
    }
  }
  A.check = check;

  function mount() {
    const hud = document.querySelector('#hud');
    if (!hud || A.el) return;
    hud.insertAdjacentHTML('beforeend', '<div id="advisor" role="status" aria-live="polite" hidden></div>');
    A.el = document.querySelector('#advisor');
    A.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-adv]'); if (!b) return;
      const act = b.dataset.adv, cur = A.cur;
      if (act === 'ver' && cur && cur.tile) { R.centerOn(cur.tile); return; }
      if (cur && cur.id) state().seen[cur.id] = PC.G.turn;
      if (act === 'off') { UI.prefs.consejero = false; UI.savePrefs(); const box = document.querySelector('#opt-consejero'); if (box) box.checked = false; UI.toast('Consejero desactivado. Puedes volver a activarlo en Opciones.', 'info'); }
      hide();
      setTimeout(check, 600);
    });
  }
  UI.on('start', () => { hide(); check(); });
  UI.on('turn', () => { hide(); });
  UI.on('refresh', () => check());
  UI.on('menu', () => hide());
  window.addEventListener('DOMContentLoaded', () => { mount(); UI.addOption('consejero', 'Consejero: consejos en los primeros turnos y avisos de amenazas', true, (on) => (on ? check() : hide())); });
})(globalThis.PC = globalThis.PC || {});

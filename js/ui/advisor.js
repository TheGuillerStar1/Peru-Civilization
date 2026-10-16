// Consejero: consejos por condición durante TODA la partida (no solo los primeros turnos) y avisos de
// amenazas cerca de tus ciudades. Cada consejo lleva su porqué, ofrece una acción real (ir, abrir la
// pantalla, posponer) y se recuerda mientras su condición siga siendo cierta.
// Se desactiva en Opciones › Ayudas y accesibilidad. Su memoria vive en la partida (g.consejero).
// API pública: UI.advisor = { el, cur, check, peek } — peek() lo consume js/ui/tasks.js.
(function (PC) {
  'use strict';
  const UI = PC.UI, R = PC.R;
  const REPEAT = 8;   // turnos mínimos antes de repetir un consejo que sigue vigente
  const SNOOZE = 5;   // «Recuérdamelo luego»: turnos que se pospone
  const STALE = 3;    // turnos que una tarjeta sin responder puede quedarse en pantalla
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
  // Ayudas seguras: muchas de estas funciones viven en otros módulos y pueden no estar cargadas.
  const safe = (fn, alt) => { try { return fn(); } catch (e) { return alt; } };
  const alguna = (list, fn) => list.some((x) => safe(() => fn(x), false));

  // Consejos generales, EN ORDEN DE PRIORIDAD: el primero cuya condición se cumpla es el que sale.
  // Campos: id, when(g,p), text(), tile?(g,p) → «Ver», open? → «Abrir», repeat? (turnos), once? (una vez).
  const TIPS = [
    { id: 'fundar', when: (g, p) => !PC.civCities(p).length && PC.civUnits(p).some((u) => u.type === 'colono'),
      text: () => `Funda tu primera ciudad: selecciona al colono y pulsa ${kbd('B')} sobre una casilla con agua, comida y altura. La costa y los valles rinden bien al comienzo.`,
      tile: (g, p) => { const u = PC.civUnits(p).find((x) => x.type === 'colono'); return u && PC.tile(u.t); }, repeat: 4 },
    { id: 'investigar', when: (g, p) => !p.research && PC.availableTechs(p).length,
      text: () => `Elige qué investigar con ${kbd('T')}. Agricultura y alfarería sostienen el crecimiento; el bronce y la metalurgia, la defensa.`,
      open: '[data-modal="techs"]', repeat: 5 },
    { id: 'producir', when: (g, p) => PC.civCities(p).some((c) => !c.build),
      text: () => `Una ciudad sin producción no aporta nada al turno. Selecciónala y elige qué construye: un explorador al principio, luego guerreros y un colono para ganar provincias.`,
      tile: (g, p) => { const c = PC.civCities(p).find((x) => !x.build); return c && PC.tile(c.t); }, repeat: 6 },
    { id: 'defender', when: (g, p) => PC.civCities(p).some((c) => !PC.unitsAt(c.t).some((u) => u.civ === p.id && PC.isMil(u))),
      text: () => `Deja una unidad militar en cada ciudad y pulsa ${kbd('F')} para fortificarla. Las ciudades vacías son presa fácil de saqueadores y vecinos.`,
      tile: (g, p) => { const c = PC.civCities(p).find((x) => !PC.unitsAt(x.t).some((u) => u.civ === p.id && PC.isMil(u))); return c && PC.tile(c.t); }, repeat: 12 },
    { id: 'oro', when: (g, p) => p.gold < 0 || (p.lastIncome !== undefined && p.lastIncome < 0),
      text: () => 'Tu oro baja cada turno: el mantenimiento de tropas y edificios supera tus ingresos. Licencia unidades viejas, abre rutas comerciales o conquista una ciudad rica antes de quedarte sin tesoro.',
      open: '[data-modal="diplo"]', repeat: 8 },
    { id: 'cohesion', when: (g, p) => p.stability < 45,
      text: () => 'Tu cohesión está baja: los templos, la cultura y la paz la recuperan. Si cae demasiado, las provincias pueden rebelarse.',
      repeat: 10 },
    { id: 'explorar', when: (g, p) => PC.civUnits(p).some((u) => u.type === 'explorador' || PC.isMil(u)),
      text: () => 'Explora: las nubes esconden provincias, recursos y vecinos. Usa el botón Explorar de la unidad o muévela tú; el minimapa muestra lo que falta.',
      once: true },
    { id: 'turno', when: (g) => g.turn >= 3,
      text: () => `${kbd('N')} salta a la siguiente unidad sin órdenes, ${kbd('Espacio')} la deja quieta este turno y ${kbd('Enter')} termina el turno. Las flechas o ${kbd('I')}${kbd('J')}${kbd('K')}${kbd('L')} desplazan el mapa.`,
      once: true },
    { id: 'diplomacia', when: (g, p) => g.civs.some((c) => c.alive && c.id !== p.id && !PC.atWar(p.id, c.id) && PC.civCities(c).some((x) => PC.isExplored(x.t))),
      text: () => `Ya conoces a tus vecinos. Abre la diplomacia con ${kbd('D')}: un pacto de fronteras o una alianza vale más que una guerra temprana.`,
      open: '[data-modal="diplo"]', once: true },
    { id: 'rutas', when: (g, p) => PC.civRoutes(p.id).length < PC.maxRoutes(p),
      text: () => 'Tienes rutas comerciales libres: cada una trae oro y acerca a tus vecinos. Abre una caravana de llamas desde una ciudad con mercado.',
      open: '[data-modal="diplo"]', repeat: 15 },
    { id: 'provincias', when: (g) => PC.playerRegionCount() < PC.phaseNeed(),
      text: () => `Controlas ${PC.playerRegionCount()} de las ${PC.G.map.regions.length} provincias y necesitas ${PC.phaseNeed()} para pasar de fase. Consulta cuáles te faltan con ${kbd('P')}.`,
      open: '[data-modal="regions"]', repeat: 20 },
    { id: 'congreso', when: (g) => !!g.congress && g.congress.next !== null && g.congress.next - g.turn <= 3 && g.congress.next >= g.turn,
      text: () => `El congreso de los pueblos se reúne en ${Math.max(0, PC.G.congress.next - PC.G.turn)} turno(s) y tu voto decide con los demás. Prepara la influencia y habla con tus vecinos antes de la sesión.`,
      open: '[data-modal="diplo"]', repeat: 4 },
    { id: 'fase', when: () => PC.canAdvancePhase(),
      text: () => 'Ya cumples las condiciones para pasar a la siguiente fase: conservas tecnologías, ciudades y ejército, y el mapa se amplía al continente.',
      open: '[data-modal="regions"]', repeat: 10 },
    { id: 'cronica', when: (g) => g.turn >= 12,
      text: () => `La crónica (${kbd('C')}) compara tu partida con la historia real, anota cada divergencia y guarda el registro de avisos de los últimos turnos.`,
      once: true }
  ];

  // Consejos de la Conquista (v0.1.3): no dependen del turno, sino de lo que ocurre en la campaña.
  const chron = (g, re) => ((g.conquista && g.conquista.chronicle) || []).some((c) => re.test(c.text));
  const conqHint = () => (PC.UI.openConquista ? ' Ábrela desde el botón Conquista de la barra superior.' : ' Consulta la crónica (' + kbd('C') + ') para seguirla.');
  const CONQ_TIPS = [
    { id: 'conq_inicio', when: (g) => !!(g.conquista && g.conquista.intro) && PC.conquistaActive(),
      text: () => 'Se abrió el primer frente de la Conquista: cada frente tiene su Corona, su comandante y sus pueblos aliados o rivales. Puedes formar una liga de resistencia (cuesta influencia y une a los vecinos contra la Corona) o pactar con ella (oro y acero, pero te odiarán los demás y la Corona puede traicionarte).' + conqHint(),
      open: '[data-modal="conquista"]', repeat: 12 },
    { id: 'conq_traicion', when: (g) => chron(g, /se alía con/),
      text: () => 'Un pueblo se ha aliado con la Corona: muchos lo hicieron para cobrarse viejas deudas con sus vecinos. Si era aliado tuyo, la alianza se rompe; puedes castigarlo, comprar su lealtad o esperar a que vuelva a la resistencia.',
      once: true },
    { id: 'conq_capital', when: (g) => Object.keys(g.fired).some((k) => k.indexOf('caida_') === 0 && k !== 'caida_capital'),
      text: () => 'Ha caído una capital. Sin ella, el pueblo pierde cohesión y los vecinos dudan: refuerza tus plazas, une la liga o pacta antes de que el frente se decida.',
      once: true },
    // Decisión pendiente de la campaña: hay frentes abiertos y aún no te has pronunciado.
    { id: 'conq_decidir', when: (g) => {
        if (!PC.conquistaActive() || !PC.conquistaView) return false;
        const v = PC.conquistaView();
        return !!v && (v.fronts || []).some((f) => f.state === 'activo') && !v.league && !v.pact;
      },
      text: () => 'Tienes frentes de la Conquista abiertos y todavía no has tomado partido. La liga de resistencia une a tus vecinos contra la Corona; el pacto te da oro, caballos y acero a cambio del odio de los demás. Nadie queda neutral para siempre.' + conqHint(),
      open: '[data-modal="conquista"]', repeat: 10 }
  ];

  function show(item) {
    A.cur = item;
    A.cur.shownTurn = PC.G.turn;
    const acts = [];
    if (item.tile) acts.push('<button type="button" class="btn" data-adv="ver">Ver</button>');
    if (item.open) acts.push('<button type="button" class="btn" data-adv="abrir">Abrir</button>');
    acts.push('<button type="button" class="btn primary" data-adv="ok">Entendido</button>');
    if (!item.threat) acts.push('<button type="button" class="btn ghost" data-adv="luego">Recuérdamelo luego</button><button type="button" class="btn ghost" data-adv="off">No más consejos</button>');
    A.el.innerHTML = `<div class="adv-ico">${PC.icon(item.threat ? 'alerta' : 'cronica')}</div>
      <div class="adv-body"><b>${item.threat ? 'Amenaza' : 'Consejero'}</b><p>${item.html}</p>
      <div class="adv-acts">${acts.join('')}</div></div>`;
    A.el.className = item.threat ? 'threat' : '';
    A.el.hidden = false;
  }
  function hide() { A.cur = null; if (A.el) A.el.hidden = true; }
  const enabled = () => UI.pref('consejero', true);
  function state() {
    const g = PC.G;
    if (!g.consejero) g.consejero = { seen: {}, shown: {}, threats: {} };
    if (!g.consejero.shown) g.consejero.shown = {};
    if (!g.consejero.next) g.consejero.next = {};
    if (!g.consejero.threats) g.consejero.threats = {};
    return g.consejero;
  }
  // El primer consejo de la lista cuya condición se cumpla y que no esté descartado ni pospuesto.
  function pick(list, g, p, st) {
    for (let i = 0; i < list.length; i++) {
      const tip = list[i];
      if (st.seen[tip.id]) continue;
      if ((st.next[tip.id] || 0) > g.turn) continue;
      if (!safe(() => !!tip.when(g, p), false)) continue;
      return tip;
    }
    return null;
  }
  // Marca el consejo como visto para siempre (los informativos) o programa su próxima aparición.
  function schedule(tip, st, g) {
    st.shown[tip.id] = g.turn;
    if (tip.once) st.seen[tip.id] = g.turn;
    else st.next[tip.id] = g.turn + (tip.repeat || REPEAT);
  }

  // Busca qué decir: primero amenazas nuevas, luego la Conquista y por último los consejos generales.
  function check() {
    if (!A.el) return;
    const g = PC.G, hud = document.querySelector('#hud');
    if (!g || g.preview || g.gameOver || !hud || hud.hidden || !enabled()) { hide(); return; }
    if (A.cur) {
      // La tarjeta se retira si el problema ya no existe o si lleva demasiado tiempo sin respuesta
      // (entonces volverá más tarde, porque su condición sigue siendo cierta).
      const vieja = A.cur.shownTurn !== undefined && g.turn - A.cur.shownTurn >= STALE;
      if ((!A.cur.threat && A.cur.still && !A.cur.still()) || vieja) hide();
      else return;
    }
    const p = PC.player(), st = state();
    for (const th of UI.threats()) {
      const key = th.city.id + ':' + th.civ.id;
      if (st.threats[key] && g.turn - st.threats[key] < 5) continue;
      st.threats[key] = g.turn;
      const n = th.foes.length;
      show({ threat: true, tile: th.tile, html: `${n === 1 ? 'Una unidad' : n + ' unidades'} de ${UI.esc(th.civ.name)} ${n === 1 ? 'se acerca' : 'se acercan'} a ${UI.esc(th.city.name)}. Refuerza la guarnición o fortifícala.` });
      return;
    }
    const tip = pick(CONQ_TIPS, g, p, st) || pick(TIPS, g, p, st);
    if (!tip) return;
    schedule(tip, st, g);
    show({ id: tip.id, html: tip.text(), tile: tip.tile ? safe(() => tip.tile(g, p), null) : null,
      open: tip.open || null, still: () => safe(() => !!tip.when(PC.G, PC.player()), false) });
  }
  A.check = check;
  // Lo que está en pantalla, para que la lista de pendientes (js/ui/tasks.js) pueda ofrecerlo.
  A.peek = function () { return A.cur ? { id: A.cur.id || null, html: A.cur.html, tile: A.cur.tile || null } : null; };

  function mount() {
    const hud = document.querySelector('#hud');
    if (!hud || A.el) return;
    hud.insertAdjacentHTML('beforeend', '<div id="advisor" role="status" aria-live="polite" hidden></div>');
    A.el = document.querySelector('#advisor');
    A.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-adv]'); if (!b) return;
      const act = b.dataset.adv, cur = A.cur, g = PC.G, st = state();
      if (act === 'ver' && cur && cur.tile) { R.centerOn(cur.tile); return; } // ver no descarta el consejo
      if (act === 'abrir') {
        if (cur && cur.open) { const nav = document.querySelector(cur.open); if (nav && nav.click) nav.click(); }
        if (cur && cur.id) st.seen[cur.id] = g.turn;
        hide(); setTimeout(check, 600); return;
      }
      if (cur && cur.id) {
        if (act === 'ok') st.seen[cur.id] = g.turn;                       // descartado para siempre
        if (act === 'luego') st.next[cur.id] = g.turn + SNOOZE;            // pospuesto
      }
      if (act === 'off') {
        UI.prefs.consejero = false; UI.savePrefs();
        const box = document.querySelector('#opt-consejero'); if (box) box.checked = false;
        UI.toast('Consejero desactivado. Puedes volver a activarlo en Opciones.', 'info');
      }
      hide();
      setTimeout(check, 600);
    });
  }
  UI.on('start', () => { hide(); check(); });
  UI.on('turn', () => { hide(); });
  UI.on('refresh', () => check());
  UI.on('menu', () => hide());
  window.addEventListener('DOMContentLoaded', () => { mount(); UI.addOption('consejero', 'Consejero: consejos durante toda la partida y avisos de amenazas', true, (on) => (on ? check() : hide())); });
})(globalThis.PC = globalThis.PC || {});

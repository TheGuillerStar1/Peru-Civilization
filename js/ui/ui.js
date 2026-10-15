// Interfaz: menú, paneles, modales y controles.
(function (PC) {
  'use strict';
  const R = PC.R;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const UI = PC.UI = { menu: { scenario: 'origenes', culture: 'caral', difficulty: 'medio' }, modal: null };
  const SAVE_KEY = 'peru-civ-save';

  // ------------------------------------------------------------------ Menú
  function card(id, title, desc, active, color, group) {
    return `<button class="card ${active ? 'active' : ''}" data-${group}="${id}">${color ? `<span class="dot" style="background:${color}"></span>` : ''}<b>${esc(title)}</b><span>${esc(desc)}</span></button>`;
  }
  function renderMenu() {
    const m = UI.menu;
    const sc = PC.SCENARIOS[m.scenario];
    if (!sc.playable.includes(m.culture)) m.culture = sc.playable[0];
    $('#scenarios').innerHTML = Object.keys(PC.SCENARIOS).map((id) => card(id, PC.SCENARIOS[id].name, PC.SCENARIOS[id].desc, id === m.scenario, null, 'sc')).join('');
    $('#cultures').innerHTML = sc.playable.map((id) => card(id, PC.CULTURES[id].name, PC.CULTURES[id].desc, id === m.culture, PC.CULTURES[id].color, 'cu')).join('');
    $('#difficulties').innerHTML = Object.keys(PC.DIFFICULTY).map((id) => card(id, PC.DIFFICULTY[id].name, PC.DIFFICULTY[id].desc, id === m.difficulty, null, 'df')).join('');
    let has = false; try { has = !!localStorage.getItem(SAVE_KEY); } catch (e) { has = false; }
    $('#btn-continue').disabled = !has;
  }
  function bindMenu() {
    $('#menu').addEventListener('click', (e) => {
      const b = e.target.closest('.card'); if (!b) return;
      if (b.dataset.sc) UI.menu.scenario = b.dataset.sc;
      if (b.dataset.cu) UI.menu.culture = b.dataset.cu;
      if (b.dataset.df) UI.menu.difficulty = b.dataset.df;
      renderMenu();
    });
    $('#btn-start').onclick = () => {
      const seed = +$('#opt-seed').value || undefined;
      PC.newGame({ scenario: UI.menu.scenario, culture: UI.menu.culture, difficulty: UI.menu.difficulty, seed, speed: $('#opt-speed').value });
      startGame(true);
    };
    $('#btn-continue').onclick = () => { try { PC.load(localStorage.getItem(SAVE_KEY)); startGame(false); } catch (e) { alert('No se pudo cargar: ' + e.message); } };
    $('#btn-load-file').onclick = () => $('#file-load').click();
    $('#file-load').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then((txt) => { PC.load(txt); startGame(false); }).catch((err) => alert('Archivo inválido: ' + err.message));
    };
  }
  function startGame(fresh) {
    $('#menu').classList.add('hidden'); $('#game').classList.remove('hidden');
    R.resize();
    const cap = PC.cityById(PC.player().capitalId) || PC.civCities(PC.player())[0];
    const u = PC.civUnits(PC.player())[0];
    R.cam.zoom = 1.25;
    R.centerOn(cap ? PC.tile(cap.t) : PC.tile(u.t));
    UI.select(null);
    if (fresh) showIntro();
    refresh();
  }
  function showIntro() {
    const g = PC.G, p = PC.player();
    openModal(`<h2>${esc(p.name)} · ${PC.fmtYear(g.year)}</h2>
      <p>${esc(PC.CULTURES[p.key].desc)}</p>
      <p><b>Dificultad: ${esc(PC.diff().name)}.</b> ${esc(PC.diff().desc)}</p>
      <h3>Cómo jugar</h3>
      <ul class="help">
        <li><b>Clic</b> en una unidad para seleccionarla; <b>clic</b> en una casilla resaltada para moverla; casillas con borde rojo = atacar. <b>Arrastra</b> para desplazar el mapa y usa la <b>rueda</b> para el zoom.</li>
        <li>El <b>Ayllu colonizador</b> funda ciudades (<kbd>B</kbd>). Los <b>Ayllus de mit'a</b> construyen chacras, andenes, canales, minas y caminos.</li>
        <li><b>Costa</b>: valles fértiles separados por desierto (cuesta movimiento y desgasta). <b>Sierra</b>: las cordilleras son barreras, crúzalas por las <b>abras</b> (línea amarilla). <b>Selva</b>: niebla densa, desgaste y fauna peligrosa 🐆🐍🐊🦟.</li>
        <li>Algunas tecnologías exigen <b>recursos</b>: sin cobre no hay bronce, sin hierro no hay hierro, sin salitre o guano no hay pólvora. Asentarte junto a los minerales cambia la historia.</li>
        <li>Las grandes culturas (Chavín, Moche, Wari, Chimú, Incas…) aparecen en su fecha… salvo que su tierra ya sea tuya.</li>
        <li>Une el <b>80% de las provincias</b> para pasar a la Fase 2: Sudamérica.</li>
      </ul>
      <p class="small">Atajos: <kbd>Enter</kbd> terminar turno · <kbd>N</kbd> siguiente unidad · <kbd>F</kbd> fortificar · <kbd>Espacio</kbd> saltar · <kbd>T</kbd> tecnologías · <kbd>Esc</kbd> cancelar</p>
      <div class="choices"><button class="primary" data-close>¡A forjar la historia!</button></div>`);
  }

  // ------------------------------------------------------------------ Barra superior
  function renderTop() {
    const g = PC.G, p = PC.player();
    $('#tb-color').style.background = p.color;
    $('#tb-civ').textContent = p.name;
    $('#tb-year').innerHTML = `📅 <b>${PC.fmtYear(g.year)}</b> <small>${PC.ERAS[PC.eraOf(p)].name} · turno ${g.turn}</small>`;
    const inc = p.lastIncome === undefined ? estimateIncome(p) : p.lastIncome;
    $('#tb-gold').innerHTML = `🪙 <b>${Math.round(p.gold)}</b> <small>${inc >= 0 ? '+' : ''}${inc}</small>`;
    const sciNow = estimateSci(p);
    const res = p.research ? `${esc(PC.TECH[p.research].name)} ${Math.min(100, Math.round(p.progress / PC.techCost(p, p.research) * 100))}%` : '<span class="warn">¡Elige investigación!</span>';
    $('#tb-sci').innerHTML = `🔬 +${sciNow} <small>${res}</small>`;
    $('#tb-cult').innerHTML = `🎭 <b>${Math.round(p.culture)}</b>`;
    const st = Math.round(p.stability);
    $('#tb-stab').innerHTML = `⚖️ <b class="${st < 35 ? 'bad' : st >= 70 ? 'good' : ''}">${st}</b> <small>cohesión</small>`;
    $('#tb-reg').innerHTML = `🗺️ <b>${PC.playerRegionCount()}</b>/${g.map.regions.length} <small>prov.</small>`;
  }
  function estimateIncome(p) { return PC.civCities(p).reduce((s, c) => s + PC.cityYields(c).g, 0); }
  function estimateSci(p) { return PC.civCities(p).reduce((s, c) => s + PC.cityYields(c).s, 0); }

  // ------------------------------------------------------------------ Panel lateral
  UI.select = function (sel) {
    R.sel = sel; R.reach = null; R.targets = null; R.path = null;
    if (sel && sel.unit) {
      if (sel.unit.civ === PC.G.playerId) { R.reach = PC.reachable(sel.unit); R.targets = PC.attackTargets(sel.unit); }
    }
    renderPanel(); R.draw();
  };
  function yieldsHtml(y) { return `<span class="y f">🌽 ${y.f}</span><span class="y p">⚒️ ${y.p}</span><span class="y g">🪙 ${y.g}</span>`; }
  function tileInfo(t) {
    const p = PC.player();
    if (!PC.isExplored(t.i)) return '<p class="muted">Territorio inexplorado.</p>';
    const T = PC.TERRAIN[t.terrain];
    const rg = PC.G.map.regions.find((r) => r.id === t.region);
    const y = PC.tileYield(p, t);
    let h = `<div class="tileinfo"><b>${esc(T.name)}</b>${t.name ? ` · <i>${esc(t.name)}</i>` : ''}<br>`;
    h += `<small>${PC.ZONE_NAME[T.zone] || ''}${rg ? ' · ' + esc(rg.name) : ''}${t.owner ? ' · ' + esc(PC.civ(t.owner).name) : ''}</small><br>`;
    if (t.terrain !== 'oceano') h += yieldsHtml(y);
    const extras = [];
    if (t.feature === 'rio') extras.push('🌊 Río navegable (sin desgaste, +1 🌽 +1 🪙)');
    if (t.feature === 'abra') extras.push('⛰️ Abra: paso de montaña (mov. 1, sin desgaste, +defensa)');
    if (t.res && PC.resVisible(p, t.res)) extras.push(`${PC.RESOURCES[t.res].icon} ${PC.RESOURCES[t.res].name}`);
    if (t.imp) extras.push(`Mejora: ${PC.IMPROVEMENTS[t.imp].name}`);
    if (t.road) extras.push('Camino');
    if (t.fauna) extras.push(`${PC.FAUNA[t.fauna].icon} ${PC.FAUNA[t.fauna].name}`);
    if (T.move !== Infinity) extras.push(`Movimiento ${T.move}${T.def ? ` · defensa +${Math.round(T.def * 100)}%` : ''}${T.attr ? ` · desgaste ${T.attr}` : ''}`);
    if (extras.length) h += '<ul>' + extras.map((e) => `<li>${e}</li>`).join('') + '</ul>';
    return h + '</div>';
  }
  function renderPanel() {
    const g = PC.G, p = PC.player();
    const sel = R.sel;
    let h = '';
    if (sel && sel.unit && g.units.includes(sel.unit)) h = unitPanel(sel.unit);
    else if (sel && sel.city) h = cityPanel(sel.city);
    else if (sel && sel.tile) h = `<h3>Casilla</h3>${tileInfo(sel.tile)}`;
    else h = civPanel(p);
    $('#panel').innerHTML = h;
  }
  function civPanel(p) {
    const st = PC.stabilityTarget(p);
    const idle = PC.civUnits(p).filter((u) => u.moves > 0 && !u.fort && !u.task && !u.auto && !u.path).length;
    const noBuild = PC.civCities(p).filter((c) => !c.build).length;
    return `<h3><span class="dot" style="background:${p.color}"></span>${esc(p.name)}</h3>
      <p class="muted">${esc(p.leader || '')}</p>
      <div class="kv"><span>Ciudades</span><b>${PC.civCities(p).length} / capacidad ${PC.capacity(p)}</b></div>
      <div class="kv"><span>Poder militar</span><b>${PC.power(p)}</b></div>
      <div class="kv"><span>Tecnologías</span><b>${Object.keys(p.techs).length} / ${PC.TECHS.length}</b></div>
      <div class="kv"><span>Dificultad</span><b>${esc(PC.diff().name)}</b></div>
      <h4>Cohesión: ${Math.round(p.stability)} → ${st.value}</h4>
      <ul class="parts">${st.parts.map(([n, v]) => `<li><span>${esc(n)}</span><b class="${v < 0 ? 'bad' : 'good'}">${v > 0 ? '+' : ''}${v}</b></li>`).join('')}</ul>
      ${idle ? `<p class="warn">${idle} unidad(es) esperan órdenes <kbd>N</kbd></p>` : ''}
      ${noBuild ? `<p class="warn">${noBuild} ciudad(es) sin producción</p>` : ''}
      ${PC.G.flags.fase2Disponible ? '<button class="primary" data-act="fase2">Avanzar a la Fase 2: Sudamérica</button>' : ''}
      <p class="small muted">Selecciona una unidad o ciudad. Pasa el ratón sobre el mapa para ver detalles.</p>`;
  }
  function unitPanel(u) {
    const U = PC.utype(u), civ = PC.civ(u.civ), t = PC.tile(u.t);
    const own = u.civ === PC.G.playerId;
    let h = `<h3>${U.icon} ${esc(U.name)}</h3><p class="muted"><span class="dot" style="background:${civ.color}"></span>${esc(civ.name)}</p>`;
    h += `<div class="kv"><span>Vida</span><b>${u.hp}/100</b></div><div class="kv"><span>Movimiento</span><b>${+u.moves.toFixed(1)} / ${PC.maxMoves(u)}</b></div>`;
    if (U.cat === 'military') h += `<div class="kv"><span>Ataque / Defensa</span><b>${U.atk}${U.ranged ? ' (a distancia)' : ''} / ${U.def}</b></div>`;
    if (U.desc) h += `<p class="small">${esc(U.desc)}</p>`;
    if (own) {
      const a = PC.attrition(u, t), fr = PC.faunaRisk(u, t);
      if (a > 0 && U.cat === 'military') h += `<p class="warn">Desgaste aquí: −${a} vida/turno</p>`;
      if (fr > 0) h += `<p class="warn">${PC.FAUNA[t.fauna].icon} Riesgo de fauna: ${Math.round(fr * 100)}%/turno (−${PC.FAUNA[t.fauna].dmg})</p>`;
      if (u.task) h += `<p>Trabajando: <b>${u.task.id === 'camino' ? 'Camino' : PC.IMPROVEMENTS[u.task.id].name}</b> (${u.task.left} turnos)</p>`;
      h += '<div class="actions">';
      if (u.type === 'colono') h += `<button data-act="found" ${PC.validCitySite(t, civ) ? '' : 'disabled'} title="${PC.validCitySite(t, civ) ? '' : 'Muy cerca de otra ciudad o terreno inválido'}">🏛️ Fundar ciudad <kbd>B</kbd></button>`;
      if (u.type === 'trabajador') {
        PC.improvementOptions(u).forEach((o) => { h += `<button data-act="work" data-id="${o.id}">${esc(o.name)} (${o.turns}t)</button>`; });
        h += `<button data-act="auto">${u.auto ? '⏹ Detener automático' : '🤖 Automatizar'}</button>`;
      }
      if (u.type === 'explorador') h += `<button data-act="auto">${u.auto ? '⏹ Detener exploración' : '🧭 Explorar automáticamente'}</button>`;
      if (U.cat === 'military') h += `<button data-act="fort">⛨ Fortificar <kbd>F</kbd></button>`;
      h += `<button data-act="skip">⏭ Saltar turno <kbd>Espacio</kbd></button>`;
      if (u.path) h += `<button data-act="stop">✋ Cancelar ruta</button>`;
      h += `<button data-act="disband" class="danger">Disolver</button></div>`;
    }
    return h + '<h4>Casilla</h4>' + tileInfo(t);
  }
  function cityPanel(city) {
    const civ = PC.civ(city.civ), own = city.civ === PC.G.playerId;
    const y = PC.cityYields(city);
    let h = `<h3>${civ.capitalId === city.id ? '★ ' : ''}${esc(city.name)}</h3><p class="muted"><span class="dot" style="background:${civ.color}"></span>${esc(civ.name)} · fundada ${PC.fmtYear(city.founded)}${city.conquered ? ' · conquistada' : ''}</p>`;
    h += `<div class="kv"><span>Población</span><b>${city.pop}</b></div>`;
    if (!own) return h + `<div class="kv"><span>Defensa</span><b>${Math.round(PC.cityStrength(city))} · muralla ${city.hp}/100</b></div>`;
    const need = PC.growthNeeded(city), surplus = y.f - city.pop * 2;
    h += `<div class="bar"><div style="width:${PC.clamp(city.food / need * 100, 0, 100)}%"></div><span>Crecimiento ${city.food}/${need} (${surplus >= 0 ? '+' : ''}${surplus})</span></div>`;
    h += `<div class="yrow">${yieldsHtml(y)}<span class="y s">🔬 ${y.s}</span><span class="y c">🎭 ${y.c}</span></div>`;
    h += `<div class="kv"><span>Defensa</span><b>${Math.round(PC.cityStrength(city))} · muralla ${city.hp}/100</b></div>`;
    const b = city.build;
    if (b && b.kind !== 'riqueza') {
      const cost = PC.buildCost(b.kind, b.id);
      const name = b.kind === 'unit' ? PC.UNITS[b.id].name : b.kind === 'building' ? PC.BUILDINGS[b.id].name : PC.WONDERS[b.id].name;
      const turns = Math.max(1, Math.ceil((cost - city.prod) / Math.max(1, y.p)));
      const bc = PC.buyCost(city);
      h += `<h4>Produciendo</h4><div class="bar prod"><div style="width:${PC.clamp(city.prod / cost * 100, 0, 100)}%"></div><span>${esc(name)} ${city.prod}/${cost} · ${turns} t</span></div>`;
      if (bc !== null) h += `<button data-act="buy" ${civ.gold >= bc && city.bought !== PC.G.turn ? '' : 'disabled'}>🪙 Comprar por ${bc}</button>`;
    } else h += `<h4>Produciendo</h4><p class="${b ? '' : 'warn'}">${b ? 'Riqueza (la producción se convierte en oro)' : '¡Elige qué producir!'}</p>`;
    const opts = PC.buildOptions(city);
    const group = (kind, title) => {
      const list = opts.filter((o) => o.kind === kind);
      if (!list.length) return '';
      return `<h4>${title}</h4><div class="buildlist">` + list.map((o) => {
        const turns = o.cost ? Math.max(1, Math.ceil(o.cost / Math.max(1, y.p))) : '';
        const def = kind === 'unit' ? PC.UNITS[o.id] : kind === 'building' ? PC.BUILDINGS[o.id] : kind === 'wonder' ? PC.WONDERS[o.id] : null;
        let tip = '';
        if (def && def.y) tip = Object.entries(def.y).map(([k, v]) => `+${v} ${{ f: '🌽', p: '⚒️', g: '🪙', s: '🔬', c: '🎭' }[k]}`).join(' ');
        if (def && def.stab) tip += ` +${def.stab} cohesión`;
        if (def && def.def && kind !== 'unit') tip += ` +${Math.round(def.def * 100)}% defensa`;
        if (kind === 'unit' && def.cat !== 'military') tip = def.desc || '';
        if (kind === 'unit' && def.cat === 'military') tip = `${def.atk}/${def.def}${def.ranged ? ' a distancia' : ''}${def.moves > 2 ? ` · mov ${def.moves}` : ''}`;
        const active = b && b.kind === o.kind && b.id === o.id;
        return `<button class="bopt ${active ? 'active' : ''}" data-act="build" data-kind="${o.kind}" data-id="${o.id}"><span>${def && def.icon ? def.icon + ' ' : ''}${esc(o.name)}</span><small>${tip}</small><em>${turns ? turns + 't' : ''}</em></button>`;
      }).join('') + '</div>';
    };
    h += group('unit', 'Unidades') + group('building', 'Edificios') + group('wonder', '🌟 Maravillas') + group('riqueza', 'Otros');
    if (city.buildings.length) h += `<h4>Construido</h4><p class="small">${city.buildings.map((x) => esc((PC.BUILDINGS[x] || PC.WONDERS[x]).name)).join(', ')}</p>`;
    return h;
  }

  function onPanelClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const sel = R.sel, act = b.dataset.act;
    const u = sel && sel.unit;
    if (act === 'found' && u) { PC.foundCity(PC.player(), PC.tile(u.t)); PC.removeUnit(u); const c = PC.cityAt(u.t); UI.select({ city: c }); }
    else if (act === 'work' && u) { PC.startWork(u, b.dataset.id); nextUnit(); }
    else if (act === 'auto' && u) { u.auto = !u.auto; if (u.auto) { PC.autoUnit(u); nextUnit(); } else UI.select({ unit: u }); }
    else if (act === 'fort' && u) { u.fort = true; u.moves = 0; nextUnit(); }
    else if (act === 'skip' && u) { u.skipTurn = PC.G.turn; nextUnit(); }
    else if (act === 'stop' && u) { u.path = null; UI.select({ unit: u }); }
    else if (act === 'disband' && u) { if (confirm('¿Disolver esta unidad?')) { PC.removeUnit(u); UI.select(null); } }
    else if (act === 'build' && sel && sel.city) { sel.city.build = { kind: b.dataset.kind, id: b.dataset.id }; UI.select({ city: sel.city }); }
    else if (act === 'buy' && sel && sel.city) { PC.buy(sel.city); UI.select({ city: sel.city }); }
    else if (act === 'fase2') { if (PC.startPhase2) { PC.startPhase2(); startGame(false); } }
    refresh();
  }

  // ------------------------------------------------------------------ Unidades: ciclo
  function needsOrders(u) { return u.moves > 0 && !u.fort && !u.task && !u.auto && !u.path && u.skipTurn !== PC.G.turn; }
  function nextUnit() {
    const list = PC.civUnits(PC.player()).filter(needsOrders);
    if (!list.length) { UI.select(null); refresh(); return; }
    const cur = R.sel && R.sel.unit;
    const idx = cur ? (list.indexOf(cur) + 1) % list.length : 0;
    const u = list[idx] || list[0];
    R.centerOn(PC.tile(u.t));
    UI.select({ unit: u });
    refresh();
  }

  // ------------------------------------------------------------------ Mapa: ratón y teclado
  function bindMap() {
    const cv = $('#map');
    let drag = null;
    cv.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: R.cam.x, cy: R.cam.y, moved: false, btn: e.button }; });
    window.addEventListener('mousemove', (e) => {
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
        if (drag.moved) { R.cam.x = drag.cx - dx; R.cam.y = drag.cy - dy; R.draw(); }
      }
      if (e.target === cv) hover(e);
    });
    window.addEventListener('mouseup', (e) => {
      if (drag && !drag.moved && e.target === cv) clickMap(e, drag.btn === 2);
      drag = null;
    });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); R.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); R.draw(); }, { passive: false });
    cv.addEventListener('mouseleave', () => { R.hover = null; $('#tooltip').classList.add('hidden'); R.draw(); });
    // Táctil: arrastrar y tocar.
    let touch = null;
    cv.addEventListener('touchstart', (e) => { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY, cx: R.cam.x, cy: R.cam.y, moved: false }; }, { passive: true });
    cv.addEventListener('touchmove', (e) => { if (!touch) return; const t = e.touches[0]; const dx = t.clientX - touch.x, dy = t.clientY - touch.y; if (Math.abs(dx) + Math.abs(dy) > 8) touch.moved = true; R.cam.x = touch.cx - dx; R.cam.y = touch.cy - dy; R.draw(); e.preventDefault(); }, { passive: false });
    cv.addEventListener('touchend', (e) => { if (touch && !touch.moved) { const t = e.changedTouches[0]; clickMap({ clientX: t.clientX, clientY: t.clientY }, false); } touch = null; });
    window.addEventListener('resize', () => { if (PC.G) { R.resize(); R.draw(); } });
    $('#zin').onclick = () => { R.zoomAt(1.2, R.w / 2, R.h / 2); R.draw(); };
    $('#zout').onclick = () => { R.zoomAt(1 / 1.2, R.w / 2, R.h / 2); R.draw(); };
    $('#tgl-regions').onclick = (e) => { R.showRegions = !R.showRegions; e.target.classList.toggle('on', R.showRegions); R.draw(); };
    $('#tgl-yields').onclick = (e) => { R.showYields = !R.showYields; e.target.classList.toggle('on', R.showYields); R.draw(); };
    document.addEventListener('keydown', onKey);
  }
  function mapXY(e) { const r = $('#map').getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function hover(e) {
    const [mx, my] = mapXY(e);
    const t = R.pick(mx, my);
    if (t !== R.hover) {
      R.hover = t;
      const sel = R.sel && R.sel.unit;
      R.path = null;
      if (t && sel && sel.civ === PC.G.playerId && !(R.reach && R.reach.has(t.i)) && t.i !== sel.t && PC.isExplored(t.i)) R.path = PC.findPath(sel, t.i);
      R.draw();
    }
    const tip = $('#tooltip');
    if (!t || !PC.isExplored(t.i)) { tip.classList.add('hidden'); return; }
    const T = PC.TERRAIN[t.terrain];
    const rg = PC.G.map.regions.find((r) => r.id === t.region);
    const city = t.cityId ? PC.cityAt(t.i) : null;
    const us = PC.isVisible(t.i) ? PC.unitsAt(t.i) : [];
    let html = `<b>${esc(city ? city.name : T.name)}</b>${rg ? `<br><small>${esc(rg.name)}</small>` : ''}`;
    if (t.owner) html += `<br><small style="color:${PC.civ(t.owner).color}">${esc(PC.civ(t.owner).name)}</small>`;
    us.forEach((u) => { html += `<br>${PC.UNITS[u.type].icon} ${esc(PC.UNITS[u.type].name)} <small>(${esc(PC.civ(u.civ).name)}, ${u.hp}♥)</small>`; });
    if (t.fauna) html += `<br>${PC.FAUNA[t.fauna].icon} <small>${esc(PC.FAUNA[t.fauna].name)}</small>`;
    const su = R.sel && R.sel.unit;
    if (su && R.targets && R.targets.includes(t.i)) {
      const o = PC.combatOdds(su, t.i);
      html += `<br><b class="${o.ratio >= 1 ? 'good' : 'bad'}">Ataque ${o.A.toFixed(1)} vs ${o.D.toFixed(1)}</b>`;
    }
    tip.innerHTML = html;
    tip.style.left = (mx + 16) + 'px'; tip.style.top = (my + 12) + 'px';
    tip.classList.remove('hidden');
  }
  function clickMap(e, right) {
    const [mx, my] = mapXY(e);
    const t = R.pick(mx, my);
    if (!t) return;
    const g = PC.G;
    const su = R.sel && R.sel.unit;
    if (su && su.civ === g.playerId && g.units.includes(su)) {
      if (R.targets && R.targets.includes(t.i)) {
        const enemy = PC.unitsAt(t.i)[0] || PC.cityAt(t.i);
        void enemy;
        PC.attack(su, t.i); afterAction(su); return;
      }
      if (R.reach && R.reach.has(t.i)) { PC.relocate(su, t.i, R.reach.get(t.i)); su.path = null; afterAction(su); return; }
      if ((right || t.i !== su.t) && PC.isExplored(t.i) && t.i !== su.t) {
        const occupiedEnemy = PC.unitsAt(t.i).some((o) => o.civ !== su.civ) || (t.cityId && PC.cityAt(t.i).civ !== su.civ);
        if (occupiedEnemy && !PC.atWar(su.civ, (PC.unitsAt(t.i)[0] || PC.cityAt(t.i)).civ)) {
          const other = PC.civ((PC.unitsAt(t.i)[0] || PC.cityAt(t.i)).civ);
          if (!other.isPlayer && confirm(`¿Declarar la guerra a ${other.name}?`)) { PC.declareWar(PC.player(), other); UI.select({ unit: su }); refresh(); }
          return;
        }
        if (right || !PC.unitsAt(t.i).some((o) => o.civ === g.playerId)) {
          const path = PC.findPath(su, t.i);
          if (path) { su.path = path; PC.followPath(su); afterAction(su); return; }
        }
      }
    }
    // Selección
    const mine = PC.unitsAt(t.i).filter((u) => u.civ === g.playerId);
    const city = t.cityId ? PC.cityAt(t.i) : null;
    if (mine.length) {
      const idx = su && mine.includes(su) ? (mine.indexOf(su) + 1) % (mine.length + (city && city.civ === g.playerId ? 1 : 0)) : 0;
      if (idx >= mine.length) UI.select({ city }); else UI.select({ unit: mine[idx] });
    } else if (city) UI.select({ city });
    else if (PC.isVisible(t.i) && PC.unitsAt(t.i).length) UI.select({ unit: PC.unitsAt(t.i)[0] });
    else UI.select({ tile: t });
    refresh();
  }
  function afterAction(u) {
    if (PC.G.units.includes(u) && u.moves > 0) UI.select({ unit: u }); else UI.select(null);
    refresh();
    if (!R.sel) setTimeout(() => { if (!PC.UI.modal) nextUnit(); }, 120);
  }
  function onKey(e) {
    if (!PC.G || $('#game').classList.contains('hidden')) return;
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (UI.modal) { if (k === 'escape' && UI.modal !== 'event') closeModal(); return; }
    const u = R.sel && R.sel.unit;
    if (k === 'enter') { endTurn(); e.preventDefault(); }
    else if (k === 'n' || k === 'tab') { nextUnit(); e.preventDefault(); }
    else if (k === 'escape') UI.select(null);
    else if (k === 'f' && u && PC.isMil(u)) { u.fort = true; u.moves = 0; nextUnit(); }
    else if (k === ' ' && u) { u.skipTurn = PC.G.turn; nextUnit(); e.preventDefault(); }
    else if (k === 'b' && u && u.type === 'colono' && PC.validCitySite(PC.tile(u.t), PC.player())) { PC.foundCity(PC.player(), PC.tile(u.t)); PC.removeUnit(u); UI.select(null); refresh(); }
    else if (k === 't') openTechs(); else if (k === 'd') openDiplo(); else if (k === 'p') openRegions(); else if (k === 'c') openChronicle();
    else if (k === 'arrowleft') { R.cam.x -= 60; R.draw(); } else if (k === 'arrowright') { R.cam.x += 60; R.draw(); }
    else if (k === 'arrowup') { R.cam.y -= 60; R.draw(); } else if (k === 'arrowdown') { R.cam.y += 60; R.draw(); }
    else if (k === '+' || k === '=') { R.zoomAt(1.2, R.w / 2, R.h / 2); R.draw(); } else if (k === '-') { R.zoomAt(1 / 1.2, R.w / 2, R.h / 2); R.draw(); }
  }

  // ------------------------------------------------------------------ Turnos
  function endTurn() {
    const g = PC.G, p = PC.player();
    if (g.eventQueue.length) { showEvent(); return; }
    if (g.gameOver) { showGameOver(); return; }
    if (!p.research && PC.availableTechs(p).length) { openTechs(); toast('Elige qué investigar antes de terminar el turno.', 'warn'); return; }
    const noBuild = PC.civCities(p).find((c) => !c.build);
    if (noBuild) { R.centerOn(PC.tile(noBuild.t)); UI.select({ city: noBuild }); toast(`${noBuild.name} necesita producción.`, 'warn'); return; }
    // Unidades con rutas o automatizadas
    PC.civUnits(p).forEach((u) => { if (u.path) PC.followPath(u); });
    PC.civUnits(p).forEach((u) => { if (u.auto && !u.task) PC.autoUnit(u); });
    $('#btn-end').disabled = true;
    setTimeout(() => {
      try { PC.endTurn(); } catch (err) { console.error(err); toast('Error: ' + err.message, 'bad'); }
      PC.civUnits(p).forEach((u) => { if (u.auto && !u.task) PC.autoUnit(u); });
      $('#btn-end').disabled = false;
      try { localStorage.setItem(SAVE_KEY, PC.serialize()); } catch (err) { /* sin almacenamiento */ }
      UI.select(null);
      refresh();
      if (g.eventQueue.length) showEvent();
      else if (g.gameOver) showGameOver();
    }, 10);
  }
  function refresh() {
    if (!PC.G) return;
    renderTop(); renderPanel(); R.draw(); flushToasts();
  }
  UI.refresh = refresh;

  // ------------------------------------------------------------------ Avisos
  function toast(text, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = text;
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('fade'), 5500);
    setTimeout(() => el.remove(), 6500);
    while ($('#toasts').children.length > 6) $('#toasts').firstChild.remove();
  }
  function flushToasts() {
    const g = PC.G;
    g.notices.splice(0).slice(-6).forEach((n) => toast(n.text, n.type));
  }

  // ------------------------------------------------------------------ Modales
  function openModal(html, kind) {
    UI.modal = kind || 'info';
    $('#modal-body').innerHTML = html;
    $('#modal').classList.remove('hidden');
    $('#modal-close').style.display = kind === 'event' ? 'none' : '';
  }
  function closeModal() { UI.modal = null; $('#modal').classList.add('hidden'); refresh(); }
  UI.closeModal = closeModal;

  function showEvent() {
    const ev = PC.currentEvent();
    if (!ev) return;
    openModal(`<div class="event"><div class="evimg">${ev.img || '📜'}</div><h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p>
      <div class="choices">${ev.choices.map((c, i) => `<button class="choice" data-choice="${i}" ${c.cond === false ? 'disabled' : ''}><b>${esc(c.label)}</b>${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</button>`).join('')}</div>
      <p class="small muted">${PC.fmtYear(PC.G.year)}</p></div>`, 'event');
  }
  function showGameOver() {
    const g = PC.G, p = PC.player();
    openModal(`<h2>${g.gameOver.win ? '🏆 Fin de la crónica' : '☠️ Derrota'}</h2><p>${esc(g.gameOver.text)}</p>
      <div class="kv"><span>Puntuación</span><b>${PC.score(p)}</b></div>
      <h3>Tu historia alternativa (${g.divergences.length} divergencias)</h3>
      <ul>${g.divergences.map((d) => `<li><b>${PC.fmtYear(d.year)}</b> ${esc(d.text)}</li>`).join('') || '<li>Tu historia fue fiel a la real.</li>'}</ul>
      <div class="choices"><button class="primary" data-act2="menu">Volver al menú</button>${g.gameOver.win ? '<button data-act2="keep">Seguir jugando</button>' : ''}</div>`, 'over');
  }

  function openTechs() {
    const p = PC.player();
    let h = `<h2>Tecnologías</h2><p class="small">Progreso acumulado: ${Math.round(p.progress)} 🔬. Las tecnologías marcadas con ⛏️ requieren controlar un recurso (o comerciarlo, a mayor costo).</p><div class="techtree">`;
    PC.ERAS.forEach((era) => {
      const ts = PC.TECHS.filter((t) => t.era === era.id);
      h += `<div class="era"><h4 style="border-color:${era.color}">${esc(era.name)}</h4>`;
      ts.forEach((t) => {
        const known = !!p.techs[t.id];
        const miss = known ? [] : PC.techMissing(p, t.id);
        const can = !known && !miss.length;
        const acc = t.needs ? PC.techAccess(p, t.id) : null;
        const cls = known ? 'known' : p.research === t.id ? 'current' : can ? 'avail' : 'locked';
        h += `<button class="tech ${cls}" data-tech="${t.id}" ${can ? '' : 'disabled'}>
          <b>${t.needs ? '⛏️ ' : ''}${t.hy === null ? '🔀 ' : ''}${esc(t.name)}</b>
          <small>${esc(t.desc || '')}</small>
          ${known ? '<em>Conocida</em>' : `<em>${PC.techCost(p, t.id)} 🔬${acc === 'trade' ? ' (comercio)' : ''}</em>`}
          ${miss.length ? `<i>Falta: ${esc(miss.join(', '))}</i>` : ''}</button>`;
      });
      h += '</div>';
    });
    h += '</div><p class="small muted">🔀 = tecnología de historia alternativa (no se desarrolló en los Andes en la historia real).</p>';
    openModal(h, 'techs');
  }
  function openDiplo() {
    const p = PC.player(), g = PC.G;
    const others = g.civs.filter((c) => c.alive && !c.isPlayer && (PC.civCities(c).length || PC.civUnits(c).length));
    let h = `<h2>Diplomacia</h2><p class="small">Tu poder: <b>${PC.power(p)}</b> · Cultura: <b>${Math.round(p.culture)}</b>. La <b>reciprocidad andina</b> permite incorporar pacíficamente señoríos pequeños con regalos, como hacían los incas.</p><table class="diplo"><tr><th>Civilización</th><th>Ciudades</th><th>Poder</th><th>Actitud</th><th>Estado</th><th></th></tr>`;
    others.forEach((c) => {
      const war = PC.atWar(p.id, c.id);
      const att = Math.round(PC.rel(c, p).att);
      const known = PC.civCities(c).some((ct) => PC.isExplored(ct.t)) || PC.civUnits(c).some((u) => PC.isExplored(u.t));
      if (!known) return;
      const issues = PC.annexIssues(p, c);
      h += `<tr><td><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</td><td>${PC.civCities(c).length}</td><td>${PC.power(c)}</td>
        <td class="${att < -20 ? 'bad' : att > 20 ? 'good' : ''}">${att}</td><td>${war ? '<b class="bad">Guerra</b>' : 'Paz'}</td><td class="acts">
        ${war ? `<button data-diplo="peace" data-civ="${c.id}">Proponer paz (${Math.round(PC.peaceChance(p, c) * 100)}%)</button>` : `<button data-diplo="war" data-civ="${c.id}" class="danger">Declarar guerra</button>`}
        ${!war && !c.external ? `<button data-diplo="annex" data-civ="${c.id}" ${issues.length ? 'disabled' : ''} title="${esc(issues.join(' · '))}">Anexar (${PC.annexCost(p, c)} 🪙)</button>` : ''}
        </td></tr>`;
    });
    h += '</table>';
    openModal(h, 'diplo');
  }
  function openRegions() {
    const g = PC.G, rc = PC.regionControl();
    const zones = ['costa', 'sierra', 'selva'];
    const total = g.map.regions.length, mine = PC.playerRegionCount(), need = Math.ceil(total * 0.8);
    let h = `<h2>Provincias del Perú</h2><p>Controlas <b>${mine}</b> de ${total}. Necesitas <b>${need}</b> (80%) para la Fase 2: Sudamérica.</p>
      <div class="bar"><div style="width:${mine / need * 100}%"></div><span>${mine}/${need}</span></div>
      <p class="small">Mapa: ${g.map.counts.costa} hexágonos de costa, ${g.map.counts.sierra} de sierra y ${g.map.counts.selva} de selva (proporciones reales: ≈12% / 28% / 60%).</p><div class="regcols">`;
    zones.forEach((z) => {
      h += `<div><h4>${PC.ZONE_NAME[z]}</h4><ul class="reglist">`;
      g.map.regions.filter((r) => r.zone === z).forEach((r) => {
        const c = rc[r.id] ? PC.civ(rc[r.id]) : null;
        h += `<li><span>${esc(r.name)} <small>(${r.tiles.length})</small></span>${c ? `<b style="color:${c.color}">${esc(c.name)}</b>` : '<i>—</i>'}</li>`;
      });
      h += '</ul></div>';
    });
    openModal(h + '</div>', 'regions');
  }
  function openChronicle() {
    const g = PC.G;
    const log = g.log.slice().reverse().filter((l) => l.type !== 'info');
    let h = `<h2>Crónica</h2><div class="tabs"><b>Divergencias de la historia real: ${g.divergences.length}</b></div>
      <ul class="div">${g.divergences.map((d) => `<li><b>${PC.fmtYear(d.year)}</b> ${esc(d.text)}</li>`).join('') || '<li class="muted">Por ahora tu historia sigue el curso conocido.</li>'}</ul>
      <h3>Registro</h3><ul class="log">${log.slice(0, 250).map((l) => `<li class="${l.type}"><b>${PC.fmtYear(l.year)}</b> ${esc(l.text)}</li>`).join('')}</ul>`;
    openModal(h, 'chronicle');
  }
  function openMenu() {
    openModal(`<h2>Menú</h2><div class="choices col">
      <button data-act2="save">💾 Guardar (navegador)</button>
      <button data-act2="export">⬇️ Exportar partida (.json)</button>
      <button data-act2="help">❓ Cómo jugar</button>
      ${PC.G.flags.fase2Disponible || PC.G.phase === 'peru' && PC.playerRegionCount() >= Math.ceil(PC.G.map.regions.length * 0.8) ? '<button data-act2="fase2" class="primary">🗺️ Fase 2: Sudamérica</button>' : ''}
      <button data-act2="menu">🏠 Volver al menú principal</button></div>
      <p class="small muted">Semilla del mapa: ${PC.G.seed} · Escenario: ${esc(PC.SCENARIOS[PC.G.scenario].name)} · Dificultad: ${esc(PC.diff().name)}</p>`, 'menu');
  }
  function bindModal() {
    $('#modal-close').onclick = closeModal;
    $('#modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal' && UI.modal !== 'event') { closeModal(); return; }
      if (e.target.closest('[data-close]')) { closeModal(); return; }
      const ch = e.target.closest('[data-choice]');
      if (ch && !ch.disabled) {
        const res = PC.resolveEvent(+ch.dataset.choice);
        closeModal();
        void res;
        if (PC.G.eventQueue.length) showEvent();
        if (PC.G.phaseChanged) { PC.G.phaseChanged = false; startGame(false); }
        return;
      }
      const tech = e.target.closest('[data-tech]');
      if (tech && !tech.disabled) { PC.player().research = tech.dataset.tech; openTechs(); refresh(); return; }
      const d = e.target.closest('[data-diplo]');
      if (d && !d.disabled) {
        const p = PC.player(), c = PC.civ(+d.dataset.civ);
        if (d.dataset.diplo === 'war' && confirm(`¿Declarar la guerra a ${c.name}?`)) PC.declareWar(p, c);
        if (d.dataset.diplo === 'peace') PC.proposePeace(p, c);
        if (d.dataset.diplo === 'annex') PC.annex(p, c);
        openDiplo(); refresh(); return;
      }
      const a = e.target.closest('[data-act2]');
      if (a) {
        const act = a.dataset.act2;
        if (act === 'save') { try { localStorage.setItem(SAVE_KEY, PC.serialize()); toast('Partida guardada.'); } catch (err) { toast('No se pudo guardar.', 'bad'); } closeModal(); }
        if (act === 'export') {
          const blob = new Blob([PC.serialize()], { type: 'application/json' });
          const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `peru-civ-${PC.G.year}.json`; link.click();
        }
        if (act === 'help') showIntro();
        if (act === 'menu') { closeModal(); $('#game').classList.add('hidden'); $('#menu').classList.remove('hidden'); renderMenu(); }
        if (act === 'keep') { PC.G.gameOver = null; closeModal(); }
        if (act === 'fase2' && PC.startPhase2) { PC.startPhase2(); closeModal(); startGame(false); }
      }
    });
    document.querySelectorAll('[data-modal]').forEach((b) => {
      b.onclick = () => ({ techs: openTechs, diplo: openDiplo, regions: openRegions, chronicle: openChronicle, menu: openMenu }[b.dataset.modal])();
    });
    $('#panel').addEventListener('click', onPanelClick);
    $('#btn-end').onclick = endTurn;
  }

  function legend() {
    const items = ['valle', 'desierto', 'sierra', 'puna', 'cordillera', 'ceja', 'selva', 'oceano'];
    $('#legend').innerHTML = items.map((k) => `<span><i style="background:${PC.TERRAIN[k].color}"></i>${esc(PC.TERRAIN[k].name)}</span>`).join('') +
      '<span><i style="background:#ffd36b"></i>Abra</span><span><i style="background:#4fa3d9"></i>Río</span>';
  }

  window.addEventListener('DOMContentLoaded', () => {
    R.init($('#map'));
    bindMenu(); bindMap(); bindModal(); renderMenu(); legend();
  });
})(globalThis.PC = globalThis.PC || {});

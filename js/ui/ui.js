// Interfaz: menú inicial, HUD, paneles, diálogos y controles sobre la maqueta 3D.
(function (PC) {
  'use strict';
  const R = PC.R;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ic = (n, cls) => PC.icon(n, cls);
  const UI = PC.UI = { menu: { scenario: 'origenes', culture: 'caral', difficulty: 'medio', leader: null, start: '' }, modal: null, buildTab: 'unit' };
  const SAVE_KEY = 'peru-civ-save';
  const storage = {
    get() { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(SAVE_KEY, v); return true; } catch (e) { return false; } }
  };

  // ------------------------------------------------------------------ Menú (pantallas como en Civilization)
  const OPT_KEY = 'peru-civ-opciones';
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(OPT_KEY)) || {}; } catch (e) { return {}; } })();
  const savePrefs = () => { try { localStorage.setItem(OPT_KEY, JSON.stringify(prefs)); } catch (e) { /* sin almacenamiento */ } };
  UI.screen = 'title';
  function showScreen(name) {
    UI.screen = name;
    document.querySelectorAll('#menu .scr').forEach((el) => { el.hidden = el.id !== 'scr-' + name; });
    $('#menu').dataset.screen = name;
    renderMenu();
    const first = $('#scr-' + name).querySelector('button:not(:disabled), a');
    if (first) first.focus({ preventScroll: true });
  }
  // Cada líder se muestra con los colores de su propio vestuario histórico.
  function leaderColor(id) { return (PC.LEADERS[id] && PC.LEADERS[id].color) || '#8a2232'; }
  function renderMenu() {
    const m = UI.menu;
    const sc = PC.SCENARIOS[m.scenario];
    if (!sc.playable.includes(m.culture)) m.culture = sc.playable[0];
    if (!m.leader) m.leader = PC.defaultLeader(m.culture);
    // Principal
    const save = storage.get();
    $('#btn-continue').disabled = !save;
    if (save) { try { const d = JSON.parse(save); const pc = d.civs.find((c) => c.isPlayer); $('#continue-info').textContent = `${pc.name} · ${PC.fmtYear(d.year)} · turno ${d.turn}`; } catch (e) { $('#continue-info').textContent = 'Retoma tu última partida'; } }
    else $('#continue-info').textContent = 'No hay partidas guardadas';
    if (UI.screen === 'leader') {
      $('#leader-list').innerHTML = Object.keys(PC.LEADERS).map((id) => {
        const L = PC.LEADERS[id];
        const img = R.leaderThumb ? R.leaderThumb(id, leaderColor(id)) : '';
        return `<button type="button" class="lp" role="option" data-ld="${id}" aria-selected="${id === m.leader}">${img ? `<img src="${img}" alt="">` : ''}<span><b>${esc(L.name)}</b><small>${esc(L.title)}</small></span></button>`;
      }).join('');
      const L = PC.LEADERS[m.leader], A = PC.AGENDAS[L.agenda];
      $('#leader-info').innerHTML = `<h3>${esc(L.name)}</h3><p class="muted">${esc(L.title)}</p>
        <div class="sec"><h4>Habilidad única</h4><p>${esc(L.desc)}</p></div>
        <div class="sec"><h4>Personalidad · ${esc(A.name)}</h4><p class="small muted">Como rival en la IA: le agrada ${esc(A.likes.toLowerCase())}; le desagrada ${esc(A.dislikes.toLowerCase())}.</p></div>
        <p class="small muted">Puedes combinar cualquier líder con cualquier civilización.</p>`;
      if (R.mountLeader) R.mountLeader($('#leader-stage'), m.leader, leaderColor(m.leader));
    }
    if (UI.screen === 'civ') {
      $('#scenarios').innerHTML = Object.keys(PC.SCENARIOS).map((id) =>
        `<button type="button" data-sc="${id}" aria-pressed="${id === m.scenario}">${esc(PC.SCENARIOS[id].name)}</button>`).join('');
      $('#sc-desc').textContent = sc.desc;
      $('#cultures').innerHTML = sc.playable.map((id) => {
        const c = PC.CULTURES[id];
        const rec = PC.defaultLeader(id) === m.leader;
        return `<button type="button" class="cul" data-cu="${id}" aria-pressed="${id === m.culture}">${PC.emblem(id, c.color)}<span>${esc(c.name)}${rec ? '<small>Afín a tu líder</small>' : ''}</span></button>`;
      }).join('');
      $('#cu-desc').textContent = PC.CULTURES[m.culture].desc;
    }
    if (UI.screen === 'setup') {
      const L = PC.LEADERS[m.leader], C = PC.CULTURES[m.culture];
      $('#setup-summary').innerHTML = `${R.leaderThumb ? `<img src="${R.leaderThumb(m.leader, leaderColor(m.leader))}" alt="">` : ''}${PC.emblem(m.culture, C.color, 'lg')}
        <div><b>${esc(L.name)}</b> guía a <b>${esc(C.name)}</b><br><small class="muted">${esc(sc.name)}</small></div>`;
      $('#difficulties').innerHTML = Object.keys(PC.DIFFICULTY).map((id) =>
        `<button type="button" data-df="${id}" aria-pressed="${id === m.difficulty}">${esc(PC.DIFFICULTY[id].name)}</button>`).join('');
      $('#df-desc').textContent = PC.DIFFICULTY[m.difficulty].desc;
      const fixed = !!sc.playerCities;
      const regs = PC.GEO_PERU.regions;
      const zoneName = { costa: 'Costa', sierra: 'Sierra', selva: 'Selva' };
      $('#opt-start').disabled = fixed;
      $('#opt-start').innerHTML = '<option value="">Tierra histórica de la civilización</option>' +
        ['costa', 'sierra', 'selva'].map((z) => `<optgroup label="${zoneName[z]}">${regs.filter((r) => r.zone === z).map((r) => `<option value="${r.id}" ${m.start === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</optgroup>`).join('');
      $('#st-desc').textContent = fixed ? (sc.startText || 'En este escenario el imperio ya existe: empiezas en el Cusco.') :
        m.start ? `Fundarás tu primera ciudad en ${regs.find((r) => r.id === m.start).name}. También puedes hacer clic en una provincia del mapa.` :
        `Empiezas en ${regs.find((r) => r.id === C.region).name}, la tierra histórica de tu civilización. Elige otra provincia en la lista o haz clic en el mapa.`;
      if (PC.G && PC.G.preview) { R.sel = { regionHL: fixed ? 'cusco' : (m.start || C.region) }; R.draw(); }
    } else if (PC.G && PC.G.preview && R.sel && R.sel.regionHL) { R.sel = null; R.draw(); }
    if (UI.screen === 'load') {
      let html = '';
      if (save) { try { const d = JSON.parse(save); const pc = d.civs.find((c) => c.isPlayer); html = `<button type="button" class="mm" data-loadslot="1"><b>${esc(pc.name)}</b><small>${PC.fmtYear(d.year)} · turno ${d.turn} · ${esc((PC.DIFFICULTY[d.difficulty] || {}).name || '')}</small></button>`; } catch (e) { html = ''; } }
      $('#save-list').innerHTML = html || '<p class="muted">No hay partidas guardadas en este navegador.</p>';
    }
    if (UI.screen === 'options') {
      $('#opt-quality').innerHTML = ['alta', 'baja'].map((q) => `<button type="button" data-q="${q}" aria-pressed="${(prefs.quality || 'alta') === q}">${q === 'alta' ? 'Alta' : 'Baja'}</button>`).join('');
      $('#opt-regions').checked = !!prefs.regions;
    }
  }
  function previewWorld() {
    // Maqueta de fondo del menú: una partida de muestra con el mapa revelado, girando despacio.
    PC.newGame({ scenario: UI.menu.scenario, culture: UI.menu.culture, difficulty: UI.menu.difficulty, seed: 20260415 });
    PC.G.revealAll = true; PC.G.preview = true;
    R.preview = true;
    R.rebuild();
    R.overview();
    renderMenu();
  }
  function bindMenu() {
    $('#menu').addEventListener('click', (e) => {
      const b = e.target.closest('button, a'); if (!b) return;
      if (b.dataset.go) { showScreen(b.dataset.go); return; }
      let rebuild = false;
      if (b.dataset.ld) { UI.menu.leader = b.dataset.ld; const pref = Object.keys(PC.DEFAULT_LEADER).find((c) => PC.DEFAULT_LEADER[c] === b.dataset.ld && PC.SCENARIOS[UI.menu.scenario].playable.includes(c)); if (pref) UI.menu.culture = pref; }
      if (b.dataset.sc) { UI.menu.scenario = b.dataset.sc; rebuild = true; }
      if (b.dataset.cu) UI.menu.culture = b.dataset.cu;
      if (b.dataset.df) UI.menu.difficulty = b.dataset.df;
      if (b.dataset.q) { prefs.quality = b.dataset.q; savePrefs(); R.setQuality(b.dataset.q); }
      if (b.dataset.loadslot) { try { PC.load(storage.get()); startGame(false); } catch (err) { menuError('No se pudo abrir la partida guardada.'); } return; }
      if (b.dataset.ld || b.dataset.sc || b.dataset.cu || b.dataset.df || b.dataset.q) renderMenu();
      if (rebuild) previewWorld();
    });
    $('#opt-regions').onchange = (e) => { prefs.regions = e.target.checked; savePrefs(); };
    $('#btn-start').onclick = () => {
      const seed = +$('#opt-seed').value || undefined;
      PC.newGame({ scenario: UI.menu.scenario, culture: UI.menu.culture, difficulty: UI.menu.difficulty, leader: UI.menu.leader, startRegion: UI.menu.start || undefined, seed, speed: $('#opt-speed').value });
      startGame(true);
    };
    $('#btn-continue').onclick = () => {
      try { PC.load(storage.get()); startGame(false); } catch (e) { showScreen('load'); menuError('No se pudo abrir la partida guardada. Empieza una nueva o carga un archivo.'); }
    };
    $('#opt-start').onchange = (e) => { UI.menu.start = e.target.value; renderMenu(); };
    $('#btn-load-file').onclick = () => $('#file-load').click();
    $('#file-load').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then((txt) => { PC.load(txt); startGame(false); }).catch(() => menuError('Ese archivo no es una partida de Perú Civilization.'));
    };
    document.addEventListener('keydown', (e) => {
      if ($('#menu').hidden || e.key !== 'Escape') return;
      const back = { leader: 'title', civ: 'leader', setup: 'civ', load: 'title', options: 'title' }[UI.screen];
      if (back) showScreen(back);
    });
  }
  function menuError(text) { const el = $('#menu-error'); el.textContent = text; el.hidden = false; }
  function showMenu() {
    closeModal();
    $('#hud').hidden = true; $('#menu').hidden = false;
    showScreen('title'); previewWorld();
  }
  function startGame(fresh) {
    $('#menu').hidden = true; $('#hud').hidden = false;
    R.preview = false; PC.G.preview = false;
    R.showRegions = !!prefs.regions;
    R.resize(); R.rebuild();
    const p = PC.player();
    const cap = PC.cityById(p.capitalId) || PC.civCities(p)[0];
    const u = PC.civUnits(p)[0];
    R.setZoom(15);
    R.centerOn(cap ? PC.tile(cap.t) : PC.tile(u.t), true);
    UI.select(null);
    renderNav(); renderMapCtl();
    if (fresh) showIntro();
    refresh();
  }
  function showIntro() {
    const g = PC.G, p = PC.player();
    openModal(`<h2>${esc(p.name)}, ${PC.fmtYear(g.year)}</h2>
      <p class="lead">${esc(PC.CULTURES[p.key].desc)}</p>
      <p class="lead"><b>${esc(PC.diff().name)}.</b> ${esc(PC.diff().desc)}</p>
      <h3>Cómo se juega</h3>
      <ul class="help">
        <li>Haz clic en una unidad para elegirla y luego en una casilla iluminada para moverla. Un anillo rojo sobre una casilla significa que puedes atacar.</li>
        <li>Arrastra para desplazar el mapa, usa la rueda para acercar y arrastra con el botón derecho (o usa <kbd>Q</kbd> y <kbd>E</kbd>) para girar.</li>
        <li>Tus piezas llevan un anillo amarillo; las de un enemigo en guerra, un anillo rojo que late. Cada civilización tiene su propio estandarte tejido.</li>
        <li>El ayllu colonizador funda ciudades (<kbd>B</kbd>). El ayllu de mit'a construye chacras, andenes, canales, minas y caminos.</li>
        <li>Costa: los valles son fértiles y el desierto desgasta. Sierra: las cordilleras frenan y se cruzan por las abras. Selva: niebla densa, desgaste y fauna peligrosa.</li>
        <li>Algunas tecnologías exigen recursos: sin cobre no hay bronce, sin hierro no hay hierro y sin salitre o guano no hay pólvora.</li>
        <li>Las unidades antiguas se pueden modernizar con oro cuando descubres su sucesora.</li>
        <li>Controla el 80% de las provincias para pasar a la Fase 2: Sudamérica, y el 75% de las regiones del continente para la Fase 3: América.</li>
      </ul>
      <div class="choices"><button class="btn primary big" data-close type="button">${ic('sol')}Empezar</button></div>`, 'intro');
  }

  // ------------------------------------------------------------------ Barra superior y navegación
  function renderNav() {
    const items = { techs: ['tecnologia', 'Tecnologías', 'T'], diplo: ['diplomacia', 'Diplomacia', 'D'], regions: ['provincias', 'Provincias', 'P'], chronicle: ['cronica', 'Crónica', 'C'], menu: ['menu', 'Menú', ''] };
    document.querySelectorAll('[data-modal]').forEach((b) => {
      const [i, l, k] = items[b.dataset.modal];
      b.innerHTML = `${ic(i)}<span>${l}</span>${k ? `<kbd>${k}</kbd>` : ''}`;
      b.title = l;
    });
    $('#modal-close').innerHTML = ic('cerrar');
  }
  function renderTop() {
    const g = PC.G, p = PC.player();
    const pl = PC.leaderOf(p), pth = R.leaderThumb ? R.leaderThumb(pl.model, leaderColor(pl.model)) : '';
    if (!$('#tb-civ')._k || $('#tb-civ')._k !== p.name + pl.model) { $('#tb-civ')._k = p.name + pl.model; $('#tb-civ').innerHTML = `${pth ? `<img class="lthumb sm" src="${pth}" alt="">` : ''}${PC.emblem(p.key, p.color)}<div><b>${esc(p.name)}</b><small>${esc(p.leader || '')}</small></div>`; }
    $('#tb-year').innerHTML = `${ic('sol')}<div><b>${PC.fmtYear(g.year)}</b> <small>${esc(PC.ERAS[PC.eraOf(p)].name)} · turno ${g.turn}</small></div>`;
    const inc = p.lastIncome === undefined ? PC.civCities(p).reduce((s, c) => s + PC.cityYields(c).g, 0) : p.lastIncome;
    $('#tb-gold').innerHTML = `${ic('oro')}<b>${Math.round(p.gold)}</b><small class="${inc < 0 ? 'bad' : ''}">${inc >= 0 ? '+' : ''}${inc}</small>`;
    $('#tb-gold').title = 'Oro e ingreso por turno';
    const sci = PC.civCities(p).reduce((s, c) => s + PC.cityYields(c).s, 0);
    if (p.research) {
      const cost = PC.techCost(p, p.research), pct = Math.min(1, p.progress / cost);
      const turns = Math.max(1, Math.ceil((cost - p.progress) / Math.max(1, sci)));
      $('#tb-sci').innerHTML = `${ic('ciencia')}<div class="sci-col"><span><b>${esc(PC.TECH[p.research].name)}</b> <small>+${sci} · ${turns} t</small></span><span class="cen-bar"><i style="width:${pct * 100}%"></i></span></div>`;
    } else $('#tb-sci').innerHTML = `${ic('ciencia')}<button class="btn" data-open="techs" type="button">Elegir investigación</button>`;
    $('#tb-cult').innerHTML = `${ic('cultura')}<b>${Math.round(p.culture)}</b><small>cultura</small>`;
    $('#tb-inf').innerHTML = `${ic('diplomacia')}<b>${Math.round(p.influence || 0)}</b><small>+${PC.influenceIncome(p)} influencia</small>`;
    $('#tb-inf').title = 'Influencia: se gasta en acciones diplomáticas';
    const st = Math.round(p.stability);
    $('#tb-stab').innerHTML = `${ic('cohesion')}<b class="${st < 35 ? 'bad' : st >= 70 ? 'good' : ''}">${st}</b><small>cohesión</small>`;
    $('#tb-reg').innerHTML = `${ic('provincias')}<b>${PC.playerRegionCount()}</b><small>/ ${g.map.regions.length} provincias</small>`;
    const idle = PC.civUnits(p).filter(needsOrders).length;
    const noBuild = PC.civCities(p).filter((c) => !c.build).length;
    let status;
    if (!p.research && PC.availableTechs(p).length) status = 'Falta elegir qué investigar.';
    else if (noBuild) status = `${noBuild === 1 ? 'Una ciudad necesita' : noBuild + ' ciudades necesitan'} producción.`;
    else if (idle) status = `${idle === 1 ? 'Una unidad espera' : idle + ' unidades esperan'} órdenes (N).`;
    else status = 'Todo listo.';
    $('#end-status').textContent = status;
    $('#btn-end').innerHTML = `${ic('turno')}Terminar turno <kbd>Enter</kbd>`;
    $('#btn-end').classList.toggle('waiting', status !== 'Todo listo.');
  }
  function renderMapCtl() {
    $('#mapctl').innerHTML = `
      <button class="btn" data-cam="in" type="button" title="Acercar">${ic('mejorar')}<span>Acercar</span></button>
      <button class="btn" data-cam="out" type="button" title="Alejar">${ic('saltar')}<span>Alejar</span></button>
      <button class="btn" data-cam="left" type="button" title="Girar a la izquierda">Girar <kbd>Q</kbd></button>
      <button class="btn" data-cam="right" type="button" title="Girar a la derecha">Girar <kbd>E</kbd></button>
      <button class="btn" data-cam="home" type="button" title="Centrar en la capital">${ic('ciudad')}<span>Capital</span></button>
      <button class="btn ${R.showRegions ? 'on' : ''}" data-cam="regions" type="button" title="Mostrar las provincias">${ic('provincias')}<span>Provincias</span></button>
      <button class="btn" data-cam="quality" type="button" title="Calidad gráfica">Calidad ${R.quality === 'alta' ? 'alta' : 'baja'}</button>`;
  }

  // ------------------------------------------------------------------ Panel lateral
  UI.select = function (sel) {
    R.sel = sel; R.reach = null; R.targets = null; R.path = null;
    if (sel && sel.unit && sel.unit.civ === PC.G.playerId) { R.reach = PC.reachable(sel.unit); R.targets = PC.attackTargets(sel.unit); }
    renderPanel(); R.draw();
  };
  UI.selectCity = function (id) { const c = PC.cityById(id); if (c && !PC.G.preview) { UI.select({ city: c }); refresh(); } };
  const Y = (y) => `<span>${ic('alimento')}${y.f}</span><span>${ic('produccion')}${y.p}</span><span>${ic('oro')}${y.g}</span>`;
  function tileInfo(t) {
    const p = PC.player();
    if (!PC.isExplored(t.i)) return '<p class="muted small">Territorio sin explorar.</p>';
    const T = PC.TERRAIN[t.terrain];
    const rg = PC.G.map.regions.find((r) => r.id === t.region);
    const rows = [];
    if (t.feature === 'rio') rows.push('Río: sin desgaste, +1 alimento y +1 oro');
    if (t.feature === 'abra') rows.push('Abra: paso de montaña, movimiento 1, sin desgaste');
    if (t.res && PC.resVisible(p, t.res)) rows.push(`Recurso: ${PC.RESOURCES[t.res].name}`);
    if (t.imp) rows.push(`Mejora: ${PC.IMPROVEMENTS[t.imp].name}`);
    if (t.road) rows.push('Camino');
    if (t.fauna) rows.push(`Peligro: ${PC.FAUNA[t.fauna].name}`);
    if (T.move !== Infinity) rows.push(`Movimiento ${T.move}${T.def ? `, defensa +${Math.round(T.def * 100)}%` : ''}${T.attr ? `, desgaste ${T.attr}` : ''}`);
    return `<div class="sec"><h4>${esc(PC.terrainName(t))}${t.name ? ' · ' + esc(t.name) : ''}</h4>
      <p class="small muted" style="margin:0">${PC.ZONE_NAME[T.zone] || ''}${rg ? ' · ' + esc(rg.name) : ''}${t.owner ? ' · ' + esc(PC.civ(t.owner).name) : ''}</p>
      ${t.terrain !== 'oceano' ? `<div class="yrow">${Y(PC.tileYield(p, t))}</div>` : ''}
      ${rows.map((r) => `<div class="kv"><span>${esc(r)}</span></div>`).join('')}</div>`;
  }
  function renderPanel() {
    if (!PC.G || PC.G.preview) return;
    const g = PC.G, sel = R.sel;
    let h;
    if (sel && sel.unit && g.units.includes(sel.unit)) h = unitPanel(sel.unit);
    else if (sel && sel.city && g.cities.includes(sel.city)) h = cityPanel(sel.city);
    else if (sel && sel.tile) h = tileInfo(sel.tile);
    else h = civPanel(PC.player());
    $('#panel').innerHTML = h;
  }
  function nextPhaseName() {
    const n = PC.phaseInfo(PC.phaseInfo().next);
    return n ? n.name.replace(' · ', ': ') : '';
  }
  function civPanel(p) {
    const st = PC.stabilityTarget(p);
    return `<div class="ph" style="--civ:${p.color}"><div class="tile-ico">${PC.emblem(p.key, p.color)}</div><div><h3>${esc(p.name)}</h3><p>${esc(p.leader || '')}</p></div></div>
      <div class="trio"><div><span>${ic('ciudad')}Ciudades</span><b>${PC.civCities(p).length}/${PC.capacity(p)}</b></div><div><span>${ic('poder')}Poder</span><b>${PC.power(p)}</b></div><div><span>${ic('tecnologia')}Tecnologías</span><b>${Object.keys(p.techs).length}</b></div></div>
      <div class="sec"><h4>Cohesión ${Math.round(p.stability)}, tiende a ${st.value}</h4>
      <ul class="parts">${st.parts.map(([n, v]) => `<li><span>${esc(n)}</span><b class="${v < 0 ? 'bad' : 'good'}">${v > 0 ? '+' : ''}${v}</b></li>`).join('')}</ul></div>
      ${PC.canAdvancePhase() ? `<button class="btn primary" data-act="fase2" type="button">${ic('mapa')}Avanzar a la ${esc(nextPhaseName())}</button>` : ''}
      <p class="small muted">Elige una unidad o una ciudad en el mapa. Pasa el puntero sobre una casilla para ver qué hay en ella.</p>`;
  }
  function diploBox(civ) {
    const p = PC.player();
    if (civ.isPlayer) return '';
    const L = PC.leaderOf(civ), st = PC.relState(p, civ), att = Math.round(PC.rel(civ, p).att);
    const chips = [`<span class="chip st-${st}">${PC.REL_NAME[st]}</span>`, `<span class="chip">${PC.attName(att)} (${att > 0 ? '+' : ''}${att})</span>`];
    if (PC.rel(p, civ).borders) chips.push('<span class="chip">Paso libre</span>');
    if (st === 'guerra') chips.push(`<span class="chip">Puntaje de guerra ${PC.rel(p, civ).warScore || 0}</span>`);
    const th = R.leaderThumb ? R.leaderThumb(L.model, civ.color) : '';
    return `<div class="sec"><h4>Diplomacia</h4><div class="lrow">${th ? `<img class="lthumb" src="${th}" alt="">` : ''}<p class="small" style="margin:0"><b>${esc(L.name)}</b><br>${esc(L.title)}</p></div><div class="chips">${chips.join('')}</div>
      <div class="actions"><button class="btn" data-act="leader" data-civ="${civ.id}" type="button">${ic('diplomacia')}Hablar con ${esc(L.name)}</button></div></div>`;
  }
  function unitPanel(u) {
    const U = PC.utype(u), civ = PC.civ(u.civ), t = PC.tile(u.t);
    const own = u.civ === PC.G.playerId;
    const war = !own && PC.atWar(PC.G.playerId, u.civ);
    const title = u.name ? `${esc(u.name)}<small class="muted"> · ${esc(U.name)}</small>` : esc(U.name);
    let h = `<div class="ph" style="--civ:${civ.color}"><div class="tile-ico">${ic(PC.unitIconKey(u.type))}</div><div><h3>${title}</h3>
      <p>${esc(civ.name)}${own ? '' : war ? ' · <span class="bad">en guerra contigo</span>' : ' · en paz'}${t.terrain === 'oceano' ? ' · embarcada' : ''}</p></div></div>`;
    h += `<div class="trio"><div><span>${ic('salud')}Vida</span><b>${u.hp}</b></div><div><span>${ic('movimiento')}Movimiento</span><b>${+u.moves.toFixed(1)}/${PC.maxMoves(u)}</b></div>
      <div><span>${ic('poder')}${U.ranged ? 'Distancia' : 'Ataque'}</span><b>${U.cat === 'military' && !U.commander ? `${U.atk}/${U.def}` : U.commander ? 'Aura' : '—'}</b></div></div>`;
    if (U.desc) h += `<p class="small muted" style="margin:0">${esc(U.desc)}</p>`;
    if (!own) return h + diploBox(civ) + tileInfo(t);
    const a = PC.attrition(u, t), fr = PC.faunaRisk(u, t);
    const states = [];
    if (u.fort) states.push('Fortificada'); if (u.heal) states.push('Curándose'); if (u.sentry) states.push('De centinela'); if (u.auto) states.push('Automática'); if (u.path) states.push('En ruta');
    if (!U.commander && PC.commanderNear(u)) states.push('Bajo el mando de un comandante (+20%)');
    if (states.length) h += `<div class="chips">${states.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>`;
    if (a > 0 && U.cat === 'military') h += `<p class="note">${ic('alerta')}Desgaste aquí: pierde ${a} de vida por turno.</p>`;
    if (fr > 0) h += `<p class="note">${ic('alerta')}${esc(PC.FAUNA[t.fauna].name)}: ${Math.round(fr * 100)}% de riesgo por turno (−${PC.FAUNA[t.fauna].dmg} de vida).</p>`;
    if (u.task) h += `<p class="note info">${ic('produccion')}Trabajando en ${u.task.id === 'camino' ? 'un camino' : PC.IMPROVEMENTS[u.task.id].name.toLowerCase()}: faltan ${u.task.left} turnos.</p>`;
    const acts = PC.unitActions(u);
    h += `<div class="sec"><h4>Acciones</h4><div class="actgrid">${acts.map((x) => `<button type="button" class="act ${x.primary ? 'primary' : ''} ${x.id === 'disolver' ? 'danger' : ''}" data-uact="${x.id}" ${x.ok ? '' : 'disabled'} title="${esc(x.reason || x.name)}">${ic(x.icon)}<span>${esc(x.name)}</span>${x.key ? `<kbd>${x.key}</kbd>` : ''}${!x.ok && x.reason ? `<small>${esc(x.reason)}</small>` : ''}</button>`).join('')}</div></div>`;
    if (u.type === 'trabajador') {
      const imps = PC.improvementOptions(u);
      h += `<div class="sec"><h4>Construir aquí</h4>${imps.length ? `<div class="actgrid">${imps.map((o) => `<button type="button" class="act" data-act="work" data-id="${o.id}">${ic('produccion')}<span>${esc(o.name)}</span><small>${o.turns} turnos</small></button>`).join('')}</div>` : '<p class="small muted" style="margin:0">Nada que construir en esta casilla. Lleva al ayllu a una casilla propia sin mejorar.</p>'}</div>`;
    }
    if (!PC.upgradeTarget(u) && U.cat === 'military' && !U.commander) {
      const line = Object.values(PC.UNIT_LINES).find((l) => l.includes(u.type));
      const next = line && line[line.indexOf(u.type) + 1];
      if (next) h += `<p class="small muted" style="margin:0">Siguiente modernización: ${esc(PC.UNITS[next].name)} (requiere ${esc(PC.TECH[PC.UNITS[next].tech].name)}${PC.UNITS[next].needs ? ' y ' + PC.UNITS[next].needs.map((r) => PC.RESOURCES[r].name).join(' o ') : ''}).</p>`;
    }
    return h + tileInfo(t);
  }
  function cityPanel(city) {
    const civ = PC.civ(city.civ), own = city.civ === PC.G.playerId;
    const y = PC.cityYields(city);
    let h = `<div class="ph" style="--civ:${civ.color}"><div class="tile-ico">${PC.emblem(civ.key, civ.color)}</div><div><h3>${esc(city.name)}</h3>
      <p>${esc(civ.name)}${civ.capitalId === city.id ? ' · capital' : ''} · fundada en ${PC.fmtYear(city.founded)}${city.conquered ? ' · conquistada' : ''}</p></div></div>`;
    h += `<div class="trio"><div><span>${ic('ciudad')}Población</span><b>${city.pop}</b></div><div><span>${ic('fortificar')}Defensa</span><b>${Math.round(PC.cityStrength(city))}</b></div><div><span>${ic('salud')}Murallas</span><b>${city.hp}</b></div></div>`;
    if (!own) return h + diploBox(civ) + (city.buildings.length ? `<div class="sec"><h4>Construido</h4><div class="chips">${city.buildings.map((b) => `<span class="chip">${esc((PC.BUILDINGS[b] || PC.WONDERS[b]).name)}</span>`).join('')}</div></div>` : '');
    const need = PC.growthNeeded(city), surplus = y.f - city.pop * 2;
    h += `<div class="yrow">${Y(y)}<span>${ic('ciencia')}${y.s}</span><span>${ic('cultura')}${y.c}</span></div>`;
    h += `<div class="bar"><i style="width:${PC.clamp(city.food / need * 100, 0, 100)}%"></i><span>Crecimiento ${city.food}/${need} (${surplus >= 0 ? '+' : ''}${surplus} por turno)</span></div>`;
    const b = city.build;
    h += '<div class="sec"><h4>Produciendo</h4>';
    if (b && b.kind !== 'riqueza') {
      const cost = PC.buildCost(b.kind, b.id);
      const name = b.kind === 'unit' ? PC.UNITS[b.id].name : b.kind === 'building' ? PC.BUILDINGS[b.id].name : PC.WONDERS[b.id].name;
      const turns = Math.max(1, Math.ceil((cost - city.prod) / Math.max(1, y.p)));
      const bc = PC.buyCost(city);
      h += `<div class="bar prod"><i style="width:${PC.clamp(city.prod / cost * 100, 0, 100)}%"></i><span>${esc(name)} · ${city.prod}/${cost} · ${turns} t</span></div>`;
      if (bc !== null) h += `<div class="actions"><button class="btn" data-act="buy" type="button" ${civ.gold >= bc && city.bought !== PC.G.turn ? '' : 'disabled'}>${ic('oro')}Comprar por ${bc} oro</button></div>`;
    } else h += `<p class="note ${b ? 'info' : ''}">${ic(b ? 'oro' : 'alerta')}${b ? 'Produce riqueza: la producción se convierte en oro.' : 'Elige qué producir.'}</p>`;
    h += '</div>';
    const opts = PC.buildOptions(city);
    const tabs = [['unit', 'Unidades'], ['building', 'Edificios'], ['wonder', 'Maravillas']];
    h += `<div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${UI.buildTab === k}">${l} <small>${opts.filter((o) => o.kind === k).length}</small></button>`).join('')}</div>`;
    const list = opts.filter((o) => o.kind === UI.buildTab || (UI.buildTab === 'building' && o.kind === 'riqueza'));
    h += '<div class="buildlist">' + (list.length ? list.map((o) => {
      const turns = o.cost ? Math.max(1, Math.ceil(o.cost / Math.max(1, y.p))) + ' t' : '';
      const def = o.kind === 'unit' ? PC.UNITS[o.id] : o.kind === 'building' ? PC.BUILDINGS[o.id] : o.kind === 'wonder' ? PC.WONDERS[o.id] : null;
      let tip = '';
      if (def && def.y) tip = Object.entries(def.y).map(([k, v]) => `+${v} ${{ f: 'alimento', p: 'producción', g: 'oro', s: 'ciencia', c: 'cultura' }[k]}`).join(', ');
      if (def && def.stab) tip += `${tip ? ', ' : ''}+${def.stab} cohesión`;
      if (def && def.def && o.kind !== 'unit') tip += `${tip ? ', ' : ''}+${Math.round(def.def * 100)}% defensa`;
      if (o.kind === 'unit') tip = def.cat === 'military' ? `Ataque ${def.atk}, defensa ${def.def}${def.ranged ? ', a distancia' : ''}${def.moves > 2 ? `, movimiento ${def.moves}` : ''}` : (def.desc || '');
      if (o.kind === 'riqueza') tip = 'Convierte la producción en oro';
      const icon = o.kind === 'unit' ? PC.unitIconKey(o.id) : o.kind === 'wonder' ? 'maravilla' : o.kind === 'riqueza' ? 'oro' : 'edificio';
      const active = b && b.kind === o.kind && b.id === o.id;
      return `<button type="button" class="bopt ${active ? 'active' : ''}" data-act="build" data-kind="${o.kind}" data-id="${o.id}">${ic(icon)}<span>${esc(o.name)}</span><em>${turns}</em><small>${esc(tip)}</small></button>`;
    }).join('') : '<p class="small muted">Nada disponible en esta categoría. Investiga nuevas tecnologías para desbloquear más.</p>') + '</div>';
    if (city.buildings.length) h += `<div class="sec"><h4>Construido</h4><div class="chips">${city.buildings.map((x) => `<span class="chip">${esc((PC.BUILDINGS[x] || PC.WONDERS[x]).name)}</span>`).join('')}</div></div>`;
    return h;
  }
  function onPanelClick(e) {
    const tab = e.target.closest('[data-tab]');
    if (tab) { UI.buildTab = tab.dataset.tab; renderPanel(); return; }
    const ua = e.target.closest('[data-uact]');
    if (ua && !ua.disabled) { runUnitAction(R.sel && R.sel.unit, ua.dataset.uact); return; }
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const sel = R.sel, act = b.dataset.act;
    const u = sel && sel.unit;
    if (act === 'leader') { openLeader(PC.civ(+b.dataset.civ)); return; }
    if (act === 'found' && u) { const t = PC.tile(u.t); PC.foundCity(PC.player(), t); PC.removeUnit(u); UI.select({ city: PC.cityAt(t.i) }); }
    else if (act === 'work' && u) { PC.startWork(u, b.dataset.id); nextUnit(); }
    else if (act === 'auto' && u) { u.auto = !u.auto; if (u.auto) { PC.autoUnit(u); nextUnit(); } else UI.select({ unit: u }); }
    else if (act === 'upgrade' && u) { PC.upgradeUnit(u); UI.select({ unit: u }); }
    else if (act === 'fort' && u) { u.fort = true; u.moves = 0; nextUnit(); }
    else if (act === 'skip' && u) { u.skipTurn = PC.G.turn; nextUnit(); }
    else if (act === 'stop' && u) { u.path = null; UI.select({ unit: u }); }
    else if (act === 'disband' && u) { ask(`¿Disolver ${PC.UNITS[u.type].name}?`, 'Disolver', () => { PC.removeUnit(u); UI.select(null); refresh(); }); }
    else if (act === 'build' && sel && sel.city) { sel.city.build = { kind: b.dataset.kind, id: b.dataset.id }; UI.select({ city: sel.city }); }
    else if (act === 'buy' && sel && sel.city) { PC.buy(sel.city); UI.select({ city: sel.city }); }
    else if (act === 'fase2' && PC.canAdvancePhase()) { PC.startNextPhase(); PC.G.phaseChanged = false; startGame(false); }
    refresh();
  }

  function runUnitAction(u, id) {
    if (!u || !PC.G.units.includes(u)) return;
    if (id === 'disolver') { ask(`¿Disolver ${PC.UNITS[u.type].name}?`, 'Disolver', () => { PC.removeUnit(u); UI.select(null); refresh(); }); return; }
    const t = PC.tile(u.t);
    const res = PC.doUnitAction(u, id);
    if (res === 'city') { UI.select({ city: PC.cityAt(t.i) }); refresh(); return; }
    if (!PC.G.units.includes(u)) { UI.select(null); refresh(); setTimeout(() => { if (!UI.modal) nextUnit(); }, 150); return; }
    if (['fortificar', 'curar', 'centinela', 'esperar', 'saquear', 'arengar'].includes(id) || (id === 'auto' && u.auto)) { nextUnit(); return; }
    UI.select({ unit: u }); refresh();
  }

  // ------------------------------------------------------------------ Ciclo de unidades
  function needsOrders(u) { return u.moves > 0 && !u.fort && !u.task && !u.auto && !u.path && !u.heal && !u.sentry && u.skipTurn !== PC.G.turn; }
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

  // ------------------------------------------------------------------ Mapa: puntero, toques y teclado
  function bindMap() {
    const cv = $('#stage canvas');
    if (!cv) return;
    let drag = null;
    cv.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, btn: e.button };
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    });
    cv.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      if (drag) {
        const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
        if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 5) { drag.moved = true; cv.classList.add('dragging'); }
        if (drag.moved) { if (drag.btn === 2) R.rotate(dx * 0.006); else R.pan(dx, dy); }
        drag.lx = e.clientX; drag.ly = e.clientY;
      } else hover(e);
    });
    cv.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') return;
      if (drag && !drag.moved) clickMap(e, drag.btn === 2);
      drag = null; cv.classList.remove('dragging');
    });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => { e.preventDefault(); R.zoom(e.deltaY > 0 ? 1.1 : 1 / 1.1); }, { passive: false });
    cv.addEventListener('pointerleave', () => { $('#tooltip').hidden = true; R.setHover(null); });
    // Táctil: un dedo desplaza, dos dedos acercan y giran; un toque selecciona.
    let tp = null;
    cv.addEventListener('touchstart', (e) => {
      const ts = [...e.touches];
      if (ts.length === 1) tp = { x: ts[0].clientX, y: ts[0].clientY, lx: ts[0].clientX, ly: ts[0].clientY, moved: false };
      else if (ts.length === 2) tp = { pinch: Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY), ang: Math.atan2(ts[1].clientY - ts[0].clientY, ts[1].clientX - ts[0].clientX), moved: true };
    }, { passive: true });
    cv.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const ts = [...e.touches];
      if (!tp) return;
      if (ts.length === 1 && tp.lx !== undefined) {
        const dx = ts[0].clientX - tp.lx, dy = ts[0].clientY - tp.ly;
        if (Math.abs(ts[0].clientX - tp.x) + Math.abs(ts[0].clientY - tp.y) > 8) tp.moved = true;
        if (tp.moved) R.pan(dx, dy);
        tp.lx = ts[0].clientX; tp.ly = ts[0].clientY;
      } else if (ts.length === 2 && tp.pinch) {
        const d = Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
        const a = Math.atan2(ts[1].clientY - ts[0].clientY, ts[1].clientX - ts[0].clientX);
        R.zoom(tp.pinch / d); R.rotate(a - tp.ang);
        tp.pinch = d; tp.ang = a;
      }
    }, { passive: false });
    cv.addEventListener('touchend', (e) => {
      if (tp && !tp.moved && e.changedTouches[0]) clickMap({ clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY }, false);
      if (!e.touches.length) tp = null;
    });
    window.addEventListener('resize', () => R.resize());
    $('#mapctl').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cam]'); if (!b) return;
      const k = b.dataset.cam;
      if (k === 'in') R.zoom(1 / 1.25); else if (k === 'out') R.zoom(1.25);
      else if (k === 'left') R.rotate(-0.4); else if (k === 'right') R.rotate(0.4);
      else if (k === 'home') { const c = PC.cityById(PC.player().capitalId); if (c) R.centerOn(PC.tile(c.t)); }
      else if (k === 'regions') { R.showRegions = !R.showRegions; R.refresh(); renderMapCtl(); }
      else if (k === 'quality') { R.setQuality(R.quality === 'alta' ? 'baja' : 'alta'); renderMapCtl(); }
    });
    document.addEventListener('keydown', onKey);
  }
  function mapXY(e) { const r = $('#stage canvas').getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function hover(e) {
    if (!PC.G || PC.G.preview) return;
    const [mx, my] = mapXY(e);
    const t = R.pick(mx, my);
    const tip = $('#tooltip');
    if (t !== R.hover) {
      const su = R.sel && R.sel.unit;
      R.path = null;
      if (t && su && su.civ === PC.G.playerId && !(R.reach && R.reach.has(t.i)) && t.i !== su.t && PC.isExplored(t.i)) R.path = PC.findPath(su, t.i);
      R.setHover(t);
    }
    if (!t || !PC.isExplored(t.i)) { tip.hidden = true; return; }
    const T = PC.TERRAIN[t.terrain];
    const rg = PC.G.map.regions.find((r) => r.id === t.region);
    const city = t.cityId ? PC.cityAt(t.i) : null;
    const us = PC.isVisible(t.i) ? PC.unitsAt(t.i) : [];
    let html = `<b>${esc(city ? city.name : PC.terrainName(t))}</b>${rg ? `<br>${esc(rg.name)}` : ''}`;
    if (t.owner) html += `<br><span class="swatch" style="background:${PC.civ(t.owner).color}"></span>${esc(PC.civ(t.owner).name)}`;
    us.forEach((u) => { html += `<br>${esc(PC.UNITS[u.type].name)} · ${esc(PC.civ(u.civ).name)} · vida ${u.hp}`; });
    if (t.res && PC.resVisible(PC.player(), t.res)) html += `<br>Recurso: ${esc(PC.RESOURCES[t.res].name)}`;
    if (t.fauna) html += `<br><span class="warn">${esc(PC.FAUNA[t.fauna].name)}</span>`;
    const su = R.sel && R.sel.unit;
    if (su && R.targets && R.targets.includes(t.i)) {
      const o = PC.combatOdds(su, t.i);
      html += `<br><b class="${o.ratio >= 1 ? 'good' : 'bad'}">Ataque ${o.A.toFixed(1)} contra ${o.D.toFixed(1)}</b>`;
    }
    tip.innerHTML = html;
    tip.style.left = Math.min(mx + 16, window.innerWidth - 280) + 'px'; tip.style.top = (my + 14) + 'px';
    tip.hidden = false;
  }
  function clickMap(e, right) {
    if (PC.G && PC.G.preview) {
      if ($('#menu').hidden || UI.screen !== 'setup' || PC.SCENARIOS[UI.menu.scenario].playerCities) return;
      const [mx, my] = mapXY(e);
      const t = R.pick(mx, my);
      if (t && t.region) { UI.menu.start = t.region; renderMenu(); }
      return;
    }
    if (!PC.G) return;
    const [mx, my] = mapXY(e);
    const t = R.pick(mx, my);
    if (!t) return;
    const g = PC.G;
    const su = R.sel && R.sel.unit;
    if (su && su.civ === g.playerId && g.units.includes(su)) {
      if (R.targets && R.targets.includes(t.i)) { PC.attack(su, t.i); afterAction(su); return; }
      if (R.reach && R.reach.has(t.i)) { PC.relocate(su, t.i, R.reach.get(t.i)); su.path = null; afterAction(su); return; }
      if (t.i !== su.t && PC.isExplored(t.i)) {
        const occ = PC.unitsAt(t.i)[0] || (t.cityId && PC.cityAt(t.i));
        if (occ && occ.civ !== su.civ && !PC.atWar(su.civ, occ.civ)) {
          const other = PC.civ(occ.civ);
          if (!other.isPlayer) ask(`¿Declarar la guerra a ${other.name}?`, 'Declarar la guerra', () => { PC.declareWar(PC.player(), other); UI.select({ unit: su }); refresh(); });
          return;
        }
        if (right || !PC.unitsAt(t.i).some((o) => o.civ === g.playerId)) {
          const path = PC.findPath(su, t.i);
          if (path) { su.path = path; PC.followPath(su); afterAction(su); return; }
        }
      }
    }
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
    if (!R.sel) setTimeout(() => { if (!UI.modal) nextUnit(); }, 200);
  }
  function onKey(e) {
    if (!PC.G || PC.G.preview || $('#hud').hidden) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (UI.modal) { if (k === 'escape' && UI.modal !== 'event') closeModal(); return; }
    const u = R.sel && R.sel.unit;
    if (k === 'enter') { endTurn(); e.preventDefault(); }
    else if (k === 'n' || k === 'tab') { nextUnit(); e.preventDefault(); }
    else if (k === 'escape') { UI.select(null); refresh(); }
    else if (u && u.civ === PC.G.playerId && ['f', 'h', 's', 'u'].includes(k)) {
      const id = { f: 'fortificar', h: 'curar', s: 'centinela', u: 'modernizar' }[k];
      const a = PC.unitActions(u).find((x) => x.id === id);
      if (a && a.ok) runUnitAction(u, id);
    }
    else if (k === ' ' && u && u.civ === PC.G.playerId) { u.skipTurn = PC.G.turn; nextUnit(); e.preventDefault(); }
    else if (k === 'b' && u && u.type === 'colono' && u.civ === PC.G.playerId && PC.validCitySite(PC.tile(u.t), PC.player())) { const t = PC.tile(u.t); PC.foundCity(PC.player(), t); PC.removeUnit(u); UI.select({ city: PC.cityAt(t.i) }); refresh(); }
    else if (k === 't') openTechs(); else if (k === 'd') openDiplo(); else if (k === 'p') openRegions(); else if (k === 'c') openChronicle();
    else if (k === 'q') R.rotate(-0.3); else if (k === 'e') R.rotate(0.3);
    else if (k === 'arrowleft') R.pan(80, 0); else if (k === 'arrowright') R.pan(-80, 0);
    else if (k === 'arrowup') R.pan(0, 80); else if (k === 'arrowdown') R.pan(0, -80);
    else if (k === '+' || k === '=') R.zoom(1 / 1.2); else if (k === '-') R.zoom(1.2);
  }

  // ------------------------------------------------------------------ Turnos
  function endTurn() {
    const g = PC.G, p = PC.player();
    if (g.eventQueue.length) { showEvent(); return; }
    if (g.gameOver) { showGameOver(); return; }
    if (!p.research && PC.availableTechs(p).length) { openTechs(); toast('Elige qué investigar antes de terminar el turno.', 'warn'); return; }
    const noBuild = PC.civCities(p).find((c) => !c.build);
    if (noBuild) { R.centerOn(PC.tile(noBuild.t)); UI.select({ city: noBuild }); refresh(); toast(`${noBuild.name} necesita producción.`, 'warn'); return; }
    PC.civUnits(p).forEach((u) => { if (u.path) PC.followPath(u); });
    PC.civUnits(p).forEach((u) => { if (u.auto && !u.task) PC.autoUnit(u); });
    $('#btn-end').disabled = true;
    setTimeout(() => {
      try { PC.endTurn(); } catch (err) { console.error(err); toast('Algo falló al procesar el turno: ' + err.message, 'war'); }
      PC.civUnits(p).forEach((u) => { if (u.auto && !u.task) PC.autoUnit(u); });
      $('#btn-end').disabled = false;
      storage.set(PC.serialize());
      UI.select(null);
      refresh();
      if (g.eventQueue.length) showEvent();
      else if (g.gameOver) showGameOver();
    }, 20);
  }
  function refresh() {
    if (!PC.G || PC.G.preview) return;
    renderTop(); renderPanel(); R.refresh(); flushToasts();
  }
  UI.refresh = refresh;

  // ------------------------------------------------------------------ Avisos
  const TOAST_ICON = { war: 'guerra', tech: 'tecnologia', history: 'cronica', event: 'cronica', city: 'ciudad', warn: 'alerta', info: 'sol' };
  function toast(text, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.innerHTML = `${ic(TOAST_ICON[type] || 'sol')}<span>${esc(text)}</span>`;
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('fade'), 5500);
    setTimeout(() => el.remove(), 6400);
    while ($('#toasts').children.length > 5) $('#toasts').firstChild.remove();
  }
  function flushToasts() { PC.G.notices.splice(0).slice(-5).forEach((n) => toast(n.text, n.type)); }

  // ------------------------------------------------------------------ Diálogos
  let askYes = null, askNo = null;
  function ask(text, yesLabel, onYes, onNo) {
    askYes = onYes; askNo = onNo || null;
    openModal(`<h2>${esc(text)}</h2><div class="choices"><button class="btn primary big" data-ask="yes" type="button">${esc(yesLabel)}</button><button class="btn big" data-ask="no" type="button">Cancelar</button></div>`, 'ask');
  }
  function openModal(html, kind) {
    UI.modal = kind || 'info';
    $('#modal-body').innerHTML = html;
    $('#modal').hidden = false;
    $('#modal-close').hidden = kind === 'event';
    const f = $('#modal-body').querySelector('button:not(:disabled)'); if (f) f.focus({ preventScroll: true });
  }
  function closeModal() { UI.modal = null; $('#modal').hidden = true; if (PC.G && !PC.G.preview) refresh(); }
  UI.closeModal = closeModal;

  function showEvent() {
    const ev = PC.currentEvent();
    if (!ev) return;
    const q = PC.G.eventQueue[0];
    const who = q && q.data && PC.civ(q.data.from || q.data.ally);
    const head = who && R.leaderThumb ? `<img class="lthumb lg" src="${R.leaderThumb(PC.leaderOf(who).model, who.color)}" alt="">` : ic(PC.EVENT_ICON[ev.id] || 'cronica', 'xl');
    openModal(`<div class="event"><div class="event-head">${head}<div><h2>${esc(ev.title)}</h2><p>${PC.fmtYear(PC.G.year)}</p></div></div>
      <p>${esc(ev.text)}</p>
      <div class="choices">${ev.choices.map((c, i) => `<button class="choice" data-choice="${i}" type="button" ${c.cond === false ? 'disabled' : ''}>${esc(c.label)}${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</button>`).join('')}</div></div>`, 'event');
  }
  UI.showEvent = showEvent;
  function showGameOver() {
    const g = PC.G, p = PC.player();
    openModal(`<h2>${g.gameOver.win ? 'Fin de la crónica' : 'Tu civilización ha caído'}</h2><p class="lead">${esc(g.gameOver.text)}</p>
      <div class="kv"><span>Puntuación</span><b>${PC.score(p)}</b></div>
      <h3>Tu historia alternativa · ${g.divergences.length} divergencias</h3>
      <ul class="div">${g.divergences.map((d) => `<li><b>${PC.fmtYear(d.year)}</b><span>${esc(d.text)}</span></li>`).join('') || '<li><b></b><span>Tu historia siguió el curso conocido.</span></li>'}</ul>
      <div class="choices"><button class="btn primary" data-act2="menu" type="button">Volver al menú</button>${g.gameOver.win ? '<button class="btn" data-act2="keep" type="button">Seguir jugando</button>' : ''}</div>`, 'over');
  }
  function openTechs() {
    const p = PC.player();
    let h = `<h2>Tecnologías</h2><p class="lead">Investigación acumulada: <b class="num">${Math.round(p.progress)}</b>. Elige la siguiente; las que muestran un recurso exigen controlarlo o comerciarlo, y por comercio cuestan más.</p><div class="techtree">`;
    PC.ERAS.forEach((era) => {
      h += `<div class="era" style="--era:${era.color}"><h4>${esc(era.name)}</h4>`;
      PC.TECHS.filter((t) => t.era === era.id).forEach((t) => {
        const known = !!p.techs[t.id];
        const miss = known ? [] : PC.techMissing(p, t.id);
        const can = !known && !miss.length;
        const acc = t.needs ? PC.techAccess(p, t.id) : null;
        const cls = known ? 'known' : p.research === t.id ? 'current' : can ? 'avail' : 'locked';
        const tags = [];
        if (t.needs) tags.push(`<span class="tag res">${esc(t.needs.map((r) => PC.RESOURCES[r].name).join(' o '))}</span>`);
        if (t.hy === null) tags.push('<span class="tag">Historia alternativa</span>');
        h += `<button type="button" class="tech ${cls}" data-tech="${t.id}" ${can ? '' : 'disabled'}><span>${esc(t.name)}</span>
          ${tags.length ? `<span class="tags">${tags.join('')}</span>` : ''}<small>${esc(t.desc || '')}</small>
          ${known ? '<em>Conocida</em>' : `<em>${PC.techCost(p, t.id)} de investigación${acc === 'trade' ? ', por comercio' : ''}</em>`}
          ${miss.length ? `<i>Falta: ${esc(miss.join(', '))}</i>` : ''}</button>`;
      });
      h += '</div>';
    });
    openModal(h + '</div>', 'techs');
  }
  function openLeader(civ) {
    const p = PC.player();
    const L = PC.leaderOf(civ), A = PC.AGENDAS[L.agenda];
    const st = PC.relState(p, civ), att = Math.round(PC.rel(civ, p).att);
    const meter = PC.clamp((att + 100) / 2, 0, 100);
    const treaties = [PC.REL_NAME[st]];
    if (PC.rel(p, civ).borders) treaties.push('Paso libre');
    if (PC.rel(p, civ).embassy) treaties.push('Embajadas');
    if (PC.rel(p, civ).denounced) treaties.push('Denunciado por ti');
    if (PC.rel(civ, p).denounced) treaties.push('Te ha denunciado');
    const routes = (PC.G.routes || []).filter((r) => (r.a === p.id && r.b === civ.id) || (r.a === civ.id && r.b === p.id)).length;
    if (routes) treaties.push(`${routes} ruta${routes > 1 ? 's' : ''} comercial${routes > 1 ? 'es' : ''}`);
    const acts = PC.DIPLO_ACTIONS.filter((a) => {
      const w = PC.atWar(p.id, civ.id);
      if (['paz', 'paz_oro', 'paz_ciudad'].includes(a.id)) return w;
      if (a.id === 'romper') return PC.rel(p, civ).ally;
      if (a.id === 'anexar' || a.id === 'vasallaje') return !w && !civ.external;
      return !w || a.id === 'guerra' ? !w : true;
    });
    const cards = acts.map((a) => {
      const iss = PC.diploIssues(p, civ, a.id);
      const ch = a.chance && !iss.length ? Math.round(a.chance(p, civ) * 100) : null;
      const cost = [a.inf ? `${a.inf} de influencia` : '', a.gold ? `${a.gold} de oro` : '', a.id === 'anexar' ? `${PC.annexCost(p, civ)} de oro` : ''].filter(Boolean).join(' y ');
      return `<button type="button" class="dact ${a.id === 'guerra' ? 'danger' : ''}" data-dact="${a.id}" data-civ="${civ.id}" ${iss.length ? 'disabled' : ''}>
        <b>${esc(a.name)}</b><small>${esc(a.desc)}</small>
        <em>${cost ? esc(cost) : 'Sin costo'}${ch !== null ? ` · ${ch}% de aceptación` : ''}</em>${iss.length ? `<i>${esc(iss[0])}</i>` : ''}</button>`;
    }).join('');
    openModal(`<div class="leader">
      <div class="leader-head" style="--civ:${civ.color}"><div class="leader-portrait" id="dlg-stage"><span class="lp-em">${PC.emblem(civ.key, civ.color)}</span></div>
        <div><h2>${esc(L.name)}</h2><p>${esc(L.title)} · ${esc(civ.name)}</p>
        <div class="chips">${treaties.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div></div></div>
      <div class="leader-grid">
        <div class="sec"><h4>Actitud hacia ti · ${PC.attName(att)}</h4>
          <div class="attbar"><i style="left:${meter}%"></i></div><p class="small muted" style="margin:0">${att > 0 ? '+' : ''}${att} de −100 a +100</p>
          <h4>Agenda: ${esc(A.name)}</h4>
          <div class="kv"><span>Le agrada</span><b>${esc(A.likes)}</b></div>
          <div class="kv"><span>Le desagrada</span><b>${esc(A.dislikes)}</b></div>
          <div class="kv"><span>Ciudades</span><b>${PC.civCities(civ).length}</b></div>
          <div class="kv"><span>Poder militar</span><b>${PC.power(civ)} (tú ${PC.power(p)})</b></div>
          ${st === 'guerra' ? `<div class="kv"><span>Puntaje de guerra</span><b class="${(PC.rel(p, civ).warScore || 0) >= 0 ? 'good' : 'bad'}">${PC.rel(p, civ).warScore || 0}</b></div>` : ''}
          <div class="kv"><span>Tu influencia</span><b>${Math.round(p.influence || 0)}</b></div>
          ${(civ.reigns || []).length ? `<h4>Gobernantes anteriores</h4>${civ.reigns.slice().reverse().slice(0, 5).map((r) => `<div class="kv"><span>${esc(r.name)}</span><b>hasta ${PC.fmtYear(r.until)}</b></div>`).join('')}` : ''}
        </div>
        <div class="sec"><h4>Acciones diplomáticas</h4><div class="dacts">${cards}</div></div>
      </div></div>`, 'leader');
    if (R.mountLeader) R.mountLeader($('#dlg-stage'), L.model, civ.color);
  }
  UI.openLeader = openLeader;
  function openDiplo() {
    const p = PC.player(), g = PC.G;
    const others = g.civs.filter((c) => c.alive && !c.isPlayer && (PC.civCities(c).length || PC.civUnits(c).length));
    let rows = '';
    others.forEach((c) => {
      const known = PC.civCities(c).some((ct) => PC.isExplored(ct.t)) || PC.civUnits(c).some((u) => PC.isExplored(u.t));
      if (!known) return;
      const st = PC.relState(p, c), att = Math.round(PC.rel(c, p).att), L = PC.leaderOf(c);
      const th = R.leaderThumb ? R.leaderThumb(L.model, c.color) : '';
      rows += `<tr><td><span class="who">${th ? `<img class="lthumb" src="${th}" alt="">` : ''}${PC.emblem(c.key, c.color)}<span>${esc(c.name)}<br><small class="muted">${esc(L.name)} · ${esc(PC.AGENDAS[L.agenda].name)}</small></span></span></td>
        <td>${PC.civCities(c).length}</td><td>${PC.power(c)}</td><td class="${att < -20 ? 'bad' : att > 20 ? 'good' : ''}">${PC.attName(att)} (${att > 0 ? '+' : ''}${att})</td>
        <td><span class="chip st-${st}">${PC.REL_NAME[st]}</span></td>
        <td><button class="btn" data-leader="${c.id}" type="button">${ic('diplomacia')}Hablar</button></td></tr>`;
    });
    openModal(`<h2>Diplomacia</h2><p class="lead">Tienes ${Math.round(p.influence || 0)} de influencia (+${PC.influenceIncome(p)} por turno), ${PC.civRoutes(p.id).length} de ${PC.maxRoutes(p)} rutas comerciales y un poder militar de ${PC.power(p)}. Habla con cada líder para proponer tratados, exigir tributo o negociar la paz.</p>
      <div class="tablewrap"><table class="diplo"><thead><tr><th>Civilización y líder</th><th>Ciudades</th><th>Poder</th><th>Actitud</th><th>Estado</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="muted">Aún no has encontrado a otras civilizaciones. Explora el mapa.</td></tr>'}</tbody></table></div>
      ${congressBox()}`, 'diplo');
  }
  function congressBox() {
    const g = PC.G, cg = g.congress;
    const members = PC.congressMembers();
    let h = `<h3>${ic('congreso')} ${esc(PC.congressName())}</h3>`;
    if (!cg || cg.next === null) {
      h += `<p class="small muted">El congreso se reúne cada ${PC.CONGRESS_EVERY} turnos cuando conoces al menos a dos pueblos (ahora: ${Math.max(0, members.length - 1)}). Allí se votan condenas, embargos, treguas y otras resoluciones.</p>`;
      return h;
    }
    const left = Math.max(0, cg.next - g.turn);
    h += `<p class="small muted">${members.length} miembros · próxima sesión ${left ? `en ${left} turno${left > 1 ? 's' : ''}` : 'este turno'} · tienes ${PC.congressVotes(PC.player())} voto${PC.congressVotes(PC.player()) > 1 ? 's' : ''}${cg.host ? ` · sede: ${esc(PC.civ(cg.host).name)}` : ''}.</p>`;
    const act = (cg.active || []).filter((a) => a.until > g.turn);
    if (act.length || cg.truce > g.turn) {
      h += '<ul class="parts">' + act.map((a) => `<li><span>${esc(PC.RESOLUTIONS[a.id].name)}${a.target ? ' · ' + esc(PC.civ(a.target).name) : ''}</span><b>${a.until - g.turn} turnos</b></li>`).join('') +
        (cg.truce > g.turn && !act.some((a) => a.id === 'tregua') ? `<li><span>Tregua general</span><b>${cg.truce - g.turn} turnos</b></li>` : '') + '</ul>';
    }
    const hist = (cg.history || []).slice(-5).reverse();
    if (hist.length) h += `<ul class="log">${hist.map((x) => `<li class="${x.pass ? 'history' : 'info'}"><b>${PC.fmtYear(x.year)}</b><span>${esc(PC.RESOLUTIONS[x.res].name)}${x.target ? ' · ' + esc(x.target) : ''}: ${x.pass ? 'aprobada' : 'rechazada'} (${x.yes}–${x.no})</span></li>`).join('')}</ul>`;
    return h;
  }
  function openRegions() {
    const g = PC.G, rc = PC.regionControl();
    const total = g.map.regions.length, mine = PC.playerRegionCount(), need = PC.phaseNeed();
    const info = PC.phaseInfo(), next = info.next && PC.phaseInfo(info.next);
    const zones = [...new Set(g.map.regions.map((r) => r.zone))];
    let h = `<h2>Provincias</h2><p class="lead">Controlas ${mine} de ${total}. ${next ? `Necesitas ${need} (el ${Math.round(info.need * 100)}%) para pasar a la ${esc(next.name.replace(' · ', ': '))}${next.ready ? '' : ' (en desarrollo)'}.` : ''}</p>
      <div class="bar"><i style="width:${Math.min(100, mine / need * 100)}%"></i><span>${mine} de ${need}</span></div>`;
    if (g.map.kind === 'peru') h += `<p class="small muted">El mapa tiene ${g.map.counts.costa} hexágonos de costa, ${g.map.counts.sierra} de sierra y ${g.map.counts.selva} de selva, en las proporciones reales del Perú.</p>`;
    h += '<div class="regcols">';
    zones.forEach((z) => {
      h += `<div><h3>${esc(PC.ZONE_NAME[z] || PC.MACRO_NAME[z] || 'Regiones')}</h3><ul class="reglist">`;
      g.map.regions.filter((r) => r.zone === z).forEach((r) => {
        const c = rc[r.id] ? PC.civ(rc[r.id]) : null;
        h += `<li><span>${esc(r.name)}</span>${c ? `<b><span class="swatch" style="background:${c.color}"></span>${esc(c.name)}</b>` : '<span class="muted">Sin dueño</span>'}</li>`;
      });
      h += '</ul></div>';
    });
    openModal(h + '</div>', 'regions');
  }
  function openChronicle() {
    const g = PC.G;
    const log = g.log.slice().reverse().filter((l) => l.type !== 'info');
    openModal(`<h2>Crónica</h2>
      <h3>Divergencias de la historia real · ${g.divergences.length}</h3>
      <ul class="div">${g.divergences.map((d) => `<li><b>${PC.fmtYear(d.year)}</b><span>${esc(d.text)}</span></li>`).join('') || '<li><b></b><span class="muted">Por ahora tu historia sigue el curso conocido.</span></li>'}</ul>
      <h3>Registro</h3><ul class="log">${log.slice(0, 250).map((l) => `<li class="${l.type}"><b>${PC.fmtYear(l.year)}</b><span>${esc(l.text)}</span></li>`).join('')}</ul>`, 'chronicle');
  }
  function openMenu() {
    const canP2 = PC.canAdvancePhase();
    openModal(`<h2>Menú</h2><div class="choices col">
      <button class="btn big" data-act2="save" type="button">Guardar la partida</button>
      <button class="btn big" data-act2="export" type="button">Exportar a un archivo</button>
      <button class="btn big" data-act2="help" type="button">Cómo se juega</button>
      ${canP2 ? `<button class="btn primary big" data-act2="fase2" type="button">${ic('mapa')}${esc(nextPhaseName())}</button>` : ''}
      <button class="btn big" data-act2="menu" type="button">Volver al menú principal</button></div>
      <p class="small muted">Semilla del mapa ${PC.G.seed} · ${esc(PC.SCENARIOS[PC.G.scenario].name)} · ${esc(PC.diff().name)}. La partida también se guarda sola al terminar cada turno.</p>`, 'menu');
  }
  function bindModal() {
    $('#modal-close').onclick = closeModal;
    $('#modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal' && UI.modal !== 'event') { closeModal(); return; }
      if (e.target.closest('[data-close]')) { closeModal(); return; }
      const ak = e.target.closest('[data-ask]');
      if (ak) { const fn = ak.dataset.ask === 'yes' ? askYes : askNo; askYes = askNo = null; closeModal(); if (fn) fn(); return; }
      const ch = e.target.closest('[data-choice]');
      if (ch && !ch.disabled) {
        PC.resolveEvent(+ch.dataset.choice);
        closeModal();
        if (PC.G.phaseChanged) { PC.G.phaseChanged = false; startGame(false); }
        if (PC.G.eventQueue.length) showEvent();
        return;
      }
      const tech = e.target.closest('[data-tech]');
      if (tech && !tech.disabled) { PC.player().research = tech.dataset.tech; closeModal(); return; }
      const lb = e.target.closest('[data-leader]');
      if (lb) { openLeader(PC.civ(+lb.dataset.leader)); return; }
      const da = e.target.closest('[data-dact]');
      if (da && !da.disabled) {
        const p = PC.player(), c = PC.civ(+da.dataset.civ);
        const go = () => { const r = PC.diploDo(p, c, da.dataset.dact); refresh(); if (r.text) toast(r.text, r.ok ? 'event' : 'warn'); openLeader(c); };
        if (da.dataset.dact === 'guerra') ask(`¿Declarar la guerra a ${c.name}?`, 'Declarar la guerra', go, () => openLeader(c));
        else go();
        return;
      }
      const d = e.target.closest('[data-diplo]');
      if (d && !d.disabled) {
        const p = PC.player(), c = PC.civ(+d.dataset.civ);
        if (d.dataset.diplo === 'war') { ask(`¿Declarar la guerra a ${c.name}?`, 'Declarar la guerra', () => { PC.declareWar(p, c); refresh(); openDiplo(); }, openDiplo); return; }
        if (d.dataset.diplo === 'peace') PC.proposePeace(p, c);
        if (d.dataset.diplo === 'annex') PC.annex(p, c);
        refresh(); openDiplo(); return;
      }
      const a = e.target.closest('[data-act2]');
      if (a) {
        const act = a.dataset.act2;
        if (act === 'save') { closeModal(); toast(storage.set(PC.serialize()) ? 'Partida guardada en este navegador.' : 'Este navegador no permite guardar. Exporta la partida a un archivo.', 'info'); }
        if (act === 'export') {
          try {
            const blob = new Blob([PC.serialize()], { type: 'application/json' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `peru-civ-${PC.G.year}.json`; link.click();
          } catch (err) { toast('No se pudo exportar desde aquí.', 'warn'); }
        }
        if (act === 'help') showIntro();
        if (act === 'menu') showMenu();
        if (act === 'keep') { PC.G.gameOver = null; closeModal(); }
        if (act === 'fase2' && PC.canAdvancePhase()) { PC.startNextPhase(); PC.G.phaseChanged = false; closeModal(); startGame(false); }
      }
    });
    document.querySelectorAll('[data-modal]').forEach((b) => {
      b.onclick = () => ({ techs: openTechs, diplo: openDiplo, regions: openRegions, chronicle: openChronicle, menu: openMenu }[b.dataset.modal])();
    });
    $('#topbar').addEventListener('click', (e) => { if (e.target.closest('[data-open="techs"]')) openTechs(); });
    $('#panel').addEventListener('click', onPanelClick);
    $('#btn-end').onclick = endTurn;
  }

  window.addEventListener('DOMContentLoaded', () => {
    try { R.init($('#stage'), $('#labels')); } catch (err) {
      document.body.insertAdjacentHTML('beforeend', '<p class="err" style="position:fixed;bottom:16px;left:16px">No se pudo iniciar el 3D en este navegador. Activa WebGL o prueba con otro navegador.</p>');
    }
    if (prefs.quality && R.setQuality) R.setQuality(prefs.quality);
    bindMenu(); bindMap(); bindModal(); renderNav();
    previewWorld(); showScreen('title');
  });
})(globalThis.PC = globalThis.PC || {});

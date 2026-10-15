// Ventana de La Conquista: frentes, liga de resistencia, pacto con la Corona y crónica (v0.1.3).
(function (PC) {
  'use strict';
  const UI = PC.UI, R = PC.R;
  if (!UI) return;
  const esc = UI.esc || ((s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const ic = (n, cls) => PC.icon(n, cls);
  const PHASE = { peru: 'Fase 1: Perú', sudamerica: 'Fase 2: Sudamérica', america: 'Fase 3: América' };
  const ORDER = { activo: 0, pendiente: 1, resistida: 2, conquistada: 3 };
  const STATE_ICON = { activo: 'guerra', pendiente: 'barco', resistida: 'paz', conquistada: 'corona' };
  const STANCE_CLS = { resiste: 'res', liga: 'liga', corona: 'cor', vasallo: 'cor', caido: 'cai', neutral: 'neu' };

  // Regiones donde se combate un frente en el mapa actual (en el Perú, el frente 'peru' abarca todo el mapa).
  function regionIds(id) {
    const g = PC.G, F = PC.conquistaFront(id);
    if (!F) return [];
    if (g.phase === 'peru') return id === 'peru' ? g.map.regions.map((r) => r.id) : [];
    return F.regions.filter((r) => g.map.regions.some((x) => x.id === r));
  }
  // Casilla de referencia del frente: ciudad de la Corona, si no de un pueblo, si no el centro de su primera región.
  function frontTile(f) {
    const regs = new Set(regionIds(f.id)), inReg = (c) => regs.has(PC.tile(c.t).region);
    const crown = f.crownId != null ? PC.civ(f.crownId) : null;
    let c = crown && PC.civCities(crown).find(inReg);
    if (!c) f.natives.some((n) => (c = PC.civCities(PC.civ(n.id)).find(inReg)));
    if (c) return PC.tile(c.t);
    const rg = PC.G.map.regions.find((r) => regs.has(r.id));
    return rg && rg.tiles.length ? PC.tile(rg.tiles[Math.floor(rg.tiles.length / 2)]) : null;
  }

  function bars(f) {
    const max = Math.max(1, f.crownCities, f.nativeCities, f.nativeStart || 0);
    const row = (label, n, cls, extra) => `<div class="cq-bar"><span>${label}</span><div class="bar"><i class="${cls}" style="width:${Math.round(n / max * 100)}%"></i></div><b class="num">${n}${extra || ''}</b></div>`;
    return `<div class="cq-bars">${row(esc(f.crownName), f.crownCities, 'cr')}${row('Pueblos', f.nativeCities, 'na', f.nativeStart ? ` <small>de ${f.nativeStart}</small>` : '')}</div>`;
  }
  function natives(f) {
    if (!f.natives.length) return '<p class="small muted">Ningún pueblo de la región ha entrado en la guerra.</p>';
    const order = { liga: 0, resiste: 1, corona: 2, vasallo: 3, neutral: 4, caido: 5 };
    return `<ul class="cq-nat">${f.natives.slice().sort((a, b) => order[a.stance] - order[b.stance] || b.cities - a.cities).map((n) => {
      const civ = PC.civ(n.id), th = civ && R.leaderThumb ? R.leaderThumb(PC.leaderOf(civ).model, n.color) : '';
      return `<li class="cq-n ${STANCE_CLS[n.stance]}">${th ? `<img class="lthumb" src="${th}" alt="">` : PC.emblem(n.key, n.color)}
        <span class="cq-nn"><b>${esc(n.name)}</b><small>${esc(n.leader)} · ${n.cities} ciudad${n.cities === 1 ? '' : 'es'}</small></span>
        <span class="chip cq-st ${STANCE_CLS[n.stance]}">${esc(n.stanceText)}</span>
        ${n.stance === 'caido' ? '' : `<button class="btn cq-talk" data-cq-talk="${n.id}" type="button" aria-label="Hablar con ${esc(n.leader)}">${ic('diplomacia')}Hablar</button>`}</li>`;
    }).join('')}</ul>`;
  }
  function card(f) {
    const crown = f.crownCiv ? PC.emblem(PC.civ(f.crownId).key, f.crownColor) : ic('barco');
    const live = f.state === 'activo', over = f.state === 'resistida' || f.state === 'conquistada';
    return `<section class="cq-front ${f.state}" data-cq-front="${f.id}" aria-labelledby="cqf-${f.id}">
      <header class="cq-fh">${ic(STATE_ICON[f.state])}<div><h4 id="cqf-${f.id}">${esc(f.name)}</h4><small>${PC.fmtYear(f.year)} · ${esc(f.crownName)}</small></div>
        <span class="cq-state ${f.state}">${esc(f.stateText)}</span></header>
      <p class="small muted cq-tx">${esc(f.text)}</p>
      ${f.state === 'pendiente' ? '' : `<div class="cq-crown">${crown}<span>${esc(f.crownLeader || f.crownCiv || f.crownName)}<small>${f.commander ? (f.commander === f.crownLeader ? `Al mando de ${esc(f.crownName)}` : `Al mando: ${esc(f.commander)}`) : live ? 'Sin mando' : esc(f.crownCiv || '')}</small></span>
        ${live ? `<span class="cq-meta">${f.crownTroops} tropas · ${f.age} turnos</span>` : ''}</div>`}
      ${live || over ? bars(f) : ''}
      ${live || over ? `<div class="cq-meta2"><span>Ciudades tomadas por la Corona <b class="num">${f.captures}</b></span><span>Recuperadas <b class="num">${f.lost}</b></span>${f.involved ? '<span class="good">Tu pueblo participa</span>' : ''}${f.atWarWithPlayer ? '<span class="bad">En guerra contigo</span>' : ''}</div>` : ''}
      ${live || over ? natives(f) : ''}
      ${f.state !== 'pendiente' ? `<div class="cq-act"><button class="btn" data-cq-see="${f.id}" type="button">${ic('mapa')}Ver en el mapa</button></div>` : ''}
    </section>`;
  }

  function leagueCard(v) {
    const L = v.league;
    let body;
    if (L) body = `<div class="cq-mem">${L.members.map((m) => `<span class="cq-m" title="${esc(m.name)}">${PC.emblem(m.key, m.color)}<b>${esc(m.name)}</b></span>`).join('')}</div>
      <p class="small muted">Lleva ${L.age} turno${L.age === 1 ? '' : 's'} unida. Sus miembros pelean juntos contra la Corona y reciben un bono de ataque.</p>
      <div class="cq-act"><button class="btn danger" data-cq="leave" type="button">${ic('cerrar')}Abandonar la liga</button></div>`;
    else {
      const why = v.pact ? 'No puedes liderar la resistencia mientras pactas con la Corona.' : v.influence < v.leagueCost ? `Te falta influencia: tienes ${v.influence} de ${v.leagueCost}.` : !v.canLeague ? 'No hay pueblos conocidos a los que convocar.' : '';
      body = `<p class="small muted">Convoca a los pueblos vecinos a pelear juntos. Cada uno decide según su actitud hacia ti y su cercanía a la Corona. Si ninguno acepta, recuperas la mitad de la influencia.</p>
        <div class="cq-act"><button class="btn primary" data-cq="league" type="button" ${v.canLeague ? '' : 'disabled'}>${ic('liga')}Convocar la liga <small>${v.leagueCost} de influencia</small></button>${why ? `<span class="small bad">${esc(why)}</span>` : ''}</div>`;
    }
    return `<section class="cq-box" aria-labelledby="cq-liga"><header class="cq-fh">${ic('liga')}<div><h4 id="cq-liga">Liga de resistencia</h4><small>Tu influencia: ${v.influence}</small></div></header>${body}</section>`;
  }
  function pactCard(v) {
    const body = v.pact
      ? `<p class="small">Eres aliado de la Corona desde ${PC.fmtYear(v.pact.year).replace(/\.$/, '')}${v.pact.betrayed ? ', pero ya te ha traicionado' : ''}. Tus vecinos te desprecian y la Corona puede volverse contra ti.</p>
        <div class="cq-act"><button class="btn danger" data-cq="unpact" type="button">${ic('cerrar')}Romper el pacto</button></div>`
      : `<p class="small muted">Alianza con los invasores: 150 de oro, caballos y acero. A cambio pierdes la liga, tus vecinos te odiarán y la Corona puede traicionarte.</p>
        <div class="cq-act"><button class="btn" data-cq="pact" type="button">${ic('pacto')}Pactar con la Corona</button></div>`;
    return `<section class="cq-box ${v.pact ? 'on' : ''}" aria-labelledby="cq-pacto"><header class="cq-fh">${ic('pacto')}<div><h4 id="cq-pacto">Pacto con la Corona</h4><small>${v.pact ? 'Vigente' : 'Sin pacto'}</small></div></header>${body}</section>`;
  }

  function open() {
    const v = PC.conquistaView(), box = document.querySelector('.modal-box'), keep = box ? box.scrollTop : 0;
    const fs = v.fronts.slice().sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.year - b.year);
    const main = fs.filter((f) => !f.silent), quiet = fs.filter((f) => f.silent);
    const t = v.tally, n = (k, l) => `<div class="cq-k ${k}"><b class="num">${t[k]}</b><span>${l}</span></div>`;
    UI.openModal(`<div class="cq">
      <h2>${ic('conquista', 'lg')}La Conquista</h2>
      <p class="lead">${esc(PHASE[PC.G.phase] || '')} · ${PC.fmtYear(PC.G.year)} Los reinos de Europa abren frentes en el continente; cada pueblo decide si resiste, pacta o aprovecha la guerra.</p>
      <div class="cq-sum" role="group" aria-label="Resumen de los frentes">${n('activo', 'en guerra')}${n('pendiente', 'en camino')}${n('resistida', 'resistidos')}${n('conquistada', 'conquistados')}</div>
      <div class="cq-top">${leagueCard(v)}${pactCard(v)}</div>
      <h3>Frentes</h3>
      <div class="cq-fronts">${main.map(card).join('') || '<p class="muted">Todavía no hay frentes abiertos.</p>'}</div>
      ${quiet.length ? `<details class="cq-quiet"><summary>Frentes ya asentados al empezar esta fase · ${quiet.length}</summary><div class="cq-fronts">${quiet.map(card).join('')}</div></details>` : ''}
      <h3>Crónica de la Conquista</h3>
      ${v.chronicle.length ? `<ul class="log cq-log">${v.chronicle.map((c) => `<li><b>${PC.fmtYear(c.year)}</b><span>${esc(c.text)}</span></li>`).join('')}</ul>` : '<p class="small muted">Aún no hay nada que contar.</p>'}
    </div>`, 'conquista');
    if (box) box.scrollTop = keep;
  }
  UI.openConquista = open;

  function hl(ids) { R.hlRegions = ids; if (R.draw) R.draw(); }
  function done(r) { if (r && r.text) UI.toast(r.text, r.ok ? 'event' : 'warn'); UI.refresh(); open(); }
  function confirm(title, yes, fn, detail) { UI.ask(title, yes, () => done(fn()), open, detail); }

  document.addEventListener('click', (e) => {
    if (UI.modal !== 'conquista') return;
    const talk = e.target.closest('[data-cq-talk]');
    if (talk) { hl(null); UI.openLeader(PC.civ(+talk.dataset.cqTalk)); return; }
    const see = e.target.closest('[data-cq-see]');
    if (see) {
      const f = PC.conquistaView().fronts.find((x) => x.id === see.dataset.cqSee), t = f && frontTile(f);
      hl(null); UI.closeModal();
      if (t) R.centerOn(t, true);
      return;
    }
    const a = e.target.closest('[data-cq]');
    if (!a || a.disabled) return;
    const k = a.dataset.cq;
    if (k === 'league') done(PC.conquistaFormLeague());
    else if (k === 'leave') confirm('¿Abandonar la liga de resistencia?', 'Abandonar la liga', PC.conquistaLeaveLeague, 'Los pueblos que la forman dejarán de ser tus aliados de guerra y su actitud hacia ti empeorará.');
    else if (k === 'pact') confirm('¿Pactar con la Corona?', 'Pactar con la Corona', PC.conquistaPact, 'Recibes oro, caballos y acero y la paz con los invasores. A cambio la liga se disuelve, tus vecinos te odiarán, tu cohesión sufrirá y la Corona puede traicionarte cuando se sienta fuerte.');
    else if (k === 'unpact') confirm('¿Romper el pacto con la Corona?', 'Romper el pacto', PC.conquistaBreakPact, 'Los invasores no perdonan: es probable que te declaren la guerra y tu cohesión bajará.');
  });
  // Resalta en el mapa las regiones del frente mientras el puntero (o el foco) está sobre su tarjeta.
  const over = (e) => {
    if (UI.modal !== 'conquista') return;
    const c = e.target.closest && e.target.closest('[data-cq-front]');
    const ids = c ? regionIds(c.dataset.cqFront) : null;
    if (JSON.stringify(ids) !== JSON.stringify(R.hlRegions || null)) hl(ids);
  };
  document.addEventListener('mouseover', over);
  document.addEventListener('focusin', over);
  document.addEventListener('mouseout', (e) => { if (UI.modal === 'conquista' && !e.relatedTarget) hl(null); });

  // Botón de la barra superior: solo mientras hay Conquista; el distintivo cuenta los frentes en guerra.
  function sync() {
    const b = document.querySelector('[data-modal="conquista"]');
    if (!b || !PC.G || PC.G.preview) return;
    const on = PC.conquistaActive();
    b.hidden = !on;
    if (!on) return;
    const n = PC.conquistaView().tally.activo;
    let badge = b.querySelector('.cq-badge');
    if (!n) { if (badge) badge.remove(); b.title = 'La Conquista'; return; }
    if (!badge) { badge = document.createElement('b'); badge.className = 'cq-badge'; b.appendChild(badge); }
    badge.textContent = n; b.title = `La Conquista: ${n} frente${n === 1 ? '' : 's'} en guerra`;
    b.setAttribute('aria-label', b.title);
  }
  UI.on('refresh', sync); UI.on('start', sync);
})(globalThis.PC = globalThis.PC || {});

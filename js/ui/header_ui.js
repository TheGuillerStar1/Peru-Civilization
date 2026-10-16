// Barra superior explicada: cada dato dice qué es al pasar el cursor (o enfocarlo con el teclado) y, al hacer clic,
// abre la pantalla donde se profundiza (tecnologías, diplomacia, provincias, crónica, economía o cohesión).
// Es solo interfaz: lee del motor y no escribe en él.
(function (PC) {
  'use strict';
  const UI = PC.UI, R = PC.R;
  const esc = (s) => UI.esc(String(s));
  const sum = (arr, k) => arr.reduce((s, c) => s + PC.cityYields(c)[k], 0);
  const sign = (n) => (n > 0 ? '+' : '') + n;
  const fmtPct = (a, b) => Math.round(Math.min(1, a / Math.max(1, b)) * 100);

  // Cada entrada: título, texto de ayuda con los valores de ahora y la acción del clic.
  const TIPS = {
    'tb-civ': () => {
      const p = PC.player(), L = PC.LEADERS[p.leaderId], lead = PC.leaderOf(p);
      return { t: p.name, body: `<p>Tu civilización y tu líder: <b>${esc(lead.name)}</b>, ${esc(lead.title || '')}</p>${L && L.desc ? `<p>${esc(L.desc)}</p>` : ''}`, click: 'Ver el resumen de tu civilización y centrar la capital' };
    },
    'tb-year': () => {
      const g = PC.G, p = PC.player(), step = PC.yearStep(g.year, g.speed);
      return { t: 'Fecha y turno', body: `<p>El tiempo solo avanza cuando terminas el turno. Ahora cada turno equivale a <b>${step} años</b>; el ritmo cambia con la época y la velocidad elegida.</p>
        <p>Turno <b>${g.turn}</b> · ${esc(PC.fmtYear(g.year))} · época <b>${esc(PC.ERAS[PC.eraOf(p)].name)}</b>.</p>`, click: 'Abrir la crónica de lo ocurrido' };
    },
    'tb-gold': () => {
      const p = PC.player(), inc = p.lastIncome === undefined ? sum(PC.civCities(p), 'g') : p.lastIncome;
      return { t: 'Oro', body: `<p>Tu tesoro: <b>${Math.round(p.gold)}</b> (${sign(inc)} por turno, según lo que rinden tus ciudades).</p>
        <p>Sirve para comprar producción en una ciudad, pagar grandes proyectos y la diplomacia. Con el tesoro por debajo de cero hay bancarrota y baja la cohesión.</p>`, click: 'Ver cuánto rinde cada ciudad' };
    },
    'tb-sci': () => {
      const p = PC.player(), sci = sum(PC.civCities(p), 's');
      if (!p.research) return { t: 'Ciencia', body: `<p>Produces <b>+${sci}</b> de ciencia por turno, pero <b>no investigas nada</b>: se está perdiendo.</p><p>Cada tecnología desbloquea unidades, edificios o mejoras.</p>`, click: 'Elegir qué investigar' };
      const cost = PC.techCost(p, p.research), turns = Math.max(1, Math.ceil((cost - p.progress) / Math.max(1, sci)));
      return { t: 'Ciencia', body: `<p>Investigas <b>${esc(PC.TECH[p.research].name)}</b>: ${Math.round(p.progress)} de ${cost} (${fmtPct(p.progress, cost)}%).</p>
        <p>Con <b>+${sci}</b> de ciencia por turno la terminas en unos <b>${turns} turnos</b>.</p>`, click: 'Abrir las tecnologías' };
    },
    'tb-cult': () => {
      const p = PC.player(), c = sum(PC.civCities(p), 'c');
      return { t: 'Cultura', body: `<p>Cultura acumulada: <b>${Math.round(p.culture)}</b> (${sign(c)} por turno).</p>
        <p>Se produce en templos, maravillas y ciudades. Da influencia (+1 por cada 10 de cultura por turno, hasta +5) y cuenta para la victoria cultural.</p>`, click: 'Ver cuánta cultura rinde cada ciudad' };
    },
    'tb-inf': () => {
      const p = PC.player();
      return { t: 'Influencia', body: `<p>Tienes <b>${Math.round(p.influence || 0)}</b> (${sign(PC.influenceIncome(p))} por turno).</p>
        <p>Se gasta en acciones diplomáticas: alianzas, embajadas, pactos y peticiones. Sube con la cultura, las rutas comerciales y las embajadas.</p>`, click: 'Abrir la diplomacia' };
    },
    'tb-stab': () => {
      const p = PC.player(), st = PC.stabilityTarget(p), now = Math.round(p.stability);
      const lines = st.parts.slice(0, 5).map(([n, v]) => `<li>${esc(n)} <b class="${v < 0 ? 'bad' : 'good'}">${sign(v)}</b></li>`).join('');
      return { t: 'Cohesión', body: `<p>Qué tan unido está tu pueblo: <b>${now}</b>, tiende a <b>${st.value}</b>.</p>
        <p>Con 70 o más tus ciudades rinden un 10% más; por debajo de 35 rinden un 15% menos, y por debajo de 28 pueden estallar revueltas.</p><ul class="tipparts">${lines}</ul>`, click: 'Ver todo lo que sube o baja la cohesión' };
    },
    'tb-reg': () => {
      const g = PC.G, mine = PC.playerRegionCount(), need = PC.phaseNeed();
      return { t: 'Provincias', body: `<p>Controlas <b>${mine}</b> de ${g.map.regions.length} provincias.</p>
        <p>Al llegar a <b>${need}</b> se abre la siguiente fase del juego (más mapa, más pueblos). Una provincia se controla con ciudades y territorio propio.</p>`, click: 'Ver el control de cada provincia' };
    }
  };
  const NAV = {
    techs: ['Tecnologías', 'El árbol de investigación: lo que sabes y lo que puedes aprender.', 'T'],
    diplo: ['Diplomacia', 'Tus relaciones con otros pueblos: hablar, comerciar, pactar o declarar la guerra.', 'D'],
    regions: ['Provincias', 'Quién controla cada provincia y cuánto falta para la siguiente fase.', 'P'],
    chronicle: ['Crónica', 'Todo lo ocurrido, con filtros y búsqueda, y tus divergencias con la historia real.', 'C'],
    conquista: ['La Conquista', 'La campaña de las Coronas por América: frentes, liga de resistencia y pactos.', 'G'],
    menu: ['Menú', 'Guardar, cargar, opciones, victorias y volver al menú principal.', '']
  };

  // ------------------------------------------------------------------ Pantallas de detalle
  function openEconomy(focus) {
    const p = PC.player(), cities = PC.civCities(p);
    const cols = [['f', 'Alimento'], ['p', 'Producción'], ['g', 'Oro'], ['s', 'Ciencia'], ['c', 'Cultura']];
    const rows = cities.map((c) => { const y = PC.cityYields(c); return `<tr><td>${esc(c.name)}${p.capitalId === c.id ? ' <small class="muted">capital</small>' : ''}</td>${cols.map(([k]) => `<td class="${k === focus ? 'hl' : ''}">${y[k]}</td>`).join('')}</tr>`; }).join('');
    const tot = cols.map(([k]) => `<td class="${k === focus ? 'hl' : ''}"><b>${sum(cities, k)}</b></td>`).join('');
    const what = { g: 'El <b>oro</b> compra producción, paga grandes proyectos y la diplomacia.', c: 'La <b>cultura</b> da influencia y cuenta para la victoria cultural.' }[focus] || '';
    UI.openModal(`<h2>Economía de tus ciudades</h2><p class="lead">Lo que rinde cada ciudad por turno. ${what} Para mejorarlo: construye edificios, trabaja la tierra con ayllus de mit'a y conquista o funda más ciudades.</p>
      <table class="econ"><thead><tr><th>Ciudad</th>${cols.map(([k, n]) => `<th class="${k === focus ? 'hl' : ''}">${n}</th>`).join('')}</tr></thead><tbody>${rows}</tbody><tfoot><tr><td>Total</td>${tot}</tr></tfoot></table>
      <p class="small muted">Alimento: hace crecer la población. Producción: lo que se gasta en construir. Pulsa una ciudad en el mapa para cambiar lo que produce.</p>`, 'econ');
  }
  function openCohesion() {
    const p = PC.player(), st = PC.stabilityTarget(p);
    UI.openModal(`<h2>Cohesión: ${Math.round(p.stability)}</h2><p class="lead">Qué tan unido está tu pueblo. Tiende poco a poco hacia <b>${st.value}</b>. Con 70 o más tus ciudades rinden un 10% más; por debajo de 35, un 15% menos; por debajo de 28 pueden estallar revueltas.</p>
      <ul class="parts">${st.parts.map(([n, v]) => `<li><span>${esc(n)}</span><b class="${v < 0 ? 'bad' : 'good'}">${sign(v)}</b></li>`).join('')}</ul>
      <p class="small muted">Para subirla: templos y edificios con cohesión, maravillas, eventos culturales (como el Inti Raymi) y no sobrepasar tu capacidad de ciudades.</p>`, 'info');
  }
  function showCiv() {
    const p = PC.player(), cap = PC.cityById(p.capitalId) || PC.civCities(p)[0];
    UI.select(null);
    if (cap) R.centerOn(PC.tile(cap.t));
    UI.refresh();
  }
  const CLICK = {
    'tb-civ': showCiv, 'tb-year': () => UI.openChronicle(), 'tb-gold': () => openEconomy('g'),
    'tb-sci': () => UI.openTechs(), 'tb-cult': () => openEconomy('c'), 'tb-inf': () => UI.openDiplo(),
    'tb-stab': openCohesion, 'tb-reg': () => UI.openRegions()
  };

  // ------------------------------------------------------------------ Globo de ayuda
  let tip = null, showT = 0, current = null;
  function mountTip() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.id = 'hdr-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
    document.body.appendChild(tip);
    return tip;
  }
  function content(el) {
    if (el.id && TIPS[el.id]) return TIPS[el.id]();
    const m = el.dataset.modal, n = NAV[m];
    if (n) return { t: n[0], body: `<p>${esc(n[1])}</p>`, click: `Abrir${n[2] ? ` (atajo: ${n[2]})` : ''}` };
    return null;
  }
  function show(el) {
    if (!PC.G || PC.G.preview) return;
    let c; try { c = content(el); } catch (err) { c = null; }
    if (!c) return;
    const t = mountTip();
    t.innerHTML = `<b>${esc(c.t)}</b>${c.body}<em>Clic: ${esc(c.click)}</em>`;
    t.hidden = false; current = el;
    const r = el.getBoundingClientRect(), w = t.offsetWidth;
    t.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    t.style.top = (r.bottom + 10) + 'px';
    el.setAttribute('aria-describedby', 'hdr-tip');
  }
  function hide() { clearTimeout(showT); if (tip) tip.hidden = true; if (current) current.removeAttribute('aria-describedby'); current = null; }

  function bind() {
    const bar = document.querySelector('#topbar'); if (!bar) return;
    const targets = () => bar.querySelectorAll('.civbadge, .stat, .navbtn');
    targets().forEach((el) => {
      if (el.id && TIPS[el.id]) { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.classList.add('hdr-act'); }
    });
    bar.addEventListener('pointerover', (e) => {
      const el = e.target.closest('.civbadge, .stat, .navbtn'); if (!el || el === current) return;
      clearTimeout(showT); showT = setTimeout(() => show(el), 150);
    });
    bar.addEventListener('pointerout', (e) => { const el = e.target.closest('.civbadge, .stat, .navbtn'); if (el && !el.contains(e.relatedTarget)) hide(); });
    bar.addEventListener('focusin', (e) => { const el = e.target.closest('.civbadge, .stat, .navbtn'); if (el) show(el); });
    bar.addEventListener('focusout', hide);
    bar.addEventListener('click', (e) => {
      const el = e.target.closest('.civbadge, .stat'); if (!el || !CLICK[el.id]) return;
      if (!PC.G || PC.G.preview || UI.modal === 'event') return;
      hide(); CLICK[el.id]();
    });
    bar.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest('.civbadge, .stat'); if (!el || !CLICK[el.id] || e.target.tagName === 'BUTTON') return;
      e.preventDefault(); e.stopPropagation(); hide(); CLICK[el.id]();
    });
    window.addEventListener('blur', hide);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); }, true);
    UI.on('turn', hide);
  }
  window.addEventListener('DOMContentLoaded', bind);
})(window.PC);

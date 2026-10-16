// Registro de avisos con filtros (crónica consultable): filtros por tipo, búsqueda sin acentos
// y salto al mapa de la ciudad mencionada. Lee la crónica del motor (PC.G.log) y las divergencias
// de la historia real (PC.G.divergences); NO escribe en el motor ni cambia el formato del guardado.
//
// ENGANCHE SIN TOCAR ui.js (deuda técnica anotada en docs/PLAN_IMPLEMENTACION.md, etapa 4):
// ahora mismo otra sesión está editando js/ui/ui.js, js/ui/render3d.js, css/style.css e index.html.
// Para no chocar con ese archivo, este módulo se engancha desde fuera:
//   1. En DOMContentLoaded reasigna el onclick del botón de la barra superior
//      ([data-modal="chronicle"]) que bindModal() ya había enlazado a su propia openChronicle().
//   2. Añade un keydown en fase de captura sobre window que intercepta la tecla C antes de que
//      llegue al onKey() de ui.js, solo con el HUD visible, sin diálogo abierto, sin escribir en un
//      campo y sin vista previa del menú. La captura y el stopPropagation son imprescindibles:
//      ui.js también abre su Crónica con la tecla C.
// Cuando la otra sesión termine, ambas cosas deben moverse dentro de ui.js (bindModal y onKey) y
// dejar este enganche como respaldo inofensivo.
(function (PC) {
  'use strict';
  const UI = PC.UI, R = PC.R;
  const MAX_ROWS = 300;      // nunca se pintan más entradas que esto
  const RECENT_TURNS = 20;   // "Solo los últimos 20 turnos"
  const MAX_DIV = 30;        // divergencias de la historia real que se listan
  const TYPES = [
    { id: 'all', label: 'Todos' },
    { id: 'war', label: 'Guerra' },
    { id: 'city', label: 'Ciudad' },
    { id: 'tech', label: 'Tecnología' },
    { id: 'history', label: 'Historia' },
    { id: 'event', label: 'Acontecimiento' },
    { id: 'info', label: 'Avisos' } // los avisos sueltos: fuera del filtro "Todos", pero a un clic
  ];
  const KNOWN = TYPES.map((t) => t.id);
  // API pública UI.chronicle: open() es lo único que otros módulos (summary.js) necesitan.
  const CH = UI.chronicle = { open: null, type: 'all', q: '', recent: false, list: null, count: null, stack: null, refs: [] };

  // ------------------------------------------------------------------ Ayudas
  // Búsqueda sin distinguir mayúsculas ni acentos: NFD separa la tilde y se descartan los diacríticos.
  function norm(s) {
    const x = String(s == null ? '' : s);
    return (x.normalize ? x.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : x).toLowerCase();
  }
  // Un tipo desconocido se pinta como aviso suelto para no depender del CSS de estilos nuevos.
  const clsOf = (t) => (KNOWN.indexOf(t) > 0 ? t : 'info');

  // Fila de la lista: año, texto y, si la entrada menciona una ciudad tuya, el botón «Ir».
  // El data-chr-go guarda el índice de la entrada dentro de la crónica completa (CH.refs).
  function row(entry, i) {
    const esc = UI.esc, city = cityIn(entry.text || '');
    return `<li class="${clsOf(entry.type)}"><b>${esc(PC.fmtYear(entry.year == null ? 0 : entry.year))}</b><span>${esc(entry.text == null ? '' : entry.text)}</span>`
      + (city ? `<button type="button" class="chr-go" data-chr-go="${i}">Ir</button>` : '')
      + '</li>';
  }
  // Reutiliza la heurística de summary.js (buscar el nombre de la ciudad dentro del aviso), pero
  // aquí se prueban TODAS las ciudades del jugador y gana el nombre más largo que aparezca.
  function cityIn(text) {
    if (!PC.G || !PC.player || !PC.civCities) return null;
    const t = norm(text);
    let best = null;
    PC.civCities(PC.player()).forEach((c) => {
      const n = c && c.name ? String(c.name) : '';
      if (!n) return;
      if (t.indexOf(norm(n)) === -1) return;
      if (!best || n.length > best.name.length) best = c;
    });
    return best;
  }

  function divergences(esc) {
    const div = (PC.G && PC.G.divergences) || [];
    const rows = div.slice(-MAX_DIV).reverse().map((d) => `<li><b>${esc(PC.fmtYear(d.year == null ? 0 : d.year))}</b><span>${esc(d.text == null ? '' : d.text)}</span></li>`);
    if (div.length > MAX_DIV) rows.push(`<li><b></b><span class="muted">y ${div.length - MAX_DIV} divergencias anteriores que no caben aquí.</span></li>`);
    if (!rows.length) rows.push('<li><b></b><span class="muted">Por ahora tu historia sigue el curso conocido.</span></li>');
    return rows.join('');
  }

  // ------------------------------------------------------------------ Pintado
  // Solo se repinta la lista y el contador, nunca el diálogo: el foco del buscador se mantiene.
  function renderList() {
    if (!CH.stack || !CH.stack.isConnected) return;
    const esc = UI.esc, g = PC.G;
    const log = (g && g.log) || [];
    const entries = []; // de la más reciente a la más antigua
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i];
      if (!e) continue;
      if (CH.type === 'all') { if (e.type === 'info') continue; }
      else if (e.type !== CH.type) continue;
      if (CH.recent && g.turn - (e.turn || 0) > RECENT_TURNS) continue;
      if (CH.q && norm(e.text).indexOf(CH.q) === -1) continue;
      entries.push({ e, i });
      if (entries.length > MAX_ROWS) break; // uno de más: sirve para saber que hay más
    }
    const more = entries.length > MAX_ROWS;
    const shown = entries.slice(0, MAX_ROWS);
    CH.refs = shown;
    CH.count.innerHTML = `Mostrando ${shown.length} ${shown.length === 1 ? 'entrada' : 'entradas'}`
      + (more ? `; hay más de ${MAX_ROWS}. Afina la búsqueda, elige un tipo o marca «Solo los últimos ${RECENT_TURNS} turnos».` : ` de ${log.length} de la crónica.`);
    CH.list.innerHTML = shown.length
      ? shown.map((x, k) => row(x.e, k)).join('') // k = índice dentro de CH.refs: lo usa data-chr-go
      : `<li class="chr-empty">Ninguna entrada coincide con el filtro.</li>`;
    CH.stack.querySelectorAll('[data-chr-type]').forEach((b) => {
      const on = b.dataset.chrType === CH.type;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function body() {
    const esc = UI.esc;
    const chips = TYPES.map((t) => `<button type="button" class="chip" data-chr-type="${t.id}" aria-pressed="${t.id === CH.type ? 'true' : 'false'}">${esc(t.label)}</button>`).join('');
    return `<h2>Crónica</h2>
      <h3>Divergencias de la historia real · ${(PC.G.divergences || []).length}</h3>
      <ul class="div">${divergences(esc)}</ul>
      <h3>Registro</h3>
      <div class="chr-tools">
        <div class="chr-filters" role="group" aria-label="Filtrar la crónica por tipo">${chips}</div>
        <label class="chr-search" for="chr-q"><span class="small muted">Buscar</span>
          <input type="search" id="chr-q" placeholder="Nombre de ciudad, unidad, cultura…" autocomplete="off"></label>
        <label class="check" for="chr-recent"><input id="chr-recent" type="checkbox"> Solo los últimos ${RECENT_TURNS} turnos</label>
      </div>
      <p class="chr-count" role="status" aria-live="polite"></p>
      <ul class="chr-log"></ul>`;
  }

  // ------------------------------------------------------------------ Diálogo
  function open() {
    if (!PC.G || !document.querySelector('#modal')) return;
    CH.type = 'all'; CH.q = ''; CH.recent = false; CH.refs = [];
    UI.openModal(body(), 'chronicle'); // mismo kind que ui.js: Esc y el cierre del diálogo siguen igual
    CH.stack = document.querySelector('#modal-body');
    CH.list = CH.stack.querySelector('.chr-log');
    CH.count = CH.stack.querySelector('.chr-count');
    CH.stack.onclick = onClick; // onclick, no addEventListener: se reasigna al abrir y no se acumula
    const q = CH.stack.querySelector('#chr-q');
    const rec = CH.stack.querySelector('#chr-recent');
    if (q) q.addEventListener('input', () => { CH.q = norm(q.value.trim()); renderList(); });
    if (rec) rec.addEventListener('change', () => { CH.recent = rec.checked; renderList(); });
    renderList();
  }

  function onClick(e) {
    const b = e.target.closest('[data-chr-type], [data-chr-go]');
    if (!b) return;
    if (b.dataset.chrType) { CH.type = b.dataset.chrType; renderList(); return; }
    const entry = CH.refs[+b.dataset.chrGo];
    const city = entry && cityIn(entry.e.text || '');
    if (city) go(city);
  }

  // Cierra el diálogo, centra la cámara en la ciudad y la selecciona. Cada paso va protegido para
  // que un fallo de cámara no impida seleccionar la ciudad (o al revés).
  function go(city) {
    const tile = PC.tile(city.t);
    if (UI.closeModal) UI.closeModal();
    if (tile && R && R.centerOn) { try { R.centerOn(tile, true); } catch (err) { console.error(err); } }
    if (UI.selectCity) { try { UI.selectCity(city.id); } catch (err) { console.error(err); } }
  }

  // ------------------------------------------------------------------ Enganche (ver cabecera)
  function hook() {
    const btn = document.querySelector('[data-modal="chronicle"]');
    if (btn) btn.onclick = () => UI.chronicle.open(); // sustituye el onclick de bindModal()
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'c' && e.key !== 'C') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // no pisar Ctrl+C ni atajos del navegador
      if (!PC.G || PC.G.preview) return;
      if (UI.modal) return;
      const hud = document.querySelector('#hud');
      if (!hud || hud.hidden) return;
      const t = e.target;
      if (t && t.tagName && ['INPUT', 'SELECT', 'TEXTAREA'].indexOf(t.tagName) !== -1) return;
      if (t && t.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();
      UI.chronicle.open();
    }, true); // captura: se adelanta al onKey() de ui.js, que abre su propia ventana con la C
  }

  window.addEventListener('DOMContentLoaded', hook);
  CH.open = open;
})(globalThis.PC = globalThis.PC || {});

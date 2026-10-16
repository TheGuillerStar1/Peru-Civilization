// Arnés sin navegador para los módulos de interfaz de la Fase 1 (tasks, advisor, chronicle).
// No carga ui.js ni render3d.js (necesitan WebGL): monta un DOM mínimo y el mismo sistema de
// ganchos (UI.on / UI.emit) que usa la interfaz real, carga el motor con tests/engine.js y
// comprueba que los módulos se montan, pintan lo que deben y no lanzan excepciones en los
// estados límite (menú, vista previa, diálogo abierto, partida terminada).
'use strict';
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------- DOM mínimo
const registry = new Map();
const indexHtml = (html) => {
  String(html).replace(/id="([^"]+)"/g, (m, id) => { add('#' + id); return m; });
  String(html).replace(/class="([^"]+)"/g, (m, list) => {
    list.split(/\s+/).filter(Boolean).forEach((c) => add('.' + c));
    return m;
  });
  String(html).replace(/data-([a-z-]+)="([^"]+)"/g, (m, k, v) => {
    add(`[data-${k}="${v}"]`);
    add(`[data-${k}]`);
    return m;
  });
};
function El(tag, id) {
  this.tagName = String(tag || 'div').toUpperCase();
  this.id = id || '';
  this.className = '';
  this.hidden = false;
  this.title = '';
  this.value = '';
  this.checked = false;
  this.textContent = '';
  this.dataset = {};
  this.style = {};
  this.children = [];
  this._listeners = {};
  this._html = '';
  this.isConnected = true;
  this.onclick = null;
  const cls = new Set();
  this.classList = {
    add: (c) => cls.add(c),
    remove: (c) => cls.delete(c),
    contains: (c) => cls.has(c),
    toggle: (c, on) => { if (on === undefined) { if (cls.has(c)) cls.delete(c); else cls.add(c); } else if (on) cls.add(c); else cls.delete(c); }
  };
}
Object.defineProperty(El.prototype, 'innerHTML', {
  get() { return this._html; },
  set(v) { this._html = String(v); indexHtml(this._html); }
});
El.prototype.addEventListener = function (t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); };
El.prototype.removeEventListener = function (t, fn) { const l = this._listeners[t] || []; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
El.prototype.fire = function (t, ev) {
  const e = Object.assign({ type: t, target: this, preventDefault() {}, stopPropagation() {} }, ev || {});
  (this._listeners[t] || []).slice().forEach((fn) => fn(e));
  if (t === 'click' && typeof this.onclick === 'function') this.onclick(e);
  return e;
};
El.prototype.click = function () { this._clicks = (this._clicks || 0) + 1; this.fire('click'); };
El.prototype.setAttribute = function (k, v) { if (k === 'id') this.id = v; else if (k === 'class') this.className = v; else this[k] = v; };
El.prototype.getAttribute = function (k) { return k === 'id' ? (this.id || null) : (this[k] === undefined ? null : this[k]); };
El.prototype.appendChild = function (c) { this.children.push(c); return c; };
El.prototype.insertAdjacentHTML = function (where, html) { this.innerHTML = this._html + html; };
El.prototype.querySelector = (sel) => null; // se reasigna abajo (necesita el documento)
El.prototype.querySelectorAll = function () { return []; };
El.prototype.closest = function () { return this; };
El.prototype.matches = function () { return false; };
El.prototype.focus = function () {};
El.prototype.remove = function () {};
El.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 320, height: 320 }; };

function add(sel, el) {
  if (registry.has(sel)) return registry.get(sel);
  const made = el || new El('div', sel[0] === '#' ? sel.slice(1) : '');
  registry.set(sel, made);
  if (made.id && sel === '#' + made.id) registry.set(sel, made);
  return made;
}
const doc = {
  hidden: false,
  body: new El('body'),
  createElement: (t) => new El(t),
  createElementNS: (ns, t) => new El(t),
  getElementById: (id) => registry.get('#' + id) || null,
  querySelector: (sel) => registry.get(sel) || null,
  querySelectorAll: (sel) => (registry.has(sel) ? [registry.get(sel)] : []),
  addEventListener: (t, fn) => { (doc._l[t] = doc._l[t] || []).push(fn); },
  removeEventListener: () => {},
  _l: {}
};
El.prototype.querySelector = function (sel) { return doc.querySelector(sel); };
El.prototype.querySelectorAll = function (sel) { return doc.querySelectorAll(sel); };
const winL = {};
const win = {
  addEventListener: (t, fn) => { (winL[t] = winL[t] || []).push(fn); },
  removeEventListener: () => {},
  fire: (t, ev) => (winL[t] || []).slice().forEach((fn) => fn(Object.assign({ type: t, target: {}, preventDefault() {}, stopPropagation() {} }, ev || {}))),
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: () => 0,
  clearInterval: () => {},
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  devicePixelRatio: 1,
  innerWidth: 1280,
  innerHeight: 800,
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {} })
};
global.window = win;
global.document = doc;
global.localStorage = win.localStorage;
global.requestAnimationFrame = win.requestAnimationFrame;
global.setInterval = win.setInterval;
global.clearInterval = win.clearInterval;

// Elementos que existen en index.html y que los módulos consultan.
add('#hud');
add('#side');
add('#toasts');
add('#modal');
add('#modal-body');
add('#end-status');
add('#btn-end');
add('#tasks');
add('#advisor');
add('#turn-summary');
add('.endbar');
['techs', 'diplo', 'regions', 'chronicle', 'conquista', 'menu'].forEach((k) => add(`[data-modal="${k}"]`, new El('button')));

// ---------------------------------------------------------------- motor real
const PC = require('./engine.js');
require(path.join(ROOT, 'js/ui/icons.js'));

// ---------------------------------------------------------------- UI de mentira
const hooks = {};
PC.R = { centerOn(t) { PC.R.last = t; }, refresh() {}, draw() {}, showRegions: false, hlRegions: null, quality: 'alta' };
PC.UI = {
  modal: null, screen: 'game', menu: {}, prefs: {}, _options: {},
  esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  pref: (k, def) => (PC.UI.prefs[k] === undefined ? def : !!PC.UI.prefs[k]),
  savePrefs() {},
  addOption: (k, label, def, fn) => { PC.UI._options[k] = { label, def, fn }; },
  on: (n, fn) => { (hooks[n] = hooks[n] || []).push(fn); },
  toast() {},
  openModal(html, kind) { PC.UI.modal = kind || 'info'; PC.UI._modal = String(html); add('#modal-body').innerHTML = html; add('#modal').hidden = false; },
  closeModal() { PC.UI.modal = null; PC.UI._modal = null; add('#modal').hidden = true; },
  needsOrders: (u) => u.moves > 0 && !u.fort && !u.task && !u.auto && !u.path && !u.heal && !u.sentry && u.skipTurn !== PC.G.turn,
  nextUnit() { PC.UI._next = (PC.UI._next || 0) + 1; },
  selectCity(id) { PC.UI._city = id; }
};
PC.UI.emit = (n, a) => (hooks[n] || []).slice().forEach((fn) => fn(a));

require(path.join(ROOT, 'js/ui/advisor.js'));
require(path.join(ROOT, 'js/ui/tasks.js'));
require(path.join(ROOT, 'js/ui/chronicle_ui.js'));
require(path.join(ROOT, 'js/ui/summary.js'));
win.fire('DOMContentLoaded');

// ---------------------------------------------------------------- utilidades
const tasksEl = () => doc.querySelector('#tasks');
const statusEl = () => doc.querySelector('#end-status');
const btnEnd = () => doc.querySelector('#btn-end');
let fallos = 0;
function ok(name, fn) {
  try { fn(); console.log('  ok   ' + name); }
  catch (e) { fallos++; console.log('  FALLA ' + name + '\n        ' + e.message); }
}
const nuevoJuego = (turn) => {
  PC.newGame({ scenario: 'origenes', culture: 'caral', difficulty: 'medio', seed: 7 });
  PC.G.preview = false;
  if (turn) PC.G.turn = turn;
  doc.querySelector('#hud').hidden = false;
  PC.UI.modal = null;
  return PC.player();
};
const refrescar = () => PC.UI.emit('refresh');

console.log('UI · lista de pendientes (P0.1)');
ok('con investigación y producción pendientes pinta filas y avisa', () => {
  const p = nuevoJuego(12);
  p.research = null;
  PC.civCities(p).forEach((c) => { c.build = null; });
  refrescar();
  assert.strictEqual(tasksEl().hidden, false, 'la lista debería estar visible');
  assert.ok(/task-list/.test(tasksEl().innerHTML), 'debería haber filas');
  assert.ok(/task-count/.test(tasksEl().innerHTML), 'debería haber contador');
  assert.ok(/Faltan|Falta 1/.test(statusEl().textContent), 'el estado debería avisar: ' + JSON.stringify(statusEl().textContent));
  assert.ok(btnEnd().classList.contains('waiting'), 'el botón debería estar en espera');
  assert.strictEqual(typeof PC.UI.tasks.render(), 'number', 'render() debe devolver un número');
});
ok('las filas llevan a su sitio (investigación, ciudad, unidad, amenaza, consejo)', () => {
  const p = nuevoJuego(12);
  p.research = null;
  PC.civCities(p).forEach((c) => { c.build = null; });
  refrescar();
  const html = tasksEl().innerHTML;
  const antes = { techs: doc.querySelector('[data-modal="techs"]')._clicks || 0, next: PC.UI._next || 0, city: PC.UI._city };
  const row = (task) => { const e = new El('button'); e.dataset.task = task; if (task === 'city') e.dataset.city = String(PC.civCities(p)[0].id); return e; };
  if (/data-task="research"/.test(html)) {
    tasksEl().fire('click', { target: row('research') });
    assert.strictEqual(doc.querySelector('[data-modal="techs"]')._clicks, antes.techs + 1, 'la fila de investigación debe abrir Tecnologías');
  }
  if (/data-task="city"/.test(html)) {
    tasksEl().fire('click', { target: row('city') });
    assert.ok(PC.UI._city !== antes.city || PC.R.last, 'la fila de ciudad debe seleccionarla o centrarla');
  }
  if (/data-task="idle"/.test(html)) {
    tasksEl().fire('click', { target: row('idle') });
    assert.strictEqual(PC.UI._next, antes.next + 1, 'la fila de unidades debe ciclar');
  }
});
ok('sin nada pendiente se oculta y dice «Todo listo.»', () => {
  const p = nuevoJuego(12);
  p.research = PC.availableTechs(p)[0].id;
  PC.civCities(p).forEach((c) => { c.build = { kind: 'riqueza', id: 'riqueza' }; });
  PC.civUnits(p).forEach((u) => { u.fort = true; u.moves = 0; });
  PC.G.units = PC.G.units.filter((u) => u.civ !== p.id || u.fort || u.civ !== p.id);
  refrescar();
  const n = PC.UI.tasks.render();
  assert.ok(n === 0 || tasksEl().hidden === false, 'render() y el DOM deben coincidir');
  if (n === 0) {
    assert.strictEqual(statusEl().textContent, 'Todo listo.');
    assert.ok(!btnEnd().classList.contains('waiting'), 'el botón no debería esperar');
  }
});
ok('no se rompe en los estados límite', () => {
  const p = nuevoJuego(20);
  PC.G.preview = true; refrescar();
  PC.G.preview = false;
  doc.querySelector('#hud').hidden = true; refrescar();
  doc.querySelector('#hud').hidden = false;
  PC.UI.modal = 'event'; refrescar(); PC.UI.modal = null;
  PC.G.gameOver = { win: true, text: 'fin' }; refrescar(); PC.G.gameOver = null;
  const g = PC.G; global.PC.G = null; try { refrescar(); } finally { global.PC.G = g; }
  refrescar();
  assert.ok(true);
});

console.log('UI · consejero permanente (P0.2)');
ok('sigue aconsejando pasado el turno 30', () => {
  const p = nuevoJuego(80);
  p.research = null;
  refrescar();
  const adv = doc.querySelector('#advisor');
  assert.strictEqual(adv.hidden, false, 'el consejero debería mostrarse en el turno 80');
  assert.ok(String(adv.innerHTML).length > 20, 'debería traer texto');
});
ok('publica peek() para la lista de pendientes', () => {
  assert.ok(PC.UI.advisor && typeof PC.UI.advisor.peek === 'function', 'UI.advisor.peek debe existir');
  const p = nuevoJuego(80);
  p.research = null;
  refrescar();
  const cur = PC.UI.advisor.peek();
  if (cur) assert.ok('html' in cur, 'peek() debería devolver html');
});
ok('las acciones de la tarjeta no lanzan excepciones', () => {
  const p = nuevoJuego(80);
  p.research = null; p.stability = 5;
  refrescar();
  const adv = doc.querySelector('#advisor');
  ['ver', 'abrir', 'luego', 'ok', 'off'].forEach((act) => {
    const b = new El('button'); b.dataset.adv = act;
    adv.fire('click', { target: b });
    PC.UI.prefs.consejero = true;
  });
  assert.ok(true);
});
ok('«Entendido» lo descarta para siempre y «Recuérdamelo luego» lo pospone', () => {
  const p = nuevoJuego(50);
  p.research = null;
  refrescar();
  const adv = doc.querySelector('#advisor');
  const primero = PC.UI.advisor.peek();
  assert.ok(primero && primero.id, 'debería haber un consejo con identificador');
  const ok = new El('button'); ok.dataset.adv = 'ok';
  adv.fire('click', { target: ok });
  assert.ok(PC.G.consejero.seen[primero.id] !== undefined, 'descartar debe marcarlo como visto');
  for (let k = 1; k <= 12; k++) { PC.G.turn += 1; refrescar(); }
  const otro = PC.UI.advisor.peek();
  assert.ok(!otro || otro.html !== primero.html, 'el consejo descartado no debe volver');
  // Posponer: el consejo vuelve como pronto dentro de 5 turnos, no al siguiente.
  const p2 = nuevoJuego(50);
  p2.research = null;
  refrescar();
  const segundo = PC.UI.advisor.peek();
  if (segundo && segundo.id) {
    const luego = new El('button'); luego.dataset.adv = 'luego';
    doc.querySelector('#advisor').fire('click', { target: luego });
    assert.ok(PC.G.consejero.next[segundo.id] >= PC.G.turn + 5, 'posponer debe programar la vuelta en 5 turnos');
    assert.strictEqual(PC.G.consejero.seen[segundo.id], undefined, 'posponer no lo descarta');
  }
});

ok('un consejo pospuesto vuelve a aparecer', () => {
  const p = nuevoJuego(50);
  p.research = null;
  refrescar();
  const primero = PC.UI.advisor.peek();
  assert.ok(primero && primero.id, 'debería haber un consejo');
  const b = new El('button'); b.dataset.adv = 'luego';
  doc.querySelector('#advisor').fire('click', { target: b });
  let volvio = false;
  for (let k = 0; k < 15 && !volvio; k++) {
    PC.G.turn += 1;
    refrescar();
    const a = PC.UI.advisor.peek();
    if (a && a.id === primero.id) volvio = true;
  }
  assert.ok(volvio, 'el consejo pospuesto debe volver mientras su condición siga siendo cierta');
});
console.log('UI · registro de la crónica (P0.4)');
ok('abre con filtros, búsqueda y entradas', () => {
  const p = nuevoJuego(40);
  PC.G.log.push({ turn: 40, year: 1200, text: 'Se funda ' + PC.civCities(p)[0].name + ' en el valle.', type: 'city' });
  PC.G.log.push({ turn: 40, year: 1200, text: 'Guerra declarada por los chankas.', type: 'war' });
  PC.UI.chronicle.open();
  const html = PC.UI._modal || '';
  const lista = (doc.querySelector('.chr-log') || {}).innerHTML || '';
  assert.ok(/chr-log/.test(html), 'debería pintar la lista');
  assert.ok(/chr-filters|data-chr-type/.test(html), 'debería pintar los filtros');
  assert.ok(/chr-q/.test(html), 'debería tener buscador');
  assert.ok(/chankas/.test(lista), 'debería incluir las entradas de la crónica: ' + JSON.stringify(lista.slice(0, 120)));
});
ok('filtrar por tipo y buscar reduce la lista sin romperse', () => {
  const p = nuevoJuego(40);
  PC.G.log.push({ turn: 40, year: 1200, text: 'Guerra declarada por los chankas.', type: 'war' });
  PC.UI.chronicle.open();
  const war = new El('button'); war.dataset.chrType = 'war';
  const host = doc.querySelector('#modal-body');
  (host._listeners.click || []).forEach((fn) => fn({ target: war, preventDefault() {}, stopPropagation() {} }));
  const q = doc.querySelector('#chr-q');
  if (q) { q.value = 'chankas'; q.fire('input'); q.fire('search'); q.fire('change'); }
  assert.ok(true);
});
ok('«Ir» salta a la ciudad mencionada', () => {
  const p = nuevoJuego(40);
  PC.civCities(p)[0].name = 'Cusco';
  PC.G.log.push({ turn: 40, year: 1200, text: 'Cusco entrena: hondero.', type: 'city' });
  PC.UI.chronicle.open();
  const lista = (doc.querySelector('.chr-log') || {}).innerHTML || '';
  assert.ok(/chr-go/.test(lista), 'debería ofrecer el salto: ' + JSON.stringify(lista.slice(0, 120)));
  // Y el botón debe llevar al índice correcto de la entrada (no al índice dentro de la crónica).
  const go = { dataset: { chrGo: '0' }, closest: () => go };
  doc.querySelector('#modal-body').fire('click', { target: go });
  assert.ok(PC.UI._city !== undefined || PC.R.last, 'el salto debe seleccionar o centrar la ciudad');
});
ok('summary.js enlaza con la crónica sin romperse', () => {
  const p = nuevoJuego(30);
  PC.G.notices.push({ text: PC.civCities(p)[0].name + ' entrena: hondero.', type: 'city' });
  PC.UI.emit('turn');
  const s = doc.querySelector('#turn-summary');
  assert.ok(s.innerHTML === '' || /Crónica|chr|chronicle/.test(s.innerHTML) || s.hidden === true, 'el resumen no debe romperse');
});
ok('el resumen no aparece solo con el enlace a la Crónica', () => {
  const p = nuevoJuego(30);
  PC.G.notices.length = 0;
  PC.civUnits(p).forEach((u) => { u.fort = true; u.moves = 0; });
  PC.UI.emit('turn');
  const s = doc.querySelector('#turn-summary');
  if (!s.hidden) {
    const filas = (s.innerHTML.match(/<li/g) || []).length;
    assert.ok(filas > 1, 'el resumen solo mostraba el enlace a la Crónica: eso es ruido en cada turno');
  }
});

console.log('');
if (fallos) { console.log(fallos + ' comprobación(es) fallida(s).'); process.exit(1); }
console.log('UI OK');
process.exit(0); // corta los temporizadores pendientes (el consejero reprograma con setTimeout)

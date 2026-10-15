// Prueba de guardado y carga: en cada fase (Perú, Sudamérica, América) guarda, carga y juega 10 turnos más.
// También carga un guardado "v1" simulado (formato antiguo sin congreso ni macrorregiones) y mide el tamaño del guardado.
// Uso: node tests/save.js [semilla]
'use strict';
const PC = require('./engine');

const LIMIT_KB = 400;
let errors = 0;
const fail = (msg) => { errors++; console.error('   ERROR:', msg); };

function playTurns(n, label) {
  const g = PC.G;
  for (let i = 0; i < n && !g.gameOver; i++) {
    try { PC.endTurn(); } catch (e) { fail(`${label}, turno ${g.turn}: ${e.stack}`); return; }
  }
}

// Guarda, carga, comprueba que el estado se conserva y sigue jugando.
function roundTrip(label) {
  const s1 = PC.serialize();
  const before = { turn: PC.G.turn, phase: PC.G.phase, civs: PC.G.civs.length, cities: PC.G.cities.length, units: PC.G.units.length };
  try { PC.load(s1); } catch (e) { fail(`${label}: no carga (${e.message})`); return; }
  const s2 = PC.serialize();
  if (s1 !== s2) fail(`${label}: guardar → cargar → guardar no da el mismo texto`);
  const after = { turn: PC.G.turn, phase: PC.G.phase, civs: PC.G.civs.length, cities: PC.G.cities.length, units: PC.G.units.length };
  if (JSON.stringify(before) !== JSON.stringify(after)) fail(`${label}: el estado cambió al cargar ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  const bad = PC.G.map.tiles.find((t, i) => t && (t.i !== i || t.terrain === undefined || t.road === undefined));
  if (bad) fail(`${label}: casilla mal restaurada ${JSON.stringify(bad)}`);
  playTurns(10, `${label} (tras cargar)`);
  console.log(`[${label}] ${PC.fmtYear(PC.G.year)} turno ${PC.G.turn} · guardado ${(s1.length / 1024).toFixed(0)} KB · ${PC.G.cities.length} ciudades`);
  return s1.length;
}

// Convierte un guardado actual al formato v1 (casillas completas, sin congreso ni zonas de provincia ni banderas).
function toV1(json) {
  PC.load(json);
  const g = JSON.parse(JSON.stringify(PC.G, (k, v) => (k === 'visible' ? undefined : v)));
  g.v = 1;
  delete g.congress; delete g.migratedFrom;
  g.flags = {};
  g.map.regions.forEach((rg) => { delete rg.zone; });
  g.civs.forEach((c) => { delete c.stabMods; delete c.rel; });
  g.notices = [{ text: 'aviso antiguo', type: 'info' }];
  return JSON.stringify(g);
}

function loadV1(json, label) {
  const old = toV1(json);
  try { PC.load(old); } catch (e) { fail(`${label}: el guardado v1 no carga (${e.stack})`); return; }
  const g = PC.G;
  if (g.v !== PC.SAVE_VERSION) fail(`${label}: la versión no se actualizó (${g.v})`);
  if (!g.congress || !Array.isArray(g.congress.active)) fail(`${label}: falta el congreso tras migrar`);
  const noZone = g.map.regions.filter((r) => !r.zone || r.zone === 'mixta');
  if (noZone.length) fail(`${label}: provincias sin macrorregión: ${noZone.map((r) => r.id).join(', ')}`);
  playTurns(10, `${label} (v1)`);
  console.log(`[${label} · v1] migrado y jugado hasta el turno ${g.turn}`);
}

const seed = +process.argv[2] || 31;
PC.newGame({ scenario: 'tahuantinsuyo', culture: 'inca', seed, autoplay: true });
playTurns(15, 'Perú');
roundTrip('Fase 1 · Perú');
loadV1(PC.serialize(), 'Fase 1 · Perú');
PC.startPhase2();
playTurns(10, 'Sudamérica');
roundTrip('Fase 2 · Sudamérica');
loadV1(PC.serialize(), 'Fase 2 · Sudamérica');
PC.startPhase3();
playTurns(10, 'América');
roundTrip('Fase 3 · América');
loadV1(PC.serialize(), 'Fase 3 · América');

// Escenario de la Conquista: guarda a mitad de campaña y carga un guardado anterior a la campaña (sin g.conquista).
PC.newGame({ scenario: 'conquista1492', culture: 'inca', seed: seed + 2, autoplay: true });
playTurns(8, 'La Conquista');
if (!PC.G.conquista || !PC.G.conquista.intro) fail('La Conquista: la campaña no se abrió en 8 turnos');
roundTrip('La Conquista (1492)');
{
  const old = JSON.parse(PC.serialize());
  delete old.conquista;
  try { PC.load(JSON.stringify(old)); PC.conquistaView(); playTurns(5, 'sin campaña'); } catch (e) { fail(`guardado sin g.conquista: ${e.stack}`); }
  if (!PC.G.conquista) fail('g.conquista no se creó sola al cargar un guardado antiguo');
  else console.log('[sin campaña] guardado antiguo cargado y g.conquista creada sola');
}

// Un guardado sin sentido debe dar error, no un estado roto.
try { PC.load('{"v":1}'); fail('un guardado vacío se cargó sin error'); } catch (e) { /* esperado */ }

// Tamaño del guardado en América tras una partida larga.
PC.newGame({ scenario: 'tahuantinsuyo', culture: 'inca', seed: seed + 1, autoplay: true, difficulty: 'realista' });
for (let i = 0; i < 150 && !PC.G.gameOver; i++) {
  if (i === 30) PC.startPhase2();
  if (i === 60) PC.startPhase3();
  try { PC.endTurn(); } catch (e) { fail(`partida larga, turno ${PC.G.turn}: ${e.stack}`); break; }
}
const size = PC.serialize().length / 1024;
const full = JSON.stringify(PC.G, (k, v) => (k === 'visible' ? undefined : v)).length / 1024;
console.log(`[tamaño] ${PC.G.phase}, turno ${PC.G.turn}: ${size.toFixed(0)} KB (sin compactar ${full.toFixed(0)} KB, límite ${LIMIT_KB} KB)`);
if (size > LIMIT_KB) fail(`el guardado ocupa ${size.toFixed(0)} KB (> ${LIMIT_KB} KB)`);
roundTrip('Partida larga');

console.log(errors ? `FALLÓ (${errors} errores)` : 'OK');
process.exit(errors ? 1 : 0);

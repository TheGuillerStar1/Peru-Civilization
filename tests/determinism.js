// Prueba de determinismo: la misma semilla y escenario deben producir exactamente la misma partida.
// Juega dos veces cada caso (~80 turnos, piloto automático) y compara PC.serialize() turno a turno.
// Una tercera partida se guarda y se carga cada pocos turnos: tampoco debe desviarse.
// Uso: node tests/determinism.js [semilla]
'use strict';
const crypto = require('crypto');
const PC = require('./engine');

const digest = (s) => crypto.createHash('sha1').update(s).digest('hex');

// Primera ruta en la que difieren dos estados (para diagnosticar).
function firstDiff(a, b, p) {
  if (a === b) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return `${p}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`.slice(0, 300);
  const keys = [...new Set(Object.keys(a).concat(Object.keys(b)))];
  for (const k of keys) { const d = firstDiff(a[k], b[k], `${p}.${k}`); if (d) return d; }
  return null;
}

function play(o, turns, reloadEvery) {
  PC.newGame({ scenario: o.scenario, culture: o.culture, seed: o.seed, autoplay: true, difficulty: o.difficulty });
  const out = [];
  for (let i = 0; i < turns && !PC.G.gameOver; i++) {
    if (o.phase2At && i === o.phase2At) PC.startPhase2();
    if (o.phase3At && i === o.phase3At) PC.startPhase3();
    PC.endTurn();
    let s = PC.serialize();
    if (reloadEvery && i % reloadEvery === reloadEvery - 1) { PC.load(s); s = PC.serialize(); }
    out.push(s);
  }
  return out;
}

function compare(name, a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] === undefined || b[i] === undefined) return `${name}: una partida terminó antes (turno ${i + 1})`;
    if (digest(a[i]) !== digest(b[i])) return `${name}: diverge en el turno ${i + 1} → ${firstDiff(JSON.parse(a[i]), JSON.parse(b[i]), 'G') || 'mismo contenido con distinto orden de claves'}`;
  }
  return null;
}

const seed = +process.argv[2] || 21;
const CASES = [
  { scenario: 'origenes', culture: 'caral', seed, turns: 80 },
  { scenario: 'tahuantinsuyo', culture: 'inca', seed: seed + 1, turns: 80, difficulty: 'realista', phase2At: 25, phase3At: 50 }
];
let fails = 0;
CASES.forEach((c) => {
  const t0 = Date.now();
  const a = play(c, c.turns), b = play(c, c.turns), r = play(c, c.turns, 7);
  const errs = [compare('dos partidas', a, b), compare('guardar y cargar', a, r)].filter(Boolean);
  const label = `[${c.scenario}/${c.culture} seed=${c.seed}] ${a.length} turnos, fase final ${JSON.parse(a[a.length - 1]).phase}`;
  if (errs.length) { fails++; console.error(`${label}\n   ` + errs.join('\n   ')); }
  else console.log(`${label}: idénticas (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
});
console.log(fails ? `FALLÓ (${fails} casos no deterministas)` : 'OK');
process.exit(fails ? 1 : 0);

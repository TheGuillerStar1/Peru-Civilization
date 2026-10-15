// Prueba de la Conquista: invariantes de la campaña, liga, pacto, y cada decisión de cada evento (sin errores y con efecto).
// Uso: node tests/conquista.js
'use strict';
const PC = require('./engine');
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.error('FALLO:', msg); } };

function boot(seed, mode) {
  PC.newGame({ scenario: 'tahuantinsuyo', culture: 'inca', seed, autoplay: false });
  const g = PC.G;
  g.year = mode === 'peru' ? 1520 : 1490; g.fired.mesoamerica = g.fired.tupac_viaje = true;
  if (mode !== 'peru') PC.startPhase2();
  if (mode === 'america') PC.startPhase3();
  g.phaseChanged = false;
  return g;
}
// Resuelve por la vía rápida los eventos pendientes eligiendo siempre la primera opción posible.
function drain(g, pick) {
  let n = 0;
  while (g.eventQueue.length && n++ < 30) { const ev = PC.currentEvent(); const i = (pick ? pick(ev) : ev.choices.findIndex((c) => c.cond !== false)); PC.resolveEvent(i < 0 ? 0 : i); }
}
function play(g, turns, pick) { for (let i = 0; i < turns && !g.gameOver; i++) { PC.endTurn(); drain(g, pick); } }

// 1) Campaña completa: estados válidos, comandantes con nombre histórico, todos los frentes se deciden.
for (const mode of ['america', 'sa', 'peru']) {
  const g = boot(31, mode);
  play(g, 70);
  const v = PC.conquistaView();
  ok(v.fronts.length > 0, `${mode}: hay frentes`);
  v.fronts.forEach((f) => ok(['pendiente', 'activo', 'resistida', 'conquistada'].includes(f.state), `${mode}: estado válido ${f.id}=${f.state}`));
  ok(v.fronts.some((f) => f.state === 'resistida' || f.state === 'conquistada'), `${mode}: algún frente se decide`);
  const names = v.fronts.map((f) => f.commander).filter(Boolean);
  ok(names.length === 0 || names.every((n) => PC.CONQUISTA_FRONTS.some((F) => F.commanders.includes(n))), `${mode}: los comandantes son los históricos`);
  console.log(`[${mode}] ${v.fronts.map((f) => `${f.id}:${f.state}`).join(' ')}`);
}

// 2) Liga de resistencia: se forma, da bonos, se puede abandonar; el pacto la rompe.
{
  let formed = null;
  for (let seed = 40; seed < 52 && !formed; seed++) {
    const g = boot(seed, 'america');
    play(g, 14);
    PC.civ(g.playerId).influence = 200;
    PC.civ(g.playerId).gold = 500;
    PC.civs && 0;
    g.civs.forEach((c) => { if (!c.isPlayer) c.metPlayer = true; });
    const r = PC.conquistaFormLeague();
    if (r.ok) formed = { g, r };
  }
  ok(!!formed, 'se forma la liga en alguna semilla');
  if (formed) {
    const { g, r } = formed, L = PC.conquistaLeague();
    ok(L && L.members.length === r.members.length && r.members.length > 0, 'la liga tiene miembros');
    const m = PC.civ(L.members[0]);
    ok(m.ligaBonus && m.bonus.atk >= 10, 'los miembros reciben el bono de la liga');
    ok(PC.rel(PC.player(), m).ally, 'los miembros son aliados del jugador');
    const before = m.bonus.atk;
    ok(!PC.conquistaFormLeague().ok, 'no se forma una segunda liga');
    const out = PC.conquistaLeaveLeague();
    ok(out.ok && !PC.conquistaLeague() && m.bonus.atk === before - 10, 'abandonar la liga quita el bono');
    play(g, 10);
    // pacto
    const p = PC.player(), gold = p.gold;
    const pr = PC.conquistaPact();
    ok(pr.ok && p.gold >= gold + 100 && g.conquista.pact, 'el pacto da oro y queda registrado');
    ok(!PC.conquistaPact().ok, 'no se pacta dos veces');
    play(g, 10);
    const crowns = g.civs.filter((c) => c.alive && c.key !== p.key && PC.rel(p, c).ally && PC.CONQUISTA_FRONTS.some((F) => F.crown === c.key));
    ok(crowns.every((c) => !PC.atWar(p.id, c.id)), 'con el pacto no hay guerra con la Corona aliada');
    ok(PC.conquistaBreakPact().ok && !g.conquista.pact, 'se puede romper el pacto');
    play(g, 6);
  }
}

// 3) Cada decisión de cada evento de la Conquista (se parte de una partida guardada para repetirla).
{
  const g0 = boot(61, 'america');
  play(g0, 16);
  const json = PC.serialize();
  const crown = g0.civs.find((c) => c.alive && PC.CONQUISTA_FRONTS.some((F) => F.crown === c.key));
  const native = g0.civs.find((c) => c.alive && !c.isPlayer && c !== crown && PC.civCities(c).length);
  const F = crown ? PC.CONQUISTA_FRONTS.find((f) => f.crown === crown.key) : PC.CONQUISTA_FRONTS[0];
  const cases = [
    ['conquista_inicio', { from: crown.id, front: F.id }], ['frente_resuelto', { front: F.id, outcome: 'resistida', from: crown.id }], ['frente_resuelto', { front: F.id, outcome: 'conquistada', from: crown.id }],
    ['traicion_aliado', { from: native.id, front: F.id }], ['requerimiento', { from: crown.id, front: F.id }], ['corona_traiciona', { from: crown.id }],
    ['caida_capital_conquista', { from: crown.id, front: F.id }], ['conquista_fin', {}]
  ];
  let runs = 0;
  cases.forEach(([id, data]) => {
    PC.load(json);
    PC.civ(PC.G.playerId).influence = 120; PC.civ(PC.G.playerId).gold = 600;
    PC.G.civs.forEach((c) => { if (!c.isPlayer) c.metPlayer = true; });
    PC.G.eventQueue = []; PC.queueEvent(id, data);
    const n = PC.currentEvent().choices.length;
    ok(n >= 1, `${id}: tiene opciones`);
    for (let i = 0; i < n; i++) {
      PC.load(json);
      const pl = PC.civ(PC.G.playerId); pl.influence = 120; pl.gold = 600;
      PC.G.civs.forEach((c) => { if (!c.isPlayer) c.metPlayer = true; });
      PC.G.eventQueue = []; PC.queueEvent(id, data);
      const ev = PC.currentEvent();
      if (ev.choices[i].cond === false) continue;
      try { const res = PC.resolveEvent(i); ok(typeof res === 'string' || res === undefined, `${id}[${i}] devuelve texto`); play(PC.G, 4); runs++; }
      catch (e) { ok(false, `${id}[${i}] lanzó ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
    }
  });
  console.log(`[eventos] ${runs} decisiones jugadas`);
}

// 4) La campaña se guarda y se carga sin perder el estado.
{
  const g = boot(71, 'america'); play(g, 30);
  const a = JSON.stringify(g.conquista);
  PC.load(PC.serialize());
  ok(JSON.stringify(PC.G.conquista) === a, 'g.conquista sobrevive al guardado y la carga');
  play(PC.G, 6);
}

// 5) Equilibrio: desenlaces razonables, ningún frente activo más de ~35 turnos, y hitos (liga espontánea, traiciones) presentes.
{
  // Partida sin interrupciones: resuelve los eventos y sigue aunque el jugador (piloto automático) caiga.
  const run = (mode, diff, seeds, turns) => {
    const r = { con: 0, res: 0, act: 0, maxAct: 0, hitos: { liga: 0, traicion: 0 } };
    const baseLog = PC.log;
    PC.log = function (t) { if (typeof t === 'string') { if (/sellan una liga/.test(t)) r.hitos.liga++; if (/se alía con Corona/.test(t)) r.hitos.traicion++; } return baseLog.apply(this, arguments); };
    try {
      for (const seed of seeds) {
        PC.newGame({ scenario: 'tahuantinsuyo', culture: 'inca', seed, autoplay: true, difficulty: diff });
        const g = PC.G; g.year = 1490; g.fired.mesoamerica = g.fired.tupac_viaje = true;
        PC.startPhase2(); if (mode === 'america') PC.startPhase3();
        const act = {};
        for (let i = 0; i < turns; i++) {
          while (g.eventQueue.length) PC.resolveEvent(PC.autoChoice());
          g.gameOver = null; PC.endTurn();
          PC.conquistaView().fronts.forEach((f) => { if (f.state === 'activo') act[f.id] = (act[f.id] || 0) + 1; });
        }
        PC.conquistaView().fronts.forEach((f) => {
          if (f.silent) return;
          if (f.state === 'conquistada') r.con++; else if (f.state === 'resistida') r.res++; else if (f.state === 'activo') r.act++;
          r.maxAct = Math.max(r.maxAct, act[f.id] || 0);
        });
      }
    } finally { PC.log = baseLog; }
    return r;
  };
  const seeds = [101, 102, 103, 104, 105, 106];
  const med = run('sa', 'medio', seeds, 70), fac = run('sa', 'facil', seeds, 70), dif = run('sa', 'dificil', seeds, 70);
  const share = (r) => r.con / Math.max(1, r.con + r.res);
  console.log(`[equilibrio sa] facil ${(100 * share(fac)).toFixed(0)}% medio ${(100 * share(med)).toFixed(0)}% dificil ${(100 * share(dif)).toFixed(0)}% · liga espontánea ${med.hitos.liga} · traiciones ${med.hitos.traicion}`);
  ok(share(med) > 0.4 && share(med) < 0.92, 'Medio: la Corona gana la mayoría de los frentes pero no todos');
  ok(share(fac) < share(dif), 'Fácil: la Corona conquista menos que en Difícil');
  ok(share(fac) < 0.7, 'Fácil: la Corona no arrasa');
  ok(med.maxAct <= 36 && fac.maxAct <= 36 && dif.maxAct <= 36, `ningún frente queda activo más de ~35 turnos (máx. ${Math.max(med.maxAct, fac.maxAct, dif.maxAct)})`);
  ok(med.act + fac.act + dif.act === 0, 'tras 70 turnos no queda ningún frente activo');
  ok(med.hitos.traicion > 0, 'hay pueblos que se alían con la Corona');
  ok(med.hitos.liga + fac.hitos.liga + dif.hitos.liga > 0, 'la IA forma ligas espontáneas entre pueblos que resisten');
}

// 6) Robustez: el jugador muere durante la campaña, y cambio de fase con frentes abiertos.
{
  const g = boot(81, 'peru'); play(g, 12);
  PC.player().alive = false;
  let threw = null;
  try { for (let i = 0; i < 6; i++) { PC.diplomacyTick(); } PC.conquistaView(); } catch (e) { threw = e; }
  ok(!threw, 'con el jugador muerto la campaña no lanza errores' + (threw ? ': ' + threw.message : ''));
  const h = boot(82, 'peru'); play(h, 14);
  PC.startPhase2(); play(PC.G, 40);
  const v = PC.conquistaView();
  ok(v.fronts.every((f) => f.state !== 'pendiente' || !f.age), 'tras cambiar de fase no quedan frentes iniciados sin resolver');
  ok(v.fronts.every((f) => f.state !== 'activo' || f.age <= 36), 'tras cambiar de fase ningún frente se eterniza');
}
console.log(fails ? `FALLÓ (${fails})` : 'OK');
process.exit(fails ? 1 : 0);

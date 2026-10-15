// Prueba de humo: juega partidas completas con piloto automático (sin navegador).
// Uso: node tests/smoke.js [semilla] [escenario] [cultura]
'use strict';
const path = require('path');
global.PC = {};
const FILES = ['js/core/util.js', 'js/data/geo.js', 'js/data/geo_sa.js', 'js/data/geo_am.js', 'js/data/conquista.js', 'js/data/rules.js', 'js/data/civs.js', 'js/data/continent.js', 'js/data/leaders.js', 'js/data/leaders_hist.js', 'js/core/mapgen.js',
  'js/core/game.js', 'js/core/ai.js', 'js/core/setup.js', 'js/core/save.js', 'js/core/events.js', 'js/core/diplomacy.js', 'js/core/actions.js', 'js/core/phases.js', 'js/core/world.js', 'js/core/economy.js', 'js/core/projects.js', 'js/core/continent.js', 'js/core/events_continent.js', 'js/core/victory.js', 'js/core/conquista.js'];
FILES.forEach((f) => require(path.resolve(__dirname, '..', f)));

function run(seed, scenario, culture, maxTurns, difficulty, phase2At, phase3At) {
  PC.newGame({ scenario, culture, seed, autoplay: true, difficulty });
  const g = PC.G;
  let errors = 0;
  for (let i = 0; i < maxTurns && !g.gameOver; i++) {
    if (phase2At && i === phase2At) { PC.startPhase2(); console.log(`   → Fase 2 forzada en ${PC.fmtYear(g.year)}: ${g.map.regions.length} regiones, ${g.civs.filter((c) => c.alive).length} civs, ${g.map.tiles.filter(Boolean).length} casillas`); }
    if (phase3At && i === phase3At) { PC.startPhase3(); console.log(`   → Fase 3 forzada en ${PC.fmtYear(g.year)}: ${g.map.regions.length} regiones, ${g.civs.filter((c) => c.alive).length} civs, ${g.map.tiles.filter(Boolean).length} casillas`); }
    try { PC.endTurn(); } catch (e) { errors++; console.error(`Turno ${g.turn} (${PC.fmtYear(g.year)}):`, e.stack); if (errors > 3) break; }
  }
  const p = PC.player();
  const fired = Object.keys(g.fired).join(', ');
  console.log(`[${scenario}/${culture}/${difficulty || 'medio'} seed=${seed}] año ${PC.fmtYear(g.year)} turno ${g.turn} fase=${g.phase} | ciudades ${PC.civCities(p).length} ` +
    `techs ${Object.keys(p.techs).length} oro ${p.gold} cohesión ${Math.round(p.stability)} provincias ${PC.playerRegionCount()}/${g.map.regions.length} ` +
    `civs vivas ${g.civs.filter((c) => c.alive).length} unidades ${g.units.length} | ${g.gameOver ? g.gameOver.text : ''}`);
  console.log('   eventos:', fired);
  console.log('   divergencias:', g.divergences.length);
  const cg = g.congress || { sessions: 0 };
  console.log(`   congreso: ${cg.sessions} sesiones · líderes rivales: ${g.civs.filter((c) => c.alive && !c.isPlayer).slice(0, 6).map((c) => PC.leaderOf(c).name).join(', ')}`);
  return errors;
}
const seed = +process.argv[2] || 7;
let err = 0;
if (process.argv[3]) err += run(seed, process.argv[3], process.argv[4], 400);
else {
  err += run(seed, 'origenes', 'caral', 400);
  err += run(seed + 1, 'origenes', 'cusco', 400);
  err += run(seed + 2, 'origenes', 'amazonia', 400);
  err += run(seed + 3, 'tahuantinsuyo', 'inca', 400);
  err += run(seed + 4, 'origenes', 'titicaca', 400, 'facil');
  err += run(seed + 5, 'origenes', 'sechin', 400, 'dificil');
  err += run(seed + 6, 'origenes', 'paracas', 400, 'realista');
  err += run(seed + 7, 'tahuantinsuyo', 'inca', 400, 'realista');
  err += run(seed + 8, 'origenes', 'caral', 400, 'medio', 120);
  err += run(seed + 9, 'tahuantinsuyo', 'inca', 400, 'medio', 60);
  err += run(seed + 10, 'origenes', 'cusco', 400, 'medio', 100, 130);
  err += run(seed + 11, 'tahuantinsuyo', 'inca', 400, 'realista', 30, 90);
  // Escenarios de la v0.1.2 (partidas cortas).
  err += run(seed + 12, 'cajamarca', 'inca', 60);
  err += run(seed + 13, 'independencia', 'peru', 50, 'medio', 15);
  err += run(seed + 14, 'pacifico', 'peru', 40);
  err += run(seed + 15, 'sudamerica1810', 'peru', 70, 'medio', 0, 3);
  // Escenario de la Conquista (v0.1.3): varios frentes y la campaña avanzada.
  err += run(seed + 16, 'conquista1492', 'inca', 120);
  err += run(seed + 17, 'conquista1492', 'inca', 200, 'realista');
}
// Guardar / cargar
const json = PC.serialize(); PC.load(json); PC.endTurn();
console.log(err ? `FALLÓ (${err} errores)` : 'OK');
process.exit(err ? 1 : 0);

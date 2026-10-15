// Reglas del contenido continental (v0.1.2): maravillas limitadas por fase y región, y preparación de los escenarios nuevos.
(function (PC) {
  'use strict';
  const G = () => PC.G;

  // ---------------------------------------------------------------- Maravillas por fase y región
  const baseCanBuild = PC.canBuild;
  PC.canBuild = function (city, kind, id) {
    if (!baseCanBuild(city, kind, id)) return false;
    if (kind !== 'wonder') return true;
    const W = PC.WONDERS[id];
    if (W.phases && !W.phases.includes(G().phase)) return false;
    if (W.regions && !W.regions.includes(PC.tile(city.t).region)) return false;
    if (W.coastal && !PC.isCoastal(city)) return false;
    return true;
  };
  // Una maravilla continental en manos del jugador siempre es una divergencia (y más si llega fuera de su fecha).
  const baseOnWonder = PC.onWonder;
  PC.onWonder = function (civ, id, city) {
    if (baseOnWonder) baseOnWonder(civ, id, city);
    const W = PC.WONDERS[id];
    if (!civ.isPlayer || !W || W.hist === undefined) return;
    PC.diverge(Math.abs(G().year - W.hist) > 300 ? `${civ.name} alza ${W.name} en ${PC.fmtYear(G().year)} (históricamente ≈ ${PC.fmtYear(W.hist)}).`
      : `${W.name} es obra de ${civ.name} y no de sus constructores históricos.`);
  };

  // ---------------------------------------------------------------- Escenarios
  PC.DEFAULT_LEADER.peru = 'ramon_castilla';
  const baseNewGame = PC.newGame;
  PC.newGame = function (o) {
    const g = baseNewGame(o);
    applyScenario(g, PC.SCENARIOS[o.scenario]);
    return g;
  };
  function applyScenario(g, sc) {
    const p = PC.player();
    (sc.fired || []).forEach((id) => { g.fired[id] = true; });
    // Lo que ya ocurrió no se vuelve a anunciar (p. ej. el viaje al poniente al recibir la navegación de altura).
    g.eventQueue = g.eventQueue.filter((e) => !(sc.fired || []).includes(e.id));
    Object.assign(g.flags, sc.flags || {});
    if (sc.playerName) p.name = sc.playerName;
    Object.entries(sc.rename || {}).forEach(([k, nm]) => g.civs.filter((c) => c.key === k).forEach((c) => { c.name = nm; c.fixedName = true; }));
    (sc.wars || []).forEach((k) => { const c = g.civs.find((x) => x.key === k && x.alive); if (c) PC.declareWar(c, p, true); });
    const capital = PC.cityById(p.capitalId);
    if (capital && sc.buildings) sc.buildings.forEach((b) => { if (PC.BUILDINGS[b] && p.techs[PC.BUILDINGS[b].tech] && !capital.buildings.includes(b)) capital.buildings.push(b); });
    // Tropas de la época en lugar de awqa runas y macaneros.
    if (capital && sc.modern) {
      PC.civUnits(p).filter((u) => PC.isMil(u) && !PC.UNITS[u.type].commander).forEach(PC.removeUnit);
      const best = PC.aiBestUnit(p);
      for (let k = 0; k < sc.modern; k++) PC.spawnUnit(p, k === 2 && p.techs.artilleria ? 'canon' : best, PC.tile(capital.t));
      PC.civCities(p).slice(1).forEach((c) => PC.spawnUnit(p, best, PC.tile(c.t)));
    }
    if (sc.startPhase === 'sudamerica' && PC.startPhase2) {
      PC.startPhase2();
      g.log = [];
      PC.log(`Comienza la historia de ${p.name} en ${PC.fmtYear(g.year)}, en el mapa de Sudamérica.`, 'history');
    }
    if (G().scenario === 'cajamarca') PC.log('Atahualpa ha vencido a Huáscar. En Tumbes desembarcan unos extranjeros barbados.', 'history');
    if (G().scenario === 'independencia') PC.log('San Martín desembarca en Paracas. El virrey resiste en Lima y en la sierra.', 'history');
    if (G().scenario === 'pacifico') PC.log('Chile ocupa Antofagasta. El tratado secreto con Bolivia arrastra al Perú a la guerra.', 'history');
    PC.updateVisibility();
  }
})(globalThis.PC = globalThis.PC || {});

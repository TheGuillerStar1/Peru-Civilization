// Economía proporcional: mantenimiento de unidades y edificios que escala con la era sin hundir el tesoro,
// y licenciamiento de tropas obsoletas o excedentes cuando el mapa se satura o el tesoro está en rojo.
(function (PC) {
  'use strict';
  const G = () => PC.G;

  // Mantenimiento por turno. gross = oro bruto de las ciudades (antes de gastos).
  PC.civUpkeep = function (civ, gross) {
    const cities = PC.civCities(civ);
    const era = PC.eraOf(civ);
    const mil = PC.civUnits(civ).filter(PC.isMil).length;
    // Cada tropa por encima de dos por ciudad cuesta más a medida que avanza la era.
    const units = Math.max(0, mil - cities.length * 2) * (1 + Math.floor(era / 2));
    // Edificios: la tarifa crece con la era hasta la sexta y nunca se lleva más del 60% del oro de las ciudades.
    const n = cities.reduce((s, c) => s + c.buildings.filter((b) => PC.BUILDINGS[b]).length, 0);
    const raw = Math.round(n * (0.5 + Math.min(era, 6) * 0.08));
    const buildings = Math.min(raw, Math.max(0, Math.round(Math.max(0, gross) * 0.6)));
    return { units, buildings, total: units + buildings };
  };

  // ¿Está el mapa saturado de unidades? (mismo tope que usa la IA al construir)
  PC.mapCrowded = function () {
    const m = G().map;
    if (!m.landCount) m.landCount = m.tiles.filter((t) => t && t.terrain !== 'oceano').length;
    return G().units.length > m.landCount * 0.3;
  };
  // Saturación en un mapa continental: ahí se aplican los topes estrictos (el mapa del Perú es pequeño).
  PC.mapTight = () => G().phase !== 'peru' && PC.mapCrowded();
  // Tropas que la civilización puede sostener.
  PC.armyCap = function (civ) {
    const n = PC.civCities(civ).length;
    if (PC.mapTight()) return n + 1;
    return n * 2 + 2;
  };

  const strength = (u) => { const U = PC.UNITS[u.type]; return U.atk + U.def + u.hp / 50; };
  // Licencia las tropas que sobran: primero comandantes repetidos, luego las obsoletas y las más débiles.
  PC.trimArmy = function (civ) {
    const g = G();
    if (!civ.alive || civ.external) return 0;
    const cities = PC.civCities(civ);
    if (!cities.length) return 0;
    if (civ.colony && g.year < civ.colony.year + (PC.diff().histAI ? 120 : 80)) return 0;
    const crowded = PC.mapTight();
    if (!crowded && civ.gold >= 0) return 0;
    let removed = 0;
    const units = PC.civUnits(civ);
    // Comandantes: uno basta, y ninguno en tiempos de paz si el mapa está saturado.
    const war = g.civs.some((o) => o.alive && PC.atWar(civ.id, o.id));
    const cmd = units.filter((u) => PC.UNITS[u.type].commander);
    cmd.slice(crowded && !war ? 0 : 1).forEach((u) => { PC.removeUnit(u); removed++; });
    if (crowded) {
      const wk = units.filter((u) => u.type === 'trabajador' && !u.task);
      wk.slice(Math.ceil(cities.length * 0.2)).forEach((u) => { PC.removeUnit(u); removed++; });
    }
    const troops = PC.civUnits(civ).filter((u) => PC.isMil(u) && !PC.UNITS[u.type].commander);
    const cap = civ.gold < 0 ? Math.min(PC.armyCap(civ), cities.length * 2) : PC.armyCap(civ);
    const excess = troops.length - cap;
    if (excess <= 0) return removed;
    // La última guarnición de cada ciudad no se licencia.
    const guard = new Set();
    cities.forEach((c) => { const x = troops.filter((u) => u.t === c.t).sort((a, b) => strength(b) - strength(a))[0]; if (x) guard.add(x); });
    const cand = troops.filter((u) => !guard.has(u))
      .sort((a, b) => ((PC.upgradeCost(b) !== null) - (PC.upgradeCost(a) !== null)) || strength(a) - strength(b));
    cand.slice(0, Math.max(1, Math.ceil(excess / 2))).forEach((u) => { PC.removeUnit(u); removed++; });
    if (removed && civ.isPlayer && !g.autoplay) PC.log(`Se licencian ${removed} unidades por falta de recursos.`, 'war', [civ.id]);
    return removed;
  };

  // La IA (y el piloto automático) licencia tropas al final de su turno económico.
  const baseProcess = PC.processCiv;
  PC.processCiv = function (civ) {
    baseProcess(civ);
    if (civ.alive && (!civ.isPlayer || G().autoplay)) PC.trimArmy(civ);
  };
})(globalThis.PC = globalThis.PC || {});

// Creación de partidas.
(function (PC) {
  'use strict';

  PC.bestSiteInRegion = function (regionId, civ) {
    const g = PC.G;
    const rg = g.map.regions.find((r) => r.id === regionId);
    if (!rg) return null;
    let cand = rg.tiles.map(PC.tile);
    // Si la provincia está llena, ampliar la búsqueda a sus alrededores.
    let best = null, bs = -1;
    const tryList = (list) => list.forEach((t) => { const s = PC.siteScore(t, civ); if (s > bs) { bs = s; best = t; } });
    tryList(cand);
    if (!best) {
      const near = new Set();
      cand.forEach((t) => PC.tilesWithin(t, 2).forEach((u) => near.add(u)));
      tryList([...near]);
    }
    return best;
  };

  PC.startingUnits = function (civ, t, list) {
    list.forEach((type) => PC.spawnUnit(civ, type, t));
  };

  PC.newGame = function (o) {
    const sc = PC.SCENARIOS[o.scenario];
    const seed = (o.seed || Math.floor(Math.random() * 1e9)) | 0;
    const g = PC.G = {
      v: 1, seed, rng: seed, scenario: o.scenario, speed: o.speed || 'normal', difficulty: o.difficulty || 'medio', turn: 1, year: sc.year, phase: 'peru',
      civs: [], cities: [], units: [], log: [], flags: {}, fired: {}, cooldown: {}, eventQueue: [], spawned: {}, wonders: {},
      notices: [], nextId: 1, autoplay: !!o.autoplay, divergences: [], revealAll: false
    };
    g.map = PC.generatePeruMap(seed);
    g.explored = new Array(g.map.tiles.length).fill(-1);

    const cul = PC.CULTURES[o.culture];
    const player = PC.addCiv({ key: o.culture, name: cul.name, color: cul.color, leader: cul.leader, isPlayer: true, bonus: cul.bonus });
    if (o.culture === 'amazonia') player.selva = true;
    g.playerId = player.id;
    const techList = cul.techs || PC.baselineTechs(sc.year);
    techList.forEach((id) => PC.grantTech(player, id, true));

    if (sc.playerCities) {
      sc.playerCities.forEach((pc) => {
        const t = PC.bestSiteInRegion(pc.region, player);
        if (t) { const c = PC.foundCity(player, t, pc.name, pc.pop); c.culture = 40; c.expanded = true; PC.claimTiles(c, 2); }
      });
      const cap = PC.cityById(player.capitalId);
      cap.buildings.push('huaca', 'casa_quipu', 'tambo');
      ['awqa', 'awqa', 'macanero', 'hondero', 'trabajador', 'colono', 'explorador'].forEach((u) => PC.spawnUnit(player, u, PC.tile(cap.t)));
      PC.civCities(player).slice(1).forEach((c) => PC.spawnUnit(player, 'macanero', PC.tile(c.t)));
      player.gold = 120;
    } else {
      const t = PC.bestSiteInRegion(cul.region, player);
      PC.foundCity(player, t, null, 1);
      PC.startingUnits(player, t, ['guerrero', 'explorador', 'trabajador', 'colono']);
    }

    // Rivales
    sc.rivals.forEach((rv) => {
      const id = typeof rv === 'string' ? rv : rv.id;
      if (id === o.culture) return;
      const F = PC.FACTIONS[id];
      const civ = PC.addCiv({ key: id, name: F.name, color: F.color, selva: F.selva, bonus: (PC.CULTURES[id] || {}).bonus });
      const techs = typeof rv === 'string' ? ((PC.CULTURES[id] && PC.CULTURES[id].techs) || ['agricultura']) : PC.baselineTechs(sc.year);
      techs.forEach((tid) => PC.grantTech(civ, tid, true));
      const cityDefs = typeof rv === 'string' ? [[F.region, null, 1]] : rv.cities;
      cityDefs.forEach(([region, name, pop]) => {
        const t = PC.bestSiteInRegion(region, civ);
        if (!t) return;
        const c = PC.foundCity(civ, t, name, pop);
        if (pop > 2) { c.culture = 35; c.expanded = true; PC.claimTiles(c, 2); }
        PC.spawnUnit(civ, PC.aiBestUnit(civ), t);
      });
      if (!PC.civCities(civ).length) { civ.alive = false; return; }
      if (typeof rv !== 'string') PC.spawnUnit(civ, PC.aiBestUnit(civ), PC.tile(PC.cityById(civ.capitalId).t));
    });
    player.gold += PC.diff().startGold;
    g.log = [];
    g.notices = [];
    PC.log(`Comienza la historia de ${player.name} en ${PC.fmtYear(g.year)}.`, 'history');
    if (o.scenario === 'tahuantinsuyo') {
      PC.log('Pachacútec ha vencido a los Chankas. Los señoríos de los Andes observan al Cusco.', 'history');
      const chanka = PC.civs().find((c) => c.key === 'chanka');
      if (chanka) PC.declareWar(chanka, player, true);
    }
    PC.updateVisibility();
    return g;
  };
  PC.civs = () => PC.G.civs;

  PC.aiBestUnit = function (civ) {
    const ok = Object.values(PC.UNITS).filter((U) => U.cat === 'military' && !U.unique && U.id !== 'explorador' && (!U.tech || civ.techs[U.tech]) && !U.needs);
    return ok.sort((a, b) => (b.atk + b.def) - (a.atk + a.def))[0].id;
  };

  // --- Guardar / cargar
  PC.serialize = () => JSON.stringify(PC.G, (k, v) => (k === 'visible' ? undefined : v));
  PC.load = function (json) {
    PC.G = JSON.parse(json);
    PC.G.notices = [];
    if (PC.G.phase === 'sudamerica') Object.assign(PC.CITY_NAMES, PC.GEO_SA.cityNames);
    PC.updateVisibility();
    return PC.G;
  };
})(globalThis.PC = globalThis.PC || {});

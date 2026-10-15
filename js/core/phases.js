// Fases de expansión: 1 Perú  2 Sudamérica  3 América  4 El Mundo.
(function (PC) {
  'use strict';

  PC.PHASES = [
    { id: 'peru', name: 'Fase 1 · Perú', ready: true },
    { id: 'sudamerica', name: 'Fase 2 · Sudamérica', ready: true },
    { id: 'america', name: 'Fase 3 · América', ready: false },
    { id: 'mundo', name: 'Fase 4 · El Mundo', ready: false }
  ];

  // Terreno continental por reglas climáticas aproximadas.
  function saTerrain(lon, lat, geo, seed, x, y) {
    const andesLon = PC.lonAtLat(geo.andes.map(([a, b]) => [a, b]), lat);
    const d = PC.distToPolyline(lon, lat, geo.andes);
    const n = PC.noise2(x * 0.7, y * 0.7, seed);
    const alti = lat < -14 && lat > -23;
    if (d < 0.7 && n > 0.35) return 'cordillera';
    if (d < (alti ? 2.8 : 1.6)) return alti && d > 0.7 ? 'puna' : 'sierra';
    if (lon < andesLon) {
      if (lat > 1) return 'selva';
      if (lat > -3) return 'llanura';
      if (lat > -30) return n > 0.72 ? 'valle' : 'desierto';
      if (lat > -38) return 'llanura';
      return 'bosque';
    }
    if (lat < -39) return 'estepa';
    if (lat < -30) return lon > -66 ? 'pampa' : 'estepa';
    if (lat < -18) {
      if (lon > -49) return 'selva';
      return lon > -58 && lat > -26 ? 'llanura' : 'llanura';
    }
    if (lat < -3) {
      if (lon > -42) return 'estepa';
      if (lon > -60 && lat < -10) return 'llanura';
      return 'selva';
    }
    if (lat > 9.3) return 'llanura';
    if (lat > 5 && lon > -72 && lon < -62) return 'llanura';
    return 'selva';
  }

  PC.generateSAMap = function (seed) {
    const geo = PC.GEO_SA;
    const dLat = geo.dLon * 0.866;
    const rows = Math.ceil((geo.latTop - geo.latBottom) / dLat) + 1;
    const cols = Math.ceil((-33 - geo.lonMin) / geo.dLon) + 1;
    const tiles = new Array(cols * rows).fill(null);
    const land = new Set();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c + ((r & 1) ? 0.5 : 0);
        const lon = geo.lonMin + x * geo.dLon, lat = geo.latTop - r * dLat;
        if (PC.pointInPolygon(lon, lat, geo.outline)) land.add(r * cols + c);
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const isLand = land.has(i);
        const nearLand = !isLand && PC.hexNeighborsCR(c, r).some(([cc, rr]) => cc >= 0 && rr >= 0 && cc < cols && rr < rows && land.has(rr * cols + cc));
        if (!isLand && !nearLand) continue;
        const x = c + ((r & 1) ? 0.5 : 0);
        const lon = geo.lonMin + x * geo.dLon, lat = geo.latTop - r * dLat;
        const terrain = isLand ? saTerrain(lon, lat, geo, seed, x, r) : 'oceano';
        tiles[i] = { i, c, r, x, y: r, lat, lon, zone: PC.TERRAIN[terrain].zone, terrain, feature: null, fauna: null, res: null, region: null, owner: null, cityId: null, imp: null, road: false };
      }
    }
    const list = tiles.filter(Boolean);
    const landT = list.filter((t) => t.terrain !== 'oceano');
    const near = (lon, lat, f) => { let b = null, bd = Infinity; list.forEach((t) => { if (f(t)) { const d = (t.lon - lon) ** 2 + (t.lat - lat) ** 2; if (d < bd) { bd = d; b = t; } } }); return b; };
    landT.forEach((t) => {
      if (t.zone === 'selva' && geo.rivers.some((rv) => PC.distToPolyline(t.lon, t.lat, rv.pts) < 1.1)) t.feature = 'rio';
      if (t.terrain === 'selva') {
        const h = PC.hash2(t.c, t.r, seed + 5);
        if (h < 0.75) t.fauna = t.feature === 'rio' ? (h < 0.4 ? 'caiman' : 'pirana') : (h < 0.3 ? 'mosquitos' : h < 0.55 ? 'jaguar' : 'serpiente');
      }
    });
    geo.lakes.forEach((lk) => { const t = near(lk.lon, lk.lat, (u) => u.terrain !== 'oceano'); if (t) { t.terrain = 'lago'; t.zone = 'sierra'; t.feature = null; t.fauna = null; t.name = lk.name; } });
    landT.forEach((t) => {
      let b = null, bd = Infinity;
      geo.regions.forEach((rg) => { const d = (t.lon - rg.lon) ** 2 + (t.lat - rg.lat) ** 2; if (d < bd) { bd = d; b = rg; } });
      t.region = b.id;
    });
    geo.hotspots.forEach(([res, lon, lat]) => { const t = near(lon, lat, (u) => !u.res && u.terrain !== 'oceano' && u.terrain !== 'lago'); if (t) t.res = res; });
    PC.shuffleSeeded(list.filter((t) => t.terrain === 'oceano'), seed).slice(0, 25).forEach((t) => { t.res = 'pesca'; });
    const regions = geo.regions.map((rg) => ({ id: rg.id, name: rg.name, zone: 'mixta', tiles: landT.filter((t) => t.region === rg.id).map((t) => t.i) })).filter((rg) => rg.tiles.length);
    const counts = { costa: 0, sierra: 0, selva: 0 };
    landT.forEach((t) => { if (counts[t.zone] !== undefined) counts[t.zone]++; });
    return { kind: 'sudamerica', name: 'Sudamérica', cols, rows, tiles, regions, counts, minCityDist: 2 };
  };

  PC.startPhase2 = function () {
    const g = PC.G;
    if (g.phase !== 'peru') return;
    const player = PC.player();
    const oldTile = (i) => g.map.tiles[i];
    // Ciudades y unidades del jugador, con sus coordenadas reales.
    const myCities = PC.civCities(player).map((c) => Object.assign({}, c, { lon: oldTile(c.t).lon, lat: oldTile(c.t).lat }))
      .sort((a, b) => b.pop - a.pop);
    const myUnits = PC.civUnits(player).filter(PC.isMil).map((u) => u.type);
    const wonders = Object.keys(g.wonders).filter((w) => g.wonders[w] === player.id);
    // Nueva partida continental conservando la civilización del jugador.
    g.phase = 'sudamerica';
    Object.assign(PC.CITY_NAMES, PC.GEO_SA.cityNames);
    g.map = PC.generateSAMap(g.seed);
    g.explored = new Array(g.map.tiles.length).fill(-1);
    g.cities = []; g.units = [];
    g.civs = g.civs.filter((c) => c.isPlayer);
    player.id = 1; g.playerId = 1; player.rel = {}; player.capitalId = null;
    g.wonders = {}; wonders.forEach((w) => { g.wonders[w] = player.id; });
    let first = true;
    myCities.forEach((c) => {
      let best = null, bd = Infinity;
      g.map.tiles.forEach((t) => {
        if (!t || ['oceano', 'lago', 'cordillera'].includes(t.terrain)) return;
        if (g.cities.some((o) => PC.dist(PC.tile(o.t), t) < 2)) return;
        const d = (t.lon - c.lon) ** 2 + (t.lat - c.lat) ** 2;
        if (d < bd && d < 9) { bd = d; best = t; }
      });
      if (!best) { const host = g.cities[0]; if (host) host.pop += Math.ceil(c.pop / 2); return; }
      const nc = PC.foundCity(player, best, c.name, c.pop);
      nc.buildings = c.buildings.slice(); nc.culture = c.culture; nc.expanded = true; nc.founded = c.founded;
      nc.build = c.build; nc.prod = c.prod; nc.food = c.food;
      PC.claimTiles(nc, c.culture >= 30 ? 2 : 1);
      if (first) { player.capitalId = nc.id; first = false; }
    });
    const cities = PC.civCities(player);
    myUnits.slice(0, cities.length * 3).forEach((type, k) => PC.spawnUnit(player, type, PC.tile(cities[k % cities.length].t)));
    PC.spawnUnit(player, 'colono', PC.tile(cities[0].t));
    PC.spawnUnit(player, 'explorador', PC.tile(cities[0].t));
    // Facciones del continente según la época y tu historia.
    const geo = PC.GEO_SA;
    const set = g.year < 1550 ? geo.natives : g.year < 1810 ? geo.colonial : geo.nations;
    const euro = g.year >= 1550;
    set.forEach(([key, name, color, region, n]) => {
      const civ = PC.addCiv({ key, name, color, selva: ['omagua', 'marajoara', 'yanomami', 'mojos', 'arawak'].includes(key) });
      civ.id = g.civs.length; // ids secuenciales
      PC.baselineTechs(g.year).forEach((t) => PC.grantTech(civ, t, true));
      if (euro && !['mapuche', 'guarani'].includes(key)) ['metal_cobre', 'hierro', 'acero', 'quimica', 'polvora', 'arcabuz', 'equitacion', 'navegacion_oceanica'].forEach((t) => PC.grantTech(civ, t, true));
      const rg = g.map.regions.find((r) => r.id === region);
      for (let k = 0; k < n && rg; k++) {
        let best = null, bs = -1;
        const cand = new Set(rg.tiles.map(PC.tile));
        if (k > 0) PC.civCities(civ).forEach((c) => PC.tilesWithin(PC.tile(c.t), 4).forEach((t) => cand.add(t)));
        cand.forEach((t) => { const s = PC.siteScore(t, civ); if (s > bs) { bs = s; best = t; } });
        if (!best) break;
        const c = PC.foundCity(civ, best, null, 2 + Math.floor(PC.eraOf(civ) / 2));
        c.culture = 30; c.expanded = true; PC.claimTiles(c, 2);
        PC.spawnUnit(civ, PC.aiBestUnit(civ), best);
      }
      if (!PC.civCities(civ).length) civ.alive = false;
    });
    g.fired.fase2 = true; g.flags.fase2Disponible = false; g.phaseChanged = true;
    PC.log(`Comienza la Fase 2: Sudamérica (${PC.fmtYear(g.year)}). ${player.name} entra en la historia del continente.`, 'history');
    PC.updateVisibility();
  };

  // Fase 3 (en desarrollo): aviso al dominar Sudamérica.
  const prevTick = PC.historyTick;
  PC.historyTick = function () {
    if (prevTick) prevTick();
    const g = PC.G;
    if (g.phase === 'sudamerica' && !g.fired.fase3 && PC.playerRegionCount() >= Math.ceil(g.map.regions.length * 0.75)) {
      g.fired.fase3 = true; PC.queueEvent('fase3', {});
    }
  };
  PC.EVENTS.fase3 = (g) => ({
    title: '¡Sudamérica es tuya!', img: '',
    text: `Dominas ${PC.playerRegionCount()} de ${g.map.regions.length} regiones del continente. La Fase 3 (América: Mesoamérica, el Caribe y Norteamérica) está en desarrollo; por ahora puedes seguir escribiendo tu historia en Sudamérica.`,
    choices: [{ label: 'Seguir jugando', effect: () => { PC.diverge('Una sola civilización andina unifica Sudamérica.'); return 'Tu nombre resuena en todo el continente.'; } }]
  });
})(globalThis.PC = globalThis.PC || {});

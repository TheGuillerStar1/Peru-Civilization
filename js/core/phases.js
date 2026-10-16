// Fases de expansión: 1 Perú  2 Sudamérica  3 América  4 El Mundo.
(function (PC) {
  'use strict';

  PC.PHASES = [
    { id: 'peru', name: 'Fase 1 · Perú', ready: true, next: 'sudamerica', need: 0.6 },
    { id: 'sudamerica', name: 'Fase 2 · Sudamérica', ready: true, next: 'america', need: 0.6 },
    { id: 'america', name: 'Fase 3 · América', ready: true, next: 'mundo', need: 0.6 },
    { id: 'mundo', name: 'Fase 4 · El Mundo', ready: false }
  ];
  PC.phaseInfo = (id) => PC.PHASES.find((p) => p.id === (id || PC.G.phase));
  // Regiones que hay que controlar para pasar a la siguiente fase: el 60% (desde 1600 basta el 40%).
  PC.phaseShare = () => (PC.G.year >= 1600 ? 0.4 : (PC.phaseInfo().need || 1));
  PC.phaseNeed = () => Math.ceil(PC.G.map.regions.length * PC.phaseShare());

  // Terreno de Sudamérica por reglas climáticas aproximadas.
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
    if (lat < -18) return lon > -49 ? 'selva' : 'llanura';
    if (lat < -3) {
      if (lon > -42) return 'estepa';
      if (lon > -60 && lat < -10) return 'llanura';
      return 'selva';
    }
    if (lat > 9.3) return 'llanura';
    if (lat > 5 && lon > -72 && lon < -62) return 'llanura';
    return 'selva';
  }

  // Terreno de Norteamérica, Mesoamérica y las Antillas.
  function naTerrain(lon, lat, geo, seed, x, y) {
    const n = PC.noise2(x * 0.8, y * 0.8, seed + 21);
    const dR = PC.distToPolyline(lon, lat, geo.rockies);
    const dP = PC.distToPolyline(lon, lat, geo.pacific);
    const dA = PC.distToPolyline(lon, lat, geo.appalachians);
    if (lat >= 66 || (lat >= 60 && lon > -100) || (lat >= 57 && lon > -80)) return dR < 1.2 && n > 0.45 ? 'cordillera' : 'tundra';
    if ((dR < 1.1 && n > 0.38) || (dP < 0.8 && n > 0.5)) return 'cordillera';
    if (dR < 2.4 || dP < 1.3) return lat > 50 ? 'taiga' : lat > 24 && lat < 38 && lon < -104 ? 'desierto' : 'sierra';
    if (dA < 1.4) return n > 0.55 ? 'sierra' : 'bosque';
    if (lat >= 50) return 'taiga';
    const rLon = PC.lonAtLat(geo.rockies, lat);
    if (lon < rLon && lat > 22) {
      if (lat > 42) return lon < -121 ? 'bosque' : 'estepa';
      if (lat > 34) return lon < -119.5 ? (lat > 38.5 ? 'bosque' : 'valle') : 'desierto';
      return 'desierto';
    }
    if (lat < 23.5) {
      if (lon > -85 && lat > 17) return n > 0.62 ? 'selva' : 'llanura'; // Antillas
      if (lon > -92 && lat > 18) return n > 0.5 ? 'selva' : 'llanura'; // Yucatán
      if (lon > -97.5 && lat > 17.5) return 'selva'; // costa del Golfo
      if (lat < 16 || lon > -94) return 'selva';
      return 'valle';
    }
    if (lat < 30 && lon < -98) return lon < -101 ? 'desierto' : 'estepa';
    if (lon < -97) return 'pradera';
    if (lat < 31) return n > 0.6 ? 'selva' : 'llanura';
    if (lat > 44) return 'bosque';
    return lon < -89 ? 'pradera' : 'bosque';
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
        tiles[i] = newTile(i, c, r, x, lat, lon, terrain);
      }
    }
    return finishContinent({ kind: 'sudamerica', name: 'Sudamérica', cols, rows, tiles, seed, rivers: geo.rivers, riverAll: false, lakes: geo.lakes,
      regions: geo.regions.map((rg) => Object.assign({ macro: geo.macro[rg.id] }, rg)),
      hotspots: geo.hotspots, fish: 25 });
  };

  PC.generateAmericaMap = function (seed) {
    const geo = PC.GEO_AM, sa = PC.GEO_SA;
    const dLat = geo.dLon * 0.866;
    const rows = Math.ceil((geo.latTop - geo.latBottom) / dLat) + 1;
    // Columnas en grados "comprimidos": X = (lon − lon0) · shrink(lat).
    const xMin = -50, xMax = 64;
    const cols = Math.ceil((xMax - xMin) / geo.dLon) + 1;
    const toLon = (c, r) => { const lat = geo.latTop - r * dLat; const X = xMin + (c + ((r & 1) ? 0.5 : 0)) * geo.dLon; return geo.lon0 + X / geo.shrink(lat); };
    const polys = [geo.outlineNA, sa.outline].concat(geo.islands.map((i) => i.pts));
    const isLandAt = (lon, lat) => polys.some((p) => PC.pointInPolygon(lon, lat, p));
    const tiles = new Array(cols * rows).fill(null);
    const land = new Set();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lat = geo.latTop - r * dLat, lon = toLon(c, r);
        if (lon >= -170 && lon <= -30 && isLandAt(lon, lat)) land.add(r * cols + c);
      }
    }
    // Islas pequeñas: el hexágono más cercano se vuelve tierra.
    geo.islets.forEach(([, lon, lat]) => {
      let best = null, bd = Infinity;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const d = (toLon(c, r) - lon) ** 2 + (geo.latTop - r * dLat - lat) ** 2;
        if (d < bd) { bd = d; best = r * cols + c; }
      }
      if (best !== null) land.add(best);
    });
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const isLand = land.has(i);
        const nearLand = !isLand && PC.hexNeighborsCR(c, r).some(([cc, rr]) => cc >= 0 && rr >= 0 && cc < cols && rr < rows && land.has(rr * cols + cc));
        if (!isLand && !nearLand) continue;
        const x = c + ((r & 1) ? 0.5 : 0);
        const lat = geo.latTop - r * dLat, lon = toLon(c, r);
        const inSA = lat < 13 && PC.pointInPolygon(lon, lat, sa.outline);
        const terrain = !isLand ? 'oceano' : inSA ? saTerrain(lon, lat, sa, seed, x * 1.3, r * 1.3) : naTerrain(lon, lat, geo, seed, x, r);
        tiles[i] = newTile(i, c, r, x, lat, lon, terrain);
      }
    }
    const regions = geo.regions.concat(sa.regions.map((rg) => Object.assign({ macro: sa.macro[rg.id] }, rg)));
    return finishContinent({ kind: 'america', name: 'América', cols, rows, tiles, seed, rivers: geo.rivers.concat(sa.rivers), riverAll: true,
      lakes: geo.lakes.concat(sa.lakes.filter((l) => !geo.lakes.some((k) => k.name === l.name))), regions, hotspots: geo.hotspots, fish: 45 });
  };

  function newTile(i, c, r, x, lat, lon, terrain) {
    return { i, c, r, x, y: r, lat, lon, zone: PC.TERRAIN[terrain].zone, terrain, feature: null, fauna: null, res: null, region: null, owner: null, cityId: null, imp: null, road: false };
  }
  // Ríos, fauna, lagos, regiones y recursos comunes a los mapas continentales.
  function finishContinent(o) {
    const { tiles, seed } = o;
    const list = tiles.filter(Boolean);
    const landT = list.filter((t) => t.terrain !== 'oceano');
    const near = (lon, lat, f) => { let b = null, bd = Infinity; list.forEach((t) => { if (f(t)) { const d = (t.lon - lon) ** 2 + (t.lat - lat) ** 2; if (d < bd) { bd = d; b = t; } } }); return b; };
    landT.forEach((t) => {
      const riverOk = o.riverAll ? t.terrain !== 'cordillera' : t.zone === 'selva';
      if (riverOk && o.rivers.some((rv) => PC.distToPolyline(t.lon, t.lat, rv.pts) < 1.1)) t.feature = 'rio';
      if (t.terrain === 'selva') {
        const h = PC.hash2(t.c, t.r, seed + 5);
        if (h < 0.75) t.fauna = t.feature === 'rio' ? (h < 0.4 ? 'caiman' : 'pirana') : (h < 0.3 ? 'mosquitos' : h < 0.55 ? 'jaguar' : 'serpiente');
      }
    });
    o.lakes.forEach((lk) => { const t = near(lk.lon, lk.lat, (u) => u.terrain !== 'oceano' && u.terrain !== 'lago'); if (t) { t.terrain = 'lago'; t.zone = 'sierra'; t.feature = null; t.fauna = null; t.name = lk.name; } });
    landT.forEach((t) => {
      let b = null, bd = Infinity;
      o.regions.forEach((rg) => { const d = (t.lon - rg.lon) ** 2 + (t.lat - rg.lat) ** 2; if (d < bd) { bd = d; b = rg; } });
      t.region = b.id;
    });
    o.hotspots.forEach(([res, lon, lat]) => { const t = near(lon, lat, (u) => !u.res && u.terrain !== 'oceano' && u.terrain !== 'lago'); if (t) t.res = res; });
    PC.shuffleSeeded(list.filter((t) => t.terrain === 'oceano'), seed).slice(0, o.fish).forEach((t) => { t.res = 'pesca'; });
    const regions = o.regions.map((rg) => ({ id: rg.id, name: rg.name, zone: rg.macro || 'mixta', tiles: landT.filter((t) => t.region === rg.id).map((t) => t.i) })).filter((rg) => rg.tiles.length);
    const counts = { costa: 0, sierra: 0, selva: 0 };
    landT.forEach((t) => { if (counts[t.zone] !== undefined) counts[t.zone]++; });
    return { kind: o.kind, name: o.name, cols: o.cols, rows: o.rows, tiles, regions, counts, minCityDist: 2 };
  }

  // ---------------------------------------------------------------- Traslado a un mapa continental
  const SELVA_KEYS = ['omagua', 'marajoara', 'yanomami', 'mojos', 'arawak', 'taino', 'maya'];
  const EURO = ['metal_cobre', 'hierro', 'acero', 'quimica', 'polvora', 'arcabuz', 'equitacion', 'navegacion_oceanica'];
  // Facciones de un conjunto según el año: las entradas pueden traer año de inicio [5] y de fin [6].
  function inYear(set, year) { return set.filter((f) => (!f[5] || year >= f[5]) && (!f[6] || year < f[6])); }
  PC.factionSet = function (phase, year) {
    const sa = PC.GEO_SA, am = PC.GEO_AM;
    const era = year < 1550 ? 'natives' : year < 1810 ? 'colonial' : 'nations';
    if (phase === 'sudamerica') return inYear(sa[era], year);
    // En América, Sudamérica aparece con menos ciudades por facción y sin los pueblos más pequeños.
    const minor = ['charrua', 'querandi', 'tehuelche', 'yanomami', 'tairona', 'caribe', 'diaguita', 'guayana', 'guyana', 'uruguay'];
    let na = inYear(am[era], year);
    if (era === 'natives' && year < 1325) na = na.map((f) => (f[0] === 'mexica' ? ['tolteca', 'Toltecas', '#a93226', 'valle_mexico', 2] : f));
    if (era === 'natives' && year < 1000) na = na.filter((f) => !['misisipiana', 'haudenosaunee'].includes(f[0]));
    return na.concat(inYear(sa[era], year).filter((f) => !minor.includes(f[0])).map((f) => [f[0], f[1], f[2], f[3], Math.min(2, Math.max(1, f[4] - 1))]));
  };

  // Mapa continuo: las casillas vacías del rectángulo pasan a ser mar, de modo que se puede navegar de un borde al otro
  // (el Pacífico se une con el Atlántico, como la vuelta al mundo de Civilization). Las casillas nuevas no llevan región ni recurso.
  PC.fillOceanRect = function (map) {
    const rowLat = new Array(map.rows).fill(null), ref = new Array(map.rows).fill(null);
    map.tiles.forEach((t) => { if (t && rowLat[t.r] === null) { rowLat[t.r] = t.lat; ref[t.r] = t; } });
    for (let r = 0; r < map.rows; r++) {
      if (rowLat[r] !== null) continue;
      let up = r - 1, dn = r + 1;
      while (up >= 0 && rowLat[up] === null) up--;
      while (dn < map.rows && rowLat[dn] === null) dn++;
      const a = up >= 0 ? up : dn, b = dn < map.rows ? dn : up;
      rowLat[r] = a === b ? rowLat[a] : rowLat[a] + (rowLat[b] - rowLat[a]) * (r - a) / (b - a);
      ref[r] = ref[a] || ref[b];
    }
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const i = r * map.cols + c;
        if (map.tiles[i]) continue;
        const x = c + ((r & 1) ? 0.5 : 0), t0 = ref[r];
        map.tiles[i] = newTile(i, c, r, x, rowLat[r], t0 ? t0.lon + (x - t0.x) : 0, 'oceano');
      }
    }
    return map;
  };

  function moveToContinent(phase, map) {
    const g = PC.G;
    if (g.wrap) PC.fillOceanRect(map);
    const player = PC.player();
    const oldTile = (i) => g.map.tiles[i];
    // Ciudades y unidades del jugador, con sus coordenadas reales.
    const myCities = PC.civCities(player).map((c) => Object.assign({}, c, { lon: oldTile(c.t).lon, lat: oldTile(c.t).lat })).sort((a, b) => b.pop - a.pop);
    const myUnits = PC.civUnits(player).filter(PC.isMil).map((u) => u.type);
    const wonders = Object.keys(g.wonders).filter((w) => g.wonders[w] === player.id);
    // Rivales que ya conocías y que siguen existiendo en el nuevo mapa conservan su relación contigo.
    const memory = {};
    g.civs.forEach((c) => { if (!c.isPlayer && c.alive && PC.civCities(c).length) memory[c.key] = { att: PC.rel(c, player).att, embassy: !!PC.rel(player, c).embassy }; });
    g.phase = phase;
    g.map = map; g.map.wrap = !!g.wrap;
    g.explored = new Array(g.map.tiles.length).fill(-1);
    g.cities = []; g.units = []; g.routes = [];
    g.civs = g.civs.filter((c) => c.isPlayer);
    player.id = 1; g.playerId = 1; player.rel = {}; player.capitalId = null;
    g.wonders = {}; wonders.forEach((w) => { g.wonders[w] = player.id; });
    if (g.congress) { g.congress.active = []; g.congress.host = null; g.congress.truce = 0; }
    let first = true;
    myCities.forEach((c) => {
      let best = null, bd = Infinity;
      g.map.tiles.forEach((t) => {
        if (!t || ['oceano', 'lago', 'cordillera'].includes(t.terrain)) return;
        if (g.cities.some((o) => PC.dist(PC.tile(o.t), t) < 2)) return;
        const d = (t.lon - c.lon) ** 2 + (t.lat - c.lat) ** 2;
        if (d < bd && d < 12) { bd = d; best = t; }
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
    const euro = g.year >= 1550;
    PC.factionSet(phase, g.year).forEach(([key, name, color, region, n]) => {
      if (g.civs.some((c) => c.key === key)) return;
      const civ = PC.addCiv({ key, name: PC.historicalName(key, g.year) || name, color, selva: SELVA_KEYS.includes(key) });
      civ.id = g.civs.length; // ids secuenciales
      PC.baselineTechs(g.year).forEach((t) => PC.grantTech(civ, t, true));
      if (euro && !['mapuche', 'guarani', 'haudenosaunee', 'lakota', 'cheroqui', 'comanche', 'maya'].includes(key)) EURO.forEach((t) => PC.grantTech(civ, t, true));
      if (memory[key]) { PC.rel(civ, player).att = memory[key].att; if (memory[key].embassy) PC.rel(civ, player).embassy = PC.rel(player, civ).embassy = true; civ.metPlayer = true; }
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
    // Las colonizaciones anteriores a esta fecha ya ocurrieron (o no) en la historia de la partida.
    // Antes de 1550 los conjuntos son de pueblos originarios: las colonizaciones pendientes llegan enseguida.
    const geo = PC.continentGeo();
    if (g.year >= 1550) {
      if (geo && geo.colonize) geo.colonize.forEach((cz) => { g.fired['col_' + cz[1]] = true; });
      g.fired.epidemia_continente = true;
    }
    g.phaseChanged = true;
    PC.updateVisibility();
  }

  PC.startPhase2 = function () {
    const g = PC.G;
    if (g.phase !== 'peru') return;
    Object.assign(PC.CITY_NAMES, PC.GEO_SA.cityNames);
    moveToContinent('sudamerica', PC.generateSAMap(g.seed));
    g.fired.fase2 = true; g.flags.fase2Disponible = false;
    PC.log(`Comienza la Fase 2: Sudamérica (${PC.fmtYear(g.year)}). ${PC.player().name} entra en la historia del continente.`, 'history');
  };
  PC.startPhase3 = function () {
    const g = PC.G;
    if (g.phase !== 'sudamerica') return;
    Object.assign(PC.CITY_NAMES, PC.GEO_SA.cityNames, PC.GEO_AM.cityNames);
    moveToContinent('america', PC.generateAmericaMap(g.seed));
    g.fired.fase3 = true; g.flags.fase3Disponible = false;
    PC.log(`Comienza la Fase 3: América (${PC.fmtYear(g.year)}). ${PC.player().name} se asoma a Mesoamérica, el Caribe y Norteamérica.`, 'history');
  };
  PC.startNextPhase = function () {
    const ph = PC.G.phase;
    if (ph === 'peru') PC.startPhase2();
    else if (ph === 'sudamerica') PC.startPhase3();
  };
  // ¿Puede el jugador avanzar ya a la siguiente fase?
  PC.canAdvancePhase = function () {
    const g = PC.G, info = PC.phaseInfo();
    const next = info && info.next && PC.phaseInfo(info.next);
    if (!next || !next.ready) return false;
    return !!(g.flags[`fase${PC.PHASES.indexOf(next) + 1}Disponible`] || PC.playerRegionCount() >= PC.phaseNeed());
  };

  // Disparadores de las fases 3 y 4.
  const prevTick = PC.historyTick;
  PC.historyTick = function () {
    if (prevTick) prevTick();
    const g = PC.G;
    if (g.phase === 'sudamerica' && !g.fired.fase3 && PC.playerRegionCount() >= PC.phaseNeed()) { g.fired.fase3 = true; PC.queueEvent('fase3', {}); }
    if (g.phase === 'america' && !g.fired.fase4 && PC.playerRegionCount() >= PC.phaseNeed()) { g.fired.fase4 = true; PC.queueEvent('fase4', {}); }
  };
  PC.EVENTS.fase3 = (g) => ({
    title: '¡Sudamérica es tuya!', img: '',
    text: `Dominas ${PC.playerRegionCount()} de ${g.map.regions.length} regiones del continente. Más allá del istmo de Panamá esperan Mesoamérica, el Caribe y Norteamérica.`,
    choices: [
      { label: 'Avanzar a la Fase 3: América', hint: 'Nuevo mapa de todo el continente; conservas tecnologías, ciudades y ejército', effect: () => { PC.diverge('Una sola civilización andina unifica Sudamérica.'); PC.startPhase3(); return 'Comienza la Fase 3: América.'; } },
      { label: 'Seguir en Sudamérica', hint: 'Podrás avanzar más tarde desde el menú', effect: () => { g.flags.fase3Disponible = true; PC.diverge('Una sola civilización andina unifica Sudamérica.'); return 'Tu nombre resuena en todo el continente.'; } }
    ]
  });
  PC.EVENTS.fase4 = (g) => ({
    title: '¡América es tuya!', img: '',
    text: `Dominas ${PC.playerRegionCount()} de ${g.map.regions.length} regiones de América, del Ártico a la Tierra del Fuego. La Fase 4 (el Mundo) está en desarrollo; por ahora puedes seguir escribiendo tu historia en América.`,
    choices: [{ label: 'Seguir jugando', effect: () => { PC.diverge('Una civilización nacida en los Andes domina toda América.'); return 'Del Ártico a la Patagonia, tu nombre es ley.'; } }]
  });
})(globalThis.PC = globalThis.PC || {});

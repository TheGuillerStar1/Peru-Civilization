// Motor del juego: estado, ciudades, unidades, movimiento, combate y turnos.
(function (PC) {
  'use strict';

  const G = () => PC.G;
  PC.civ = (id) => G().civs.find((c) => c.id === id);
  PC.player = () => PC.civ(G().playerId);
  PC.tile = (i) => G().map.tiles[i];
  PC.tileCR = (c, r) => { const m = G().map; return (c < 0 || r < 0 || c >= m.cols || r >= m.rows) ? null : m.tiles[r * m.cols + c]; };
  PC.neighbors = (t) => PC.hexNeighborsCR(t.c, t.r).map(([c, r]) => PC.tileCR(c, r)).filter(Boolean);
  PC.dist = (a, b) => PC.hexDistCR(a.c, a.r, b.c, b.r);
  PC.tilesWithin = (t, rad) => G().map.tiles.filter((u) => u && PC.dist(t, u) <= rad);
  PC.cityAt = (i) => { const t = PC.tile(i); return t && t.cityId ? PC.cityById(t.cityId) : null; };
  PC.cityById = (id) => G().cities.find((c) => c.id === id);
  PC.unitsAt = (i) => G().units.filter((u) => u.t === i);
  PC.civCities = (civ) => G().cities.filter((c) => c.civ === civ.id);
  PC.civUnits = (civ) => G().units.filter((u) => u.civ === civ.id);
  PC.hasTech = (civ, id) => !!civ.techs[id];
  PC.utype = (u) => PC.UNITS[u.type];
  PC.isMil = (u) => PC.UNITS[u.type].cat === 'military';

  PC.log = function (text, type, civIds) {
    const g = G();
    g.log.push({ turn: g.turn, year: g.year, text, type: type || 'info' });
    if (g.log.length > 600) g.log.shift();
    if (!civIds || civIds.includes(g.playerId)) g.notices.push({ text, type: type || 'info' });
  };

  // --- Relaciones
  PC.rel = function (a, b) {
    const A = typeof a === 'object' ? a : PC.civ(a);
    const id = typeof b === 'object' ? b.id : b;
    if (!A.rel[id]) A.rel[id] = { war: false, att: 0, since: 0 };
    return A.rel[id];
  };
  PC.atWar = (a, b) => a !== b && PC.rel(a, b).war;
  PC.declareWar = function (a, b, quiet) {
    if (a.id === b.id || PC.atWar(a.id, b.id)) return;
    PC.rel(a, b).war = true; PC.rel(b, a).war = true;
    PC.rel(a, b).since = PC.rel(b, a).since = G().turn;
    PC.rel(b, a).att -= 40;
    PC.rel(a, b).warScore = 0; PC.rel(b, a).warScore = 0;
    PC.cancelRoutes && PC.cancelRoutes(a.id, b.id);
    if (!quiet) PC.log(`${a.name} declara la guerra a ${b.name}.`, 'war', [a.id, b.id]);
    if (PC.onWarDeclared) PC.onWarDeclared(a, b);
  };
  PC.addWarScore = function (aId, bId, v) {
    if (aId === bId) return;
    PC.rel(aId, bId).warScore = (PC.rel(aId, bId).warScore || 0) + v;
    PC.rel(bId, aId).warScore = (PC.rel(bId, aId).warScore || 0) - v;
  };
  PC.makePeace = function (a, b) {
    if (!PC.atWar(a.id, b.id)) return;
    PC.rel(a, b).war = false; PC.rel(b, a).war = false;
    PC.rel(a, b).since = PC.rel(b, a).since = G().turn;
    PC.rel(a, b).att += 15; PC.rel(b, a).att += 15;
    PC.rel(a, b).warScore = 0; PC.rel(b, a).warScore = 0;
    PC.log(`${a.name} y ${b.name} firman la paz.`, 'war', [a.id, b.id]);
  };

  // --- Civilizaciones
  PC.addCiv = function (o) {
    const g = G();
    const civ = Object.assign({
      id: g.civs.length + 1, key: o.key, name: o.name, color: o.color, leader: o.leader || '', isPlayer: !!o.isPlayer,
      alive: true, gold: 20, techs: {}, research: null, progress: 0, stability: 60, culture: 0, bonus: o.bonus || {},
      rel: {}, capitalId: null, external: !!o.external, selva: !!o.selva, stabMods: [], born: g.year
    }, o.extra || {});
    if (civ.selva) civ.bonus = Object.assign({ selvaNative: true }, civ.bonus);
    g.civs.push(civ);
    return civ;
  };
  PC.grantTech = function (civ, id, quiet) {
    if (civ.techs[id]) return;
    civ.techs[id] = G().year;
    if (civ.research === id) { civ.research = null; }
    if (!quiet) PC.log(`${civ.name} descubre: ${PC.TECH[id].name}.`, 'tech', [civ.id]);
    if (PC.onTech) PC.onTech(civ, id);
  };
  PC.baselineTechs = function (year) {
    return PC.TECHS.filter((t) => t.hy !== null && t.hy !== undefined && t.hy <= year).map((t) => t.id);
  };
  PC.eraOf = function (civ) {
    let e = 0;
    Object.keys(civ.techs).forEach((id) => { if (PC.TECH[id] && PC.TECH[id].era > e) e = PC.TECH[id].era; });
    return e;
  };
  PC.civHasRes = function (civ, res) {
    return G().map.tiles.some((t) => t && t.owner === civ.id && t.res === res && PC.resVisible(civ, res));
  };
  // Acceso a un recurso para investigar: propio, o por comercio con un vecino en paz (más caro).
  // Tras el contacto con Europa, el hierro, el carbón y el salitre llegan también por el comercio transatlántico.
  PC.resAccess = function (civ, res) {
    if (PC.civHasRes(civ, res)) return 'own';
    const g = G();
    const partner = g.civs.some((o) => o.alive && o.id !== civ.id && !PC.atWar(civ.id, o.id) && PC.rel(civ, o).att > -30 &&
      g.map.tiles.some((t) => t && t.owner === o.id && t.res === res));
    if (partner) return 'trade';
    if (g.flags.espanaLlego && g.year >= g.flags.espanaLlego + 20 && ['hierro', 'carbon', 'salitre'].includes(res) && !civ.external) return 'trade';
    return null;
  };
  PC.techAccess = function (civ, id) {
    const t = PC.TECH[id];
    if (!t.needs) return 'own';
    let acc = t.needs.map((r) => PC.resAccess(civ, r));
    // Realista: las tecnologías de historia alternativa exigen el recurso en territorio propio.
    if (civ.isPlayer && PC.diff().histAI && (t.hy === null || t.hy === undefined)) acc = acc.map((a) => (a === 'own' ? 'own' : null));
    return acc.includes('own') ? 'own' : acc.includes('trade') ? 'trade' : null;
  };
  PC.resVisible = (civ, res) => { const R = PC.RESOURCES[res]; return !R.reveal || PC.hasTech(civ, R.reveal); };
  PC.techCost = function (civ, id) {
    const t = PC.TECH[id];
    let c = t.cost * (1 + 0.3 * t.era);
    if (civ.bonus.cheap && civ.bonus.cheap.includes(id)) c *= 0.7;
    // Difusión: más barato si otras civilizaciones ya la conocen.
    const known = G().civs.filter((o) => o.alive && o.id !== civ.id && o.techs[id]).length;
    c *= Math.max(0.6, 1 - 0.08 * known);
    if (t.needs && PC.techAccess(civ, id) === 'trade') c *= 1.5;
    if (civ.isPlayer && (t.hy === null || t.hy > G().year + 300)) c *= PC.diff().altTech;
    return Math.ceil(c);
  };
  PC.techMissing = function (civ, id) {
    const t = PC.TECH[id];
    const miss = [];
    t.req.forEach((r) => { if (!civ.techs[r]) miss.push(PC.TECH[r].name); });
    if (t.needs && !PC.techAccess(civ, id)) miss.push('recurso: ' + t.needs.map((r) => PC.RESOURCES[r].name).join(' o '));
    if (t.needsFlag && !(civ.flags && civ.flags[t.needsFlag]) && !G().flags[t.needsFlag + '_' + civ.id]) miss.push('caballos (contacto con Europa)');
    return miss;
  };
  PC.canResearch = (civ, id) => !civ.techs[id] && PC.techMissing(civ, id).length === 0;
  PC.availableTechs = (civ) => PC.TECHS.filter((t) => PC.canResearch(civ, t.id));

  PC.capacity = function (civ) {
    let c = 3 + (civ.bonus.capacity || 0);
    [['quipu', 2], ['administracion', 4], ['escritura', 2], ['imprenta', 2], ['universidad', 2], ['ferrocarril', 3], ['radio', 4], ['computacion', 4]]
      .forEach(([t, v]) => { if (civ.techs[t]) c += v; });
    return c;
  };
  PC.power = function (civ) {
    let p = 0;
    PC.civUnits(civ).forEach((u) => { const U = PC.utype(u); if (U.cat === 'military') p += (U.atk + U.def) / 2 * (0.4 + 0.6 * u.hp / 100); });
    PC.civCities(civ).forEach((c) => { p += 2 + c.pop; });
    return Math.round(p);
  };

  // --- Rendimientos
  PC.tileYield = function (civ, t) {
    const T = PC.TERRAIN[t.terrain];
    let f = T.f, p = T.p, g = T.g;
    if (t.feature === 'rio') { f += 1; g += 1; }
    if (t.res && (!civ || PC.resVisible(civ, t.res))) { const R = PC.RESOURCES[t.res]; f += R.f; p += R.p; g += R.g; }
    if (t.imp) { const I = PC.IMPROVEMENTS[t.imp]; f += I.f || 0; p += I.p || 0; g += I.g || 0; }
    if (civ) {
      if (t.terrain === 'oceano' && civ.techs.pesca) f += 1;
      if (t.terrain === 'puna' && civ.techs.camelidos) p += 1;
      if (t.terrain === 'valle' && civ.techs.puquios) f += 1;
      if (t.terrain === 'valle' && civ.bonus.valleFood) f += civ.bonus.valleFood;
      if (t.imp === 'mina' && (t.res === 'oro' || t.res === 'plata') && civ.bonus.goldMines) g += civ.bonus.goldMines;
      if ((t.terrain === 'valle' || t.imp === 'chacra') && civ.techs.fertilizantes) f += 1;
      if (t.imp === 'mina' && civ.techs.vapor) p += 1;
      const zy = civ.bonus.zoneYield && civ.bonus.zoneYield[t.zone];
      if (zy) { f += zy.f || 0; p += zy.p || 0; g += zy.g || 0; }
    }
    return { f, p, g };
  };
  PC.cityWorkRadius = (city) => (city.culture >= 30 ? 2 : 1);
  PC.isCoastal = (city) => PC.neighbors(PC.tile(city.t)).some((t) => t.terrain === 'oceano');
  PC.cityBuildings = (city) => city.buildings.map((b) => PC.BUILDINGS[b] || PC.WONDERS[b]).filter(Boolean);

  PC.cityYields = function (city) {
    const civ = PC.civ(city.civ);
    const center = PC.tile(city.t);
    const enemyAt = new Set(G().units.filter((u) => u.civ !== civ.id && PC.atWar(civ.id, u.civ)).map((u) => u.t));
    const cand = PC.tilesWithin(center, PC.cityWorkRadius(city)).filter((t) => t !== center && t.owner === civ.id && !t.cityId && !enemyAt.has(t.i));
    const scored = cand.map((t) => { const y = PC.tileYield(civ, t); return { t, y, s: y.f * 2.2 + y.p * 1.6 + y.g }; }).sort((a, b) => b.s - a.s);
    const worked = scored.slice(0, city.pop);
    const cy = PC.tileYield(civ, center);
    let f = Math.max(2, cy.f) + 1, p = Math.max(1, cy.p) + 1, g = Math.max(1, cy.g), s = 1 + city.pop * 0.8, c = 1;
    worked.forEach((w) => { f += w.y.f; p += w.y.p; g += w.y.g; });
    PC.cityBuildings(city).forEach((b) => { if (b.y) { f += b.y.f || 0; p += b.y.p || 0; g += b.y.g || 0; s += b.y.s || 0; c += b.y.c || 0; } });
    c += civ.bonus.culture || 0; g += civ.bonus.gold || 0; p += civ.bonus.prod || 0;
    if (civ.capitalId === city.id) { p += 2 + (civ.bonus.capitalProd || 0); g += 2; s += 1; c += 1; }
    G().routes && G().routes.forEach((r) => { if (r.from === city.id || r.to === city.id) g += 2 + Math.floor(PC.eraOf(civ) / 2); });
    let mult = 1;
    if (civ.stability >= 70) mult = 1.1; else if (civ.stability < 35) mult = 0.85;
    if (!civ.isPlayer) mult *= PC.diff().aiYield;
    const pm = mult * (civ.techs.rueda ? 1.1 : 1);
    return { f: Math.round(f), p: Math.round(p * pm), g: Math.round(g * mult), s: Math.round(s * mult), c: Math.round(c), worked: worked.map((w) => w.t.i) };
  };
  PC.growthNeeded = (city) => {
    const civ = PC.civ(city.civ);
    return Math.floor((12 + 8 * city.pop + city.pop * city.pop * 0.6) * (civ.techs.ceramica ? 0.85 : 1) * (1 - (civ.bonus.growth || 0) / 100));
  };

  // --- Ciudades
  PC.validCitySite = function (t, civ) {
    if (!t || ['oceano', 'lago', 'cordillera'].includes(t.terrain)) return false;
    if (t.owner && civ && t.owner !== civ.id) return false;
    const min = G().map.minCityDist || 3;
    return !G().cities.some((c) => PC.dist(PC.tile(c.t), t) < min);
  };
  PC.siteScore = function (t, civ) {
    if (!PC.validCitySite(t, civ)) return -1;
    let s = 0;
    PC.tilesWithin(t, 1).forEach((u) => {
      if (u.owner && civ && u.owner !== civ.id) return;
      const y = PC.tileYield(civ, u);
      s += y.f * 1.6 + y.p + y.g * 0.8 + (u.res ? 1.5 : 0);
    });
    if (PC.neighbors(t).some((u) => u.terrain === 'oceano')) s += 2;
    if (civ && !civ.selva && t.zone === 'selva') s *= 0.6;
    return s;
  };
  PC.cityName = function (civ, t) {
    const used = new Set(G().cities.map((c) => c.name));
    const names = (PC.CITY_NAMES[t.region] || []).filter((n) => !used.has(n));
    if (names.length) return names[0];
    const rg = G().map.regions.find((r) => r.id === t.region);
    let base = rg ? rg.name.split(/[ (-]/)[0] : 'Llacta', n = 2;
    while (used.has(base + ' ' + n)) n++;
    return base + ' ' + n;
  };
  PC.foundCity = function (civ, t, name, pop) {
    const g = G();
    const city = { id: PC.uid(), name: name || PC.cityName(civ, t), civ: civ.id, t: t.i, pop: pop || 1, food: 0, prod: 0, build: null,
      buildings: [], culture: 0, hp: 100, founded: g.year, origCiv: civ.id, conquered: false };
    g.cities.push(city);
    t.cityId = city.id; t.owner = civ.id; t.road = true;
    if (t.imp && !['mina', 'pozo'].includes(t.imp)) t.imp = null;
    PC.claimTiles(city, 1);
    if (!civ.capitalId) civ.capitalId = city.id;
    PC.log(`${civ.name} funda ${city.name}.`, 'city', [civ.id]);
    return city;
  };
  PC.claimTiles = function (city, rad) {
    PC.tilesWithin(PC.tile(city.t), rad).forEach((t) => { if (!t.owner) t.owner = city.civ; });
  };
  PC.captureCity = function (city, newCivId) {
    const g = G();
    const old = PC.civ(city.civ), nc = PC.civ(newCivId);
    const wasCapital = old.capitalId === city.id;
    city.civ = nc.id; city.hp = 50; city.pop = Math.max(1, city.pop - 1); city.build = null; city.prod = 0;
    city.conquered = city.origCiv !== nc.id;
    city.buildings = city.buildings.filter((b) => PC.WONDERS[b] || PC.chance(0.5));
    PC.tilesWithin(PC.tile(city.t), PC.cityWorkRadius(city)).forEach((t) => {
      if (t.owner === old.id && !t.cityId) t.owner = nc.id;
    });
    PC.tile(city.t).owner = nc.id;
    g.units = g.units.filter((u) => !(u.t === city.t && u.civ !== nc.id));
    PC.log(`${nc.name} conquista ${city.name} (antes de ${old.name}).`, 'war', [old.id, nc.id]);
    if (wasCapital) {
      const rest = PC.civCities(old).sort((a, b) => b.pop - a.pop);
      old.capitalId = rest.length ? rest[0].id : null;
      old.stability -= 15;
    }
    if (!PC.civCities(old).length) PC.eliminate(old, nc);
    if (PC.onCityCaptured) PC.onCityCaptured(city, old, nc, wasCapital);
  };
  PC.eliminate = function (civ, by) {
    const g = G();
    civ.alive = false;
    g.units = g.units.filter((u) => u.civ !== civ.id);
    g.map.tiles.forEach((t) => { if (t && t.owner === civ.id) t.owner = null; });
    PC.log(`${civ.name} desaparece${by ? ' ante ' + by.name : ''}.`, 'war');
  };

  PC.isCoastalTile = (t) => PC.neighbors(t).some((u) => u.terrain === 'oceano');
  PC.canBuild = function (city, kind, id) {
    const civ = PC.civ(city.civ);
    if (kind === 'unit') {
      const U = PC.UNITS[id];
      if (!U || U.unique) return false;
      if (U.tech && !civ.techs[U.tech]) return false;
      if (U.needs && !U.needs.some((r) => PC.civHasRes(civ, r))) return false;
      if (id === 'colono' && city.pop < 2) return false;
      if (U.commander && PC.civUnits(civ).filter((x) => PC.UNITS[x.type].commander).length >= 1 + Math.floor(PC.civCities(civ).length / 4)) return false;
      return true;
    }
    if (kind === 'building') {
      const B = PC.BUILDINGS[id];
      if (!B || city.buildings.includes(id) || !civ.techs[B.tech]) return false;
      if (B.coastal && !PC.isCoastal(city)) return false;
      return true;
    }
    if (kind === 'wonder') {
      const W = PC.WONDERS[id];
      if (!W || G().wonders[id] || !civ.techs[W.tech]) return false;
      return true;
    }
    if (kind === 'riqueza') return true;
    return false;
  };
  PC.buildCost = function (kind, id) {
    if (kind === 'unit') return PC.UNITS[id].cost;
    if (kind === 'building') return PC.BUILDINGS[id].cost;
    if (kind === 'wonder') return PC.WONDERS[id].cost;
    return Infinity;
  };
  PC.buyCost = function (city) {
    const b = city.build;
    if (!b || b.kind === 'riqueza') return null;
    const left = PC.buildCost(b.kind, b.id) - city.prod;
    if (left <= 0) return null;
    return Math.ceil(left * (b.kind === 'wonder' ? 4 : 2) + 10);
  };
  PC.buy = function (city) {
    const civ = PC.civ(city.civ);
    const cost = PC.buyCost(city);
    if (cost === null || civ.gold < cost || city.bought === G().turn) return false;
    civ.gold -= cost;
    city.prod = PC.buildCost(city.build.kind, city.build.id);
    city.bought = G().turn;
    return true;
  };
  PC.buildOptions = function (city) {
    const out = [];
    Object.keys(PC.UNITS).forEach((id) => { if (PC.canBuild(city, 'unit', id)) out.push({ kind: 'unit', id, name: PC.UNITS[id].name, cost: PC.UNITS[id].cost }); });
    Object.keys(PC.BUILDINGS).forEach((id) => { if (PC.canBuild(city, 'building', id)) out.push({ kind: 'building', id, name: PC.BUILDINGS[id].name, cost: PC.BUILDINGS[id].cost }); });
    Object.keys(PC.WONDERS).forEach((id) => { if (PC.canBuild(city, 'wonder', id)) out.push({ kind: 'wonder', id, name: PC.WONDERS[id].name, cost: PC.WONDERS[id].cost }); });
    out.push({ kind: 'riqueza', id: 'riqueza', name: 'Producir riqueza (oro)', cost: 0 });
    return out;
  };

  // --- Unidades
  PC.maxMoves = function (u) {
    const U = PC.utype(u), civ = PC.civ(u.civ);
    let m = U.moves;
    if (civ.bonus.exploreMove && (u.type === 'explorador' || PC.tile(u.t).terrain === 'oceano')) m += civ.bonus.exploreMove;
    if (U.cat === 'military' || u.type === 'colono' || u.type === 'trabajador') {
      Object.keys(G().wonders).forEach((w) => { if (G().wonders[w] === civ.id && PC.WONDERS[w].gmove) m += PC.WONDERS[w].gmove; });
    }
    return m;
  };
  PC.spawnUnit = function (civ, type, t) {
    const g = G();
    const U = PC.UNITS[type];
    let spot = t;
    const free = (x) => x && !['oceano', 'lago'].includes(x.terrain) && !g.units.some((u) => u.t === x.i && PC.UNITS[u.type].cat === U.cat) &&
      !g.units.some((u) => u.t === x.i && u.civ !== civ.id) && (!x.cityId || PC.cityAt(x.i).civ === civ.id);
    if (!free(spot)) {
      spot = null;
      for (let rad = 1; rad <= 4 && !spot; rad++) {
        const ring = PC.tilesWithin(t, rad).filter(free);
        if (ring.length) spot = ring.sort((a, b) => PC.dist(a, t) - PC.dist(b, t))[0];
      }
    }
    if (!spot) return null;
    const u = { id: PC.uid(), type, civ: civ.id, t: spot.i, hp: 100, moves: U.moves, fort: false, moved: false, path: null, task: null, auto: false };
    if (U.commander) {
      const pool = PC.COMMANDER_NAMES[civ.key === 'espana' ? 'espana' : PC.eraOf(civ) >= 7 ? 'moderno' : 'andino'];
      const used = new Set(g.units.filter((x) => x.name).map((x) => x.name));
      if (civ.leaderId && PC.LEADERS[civ.leaderId]) used.add(PC.LEADERS[civ.leaderId].name); // el líder no aparece también como comandante
      u.name = pool.find((n) => !used.has(n)) || pool[g.units.length % pool.length];
    }
    g.units.push(u);
    return u;
  };
  // Mejora de unidades: devuelve el tipo más avanzado de su línea que la civilización puede entrenar.
  PC.upgradeTarget = function (u) {
    const civ = PC.civ(u.civ);
    const line = Object.values(PC.UNIT_LINES).find((l) => l.includes(u.type));
    if (!line) return null;
    let best = null;
    for (let k = line.indexOf(u.type) + 1; k < line.length; k++) {
      const U = PC.UNITS[line[k]];
      if ((!U.tech || civ.techs[U.tech]) && (!U.needs || U.needs.some((r) => PC.civHasRes(civ, r)))) best = line[k];
    }
    return best;
  };
  PC.upgradeCost = function (u) {
    const to = PC.upgradeTarget(u);
    return to ? Math.round((PC.UNITS[to].cost - PC.UNITS[u.type].cost) * 1.5 + 10) : null;
  };
  PC.upgradeUnit = function (u) {
    const civ = PC.civ(u.civ), to = PC.upgradeTarget(u), cost = PC.upgradeCost(u);
    if (!to || civ.gold < cost || u.moves <= 0) return false;
    const from = PC.UNITS[u.type].name;
    civ.gold -= cost; u.type = to; u.moves = 0; u.fort = false; u.hp = Math.max(u.hp, 50);
    if (civ.isPlayer) PC.log(`${from} se moderniza: ahora es ${PC.UNITS[to].name}.`, 'city', [civ.id]);
    return true;
  };
  PC.removeUnit = (u) => { G().units = G().units.filter((x) => x !== u); };

  PC.canEmbark = (civ) => !!civ.techs.navegacion;
  PC.moveCost = function (u, from, to) {
    const civ = PC.civ(u.civ);
    const T = PC.TERRAIN[to.terrain];
    if (to.terrain === 'oceano') return PC.canEmbark(civ) ? 99 : Infinity;
    if (from.terrain === 'oceano' && to.terrain !== 'oceano') return 99;
    if (T.move === Infinity) return Infinity;
    let c = T.move;
    if (to.feature === 'abra') c = 1;
    if (to.terrain === 'cordillera' && civ.techs.puentes && c > 2) c = 2;
    if (to.feature === 'rio' && T.zone === 'selva') c = 1;
    if (civ.bonus.selvaNative && T.zone === 'selva') c = 1;
    if (from.road && to.road) c = civ.techs.ferrocarril ? 0.34 : 0.5;
    return c;
  };
  // Casillas a las que la unidad puede llegar este turno.
  PC.reachable = function (u) {
    const g = G();
    const civ = PC.civ(u.civ);
    const U = PC.utype(u);
    const max = PC.maxMoves(u);
    const out = new Map();
    if (u.moves <= 0) return out;
    const blockers = new Map();
    g.units.forEach((o) => { if (o.civ !== u.civ) blockers.set(o.t, o); });
    const sameCat = new Set(g.units.filter((o) => o.civ === u.civ && o !== u && PC.UNITS[o.type].cat === U.cat).map((o) => o.t));
    const best = new Map([[u.t, u.moves]]);
    const queue = [u.t];
    while (queue.length) {
      queue.sort((a, b) => best.get(b) - best.get(a));
      const cur = queue.shift();
      const left = best.get(cur);
      const ct = PC.tile(cur);
      PC.neighbors(ct).forEach((nt) => {
        if (blockers.has(nt.i)) return;
        if (nt.cityId && PC.cityAt(nt.i).civ !== u.civ) return;
        const cost = PC.moveCost(u, ct, nt);
        if (cost === Infinity) return;
        if (!(left >= cost || (left === max && cur === u.t) || (cost === 99 && left > 0 && cur === u.t))) return;
        const nl = cost === 99 ? 0 : Math.max(0, left - cost);
        if ((best.get(nt.i) ?? -1) >= nl) return;
        best.set(nt.i, nl);
        if (!sameCat.has(nt.i)) out.set(nt.i, nl);
        if (nl > 0) queue.push(nt.i);
      });
    }
    void civ;
    return out;
  };
  PC.attackTargets = function (u) {
    const U = PC.utype(u);
    if (U.cat !== 'military' || U.atk <= 0 || u.moves <= 0) return [];
    const t = PC.tile(u.t);
    if (t.terrain === 'oceano') return [];
    return PC.neighbors(t).filter((nt) => {
      const enemyUnits = PC.unitsAt(nt.i).filter((o) => PC.atWar(u.civ, o.civ));
      const city = nt.cityId ? PC.cityAt(nt.i) : null;
      return enemyUnits.length || (city && PC.atWar(u.civ, city.civ));
    }).map((nt) => nt.i);
  };
  // Camino A* (multi-turno) ignorando presupuesto de movimiento.
  PC.findPath = function (u, target, opts) {
    const g = G();
    const goal = PC.tile(target);
    const enemyT = new Set(g.units.filter((o) => o.civ !== u.civ).map((o) => o.t));
    const open = [{ i: u.t, f: 0 }];
    const gs = new Map([[u.t, 0]]), prev = new Map();
    let iter = 0;
    while (open.length && iter++ < 4000) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift().i;
      if (cur === target) break;
      const ct = PC.tile(cur);
      PC.neighbors(ct).forEach((nt) => {
        if (nt.i !== target && enemyT.has(nt.i)) return;
        if (nt.i !== target && nt.cityId && PC.cityAt(nt.i).civ !== u.civ) return;
        let c = PC.moveCost(u, ct, nt);
        if (c === Infinity) return;
        if (c === 99) c = 3;
        const T = PC.TERRAIN[nt.terrain];
        if (!(opts && opts.ignoreAttr) && T.attr && nt.owner !== u.civ && !nt.road && nt.feature !== 'rio') c += T.attr / 15;
        const ng = gs.get(cur) + c;
        if (ng < (gs.get(nt.i) ?? Infinity)) {
          gs.set(nt.i, ng); prev.set(nt.i, cur);
          open.push({ i: nt.i, f: ng + PC.dist(nt, goal) });
        }
      });
    }
    if (!prev.has(target)) return null;
    const path = [];
    let x = target;
    while (x !== u.t) { path.unshift(x); x = prev.get(x); }
    return path;
  };
  // Mueve la unidad hacia una casilla alcanzable (o avanza por su ruta).
  PC.moveUnitTo = function (u, target) {
    const reach = PC.reachable(u);
    if (reach.has(target)) {
      PC.relocate(u, target, reach.get(target));
      return true;
    }
    const path = PC.findPath(u, target);
    if (!path) return false;
    u.path = path;
    return PC.followPath(u);
  };
  PC.followPath = function (u) {
    let moved = false;
    while (u.path && u.path.length && u.moves > 0) {
      const next = u.path[0];
      const reach = PC.reachable(u);
      if (!reach.has(next)) {
        // Puede que haya una unidad propia de paso: intentar saltar al siguiente tramo alcanzable.
        let k = -1;
        for (let j = Math.min(u.path.length - 1, 4); j >= 1; j--) if (reach.has(u.path[j])) { k = j; break; }
        if (k < 0) { if (!moved) u.path = null; break; }
        PC.relocate(u, u.path[k], reach.get(u.path[k]));
        u.path = u.path.slice(k + 1);
      } else {
        PC.relocate(u, next, reach.get(next));
        u.path.shift();
      }
      moved = true;
    }
    if (u.path && !u.path.length) u.path = null;
    return moved;
  };
  PC.relocate = function (u, ti, left) {
    const g = G();
    // Captura de civiles enemigos.
    PC.unitsAt(ti).filter((o) => o.civ !== u.civ && !PC.isMil(o)).forEach((o) => {
      if (PC.isMil(u) && PC.atWar(u.civ, o.civ)) {
        PC.removeUnit(o);
        if (o.type === 'trabajador' || o.type === 'colono') { const w = PC.spawnUnit(PC.civ(u.civ), 'trabajador', PC.tile(ti)); if (w) w.moves = 0; }
        PC.log(`${PC.civ(u.civ).name} captura un ${PC.UNITS[o.type].name}.`, 'war', [u.civ, o.civ]);
      }
    });
    u.t = ti; u.moves = left; u.moved = true; u.fort = false;
    if (u.civ === g.playerId) PC.updateVisibility();
  };

  // --- Combate
  PC.unitStrength = function (u, role, t) {
    const U = PC.utype(u), civ = PC.civ(u.civ);
    let base = role === 'atk' ? U.atk : U.def;
    if (role === 'def' && civ.techs.bronce && U.cat === 'military') base += 1;
    if (role === 'atk' && civ.techs.acero && ['infante_hierro', 'lancero'].includes(u.type)) base += 2;
    let mult = 1;
    if (role === 'atk' && civ.bonus.atk) mult *= 1 + civ.bonus.atk / 100;
    if (role === 'def') {
      if (t.terrain === 'oceano') return civ.bonus.seaDef ? Math.max(1, base * 0.5 * (1 + civ.bonus.seaDef / 100) * (0.5 + 0.5 * u.hp / 100)) : 1;
      mult *= 1 + PC.TERRAIN[t.terrain].def + (t.feature === 'abra' ? 0.25 : 0);
      if (u.fort) mult *= 1.25;
      const city = t.cityId ? PC.cityAt(t.i) : null;
      if (city) mult *= 1.25 + PC.cityDefBonus(city) + (civ.bonus.cityDef || 0) / 100;
    }
    if (civ.selva && PC.TERRAIN[t.terrain].zone === 'selva') mult *= 1.25;
    if (role === 'def' && civ.bonus.defense) mult *= 1 + civ.bonus.defense / 100;
    if (role === 'def' && civ.bonus.mountainDef && (t.terrain === 'sierra' || t.terrain === 'cordillera' || t.terrain === 'puna')) mult *= 1 + civ.bonus.mountainDef / 100;
    if (!U.commander && PC.commanderNear(u)) mult *= 1.2;
    return Math.max(0.5, base * mult * (0.5 + 0.5 * u.hp / 100));
  };
  PC.commanderNear = function (u) {
    const t = PC.tile(u.t);
    return G().units.some((o) => o.civ === u.civ && o !== u && PC.UNITS[o.type].commander && PC.dist(PC.tile(o.t), t) <= 1);
  };
  PC.cityDefBonus = function (city) {
    const civ = PC.civ(city.civ);
    let d = 0;
    PC.cityBuildings(city).forEach((b) => { d += b.def || 0; });
    Object.keys(G().wonders).forEach((w) => { if (G().wonders[w] === civ.id && PC.WONDERS[w].gdef) d += PC.WONDERS[w].gdef; });
    return d;
  };
  PC.cityStrength = function (city) {
    const civ = PC.civ(city.civ);
    const base = 3 + city.pop + PC.eraOf(civ) * 2.5;
    return base * (1 + PC.cityDefBonus(city) + (civ.bonus.cityDef || 0) / 100) * (1 + PC.TERRAIN[PC.tile(city.t).terrain].def) * (0.5 + 0.5 * city.hp / 100);
  };
  PC.bestDefender = function (ti, attackerCiv) {
    const defs = PC.unitsAt(ti).filter((o) => PC.isMil(o) && PC.atWar(attackerCiv, o.civ));
    if (!defs.length) return null;
    return defs.sort((a, b) => PC.unitStrength(b, 'def', PC.tile(ti)) - PC.unitStrength(a, 'def', PC.tile(ti)))[0];
  };
  PC.combatOdds = function (u, ti) {
    const t = PC.tile(ti);
    const A = PC.unitStrength(u, 'atk', PC.tile(u.t));
    const d = PC.bestDefender(ti, u.civ);
    const city = t.cityId ? PC.cityAt(ti) : null;
    const D = d ? PC.unitStrength(d, 'def', t) : city ? PC.cityStrength(city) : 0.5;
    const civ = PC.civ(u.civ);
    let a = A;
    if (city && civ.bonus.atkCity) a *= 1 + civ.bonus.atkCity / 100;
    const foe = d ? PC.civ(d.civ) : city ? PC.civ(city.civ) : null;
    if (foe && foe.external && civ.bonus.atkVsExternal) a *= 1 + civ.bonus.atkVsExternal / 100;
    return { A: a, D, ratio: a / D };
  };
  PC.attack = function (u, ti) {
    const g = G();
    const t = PC.tile(ti);
    const U = PC.utype(u);
    const atkCiv = PC.civ(u.civ);
    const def = PC.bestDefender(ti, u.civ);
    const city = t.cityId ? PC.cityAt(ti) : null;
    const { A, D } = PC.combatOdds(u, ti);
    const ratio = A / D;
    const r1 = 0.8 + PC.rand() * 0.4, r2 = 0.8 + PC.rand() * 0.4;
    const dmgD = Math.round(30 * Math.pow(ratio, 0.75) * r1);
    const dmgA = U.ranged ? 0 : Math.round(30 / Math.pow(ratio, 0.75) * r2);
    u.moves = 0; u.moved = true; u.fort = false;
    let text;
    if (def) {
      def.hp -= dmgD; u.hp -= dmgA;
      const dn = PC.UNITS[def.type].name, dc = PC.civ(def.civ);
      if (def.hp <= 0) {
        PC.removeUnit(def);
        PC.addWarScore(u.civ, def.civ, 5);
        text = `${atkCiv.name} (${U.name}) destruye a ${dn} de ${dc.name}.`;
        if (!U.ranged && u.hp > 0 && !PC.bestDefender(ti, u.civ) && !city) PC.relocate(u, ti, 0);
      } else text = `${U.name} de ${atkCiv.name} ataca a ${dn} de ${dc.name} (−${dmgD} / −${dmgA}).`;
      PC.log(text, 'war', [u.civ, def.civ]);
    } else if (city) {
      city.hp -= Math.round(dmgD * 0.8); u.hp -= dmgA;
      if (city.hp <= 0 && !U.ranged && u.hp > 0) {
        PC.addWarScore(u.civ, city.civ, 25);
        PC.captureCity(city, u.civ);
        PC.relocate(u, ti, 0);
      } else {
        city.hp = Math.max(1, city.hp);
        PC.log(`${atkCiv.name} asalta ${city.name} (muralla ${city.hp}/100).`, 'war', [u.civ, city.civ]);
      }
    }
    if (u.hp <= 0) { PC.removeUnit(u); PC.log(`${U.name} de ${atkCiv.name} cae en combate.`, 'war', [u.civ]); }
    if (PC.onCombat) PC.onCombat(u, def, city);
    return true;
  };

  // --- Trabajadores
  PC.improvementOptions = function (u) {
    const civ = PC.civ(u.civ), t = PC.tile(u.t);
    const out = [];
    if (t.cityId || t.terrain === 'oceano' || (t.owner && t.owner !== civ.id)) return out;
    Object.keys(PC.IMPROVEMENTS).forEach((id) => {
      const I = PC.IMPROVEMENTS[id];
      if (t.imp === id || !civ.techs[I.tech]) return;
      if (I.terrains && !I.terrains.includes(t.terrain)) return;
      if (I.needsRes && !(t.res && I.needsRes.includes(t.res) && PC.resVisible(civ, t.res))) return;
      if (id === 'mina' && !(t.res && PC.RESOURCES[t.res].mineral) && !['sierra', 'cordillera', 'puna'].includes(t.terrain)) return;
      if (id === 'chacra' && t.res && PC.RESOURCES[t.res].mineral) return;
      out.push({ id, name: I.name, turns: I.turns });
    });
    if (!t.road && civ.techs.caminos) out.push({ id: 'camino', name: PC.ROAD.name, turns: PC.ROAD.turns });
    return out;
  };
  PC.startWork = function (u, id) {
    const opts = PC.improvementOptions(u).find((o) => o.id === id);
    if (!opts) return false;
    u.task = { id, left: opts.turns, t: u.t };
    u.moves = 0;
    return true;
  };
  function progressWork(u) {
    if (!u.task) return;
    if (u.task.t !== u.t) { u.task = null; return; }
    u.task.left--;
    if (u.task.left <= 0) {
      const t = PC.tile(u.t);
      if (u.task.id === 'camino') t.road = true; else t.imp = u.task.id;
      if (!t.owner) t.owner = u.civ;
      if (PC.onImprovement) PC.onImprovement(u, t);
      u.task = null;
    }
  }

  // --- Visibilidad (niebla de guerra; densa en la selva)
  PC.seesSelva = (civ) => civ.bonus.selvaNative || civ.techs.amazonia;
  PC.updateVisibility = function () {
    const g = G();
    const civ = PC.player();
    if (!civ) return;
    const vis = new Set();
    const see = (from, rad) => {
      PC.tilesWithin(from, rad).forEach((t) => {
        const d = PC.dist(from, t);
        if (d >= 2 && PC.TERRAIN[t.terrain].zone === 'selva' && !PC.seesSelva(civ)) return;
        vis.add(t.i);
      });
    };
    PC.civUnits(civ).forEach((u) => see(PC.tile(u.t), PC.tile(u.t).terrain === 'cordillera' ? 3 : 2));
    PC.civCities(civ).forEach((c) => see(PC.tile(c.t), 2));
    g.map.tiles.forEach((t) => { if (t && t.owner === civ.id) vis.add(t.i); });
    g.visible = vis;
    vis.forEach((i) => { g.explored[i] = g.turn; });
  };
  PC.isVisible = (i) => (G().revealAll ? true : G().visible && G().visible.has(i));
  PC.isExplored = (i) => (G().revealAll ? true : G().explored[i] >= 0);

  // --- Cohesión (estabilidad)
  PC.stabilityTarget = function (civ) {
    const cities = PC.civCities(civ);
    const parts = [];
    let t = 60;
    parts.push(['Base', 60]);
    if (civ.bonus.stab) { t += civ.bonus.stab; parts.push(['Cultura y líder', civ.bonus.stab]); }
    let bs = 0;
    cities.forEach((c) => PC.cityBuildings(c).forEach((b) => { bs += b.stab || 0; }));
    if (cities.length) { const v = Math.round(bs / cities.length * 2); if (v) { t += v; parts.push(['Templos y edificios', v]); } }
    let ws = 0;
    Object.keys(G().wonders).forEach((w) => { if (G().wonders[w] === civ.id) ws += PC.WONDERS[w].gstab || 0; });
    if (ws) { t += ws; parts.push(['Maravillas', ws]); }
    const over = cities.length - PC.capacity(civ);
    if (over > 0) { t -= over * 4; parts.push(['Exceso de ciudades', -over * 4]); }
    const conq = cities.filter((c) => c.conquered).length;
    if (conq && !civ.bonus.noConqPenalty) { const v = conq * (civ.techs.mitmaq ? 1 : 3); t -= v; parts.push(['Pueblos conquistados', -v]); }
    if (civ.gold < 0) { t -= 12; parts.push(['Bancarrota', -12]); }
    const wars = G().civs.filter((o) => o.alive && PC.atWar(civ.id, o.id) && PC.power(o) > PC.power(civ)).length;
    if (wars) { const v = Math.min(0, -wars * 5 + (civ.bonus.warStab || 0)); t += v; parts.push(['Guerra contra potencias', v]); }
    civ.stabMods.forEach((m) => { t += m.v; parts.push([m.name, m.v]); });
    return { value: PC.clamp(Math.round(t), 0, 100), parts };
  };
  PC.addStabMod = (civ, name, v, turns) => civ.stabMods.push({ name, v, turns });

  // --- Turno de una civilización (economía y mantenimiento)
  PC.processCiv = function (civ) {
    const g = G();
    if (!civ.alive) return;
    let gold = 0, sci = 0, cult = 0;
    PC.civCities(civ).forEach((city) => {
      const y = PC.cityYields(city);
      gold += y.g; sci += y.s; cult += y.c;
      city.culture += y.c;
      if (city.culture >= 30 && !city.expanded) { city.expanded = true; PC.claimTiles(city, 2); }
      city.hp = Math.min(100, city.hp + 10);
      // Crecimiento
      city.food += y.f - city.pop * 2;
      const need = PC.growthNeeded(city);
      if (city.food >= need) {
        city.pop++; city.food = city.buildings.includes('qollqa') ? Math.floor(need * 0.25) : 0;
      } else if (city.food < 0) {
        if (city.pop > 1) { city.pop--; PC.log(`Hambruna en ${city.name}.`, 'city', [civ.id]); }
        city.food = 0;
      }
      // Producción
      if (!city.build && !civ.isPlayer && PC.aiChooseBuild) city.build = PC.aiChooseBuild(city);
      if (!city.build && civ.isPlayer && g.autoplay && PC.aiChooseBuild) city.build = PC.aiChooseBuild(city);
      const b = city.build;
      if ((!civ.isPlayer || g.autoplay) && b && b.kind !== 'wonder') {
        const bc = PC.buyCost(city);
        if (bc !== null && civ.gold > bc * 2 + 40) PC.buy(city);
      }
      if (!b || b.kind === 'riqueza') { gold += Math.floor(y.p / 2); }
      else {
        if (!PC.canBuild(city, b.kind, b.id)) {
          if (b.kind === 'wonder' && g.wonders[b.id]) PC.log(`Otra civilización completó ${PC.WONDERS[b.id].name}; ${city.name} pierde el proyecto.`, 'city', [civ.id]);
          city.build = null;
        } else {
          city.prod += y.p;
          const cost = PC.buildCost(b.kind, b.id);
          if (city.prod >= cost) {
            city.prod -= cost;
            PC.completeBuild(city, b);
          }
        }
      }
    });
    // Mantenimiento militar
    const mil = PC.civUnits(civ).filter(PC.isMil).length;
    const era = PC.eraOf(civ);
    const upkeep = Math.max(0, mil - PC.civCities(civ).length * 2) * (1 + Math.floor(era / 3));
    const bUpkeep = PC.civCities(civ).reduce((s2, c) => s2 + c.buildings.filter((b) => PC.BUILDINGS[b]).length, 0);
    gold -= upkeep + Math.round(bUpkeep * (0.5 + era * 0.15));
    if (civ.tribute) { const tr = Math.max(0, Math.floor(gold * civ.tribute)); gold -= tr; }
    civ.gold += gold; civ.lastIncome = gold; civ.lastSci = sci; civ.lastCult = cult;
    civ.culture += cult;
    // Investigación
    civ.progress += sci;
    if (!civ.research && (!civ.isPlayer || g.autoplay) && PC.aiChooseTech) civ.research = PC.aiChooseTech(civ);
    if (civ.research && !PC.canResearch(civ, civ.research)) civ.research = null;
    if (civ.research && civ.progress >= PC.techCost(civ, civ.research)) {
      civ.progress -= PC.techCost(civ, civ.research);
      PC.grantTech(civ, civ.research);
      civ.research = null;
    }
    if (!civ.research) civ.progress = Math.min(civ.progress, 400 + PC.eraOf(civ) * 300);
    // Cohesión
    civ.stabMods.forEach((m) => { m.turns--; });
    civ.stabMods = civ.stabMods.filter((m) => m.turns > 0);
    const tgt = PC.stabilityTarget(civ).value;
    civ.stability = PC.clamp(civ.stability + (tgt - civ.stability) * 0.25, 0, 100);
    // La IA moderniza sus unidades cuando le sobra oro.
    if (!civ.isPlayer || g.autoplay) PC.civUnits(civ).forEach((u) => { const c = PC.upgradeCost(u); if (c !== null && civ.gold > c * 2 + 30 && u.moves > 0) PC.upgradeUnit(u); });
    // Unidades: trabajo, curación, desgaste
    PC.civUnits(civ).forEach((u) => {
      progressWork(u);
      const t = PC.tile(u.t);
      const inCity = !!t.cityId;
      if (!u.moved) {
        let h = 10;
        if (t.owner === civ.id) h = 15;
        if (inCity) { h = 25; if (PC.cityAt(t.i).buildings.includes('tambo')) h += 15; }
        h += civ.bonus.heal || 0;
        if (u.heal) h += 5;
        u.hp = Math.min(100, u.hp + h);
      }
      if (PC.faunaRisk(u, t) > 0 && PC.rand() < PC.faunaRisk(u, t)) {
        const F = PC.FAUNA[t.fauna];
        u.hp -= F.dmg;
        if (civ.isPlayer) PC.log(`${F.text} tu ${PC.UNITS[u.type].name}${u.hp <= 0 ? ', que no sobrevive' : ''} (−${F.dmg}).`, 'war', [civ.id]);
        if (u.hp <= 0) { PC.removeUnit(u); return; }
      }
      if (PC.isMil(u)) {
        const a = PC.attrition(u, t);
        if (a > 0) {
          u.hp -= a;
          if (u.hp <= 0) {
            PC.removeUnit(u);
            PC.log(`${PC.UNITS[u.type].name} de ${civ.name} perece por desgaste en ${PC.TERRAIN[t.terrain].name.toLowerCase()}.`, 'war', [civ.id]);
            return;
          }
        }
      }
      if (u.heal && u.hp >= 100) { u.heal = false; if (civ.isPlayer) PC.log(`${PC.UNITS[u.type].name} terminó de curarse.`, 'city', [civ.id]); }
      u.fort = !u.moved && PC.isMil(u) ? true : u.fort;
      u.moved = false;
      u.moves = PC.maxMoves(u);
    });
  };
  // Probabilidad de que la fauna amazónica hiera a la unidad este turno.
  PC.faunaRisk = function (u, t) {
    if (!t.fauna || t.cityId || t.road) return 0;
    const civ = PC.civ(u.civ);
    if (civ.bonus.selvaNative) return 0;
    const F = PC.FAUNA[t.fauna];
    let p = F.chance;
    if (t.owner === u.civ) p *= 0.5;
    if (civ.techs.amazonia) p *= 0.5;
    if (F.disease && civ.techs.medicina) p *= 0.7;
    if (F.disease && civ.techs.medicina_moderna) p *= 0.2;
    if (civ.techs.fusil) p *= 0.6;
    if (PC.utype(u).halfAttr || PC.utype(u).noAttrIn) p *= 0.5;
    return p;
  };
  PC.attrition = function (u, t) {
    const civ = PC.civ(u.civ), U = PC.utype(u);
    const T = PC.TERRAIN[t.terrain];
    if (!T.attr || t.cityId || t.owner === u.civ || t.road || t.feature === 'abra') return 0;
    if (t.feature === 'rio' && T.zone === 'selva') return 0;
    if (t.imp && PC.IMPROVEMENTS[t.imp].noAttr) return 0;
    if (T.zone === 'selva' && (civ.bonus.selvaNative || civ.bonus.selvaNoAttr || (U.noAttrIn && U.noAttrIn.includes('selva')))) return 0;
    let a = T.attr;
    if (T.zone === 'selva' && civ.techs.amazonia) a *= 0.5;
    if (t.terrain === 'cordillera' && civ.techs.puentes) a *= 0.5;
    if (civ.techs.medicina) a *= 0.8;
    if (civ.techs.medicina_moderna) a *= 0.5;
    if (U.halfAttr) a *= 0.5;
    return Math.round(a);
  };
  PC.completeBuild = function (city, b) {
    const g = G();
    const civ = PC.civ(city.civ);
    if (b.kind === 'unit') {
      if (b.id === 'colono') city.pop = Math.max(1, city.pop - 1);
      const u = PC.spawnUnit(civ, b.id, PC.tile(city.t));
      if (u && civ.isPlayer) PC.log(`${city.name} entrena: ${PC.UNITS[b.id].name}.`, 'city', [civ.id]);
      if (!civ.isPlayer || g.autoplay || b.id === 'colono' || b.id === 'trabajador') city.build = null;
    } else if (b.kind === 'building') {
      city.buildings.push(b.id);
      PC.log(`${city.name} construye: ${PC.BUILDINGS[b.id].name}.`, 'city', [civ.id]);
      city.build = null;
    } else if (b.kind === 'wonder') {
      city.buildings.push(b.id); g.wonders[b.id] = civ.id;
      PC.log(`${civ.name} completa la maravilla ${PC.WONDERS[b.id].name} en ${city.name}.`, 'history');
      civ.culture += 20;
      city.build = null;
      if (PC.onWonder) PC.onWonder(civ, b.id, city);
    }
  };

  // --- Control de provincias
  PC.regionControl = function () {
    const g = G();
    const out = {};
    g.map.regions.forEach((rg) => {
      const cnt = {};
      rg.tiles.forEach((i) => { const o = PC.tile(i).owner; if (o) cnt[o] = (cnt[o] || 0) + 1; });
      let best = null, bc = 0;
      Object.keys(cnt).forEach((o) => { if (cnt[o] > bc) { bc = cnt[o]; best = +o; } });
      const hasCity = best && rg.tiles.some((i) => { const c = PC.cityAt(i); return c && c.civ === best; });
      out[rg.id] = (best && (bc >= Math.ceil(rg.tiles.length / 2) || hasCity)) ? best : null;
    });
    return out;
  };
  PC.playerRegionCount = function () {
    const rc = PC.regionControl();
    return Object.values(rc).filter((v) => v === G().playerId).length;
  };

  // --- Fin de turno
  PC.endTurn = function () {
    const g = G();
    if (g.gameOver) return false;
    if (g.eventQueue.length) return false;
    const player = PC.player();
    PC.processCiv(player);
    g.civs.filter((c) => c.alive && !c.isPlayer).forEach((civ) => {
      try { if (PC.aiTurn) PC.aiTurn(civ); } catch (e) { console.error('IA', civ.name, e); }
      PC.processCiv(civ);
    });
    if (g.autoplay && PC.aiTurn) { PC.aiTurn(player, true); }
    PC.worldTick();
    return true;
  };
  PC.worldTick = function () {
    const g = G();
    const step = PC.yearStep(g.year, g.speed);
    const prev = g.year;
    g.year += step;
    if (prev < 0 && g.year >= 0) g.year = Math.max(1, g.year);
    g.turn++;
    // Niebla densa: la selva explorada se "cierra" si no hay presencia durante 8 turnos.
    g.map.tiles.forEach((t) => {
      if (t && PC.TERRAIN[t.terrain].zone === 'selva' && g.explored[t.i] >= 0 && g.turn - g.explored[t.i] > 8) g.explored[t.i] = -1;
    });
    if (PC.wakeSentries) PC.wakeSentries();
    if (PC.diplomacyTick) PC.diplomacyTick();
    if (PC.historyTick) PC.historyTick();
    if (PC.checkEvents) PC.checkEvents();
    const player = PC.player();
    if (!PC.civCities(player).length && !PC.civUnits(player).some((u) => u.type === 'colono')) {
      g.gameOver = { win: false, text: `${player.name} ha desaparecido de la historia en ${PC.fmtYear(g.year)}.` };
    } else if (g.year >= PC.END_YEAR) {
      g.gameOver = { win: true, text: `Has llegado a ${PC.fmtYear(g.year)}. Fin de la crónica.` };
    }
    PC.updateVisibility();
  };

  PC.score = function (civ) {
    const cities = PC.civCities(civ);
    return Math.round(cities.reduce((s, c) => s + c.pop * 4 + c.buildings.length * 2, 0) + Object.keys(civ.techs).length * 6 +
      civ.culture / 20 + Object.values(G().wonders).filter((w) => w === civ.id).length * 25 + PC.playerRegionCount() * 10);
  };
})(globalThis.PC = globalThis.PC || {});

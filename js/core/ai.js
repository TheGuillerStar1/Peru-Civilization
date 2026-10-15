// Inteligencia artificial de las facciones (y piloto automático del jugador para pruebas).
(function (PC) {
  'use strict';
  const G = () => PC.G;

  PC.aiChooseTech = function (civ) {
    const av = PC.availableTechs(civ);
    if (!av.length) return null;
    const scored = av.map((t) => {
      let s = PC.techCost(civ, t.id) * (0.8 + PC.rand() * 0.5);
      if (t.needs) s *= 0.7; // aprovechar recursos estratégicos propios
      if (['administracion', 'caminos', 'quipu', 'guerra', 'metal_cobre', 'hierro', 'polvora', 'arcabuz'].includes(t.id)) s *= 0.8;
      return { t, s };
    }).sort((a, b) => a.s - b.s);
    return scored[0].t.id;
  };

  function bestMilitary(city, opts) {
    const mil = opts.filter((o) => o.kind === 'unit' && PC.UNITS[o.id].cat === 'military' && o.id !== 'explorador');
    if (!mil.length) return null;
    return mil.sort((a, b) => (PC.UNITS[b.id].atk + PC.UNITS[b.id].def) - (PC.UNITS[a.id].atk + PC.UNITS[a.id].def))[0];
  }
  function hasSiteNear(civ) {
    return PC.civCities(civ).some((c) => PC.tilesWithin(PC.tile(c.t), 5).some((t) => PC.siteScore(t, civ) > 8));
  }

  PC.aiChooseBuild = function (city) {
    const civ = PC.civ(city.civ);
    const opts = PC.buildOptions(city);
    const units = PC.civUnits(civ);
    const cities = PC.civCities(civ);
    const mil = units.filter(PC.isMil).length;
    const garrison = units.some((u) => u.t === city.t && PC.isMil(u));
    const war = G().civs.some((o) => o.alive && PC.atWar(civ.id, o.id));
    const settlers = units.filter((u) => u.type === 'colono').length;
    const workers = units.filter((u) => u.type === 'trabajador').length;
    const pick = (o) => (o ? { kind: o.kind, id: o.id } : null);
    const bm = bestMilitary(city, opts);
    if (!garrison && bm) return pick(bm);
    if (war && mil < cities.length * 3 && bm) return pick(bm);
    if (mil < Math.ceil(cities.length * 1.3) && bm) return pick(bm);
    const maxCities = civ.external ? 0 : (civ.isPlayer ? 14 : 3 + PC.eraOf(civ));
    if (city.pop >= 3 && settlers < 1 && cities.length < maxCities && opts.some((o) => o.id === 'colono') && hasSiteNear(civ)) return { kind: 'unit', id: 'colono' };
    if (workers < Math.ceil(cities.length * 0.6) && opts.some((o) => o.id === 'trabajador')) return { kind: 'unit', id: 'trabajador' };
    const wonders = opts.filter((o) => o.kind === 'wonder');
    if (wonders.length && PC.rand() < (civ.isPlayer ? 0.5 : 0.25) && city.pop >= 3) return pick(PC.pick(wonders));
    const blds = opts.filter((o) => o.kind === 'building').sort((a, b) => a.cost - b.cost);
    if (blds.length) return pick(blds[0]);
    if (bm && mil < cities.length * 2) return pick(bm);
    return { kind: 'riqueza', id: 'riqueza' };
  };

  // --- Diplomacia
  function aiDiplomacy(civ) {
    const g = G();
    if (civ.external) return;
    const myPow = PC.power(civ);
    const others = g.civs.filter((o) => o.alive && o.id !== civ.id);
    const myTiles = new Set(g.map.tiles.filter((t) => t && t.owner === civ.id).map((t) => t.i));
    let offensive = others.filter((o) => PC.atWar(civ.id, o.id) && PC.rel(civ, o).aggressor).length;
    others.forEach((o) => {
      if (o.external) return;
      const r = PC.rel(civ, o);
      const border = g.map.tiles.some((t) => t && t.owner === o.id && PC.neighbors(t).some((n) => myTiles.has(n.i)));
      r.att = PC.clamp(r.att + (border ? -1.2 : 0.4) + (r.att < 0 ? 0.3 : -0.3), -100, 100);
      if (o.isPlayer && o.stability > 70) r.att += 0.2;
      const theirPow = PC.power(o);
      if (!r.war) {
        const aggressive = (PC.eraOf(civ) >= 3 ? 0.08 : 0.04) * PC.diff().aiAggr;
        if (border && offensive === 0 && r.att < -20 && myPow > theirPow * 1.4 && g.turn - r.since > 10 && PC.rand() < aggressive) {
          PC.declareWar(civ, o); r.aggressor = true; offensive++;
        }
      } else if (g.turn - r.since > 8) {
        const losing = myPow < theirPow * 0.8;
        if ((losing || PC.rand() < 0.04) && !(o.isPlayer && o.external)) {
          if (o.isPlayer) { if (PC.queueEvent && PC.rand() < 0.35) PC.queueEvent('propuesta_paz', { from: civ.id }); }
          else if (!(PC.power(o) > myPow * 2 && PC.rand() < 0.7)) { PC.makePeace(civ, o); r.aggressor = false; PC.rel(o, civ).aggressor = false; }
        }
      }
    });
  }

  // --- Unidades
  function nearestOwnCity(civ, t) {
    let best = null, bd = Infinity;
    PC.civCities(civ).forEach((c) => { const d = PC.dist(PC.tile(c.t), t); if (d < bd) { bd = d; best = c; } });
    return best;
  }
  function stepToward(u, target) {
    if (!u.path || u.pathTarget !== target) { u.path = PC.findPath(u, target); u.pathTarget = target; }
    if (!u.path) return false;
    // No entrar en la casilla objetivo si está ocupada por un enemigo.
    if (u.path.length === 1 && PC.unitsAt(u.path[0]).some((o) => o.civ !== u.civ)) return false;
    return PC.followPath(u);
  }
  function aiSettler(civ, u) {
    const t = PC.tile(u.t);
    if (u.target === u.t && PC.validCitySite(t, civ)) { PC.foundCity(civ, t); PC.removeUnit(u); return; }
    if (u.target === undefined || u.target === null || !PC.validCitySite(PC.tile(u.target), civ)) {
      let best = null, bs = 6;
      const origin = nearestOwnCity(civ, t);
      const cands = PC.tilesWithin(origin ? PC.tile(origin.t) : t, 6);
      cands.forEach((c) => { const s = PC.siteScore(c, civ) - PC.dist(t, c) * 0.8; if (s > bs) { bs = s; best = c; } });
      if (!best) { if (PC.validCitySite(t, civ) && PC.civCities(civ).length === 0) { PC.foundCity(civ, t); PC.removeUnit(u); } else u.target = null; return; }
      u.target = best.i; u.path = null;
    }
    stepToward(u, u.target);
    if (u.t === u.target && PC.validCitySite(PC.tile(u.t), civ)) { PC.foundCity(civ, PC.tile(u.t)); PC.removeUnit(u); }
  }
  function workValue(id, t) {
    const base = { mina: 5, andenes: 5, canal: 5, pozo: 6, plantacion: 4, corral: 4, chacra: 3, camino: 1 }[id] || 1;
    return base + (t.res ? 2 : 0);
  }
  function aiWorker(civ, u) {
    if (u.task) return;
    const here = PC.improvementOptions(u).filter((o) => o.id !== 'camino' || PC.tile(u.t).owner === civ.id);
    const t = PC.tile(u.t);
    if (here.length && t.owner === civ.id && (!t.imp || here.some((o) => o.id === 'camino'))) {
      const best = here.sort((a, b) => workValue(b.id, t) - workValue(a.id, t))[0];
      if (!t.imp || best.id === 'camino') { PC.startWork(u, best.id); return; }
    }
    // Buscar una casilla propia sin mejorar cerca de una ciudad.
    let target = null, bd = Infinity;
    PC.civCities(civ).forEach((c) => {
      PC.tilesWithin(PC.tile(c.t), 1).forEach((x) => {
        if (x.owner !== civ.id || x.imp || x.cityId || x.terrain === 'oceano' || x.terrain === 'lago') return;
        if (G().units.some((o) => o !== u && o.t === x.i && o.type === 'trabajador')) return;
        const d = PC.dist(t, x);
        if (d < bd) { bd = d; target = x; }
      });
    });
    if (target) stepToward(u, target.i);
  }
  function aiExplorer(civ, u) {
    const g = G();
    const t = PC.tile(u.t);
    if (civ.isPlayer) {
      let best = null, bd = Infinity;
      g.map.tiles.forEach((x) => { if (x && !PC.isExplored(x.i) && x.terrain !== 'oceano') { const d = PC.dist(t, x); if (d < bd) { bd = d; best = x; } } });
      if (best && stepToward(u, best.i)) return;
    }
    const opts = [...PC.reachable(u).keys()];
    if (opts.length) PC.relocate(u, PC.pick(opts), 0);
  }
  function aiMilitary(civ, u) {
    const g = G();
    const t = PC.tile(u.t);
    const U = PC.utype(u);
    // Atacar si es favorable.
    const targets = PC.attackTargets(u);
    if (targets.length) {
      const scored = targets.map((ti) => {
        const o = PC.combatOdds(u, ti);
        const city = PC.cityAt(ti);
        let s = o.ratio;
        if (city && !PC.bestDefender(ti, u.civ)) {
          const besiegers = PC.neighbors(PC.tile(ti)).filter((n) => G().units.some((x) => x.t === n.i && x.civ === u.civ && PC.isMil(x))).length;
          s += (city.hp < 50 ? 0.6 : 0.25) + 0.15 * besiegers;
        }
        return { ti, s };
      }).sort((a, b) => b.s - a.s);
      const need = civ.external ? 0.6 : 0.85;
      if (scored[0].s >= need || U.ranged) { PC.attack(u, scored[0].ti); return; }
    }
    if (u.hp < 40 && !t.cityId) {
      const c = nearestOwnCity(civ, t);
      if (c) { stepToward(u, c.t); return; }
    }
    const enemies = g.civs.filter((o) => o.alive && PC.atWar(civ.id, o.id));
    const garrisoned = (c) => g.units.some((x) => x.t === c.t && x.civ === civ.id && PC.isMil(x));
    // Guarnición: no abandonar una ciudad vacía.
    if (t.cityId && g.units.filter((x) => x.t === u.t && x.civ === civ.id && PC.isMil(x)).length === 1 && !civ.external) return;
    if (enemies.length) {
      let best = null, bd = civ.external ? 99 : 7;
      enemies.forEach((e) => {
        PC.civCities(e).forEach((c) => { const d = PC.dist(t, PC.tile(c.t)) - (e.isPlayer && civ.external ? 3 : 0); if (d < bd) { bd = d; best = c.t; } });
        PC.civUnits(e).forEach((x) => { const d = PC.dist(t, PC.tile(x.t)) + 1; if (d < bd && PC.tile(x.t).terrain !== 'oceano') { bd = d; best = x.t; } });
      });
      if (best !== null) {
        if (PC.dist(t, PC.tile(best)) <= 1) return;
        // Aproximarse a una casilla adyacente al objetivo.
        const adj = PC.neighbors(PC.tile(best)).filter((n) => PC.moveCost(u, n, n) !== Infinity && !g.units.some((x) => x.t === n.i && (x.civ !== u.civ || PC.isMil(x))))
          .sort((a, b) => PC.dist(a, t) - PC.dist(b, t));
        if (adj.length) { stepToward(u, adj[0].i); return; }
      }
    }
    const empty = PC.civCities(civ).filter((c) => !garrisoned(c));
    if (empty.length) {
      const c = empty.sort((a, b) => PC.dist(PC.tile(a.t), t) - PC.dist(PC.tile(b.t), t))[0];
      stepToward(u, c.t);
    }
  }

  PC.aiTurn = function (civ, isPlayerAuto) {
    if (!civ.alive) return;
    if (!isPlayerAuto) aiDiplomacy(civ);
    if (isPlayerAuto) {
      PC.civCities(civ).forEach((c) => { if (!c.build) c.build = PC.aiChooseBuild(c); });
      if (!civ.research) civ.research = PC.aiChooseTech(civ);
    }
    PC.civUnits(civ).slice().forEach((u) => {
      if (!G().units.includes(u) || u.moves <= 0) return;
      try {
        if (u.type === 'colono') aiSettler(civ, u);
        else if (u.type === 'trabajador') aiWorker(civ, u);
        else if (u.type === 'explorador') aiExplorer(civ, u);
        else if (PC.isMil(u)) aiMilitary(civ, u);
      } catch (e) { console.error('IA unidad', u.type, e); }
    });
  };

  // Automatizaciones para el jugador.
  PC.autoUnit = function (u) {
    const civ = PC.civ(u.civ);
    if (u.type === 'trabajador') aiWorker(civ, u);
    else if (u.type === 'explorador') aiExplorer(civ, u);
  };
})(globalThis.PC = globalThis.PC || {});

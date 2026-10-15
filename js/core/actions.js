// Acciones de unidad según su tipo y su situación (al estilo de Civilization VII):
// fundar, comerciar, arengar, fortificar, curar, saquear, centinela, modernizar, esperar, disolver…
(function (PC) {
  'use strict';
  const G = () => PC.G;

  // --- Rutas comerciales
  PC.maxRoutes = (civ) => 1 + Math.floor(PC.eraOf(civ) / 2) + (PC.leaderOf(civ).agenda === 'mercader' ? 1 : 0);
  PC.civRoutes = (civId) => (G().routes || []).filter((r) => r.a === civId || r.b === civId);
  PC.routeTarget = function (u) {
    const g = G(), civ = PC.civ(u.civ), t = PC.tile(u.t);
    if (PC.civRoutes(civ.id).length >= PC.maxRoutes(civ)) return { reason: `Ya tienes ${PC.maxRoutes(civ)} rutas, el máximo de tu era` };
    const near = g.cities.filter((c) => c.civ !== civ.id && PC.dist(PC.tile(c.t), t) <= 1);
    if (!near.length) return { reason: 'Llévala junto a una ciudad extranjera' };
    const ok = near.filter((c) => !PC.atWar(civ.id, c.civ));
    if (!ok.length) return { reason: 'No se comercia con enemigos en guerra' };
    const own = PC.civCities(civ);
    if (!own.length) return { reason: 'Necesitas una ciudad propia' };
    for (const city of ok) {
      const from = own.slice().sort((a, b) => PC.dist(PC.tile(a.t), PC.tile(city.t)) - PC.dist(PC.tile(b.t), PC.tile(city.t)))[0];
      if (!(g.routes || []).some((r) => (r.from === from.id && r.to === city.id) || (r.from === city.id && r.to === from.id))) return { city, from };
    }
    return { reason: 'Ya existe una ruta con esa ciudad' };
  };
  PC.openRoute = function (u) {
    const tg = PC.routeTarget(u);
    if (!tg.city) return false;
    const g = G();
    g.routes = g.routes || [];
    const other = PC.civ(tg.city.civ), civ = PC.civ(u.civ);
    g.routes.push({ from: tg.from.id, to: tg.city.id, a: civ.id, b: other.id, turn: g.turn });
    const bonus = PC.leaderOf(other).agenda === 'mercader' ? 22 : 12;
    PC.rel(other, civ).att += bonus; PC.rel(civ, other).att += 8;
    PC.removeUnit(u);
    PC.log(`Se abre una ruta de caravanas entre ${tg.from.name} y ${tg.city.name} (${other.name}).`, 'city', [civ.id, other.id]);
    return true;
  };
  PC.cancelRoutes = function (aId, bId) {
    const g = G();
    if (!g.routes) return;
    const before = g.routes.length;
    g.routes = g.routes.filter((r) => !((r.a === aId && r.b === bId) || (r.a === bId && r.b === aId)));
    if (g.routes.length < before) PC.log(`La guerra corta las rutas comerciales entre ${PC.civ(aId).name} y ${PC.civ(bId).name}.`, 'war', [aId, bId]);
  };

  // --- Saqueo
  PC.canPillage = function (u) {
    const t = PC.tile(u.t);
    if (u.moves <= 0) return { ok: false, reason: 'Sin movimiento este turno' };
    if (!t.owner || t.owner === u.civ || !PC.atWar(u.civ, t.owner)) return { ok: false, reason: 'Solo en territorio de un enemigo en guerra' };
    if (t.cityId) return { ok: false, reason: 'Las ciudades se asaltan, no se saquean' };
    if (!t.imp && !t.road) return { ok: false, reason: 'No hay mejoras ni caminos que saquear' };
    return { ok: true };
  };
  PC.pillage = function (u) {
    if (!PC.canPillage(u).ok) return false;
    const t = PC.tile(u.t), civ = PC.civ(u.civ), victim = PC.civ(t.owner);
    const what = t.imp ? PC.IMPROVEMENTS[t.imp].name.toLowerCase() : 'el camino';
    if (t.imp) t.imp = null; else t.road = false;
    const loot = 10 + PC.eraOf(civ) * 5;
    civ.gold += loot; u.hp = Math.min(100, u.hp + 20); u.moves = 0; u.moved = true;
    PC.addWarScore(civ.id, victim.id, 3);
    PC.rel(victim, civ).att -= 10;
    PC.log(`${civ.name} saquea ${what} de ${victim.name} y obtiene ${loot} de oro.`, 'war', [civ.id, victim.id]);
    return true;
  };

  // --- Comandantes
  PC.canRally = function (u) {
    if (!PC.UNITS[u.type].commander) return { ok: false };
    if (u.moves <= 0) return { ok: false, reason: 'Sin movimiento este turno' };
    const wait = u.lastRally !== undefined ? 5 - (G().turn - u.lastRally) : 0;
    if (wait > 0) return { ok: false, reason: `Podrá volver a arengar en ${wait} turnos` };
    const t = PC.tile(u.t);
    const hurt = G().units.filter((o) => o.civ === u.civ && o !== u && PC.isMil(o) && o.hp < 100 && PC.dist(PC.tile(o.t), t) <= 1);
    if (!hurt.length) return { ok: false, reason: 'No hay tropas heridas junto a él' };
    return { ok: true, hurt };
  };
  PC.rally = function (u) {
    const r = PC.canRally(u);
    if (!r.ok) return false;
    r.hurt.forEach((o) => { o.hp = Math.min(100, o.hp + 25); });
    u.lastRally = G().turn; u.moves = 0;
    PC.log(`${u.name || 'El comandante'} arenga a ${r.hurt.length} unidades: recuperan 25 de vida.`, 'city', [u.civ]);
    return true;
  };

  // --- Centinelas: despiertan cuando un enemigo se acerca.
  PC.wakeSentries = function () {
    const g = G();
    g.units.forEach((u) => {
      if (!u.sentry) return;
      const t = PC.tile(u.t);
      const foe = g.units.find((o) => o.civ !== u.civ && PC.atWar(u.civ, o.civ) && PC.dist(PC.tile(o.t), t) <= 2);
      if (foe) {
        u.sentry = false;
        if (u.civ === g.playerId) PC.log(`Un centinela avisa: ${PC.UNITS[foe.type].name} de ${PC.civ(foe.civ).name} a la vista.`, 'war', [u.civ]);
      }
    });
  };

  // --- Lista de acciones para la interfaz
  PC.unitActions = function (u) {
    const civ = PC.civ(u.civ), U = PC.utype(u), t = PC.tile(u.t);
    const out = [];
    const A = (id, name, icon, ok, reason, key, primary) => out.push({ id, name, icon, ok: !!ok, reason: ok ? '' : (reason || ''), key: key || '', primary: !!primary });
    if (u.type === 'colono') A('fundar', 'Fundar ciudad', 'ciudad', PC.validCitySite(t, civ), 'Muy cerca de otra ciudad o terreno inválido', 'B', true);
    if (u.type === 'caravana') { const r = PC.routeTarget(u); A('ruta', r.city ? `Abrir ruta con ${r.city.name}` : 'Abrir ruta comercial', 'oro', !!r.city, r.reason, '', true); }
    if (U.commander) { const r = PC.canRally(u); A('arengar', 'Arengar a las tropas', 'sol', r.ok, r.reason, '', true); }
    if (u.type === 'trabajador') A('auto', u.auto ? 'Detener el trabajo automático' : 'Trabajar automáticamente', 'auto', true);
    if (u.type === 'explorador') A('auto', u.auto ? 'Detener la exploración' : 'Explorar automáticamente', 'auto', true);
    if (U.cat === 'military' && !U.commander) {
      A('fortificar', 'Fortificar', 'fortificar', u.moves > 0 && !u.fort, u.fort ? 'Ya está fortificada' : 'Sin movimiento este turno', 'F');
      A('curar', 'Curar hasta sanar', 'salud', u.hp < 100, 'Tiene la vida completa', 'H');
      const p = PC.canPillage(u); A('saquear', 'Saquear', 'guerra', p.ok, p.reason, '');
    }
    A('centinela', 'Centinela', 'auto', !u.sentry, 'Ya está de guardia', 'S');
    const up = PC.upgradeTarget(u);
    if (up) { const cost = PC.upgradeCost(u); A('modernizar', `Modernizar a ${PC.UNITS[up].name} · ${cost} oro`, 'mejorar', civ.gold >= cost && u.moves > 0, civ.gold < cost ? `Necesitas ${cost} de oro` : 'Sin movimiento este turno', 'U', true); }
    if (u.path) A('cancelar', 'Cancelar ruta', 'detener', true);
    A('esperar', 'Esperar', 'saltar', true, '', 'Espacio');
    A('disolver', 'Disolver', 'cerrar', true);
    return out;
  };
  PC.doUnitAction = function (u, id) {
    const civ = PC.civ(u.civ), t = PC.tile(u.t);
    switch (id) {
      case 'fundar': if (PC.validCitySite(t, civ)) { PC.foundCity(civ, t); PC.removeUnit(u); return 'city'; } return false;
      case 'ruta': return PC.openRoute(u);
      case 'arengar': return PC.rally(u);
      case 'auto': u.auto = !u.auto; if (u.auto && PC.autoUnit) PC.autoUnit(u); return true;
      case 'fortificar': u.fort = true; u.moves = 0; return true;
      case 'curar': u.heal = true; u.fort = true; u.moves = 0; return true;
      case 'saquear': return PC.pillage(u);
      case 'centinela': u.sentry = true; u.moves = 0; return true;
      case 'modernizar': return PC.upgradeUnit(u);
      case 'cancelar': u.path = null; return true;
      case 'esperar': u.skipTurn = G().turn; return true;
      case 'disolver': PC.removeUnit(u); return true;
      default: return false;
    }
  };
})(globalThis.PC = globalThis.PC || {});

// Formato de guardado: compactación al guardar y migración tolerante al cargar.
// Versión 2: las casillas omiten lo que se puede deducir (i, c, r, y) y los valores por defecto;
// los avisos pendientes no se guardan y la crónica se recorta. Las partidas v1 siguen cargándose.
(function (PC) {
  'use strict';

  PC.SAVE_VERSION = 2;
  PC.SAVE_LOG = 200; // entradas de la crónica que se guardan

  // Valores por defecto de una casilla: si coinciden, no se escriben en el guardado.
  PC.TILE_DEFAULTS = { feature: null, fauna: null, res: null, region: null, owner: null, cityId: null, imp: null, road: false };
  const tileX = (c, r, kind) => (kind === 'peru' ? undefined : c + ((r & 1) ? 0.5 : 0));

  function packTile(t, cols, kind) {
    if (!t) return null;
    const o = {};
    Object.keys(t).forEach((k) => {
      const v = t[k];
      if (k === 'i' || k === 'c' || k === 'r' || k === 'y' || v === undefined) return;
      if (k === 'x' && v === tileX(t.c, t.r, kind)) return;
      if (k in PC.TILE_DEFAULTS && v === PC.TILE_DEFAULTS[k]) return;
      o[k] = v;
    });
    return o;
  }
  // Restaura una casilla compacta; con una casilla completa (v1) no cambia nada. Respeta claves desconocidas.
  function unpackTile(t, i, cols, kind) {
    if (!t) return null;
    const c = i % cols, r = Math.floor(i / cols);
    const x = t.x !== undefined ? t.x : c + ((r & 1) ? 0.5 : 0);
    // Mismo orden de claves que una casilla recién creada (el orden importa para el determinismo).
    const out = { i, c, r, x, y: r, lat: t.lat, lon: t.lon, zone: t.zone, terrain: t.terrain };
    Object.keys(PC.TILE_DEFAULTS).forEach((k) => { out[k] = t[k] !== undefined ? t[k] : PC.TILE_DEFAULTS[k]; });
    Object.keys(t).forEach((k) => { if (!(k in out)) out[k] = t[k]; });
    return out;
  }

  // Unidades: plantilla con el orden de claves de PC.spawnUnit; los valores por defecto no se guardan.
  PC.UNIT_TEMPLATE = [['id'], ['type'], ['civ'], ['t'], ['hp', 100], ['moves'], ['fort', false], ['moved', false], ['path', null], ['task', null], ['auto', false]];
  function packObj(o, tpl) {
    const out = Object.assign({}, o);
    tpl.forEach(([k, d]) => { if (d !== undefined && out[k] === d) delete out[k]; });
    return out;
  }
  function unpackObj(o, tpl) {
    const out = {};
    tpl.forEach(([k, d]) => { if (o[k] !== undefined) out[k] = o[k]; else if (d !== undefined) out[k] = d; });
    Object.keys(o).forEach((k) => { if (!(k in out)) out[k] = o[k]; });
    return out;
  }

  // Copia superficial del estado lista para guardar (no modifica la partida en curso).
  PC.packSave = function (g) {
    const out = Object.assign({}, g, { v: PC.SAVE_VERSION, log: (g.log || []).slice(-PC.SAVE_LOG) });
    out.units = (g.units || []).map((u) => packObj(u, PC.UNIT_TEMPLATE));
    delete out.notices;
    delete out.visible;
    if (g.map && g.map.tiles) out.map = Object.assign({}, g.map, { packed: true, tiles: g.map.tiles.map((t) => packTile(t, g.map.cols, g.map.kind)) });
    return out;
  };

  // Campos que el código actual espera en el estado. Otros módulos pueden añadir los suyos aquí.
  PC.SAVE_DEFAULTS = {
    speed: () => 'normal', difficulty: () => 'medio', phase: () => 'peru', civs: () => [], cities: () => [], units: () => [], log: () => [],
    flags: () => ({}), fired: () => ({}), cooldown: () => ({}), eventQueue: () => [], spawned: () => ({}), wonders: () => ({}),
    notices: () => [], divergences: () => [], revealAll: () => false, autoplay: () => false, nextId: () => 1,
    congress: () => ({ next: null, active: [], sessions: 0, host: null, truce: 0, history: [] })
  };
  PC.SAVE_FLAG_DEFAULTS = {};
  PC.CIV_DEFAULTS = { techs: () => ({}), rel: () => ({}), bonus: () => ({}), stabMods: () => [], research: () => null, progress: () => 0,
    stability: () => 60, culture: () => 0, gold: () => 0, alive: () => true, isPlayer: () => false, external: () => false, capitalId: () => null };
  PC.CITY_DEFAULTS = { buildings: () => [], build: () => null, food: () => 0, prod: () => 0, culture: () => 0, hp: () => 100 };
  const fill = (obj, defs) => { Object.keys(defs).forEach((k) => { if (obj[k] === undefined) obj[k] = defs[k](); }); };

  // Macrorregión de una provincia según el mapa en el que está.
  function regionZone(kind, id) {
    if (kind === 'sudamerica') return PC.GEO_SA.macro[id];
    if (kind === 'america') { const rg = PC.GEO_AM.regions.find((r) => r.id === id); return (rg && rg.macro) || PC.GEO_SA.macro[id]; }
    const rg = PC.GEO_PERU && PC.GEO_PERU.regions && PC.GEO_PERU.regions.find((r) => r.id === id);
    return rg && rg.zone;
  }

  // Convierte cualquier guardado (v1 o v2) al estado que espera el código actual. No borra campos desconocidos.
  PC.migrateSave = function (g) {
    if (!g || typeof g !== 'object' || !g.map || !Array.isArray(g.map.tiles)) throw new Error('Guardado no válido');
    const from = g.v || 1;
    fill(g, PC.SAVE_DEFAULTS);
    if (g.congress) fill(g.congress, PC.SAVE_DEFAULTS.congress());
    fill(g.flags, PC.SAVE_FLAG_DEFAULTS);
    const m = g.map;
    m.kind = m.kind || g.phase || 'peru';
    if (!m.cols) m.cols = Math.max(1, ...m.tiles.filter(Boolean).map((t) => (t.c || 0) + 1));
    if (!m.rows) m.rows = Math.ceil(m.tiles.length / m.cols);
    m.tiles = m.tiles.map((t, i) => unpackTile(t, i, m.cols, m.kind));
    delete m.packed;
    m.regions = m.regions || [];
    m.regions.forEach((rg) => {
      if (!rg.tiles) rg.tiles = m.tiles.filter((t) => t && t.region === rg.id).map((t) => t.i);
      if (!rg.zone) rg.zone = regionZone(m.kind, rg.id) || 'mixta';
    });
    if (!m.counts) { m.counts = { costa: 0, sierra: 0, selva: 0 }; m.tiles.forEach((t) => { if (t && t.terrain !== 'oceano' && m.counts[t.zone] !== undefined) m.counts[t.zone]++; }); }
    if (!Array.isArray(g.explored) || g.explored.length !== m.tiles.length) {
      const old = Array.isArray(g.explored) ? g.explored : [];
      g.explored = m.tiles.map((t, i) => (old[i] !== undefined && old[i] !== null ? old[i] : -1));
    }
    g.units = g.units.map((u) => unpackObj(u, PC.UNIT_TEMPLATE));
    g.civs.forEach((c) => fill(c, PC.CIV_DEFAULTS));
    g.cities.forEach((c) => fill(c, PC.CITY_DEFAULTS));
    // Identificadores: nextId es el último usado (PC.uid lo incrementa antes de devolverlo).
    const maxId = Math.max(0, ...g.cities.map((c) => +c.id || 0), ...g.units.map((u) => +u.id || 0));
    if (!(g.nextId >= maxId)) g.nextId = maxId;
    if (from < 2) g.migratedFrom = from;
    g.v = PC.SAVE_VERSION;
    return g;
  };
})(globalThis.PC = globalThis.PC || {});

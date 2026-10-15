// Generador de mapas con "proyección estratégica".
// El Perú real es ~11% costa, ~28% sierra y ~60% selva. Para el juego se estira la costa y la sierra y se
// comprime la Amazonía (objetivo ≈ 35% / 45% / 20% sobre ~200 hexágonos), conservando la silueta del país.
(function (PC) {
  'use strict';

  const TARGET = { costa: 30, sierra: 70, selva: 150 };

  function makeProjection(geo, k) {
    const L0 = (lat) => (lat > -3.4 ? -80.3 : PC.lonAtLat(geo.coast, lat));
    const L1 = (lat) => L0(lat) + geo.coastWidth(lat);
    const L2 = (lat) => Math.max(L1(lat) + 0.4, PC.lonAtLat(geo.andesEast, lat));
    const off = (lat) => k.off * (L0(lat) + 81.3);
    function warp(lon, lat) {
      const a = L0(lat), b = L1(lat), c = L2(lat);
      let x = off(lat);
      if (lon < a) return x + (lon - a) * k.c;
      x += k.c * Math.min(lon - a, b - a);
      if (lon > b) x += k.s * Math.min(lon - b, c - b);
      if (lon > c) x += k.e * (lon - c);
      return x;
    }
    function unwarp(x, lat) {
      const a = L0(lat), b = L1(lat), c = L2(lat);
      let rest = x - off(lat);
      if (rest < 0) return a + rest / k.c;
      const wc = k.c * (b - a);
      if (rest <= wc) return a + rest / k.c;
      rest -= wc;
      const ws = k.s * (c - b);
      if (rest <= ws) return b + rest / k.s;
      rest -= ws;
      return c + rest / k.e;
    }
    function zoneOf(lon, lat) {
      if (lon < L0(lat)) return 'mar';
      if (lon < L1(lat)) return 'costa';
      if (lon < L2(lat)) return 'sierra';
      return 'selva';
    }
    return { warp, unwarp, zoneOf, L0, L1, L2 };
  }

  // Recorre la cuadrícula y devuelve las casillas candidatas con su zona.
  function scan(geo, proj, rows) {
    const cells = [];
    let xmin = Infinity, xmax = -Infinity;
    for (let r = 0; r < rows; r++) {
      const lat = geo.latTop - r * geo.rowLat;
      xmin = Math.min(xmin, proj.warp(-82, lat)); xmax = Math.max(xmax, proj.warp(-68.5, lat));
    }
    const X0 = Math.floor(xmin) - 1, cols = Math.ceil(xmax - X0) + 2;
    for (let r = 0; r < rows; r++) {
      const lat = geo.latTop - r * geo.rowLat;
      const coastX = proj.warp(proj.L0(lat), lat);
      for (let c = 0; c < cols; c++) {
        const x = X0 + c + ((r & 1) ? 0.5 : 0);
        const lon = proj.unwarp(x, lat);
        const land = PC.pointInPolygon(lon, lat, geo.outline);
        let zone = null;
        if (land) zone = proj.zoneOf(lon, lat);
        else if (lat < -3.3 && lat > -18.6 && x < coastX && x > coastX - 1.8) zone = 'mar';
        if (land && zone === 'mar') zone = 'costa';
        if (zone) cells.push({ c, r, x, lat, lon, zone });
      }
    }
    return { cells, cols, X0 };
  }

  PC.generatePeruMap = function (seed) {
    const geo = PC.GEO_PERU;
    const rows = Math.round((geo.latTop - geo.latBottom) / geo.rowLat) + 1;
    // Ajuste iterativo de las escalas de cada macrozona para acercarse al objetivo de hexágonos.
    const k = { c: 1.4, s: 0.9, e: 0.9, off: 0.4 };
    let res;
    for (let it = 0; it < 12; it++) {
      res = scan(geo, makeProjection(geo, k), rows);
      const n = { costa: 0, sierra: 0, selva: 0 };
      res.cells.forEach((cl) => { if (n[cl.zone] !== undefined) n[cl.zone]++; });
      k.c *= Math.pow(TARGET.costa / Math.max(1, n.costa), 0.8);
      k.s *= Math.pow(TARGET.sierra / Math.max(1, n.sierra), 0.8);
      k.e *= Math.pow(TARGET.selva / Math.max(1, n.selva), 0.8);
    }
    const proj = makeProjection(geo, k);
    res = scan(geo, proj, rows);
    // Recorta columnas vacías.
    const minC = Math.min(...res.cells.map((cl) => cl.c)) - 1;
    res.cells.forEach((cl) => { cl.c -= minC; });
    const cols = Math.max(...res.cells.map((cl) => cl.c)) + 2;
    const X0 = res.X0 + minC;
    const toXY = (lon, lat) => [proj.warp(lon, lat) - X0, (geo.latTop - lat) / geo.rowLat];

    const tiles = new Array(cols * rows).fill(null);
    res.cells.forEach((cl) => {
      tiles[cl.r * cols + cl.c] = {
        i: cl.r * cols + cl.c, c: cl.c, r: cl.r, x: cl.x - X0, y: cl.r, lat: cl.lat, lon: cl.lon, zone: cl.zone,
        terrain: null, feature: null, fauna: null, res: null, region: null, owner: null, cityId: null, imp: null, road: false
      };
    });
    const list = tiles.filter(Boolean);
    const land = list.filter((t) => t.zone !== 'mar');
    const dist2 = (t, p) => (t.x - p[0]) ** 2 + (t.y - p[1]) ** 2;

    // Ríos en espacio esquemático.
    const rivers = geo.rivers.map((rv) => ({ name: rv.name, coastal: !!rv.coastal, pts: rv.pts.map((p) => toXY(p[0], p[1])) }));

    list.forEach((t) => {
      if (t.zone === 'mar') { t.terrain = 'oceano'; return; }
      const lonA = proj.L0(t.lat), lonB = proj.L1(t.lat), lonC = proj.L2(t.lat);
      const n = PC.noise2(t.x * 0.8, t.y * 0.8, seed) * 0.7 + PC.noise2(t.x * 2.1, t.y * 2.1, seed + 7) * 0.3;
      if (t.zone === 'costa') {
        const nearRiver = rivers.some((rv) => rv.coastal && PC.distToPolyline(t.x, t.y, rv.pts) < 0.5);
        t.terrain = nearRiver ? 'valle' : 'desierto';
      } else if (t.zone === 'sierra') {
        const p = (t.lon - lonB) / Math.max(0.01, lonC - lonB);
        if ((p < 0.33 && n > 0.47) || (p > 0.75 && n > 0.56)) t.terrain = 'cordillera';
        else if ((t.lat < -13.8 && n < 0.55) || (t.lat < -10 && t.lat > -11.6 && n < 0.45)) t.terrain = 'puna';
        else t.terrain = 'sierra';
      } else {
        const dx = t.x - (proj.warp(lonC, t.lat) - X0);
        t.terrain = dx < 1.1 ? 'ceja' : 'selva';
        if (rivers.some((rv) => !rv.coastal && PC.distToPolyline(t.x, t.y, rv.pts) < 0.6)) t.feature = 'rio';
      }
      void lonA;
    });

    // Fauna peligrosa en la selva: caimanes y pirañas junto a los ríos, mosquitos en las tierras bajas
    // inundables, jaguares y serpientes en el monte. La ceja de selva es menos hostil.
    list.forEach((t) => {
      if (t.zone !== 'selva') return;
      const h = PC.hash2(t.c * 7 + 3, t.r * 13 + 1, seed);
      const h2 = PC.hash2(t.c + 11, t.r + 5, seed + 3);
      if (t.terrain === 'ceja') { if (h < 0.45) t.fauna = h2 < 0.5 ? 'serpiente' : 'jaguar'; return; }
      if (h > 0.85) return;
      if (t.feature === 'rio') t.fauna = h2 < 0.55 ? 'caiman' : 'pirana';
      else t.fauna = h2 < 0.4 ? 'mosquitos' : h2 < 0.7 ? 'jaguar' : 'serpiente';
    });

    // Lago Titicaca y abras.
    const nearest = (pt, filter) => {
      let best = null, bd = Infinity;
      list.forEach((t) => { if (filter(t)) { const d = dist2(t, pt); if (d < bd) { bd = d; best = t; } } });
      return best;
    };
    geo.lakes.forEach((lk) => { const t = nearest(toXY(lk.lon, lk.lat), (u) => u.zone === 'sierra'); if (t) { t.terrain = 'lago'; t.feature = null; t.name = lk.name; } });
    geo.passes.forEach((ps) => {
      const t = nearest(toXY(ps.lon, ps.lat), (u) => u.zone === 'sierra' && u.terrain !== 'lago');
      if (t) { t.terrain = 'cordillera'; t.feature = 'abra'; t.name = ps.name; }
    });

    // Provincias: casilla → semilla más cercana de su misma macrozona.
    const seeds = geo.regions.map((rg) => ({ rg, p: toXY(rg.lon, rg.lat) }));
    land.forEach((t) => {
      let best = null, bd = Infinity;
      seeds.forEach((s) => { if (s.rg.zone === t.zone) { const d = dist2(t, s.p); if (d < bd) { bd = d; best = s; } } });
      t.region = best ? best.rg.id : null;
    });
    const regions = geo.regions.map((rg) => ({ id: rg.id, name: rg.name, zone: rg.zone, tiles: land.filter((t) => t.region === rg.id).map((t) => t.i) }))
      .filter((rg) => rg.tiles.length > 0);

    // Recursos: yacimientos históricos + pesca.
    const isCoastLand = (t) => t.zone === 'costa' && PC.hexNeighborsCR(t.c, t.r).some(([c, r]) => { const u = tiles[r * cols + c]; return u && u.terrain === 'oceano'; });
    geo.hotspots.forEach(([res, lon, lat, n]) => {
      const R = PC.RESOURCES[res];
      const ok = (t) => !t.res && t.terrain !== 'lago' && t.terrain !== 'oceano' &&
        (res !== 'guano' || isCoastLand(t)) && (R.mineral || t.terrain !== 'cordillera');
      for (let j = 0; j < n; j++) { const t = nearest(toXY(lon, lat), ok); if (t) t.res = res; }
    });
    const ocean = list.filter((t) => t.terrain === 'oceano');
    let fish = 0;
    PC.shuffleSeeded(ocean, seed).forEach((t) => { if (fish < Math.ceil(ocean.length * 0.3)) { t.res = 'pesca'; fish++; } });

    const counts = { costa: 0, sierra: 0, selva: 0 };
    land.forEach((t) => counts[t.zone]++);
    return { kind: 'peru', name: 'Perú', cols, rows, tiles, regions, counts, rivers };
  };

  PC.shuffleSeeded = function (arr, seed) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(PC.hash2(i, seed, 99) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
})(globalThis.PC = globalThis.PC || {});

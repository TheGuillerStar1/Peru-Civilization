// Utilidades: azar con semilla, ruido, hexágonos y geometría.
(function (PC) {
  'use strict';

  // --- Azar reproducible (mulberry32). El estado vive en PC.G.rng para que las partidas guardadas sean deterministas.
  PC.rand = function () {
    const G = PC.G;
    const s = ((G ? G.rng : (PC._seed | 0)) + 0x6D2B79F5) | 0;
    if (G) G.rng = s; else PC._seed = s;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  PC.randInt = (a, b) => a + Math.floor(PC.rand() * (b - a + 1));
  PC.pick = (arr) => arr[Math.floor(PC.rand() * arr.length)];
  PC.chance = (p) => PC.rand() < p;
  PC.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(PC.rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  };

  // Ruido de valor determinista en 2D (para relieve).
  function hash2(x, y, seed) {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  PC.noise2 = function (x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const s = (t) => t * t * (3 - 2 * t);
    const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    const u = s(xf), v = s(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  PC.hash2 = hash2;

  // --- Hexágonos "pointy-top" con desplazamiento odd-r.
  const DIRS_EVEN = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
  const DIRS_ODD = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
  PC.hexNeighborsCR = function (c, r) {
    const dirs = (r & 1) ? DIRS_ODD : DIRS_EVEN;
    return dirs.map(([dc, dr]) => [c + dc, r + dr]);
  };
  PC.offsetToCube = function (c, r) {
    const x = c - (r - (r & 1)) / 2, z = r;
    return [x, -x - z, z];
  };
  PC.hexDistCR = function (c1, r1, c2, r2) {
    const a = PC.offsetToCube(c1, r1), b = PC.offsetToCube(c2, r2);
    return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  };

  // --- Geometría.
  PC.pointInPolygon = function (x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };
  // Interpola la longitud de una polilínea ordenada por latitud (de norte a sur).
  PC.lonAtLat = function (line, lat) {
    if (lat >= line[0][1]) return line[0][0];
    for (let i = 1; i < line.length; i++) {
      const [x1, y1] = line[i - 1], [x2, y2] = line[i];
      if (lat <= y1 && lat >= y2) return x1 + (x2 - x1) * (lat - y1) / (y2 - y1 || 1);
    }
    return line[line.length - 1][0];
  };
  PC.distToSegment = function (px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + t * dx - px, qy = ay + t * dy - py;
    return Math.sqrt(qx * qx + qy * qy);
  };
  PC.distToPolyline = function (px, py, line) {
    let d = Infinity;
    for (let i = 1; i < line.length; i++) d = Math.min(d, PC.distToSegment(px, py, line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]));
    return d;
  };

  PC.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  PC.fmtYear = (y) => (y < 0 ? `${-y} a.C.` : `${y} d.C.`);
  PC.uid = function () { PC.G.nextId = (PC.G.nextId || 1) + 1; return PC.G.nextId; };
})(globalThis.PC = globalThis.PC || {});

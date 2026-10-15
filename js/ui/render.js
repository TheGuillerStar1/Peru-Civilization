// Dibujo del mapa en canvas.
(function (PC) {
  'use strict';
  const SQ3 = Math.sqrt(3);
  const R = PC.R = {
    canvas: null, ctx: null, cam: { x: 0, y: 0, zoom: 1 }, size: 30, showRegions: false, showYields: false,
    sel: null, reach: null, targets: null, hover: null, path: null
  };

  R.init = function (canvas) {
    R.canvas = canvas; R.ctx = canvas.getContext('2d');
    R.resize();
  };
  R.resize = function () {
    const c = R.canvas, dpr = window.devicePixelRatio || 1;
    const w = c.parentElement.clientWidth, h = c.parentElement.clientHeight;
    c.width = w * dpr; c.height = h * dpr; c.style.width = w + 'px'; c.style.height = h + 'px';
    R.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R.w = w; R.h = h;
  };
  R.S = () => R.size * R.cam.zoom;
  R.tileCenter = function (t) {
    const S = R.S();
    return [(t.c + 0.5 * (t.r & 1)) * SQ3 * S - R.cam.x, t.r * 1.5 * S - R.cam.y];
  };
  R.centerOn = function (t) {
    const S = R.S();
    R.cam.x = (t.c + 0.5 * (t.r & 1)) * SQ3 * S - R.w / 2;
    R.cam.y = t.r * 1.5 * S - R.h / 2;
  };
  R.pick = function (mx, my) {
    const g = PC.G; if (!g) return null;
    let best = null, bd = Infinity;
    g.map.tiles.forEach((t) => {
      if (!t) return;
      const [x, y] = R.tileCenter(t);
      const d = (x - mx) ** 2 + (y - my) ** 2;
      if (d < bd) { bd = d; best = t; }
    });
    return bd < (R.S() * 1.05) ** 2 ? best : null;
  };
  R.zoomAt = function (factor, mx, my) {
    const z0 = R.cam.zoom, z1 = PC.clamp(z0 * factor, 0.45, 2.6);
    const wx = (R.cam.x + mx) / z0, wy = (R.cam.y + my) / z0;
    R.cam.zoom = z1; R.cam.x = wx * z1 - mx; R.cam.y = wy * z1 - my;
  };

  function hexPath(ctx, x, y, S) {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 180 * (60 * k - 30);
      const px = x + S * Math.cos(a), py = y + S * Math.sin(a);
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  // Vértices del lado compartido con el vecino en dirección k (orden de PC.hexNeighborsCR).
  const EDGE = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]];
  function corner(x, y, S, k) { const a = Math.PI / 180 * (60 * k - 30); return [x + S * Math.cos(a), y + S * Math.sin(a)]; }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(PC.clamp(r * f, 0, 255)); g = Math.round(PC.clamp(g * f, 0, 255)); b = Math.round(PC.clamp(b * f, 0, 255));
    return `rgb(${r},${g},${b})`;
  }

  function drawTerrainDetail(ctx, t, x, y, S) {
    const h = PC.hash2(t.c, t.r, 5);
    ctx.save();
    if (t.terrain === 'cordillera') {
      const peaks = [[-0.45, 0.3, 0.5], [0.05, 0.35, 0.65], [0.45, 0.3, 0.45]];
      peaks.forEach(([dx, dy, hgt]) => {
        const px = x + dx * S, py = y + dy * S;
        ctx.fillStyle = '#6f6a66';
        ctx.beginPath(); ctx.moveTo(px - 0.3 * S, py); ctx.lineTo(px, py - hgt * S); ctx.lineTo(px + 0.3 * S, py); ctx.fill();
        ctx.fillStyle = '#f2f2f2';
        ctx.beginPath(); ctx.moveTo(px - 0.1 * S, py - hgt * S * 0.66); ctx.lineTo(px, py - hgt * S); ctx.lineTo(px + 0.1 * S, py - hgt * S * 0.66); ctx.fill();
      });
      if (t.feature === 'abra') {
        ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = Math.max(1.5, S * 0.08); ctx.setLineDash([S * 0.12, S * 0.1]);
        ctx.beginPath(); ctx.moveTo(x - 0.7 * S, y + 0.15 * S); ctx.quadraticCurveTo(x, y - 0.25 * S, x + 0.7 * S, y + 0.15 * S); ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (t.terrain === 'selva' || t.terrain === 'ceja') {
      ctx.fillStyle = t.terrain === 'selva' ? '#245a2e' : '#3e7a3e';
      for (let k = 0; k < 6; k++) {
        const a = h * 6.28 + k * 1.05, rr = 0.25 + ((k * 37) % 10) / 30;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr * S, y + Math.sin(a) * rr * S, S * 0.16, 0, 6.28); ctx.fill();
      }
    } else if (t.terrain === 'desierto') {
      ctx.fillStyle = 'rgba(160,130,80,0.5)';
      for (let k = 0; k < 7; k++) { const a = h * 9 + k * 0.9; ctx.fillRect(x + Math.cos(a) * 0.5 * S, y + Math.sin(a * 1.3) * 0.45 * S, 2, 2); }
    } else if (t.terrain === 'valle') {
      ctx.strokeStyle = 'rgba(60,110,40,0.55)'; ctx.lineWidth = 1.2;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x - 0.5 * S, y + k * 0.18 * S); ctx.lineTo(x + 0.5 * S, y + k * 0.18 * S); ctx.stroke(); }
    } else if (t.terrain === 'sierra' || t.terrain === 'puna') {
      ctx.strokeStyle = 'rgba(90,75,45,0.45)'; ctx.lineWidth = 1.3;
      [[-0.35, 0.2], [0.25, -0.15]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx * S, y + dy * S + 0.15 * S, 0.22 * S, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
    } else if (t.terrain === 'oceano') {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 0.4 * S, y); ctx.quadraticCurveTo(x - 0.2 * S, y - 0.1 * S, x, y); ctx.quadraticCurveTo(x + 0.2 * S, y + 0.1 * S, x + 0.4 * S, y); ctx.stroke();
    }
    if (t.feature === 'rio') {
      ctx.strokeStyle = '#4fa3d9'; ctx.lineWidth = Math.max(2, S * 0.12);
      ctx.beginPath(); ctx.moveTo(x - 0.75 * S, y - 0.1 * S); ctx.bezierCurveTo(x - 0.3 * S, y + 0.3 * S, x + 0.2 * S, y - 0.35 * S, x + 0.75 * S, y + 0.1 * S); ctx.stroke();
    }
    ctx.restore();
  }

  const IMP_ICON = { chacra: '▦', andenes: '≋', canal: '≈', mina: '⛏', corral: '∩', plantacion: '✿', pozo: '⛽' };

  R.draw = function () {
    const g = PC.G; if (!g || !R.ctx) return;
    const ctx = R.ctx, S = R.S();
    ctx.fillStyle = '#0d1418'; ctx.fillRect(0, 0, R.w, R.h);
    const player = PC.player();
    const visible = (t) => PC.isVisible(t.i), explored = (t) => PC.isExplored(t.i);
    const tiles = g.map.tiles.filter((t) => { if (!t) return false; const [x, y] = R.tileCenter(t); return x > -S * 2 && y > -S * 2 && x < R.w + S * 2 && y < R.h + S * 2; });

    // 1. Terreno
    tiles.forEach((t) => {
      const [x, y] = R.tileCenter(t);
      hexPath(ctx, x, y, S + 0.5);
      if (!explored(t)) {
        ctx.fillStyle = t.zone === 'selva' ? '#0f2416' : '#161a1d'; ctx.fill();
        if (t.zone === 'selva') { ctx.fillStyle = 'rgba(40,90,50,0.35)'; ctx.font = `${S * 0.5}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y); }
        return;
      }
      ctx.fillStyle = shade(PC.TERRAIN[t.terrain].color, 0.92 + PC.hash2(t.c, t.r, 3) * 0.16); ctx.fill();
      drawTerrainDetail(ctx, t, x, y, S);
    });
    // 2. Caminos
    ctx.save(); ctx.strokeStyle = '#7a4b25'; ctx.lineWidth = Math.max(1.5, S * 0.09);
    tiles.forEach((t) => {
      if (!t.road || !explored(t)) return;
      const [x, y] = R.tileCenter(t);
      PC.neighbors(t).forEach((n) => { if (n.road && n.i > t.i && explored(n)) { const [x2, y2] = R.tileCenter(n); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); } });
    });
    ctx.restore();
    // 3. Territorios y fronteras
    tiles.forEach((t) => {
      if (!explored(t)) return;
      const [x, y] = R.tileCenter(t);
      if (t.owner) {
        const civ = PC.civ(t.owner);
        hexPath(ctx, x, y, S); ctx.globalAlpha = 0.16; ctx.fillStyle = civ.color; ctx.fill(); ctx.globalAlpha = 1;
      }
      const nb = PC.hexNeighborsCR(t.c, t.r);
      nb.forEach(([c, r], k) => {
        const n = PC.tileCR(c, r);
        const [a, b] = EDGE[k];
        const p1 = corner(x, y, S, a), p2 = corner(x, y, S, b);
        if (t.owner && (!n || n.owner !== t.owner)) {
          ctx.strokeStyle = PC.civ(t.owner).color; ctx.lineWidth = Math.max(2, S * 0.11);
          ctx.beginPath(); ctx.moveTo(p1[0] + (x - p1[0]) * 0.08, p1[1] + (y - p1[1]) * 0.08); ctx.lineTo(p2[0] + (x - p2[0]) * 0.08, p2[1] + (y - p2[1]) * 0.08); ctx.stroke();
        }
        if (R.showRegions && n && n.region !== t.region && t.region && n.region) {
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.setLineDash([]);
        }
      });
    });
    // 4. Recursos, mejoras, fauna
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    tiles.forEach((t) => {
      if (!explored(t)) return;
      const [x, y] = R.tileCenter(t);
      if (t.res && PC.resVisible(player, t.res)) { ctx.font = `${S * 0.42}px sans-serif`; ctx.fillText(PC.RESOURCES[t.res].icon, x - S * 0.42, y - S * 0.38); }
      if (t.fauna && !PC.civCities(player).some((c) => c.t === t.i)) { ctx.font = `${S * 0.36}px sans-serif`; ctx.globalAlpha = 0.85; ctx.fillText(PC.FAUNA[t.fauna].icon, x + S * 0.45, y - S * 0.38); ctx.globalAlpha = 1; }
      if (t.imp) { ctx.font = `bold ${S * 0.38}px sans-serif`; ctx.fillStyle = '#fff8d8'; ctx.fillText(IMP_ICON[t.imp] || '•', x + S * 0.45, y + S * 0.4); }
      if (!visible(t) && t.terrain !== 'oceano') { hexPath(ctx, x, y, S + 0.5); ctx.fillStyle = 'rgba(8,12,16,0.42)'; ctx.fill(); }
      if (R.showYields && t.terrain !== 'oceano') {
        const yv = PC.tileYield(player, t);
        ctx.font = `bold ${S * 0.3}px sans-serif`;
        ctx.fillStyle = '#8fe388'; ctx.fillText(yv.f, x - S * 0.3, y + S * 0.05);
        ctx.fillStyle = '#f0b26b'; ctx.fillText(yv.p, x, y + S * 0.05);
        ctx.fillStyle = '#f7e07a'; ctx.fillText(yv.g, x + S * 0.3, y + S * 0.05);
      }
    });
    // 5. Selección: alcance y objetivos
    if (R.reach) R.reach.forEach((left, i) => { const t = PC.tile(i); const [x, y] = R.tileCenter(t); hexPath(ctx, x, y, S * 0.9); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill(); });
    if (R.targets) R.targets.forEach((i) => { const [x, y] = R.tileCenter(PC.tile(i)); hexPath(ctx, x, y, S * 0.9); ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 3; ctx.stroke(); });
    if (R.path) {
      ctx.strokeStyle = 'rgba(255,230,120,0.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath();
      const u = R.sel && R.sel.unit; if (u) { const [x0, y0] = R.tileCenter(PC.tile(u.t)); ctx.moveTo(x0, y0); }
      R.path.forEach((i) => { const [x, y] = R.tileCenter(PC.tile(i)); ctx.lineTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
    }
    if (R.hover) { const [x, y] = R.tileCenter(R.hover); hexPath(ctx, x, y, S); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    // 6. Ciudades
    g.cities.forEach((city) => {
      const t = PC.tile(city.t);
      if (!explored(t)) return;
      const [x, y] = R.tileCenter(t);
      if (x < -S * 3 || x > R.w + S * 3 || y < -S * 3 || y > R.h + S * 3) return;
      const civ = PC.civ(city.civ);
      ctx.fillStyle = civ.color; ctx.strokeStyle = '#1b1208'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - S * 0.42, y + S * 0.3); ctx.lineTo(x - S * 0.42, y - S * 0.05); ctx.lineTo(x - S * 0.2, y - S * 0.05);
      ctx.lineTo(x - S * 0.2, y - S * 0.28); ctx.lineTo(x + S * 0.2, y - S * 0.28); ctx.lineTo(x + S * 0.2, y - S * 0.05);
      ctx.lineTo(x + S * 0.42, y - S * 0.05); ctx.lineTo(x + S * 0.42, y + S * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (civ.capitalId === city.id) { ctx.fillStyle = '#ffe066'; ctx.font = `${S * 0.35}px sans-serif`; ctx.fillText('★', x, y - S * 0.45); }
      const label = `${city.pop} ${city.name}`;
      ctx.font = `bold ${Math.max(10, S * 0.36)}px Georgia, serif`;
      const w = ctx.measureText(label).width + 10;
      ctx.fillStyle = 'rgba(15,10,5,0.78)'; ctx.fillRect(x - w / 2, y + S * 0.45, w, S * 0.48);
      ctx.fillStyle = civ.color; ctx.fillRect(x - w / 2, y + S * 0.45, 4, S * 0.48);
      ctx.fillStyle = '#fff'; ctx.fillText(label, x + 2, y + S * 0.7);
      if (city.hp < 100) { ctx.fillStyle = '#300'; ctx.fillRect(x - S * 0.4, y + S * 0.95, S * 0.8, 3); ctx.fillStyle = '#e44'; ctx.fillRect(x - S * 0.4, y + S * 0.95, S * 0.8 * city.hp / 100, 3); }
    });
    // 7. Unidades
    const byTile = new Map();
    g.units.forEach((u) => { if (!byTile.has(u.t)) byTile.set(u.t, []); byTile.get(u.t).push(u); });
    byTile.forEach((us, ti) => {
      const t = PC.tile(ti);
      if (!visible(t)) return;
      const [x, y] = R.tileCenter(t);
      us.sort((a, b) => PC.isMil(b) - PC.isMil(a)).forEach((u, k) => {
        const civ = PC.civ(u.civ);
        const ox = x + (k ? S * 0.32 : (t.cityId ? -S * 0.3 : 0)), oy = y + (t.cityId ? -S * 0.55 : 0) + (k ? S * 0.25 : 0);
        const r = S * (k ? 0.27 : 0.36);
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, 6.28);
        ctx.fillStyle = 'rgba(20,14,8,0.85)'; ctx.fill();
        ctx.lineWidth = (R.sel && R.sel.unit === u) ? 4 : 2.5; ctx.strokeStyle = (R.sel && R.sel.unit === u) ? '#fff' : civ.color; ctx.stroke();
        ctx.font = `${r * 1.15}px sans-serif`; ctx.fillStyle = '#fff'; ctx.fillText(PC.UNITS[u.type].icon, ox, oy + 1);
        if (u.hp < 100) { ctx.fillStyle = '#300'; ctx.fillRect(ox - r, oy + r + 1, r * 2, 3); ctx.fillStyle = u.hp > 50 ? '#5c5' : u.hp > 25 ? '#ec4' : '#e44'; ctx.fillRect(ox - r, oy + r + 1, r * 2 * u.hp / 100, 3); }
        if (u.civ === g.playerId && u.moves > 0 && !u.fort && !u.task && !u.auto && !u.path) { ctx.fillStyle = '#7CFC00'; ctx.beginPath(); ctx.arc(ox + r * 0.75, oy - r * 0.75, 3.5, 0, 6.28); ctx.fill(); }
        if (u.fort) { ctx.fillStyle = '#9ad'; ctx.font = `${r * 0.7}px sans-serif`; ctx.fillText('⛨', ox - r * 0.8, oy - r * 0.7); }
      });
    });
  };
})(globalThis.PC = globalThis.PC || {});

// Ventana de victorias y pantalla final con la victoria, la puntuación y la evolución de la partida.
(function (PC) {
  'use strict';
  const UI = PC.UI;
  if (!UI) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ic = (n, cls) => PC.icon(n, cls);
  const ICON = { dominacion: 'poder', cultural: 'maravilla', diplomatica: 'congreso', historica: 'cronica', puntuacion: 'corona' };

  function progressList() {
    return `<div class="vic-list">${PC.victoryProgress().map((o) => `<section class="vic">
      <div class="vic-h">${ic(ICON[o.id])}<h4>${esc(o.name)}</h4><b class="num">${Math.round(o.pct * 100)}%</b></div>
      <p class="small muted">${esc(o.desc)}</p>
      <div class="bar vic-bar"><i style="width:${Math.round(o.pct * 100)}%"></i></div>
      <div class="vic-parts">${o.parts.map(([l, v, m]) => `<span>${esc(l)} <b class="num">${m === 1 && v <= 1 ? (v ? 'sí' : 'no') : `${v} / ${m}`}</b></span>`).join('')}</div>
    </section>`).join('')}</div>`;
  }
  function legacyList() {
    const v = PC.G.victory || { legados: {} };
    return `<ul class="vic-leg">${PC.LEGACIES.map((L) => { const y = v.legados[L.id]; return `<li class="${y !== undefined ? 'ok' : ''}">${ic(y !== undefined ? 'corona' : 'cronica')}<span>${esc(L.name)}<small>${esc(L.era)}</small></span><b>${y !== undefined ? PC.fmtYear(y) : ''}</b></li>`; }).join('')}</ul>`;
  }

  UI.openVictories = function () {
    const g = PC.G, p = PC.player();
    const rk = PC.scoreRanking();
    const won = g.victory && g.victory.won;
    UI.openModal(`<h2>Victorias</h2>
      <p class="lead">${won ? `Ya lograste la victoria ${esc(PC.VICTORY_KIND[won.kind].toLowerCase())} (${PC.fmtYear(won.year)}). ` : ''}Gana la primera que completes. Si llegas a ${PC.fmtYear(PC.END_YEAR)} sin ninguna, gana la mayor puntuación.</p>
      ${progressList()}
      <h3>Legados de la historia · ${Object.keys((g.victory || { legados: {} }).legados).length} de ${PC.LEGACIES.length}</h3>${legacyList()}
      <h3>Puntuación</h3>${ranking(rk.slice(0, 6), p)}`, 'victorias');
  };

  function ranking(rows, p) {
    return `<ol class="vic-rank">${rows.map((r) => `<li class="${r.civ.id === p.id ? 'me' : ''}">${PC.emblem(r.civ.key, r.civ.color)}<span>${esc(r.civ.name)}</span><b class="num">${r.score}</b></li>`).join('')}</ol>`;
  }

  // Gráfico de líneas simple en SVG: series = [{ name, color, me, pts: [[x, y]] }]
  function chart(title, series, xs) {
    const W = 360, H = 150, L = 34, B = 18, T = 8, Rr = 8;
    const ymax = Math.max(1, ...series.flatMap((s) => s.pts.map((q) => q[1])));
    const x0 = xs[0], x1 = Math.max(xs[0] + 1, xs[xs.length - 1]);
    const X = (x) => L + (x - x0) / (x1 - x0) * (W - L - Rr), Y = (y) => H - B - y / ymax * (H - B - T);
    const grid = [0, 0.5, 1].map((f) => `<line x1="${L}" x2="${W - Rr}" y1="${Y(ymax * f)}" y2="${Y(ymax * f)}" class="vg"/><text x="${L - 4}" y="${Y(ymax * f) + 3}" text-anchor="end">${Math.round(ymax * f)}</text>`).join('');
    const lines = series.slice().sort((a, b) => a.me - b.me).map((s) => s.pts.length > 1
      ? `<polyline points="${s.pts.map((q) => `${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="${s.me ? 'var(--qolli)' : s.color}" stroke-width="${s.me ? 2.5 : 1.5}" stroke-linejoin="round"${s.me ? '' : ' opacity="0.85"'}/>`
      : s.pts.length ? `<circle cx="${X(s.pts[0][0])}" cy="${Y(s.pts[0][1])}" r="2.5" fill="${s.me ? 'var(--qolli)' : s.color}"/>` : '').join('');
    const yl = (y) => PC.fmtYear(y);
    return `<figure class="vic-chart"><figcaption>${esc(title)}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${grid}${lines}
      <text x="${L}" y="${H - 4}">${yl(x0)}</text><text x="${W - Rr}" y="${H - 4}" text-anchor="end">${yl(x1)}</text></svg></figure>`;
  }
  function charts() {
    const g = PC.G, p = PC.player(), h = g.history || [];
    if (h.length < 2) return '';
    const last = h[h.length - 1][2];
    const rivals = Object.keys(last).map(Number).filter((id) => id !== p.id).sort((a, b) => last[b][2] - last[a][2]).slice(0, 3);
    const ids = [p.id].concat(rivals);
    const xs = h.map((r) => r[1]);
    const ser = (k) => ids.map((id) => { const c = PC.civ(id); return { name: c ? c.name : '', color: c ? c.color : '#888', me: id === p.id, pts: h.filter((r) => r[2][id]).map((r) => [r[1], r[2][id][k]]) }; });
    const legend = ids.map((id) => { const c = PC.civ(id); return c ? `<span class="${id === p.id ? 'me' : ''}"><i style="background:${id === p.id ? 'var(--qolli)' : c.color}"></i>${esc(c.name)}</span>` : ''; }).join('');
    return `<h3>Evolución</h3><div class="vic-legend">${legend}</div><div class="vic-charts">${chart('Población', ser(0), xs)}${chart('Territorio (casillas)', ser(1), xs)}</div>
      ${g.phase !== 'peru' ? '<p class="small muted">El territorio se mide en el mapa de cada fase; cambia de escala al pasar de fase.</p>' : ''}`;
  }

  UI.renderGameOver = function () {
    const g = PC.G, p = PC.player(), o = g.gameOver;
    const kind = o.kind || (o.win ? 'puntuacion' : null);
    const head = o.win ? (kind && kind !== 'puntuacion' ? `Victoria ${PC.VICTORY_KIND[kind].toLowerCase()}` : 'Fin de la crónica') : o.survived ? 'Fin de la crónica' : 'Tu civilización ha caído';
    const rk = PC.scoreRanking();
    const mine = rk.find((r) => r.civ.isPlayer);
    UI.openModal(`<div class="vic-over"><div class="vic-h big">${ic(ICON[kind] || 'cronica', 'xl')}<div><h2>${esc(head)}</h2><p class="small muted">${PC.fmtYear(g.year)} · turno ${g.turn}</p></div></div>
      <p class="lead">${esc(o.text)}</p>
      <div class="vic-score"><div class="kv"><span>Puntuación</span><b>${PC.score(p)}</b></div><div class="kv"><span>Puesto</span><b>${mine ? rk.indexOf(mine) + 1 : '—'} de ${rk.length}</b></div>
        <div class="kv"><span>Legados</span><b>${Object.keys((g.victory || { legados: {} }).legados).length} de ${PC.LEGACIES.length}</b></div></div>
      ${charts()}
      <h3>Puntuación final</h3>${ranking(rk.slice(0, 5), p)}
      <h3>Tu historia alternativa · ${g.divergences.length} divergencias</h3>
      <ul class="div">${g.divergences.map((d) => `<li><b>${PC.fmtYear(d.year)}</b><span>${esc(d.text)}</span></li>`).join('') || '<li><b></b><span>Tu historia siguió el curso conocido.</span></li>'}</ul>
      <div class="choices"><button class="btn primary" data-act2="menu" type="button">Volver al menú</button>${o.win || o.survived ? '<button class="btn" data-act2="keep" type="button">Seguir jugando</button>' : ''}</div></div>`, 'over');
  };
})(globalThis.PC = globalThis.PC || {});

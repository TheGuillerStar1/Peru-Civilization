// Guía de inicio ilustrada («Cómo se juega»): cada tarjeta lleva una captura real de la maqueta 3D (img/intro/*.jpg)
// y el pie fijo mantiene siempre a la vista el botón de empezar. Las fases se dibujan con los mapas reales del juego.
(function (PC) {
  'use strict';
  const UI = PC.UI;
  if (!UI) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ic = (n, cls) => PC.icon(n, cls);

  // Miniatura de un mapa continental o del Perú: un hexágono por casilla, coloreado por su terreno.
  const thumbs = {};
  function mapThumb(kind, seed) {
    const key = kind + seed;
    if (thumbs[key]) return thumbs[key];
    let m = null;
    try { m = kind === 'peru' ? PC.generatePeruMap(seed) : kind === 'sudamerica' ? PC.generateSAMap(seed) : PC.generateAmericaMap(seed); } catch (e) { m = null; }
    if (!m) return '';
    const tiles = m.tiles.filter(Boolean);
    const xs = tiles.map((t) => t.x), ys = tiles.map((t) => t.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const size = 240, k = Math.min((size - 8) / (x1 - x0 + 1), (size - 8) / ((y1 - y0 + 1) * 0.866));
    const cv = document.createElement('canvas'); cv.width = cv.height = size * 2;
    const c = cv.getContext('2d'); c.scale(2, 2);
    const ox = (size - (x1 - x0 + 1) * k) / 2, oy = (size - (y1 - y0 + 1) * 0.866 * k) / 2;
    const r = k * 0.58;
    tiles.forEach((t) => {
      const cx = ox + (t.x - x0 + 0.5) * k, cy = oy + (t.y - y0 + 0.5) * 0.866 * k;
      c.beginPath();
      for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); c.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
      c.closePath();
      const T = PC.TERRAIN[t.terrain];
      c.fillStyle = t.terrain === 'oceano' ? '#16405f' : T.color;
      c.globalAlpha = t.terrain === 'oceano' ? 0.55 : 1;
      c.fill();
    });
    return (thumbs[key] = cv.toDataURL('image/png'));
  }

  const chips = (arr) => `<figcaption class="in-chips">${arr.map(([c, t]) => `<span style="--c:${c}"><i></i>${t}</span>`).join('')}</figcaption>`;
  const photo = (file, alt, caps) => `<figure class="in-art"><img src="img/intro/${file}.jpg" alt="${esc(alt)}" loading="lazy" width="640" height="340">${caps ? chips(caps) : ''}</figure>`;
  function phases(seed) {
    const items = [['peru', 'Perú', 'Fase 1'], ['sudamerica', 'Sudamérica', 'Fase 2'], ['america', 'América', 'Fase 3']];
    return `<figure class="in-art in-phases" role="img" aria-label="Los mapas de las tres fases jugables">${items.map(([k, n, f], i) => `${i ? '<span class="in-arrow"><b>60%</b></span>' : ''}<div><img src="${mapThumb(k, seed)}" alt=""><small>${f}</small><b>${n}</b></div>`).join('')}</figure>`;
  }

  const KEYS = [['Enter', 'terminar turno'], ['N', 'siguiente unidad'], ['F', 'fortificar'], ['B', 'fundar ciudad'], ['T', 'tecnologías'], ['D', 'diplomacia'], ['P', 'provincias'], ['C', 'crónica'], ['G', 'La Conquista'], ['Q', 'girar'], ['E', 'girar']];

  UI.renderIntro = function () {
    const g = PC.G, p = PC.player();
    const L = PC.leaderOf ? PC.leaderOf(p) : null;
    const thumb = PC.R && PC.R.leaderThumb && L ? PC.R.leaderThumb(L.model, p.color) : '';
    const sc = PC.SCENARIOS[g.scenario];
    const card = (title, text, art, icon) => `<article class="in-card">${art}<h4>${ic(icon)}${title}</h4><p>${text}</p></article>`;
    UI.openModal(`<div class="intro">
      <header class="in-head" style="--civ:${p.color}">
        ${thumb ? `<img class="lthumb lg" src="${thumb}" alt="">` : ''}${PC.emblem(p.key, p.color, 'xl')}
        <div><h2>${esc(p.name)} · ${PC.fmtYear(g.year)}</h2><p class="small muted">${esc(p.leader || '')}${sc ? ' · ' + esc(sc.name) : ''}</p></div>
        <span class="chip">${esc(PC.diff().name)}</span>
      </header>
      <p class="lead">${esc(PC.CULTURES[p.key] ? PC.CULTURES[p.key].desc : '')} <span class="muted">${esc(PC.diff().desc)}</span></p>
      <div class="in-grid">
        ${card('Mueve y ataca', 'Elige una unidad y pulsa una casilla iluminada. Tus piezas llevan un anillo amarillo; si hay guerra, el enemigo lleva un anillo rojo y puedes atacarlo.', photo('mover-atacar', 'Una unidad propia con anillo amarillo frente a una unidad enemiga con anillo rojo', [['var(--qolli)', 'tuya'], ['var(--cinabrio)', 'enemigo en guerra']]), 'movimiento')}
        ${card('Costa, sierra y selva', 'Los valles de la costa son fértiles y el desierto desgasta; las cordilleras frenan y se cruzan por las abras; la selva esconde fauna peligrosa.', photo('costa-sierra-selva', 'Del mar a la selva: costa, cordillera nevada y selva', [['#3a7fa8', 'mar y costa'], ['#b8ad86', 'sierra'], ['#3f8f4a', 'selva']]), 'provincias')}
        ${card('Recursos e historia', 'Sin cobre no hay bronce, sin hierro no hay acero y sin salitre no hay pólvora: controla los yacimientos o comercia, y adelántate a la historia.', photo('recursos', 'Minas y recursos sobre el altiplano', null), 'tecnologia')}
        ${card('Líderes y diplomacia', 'Cada líder tiene su agenda: regalos, alianzas, embajadas, denuncias, tributo y paz. Hablan los de verdad, y se suceden con los años.', photo('diplomacia', 'La ficha de un líder rival con su modelo 3D y sus acciones diplomáticas', null), 'diplomacia')}
        ${card('La Conquista', 'Desde 1493 las Coronas abren frentes con comandantes históricos. Forma una liga de resistencia o pacta con ellas; los pueblos también pueden traicionarse.', photo('conquista', 'Una ciudad de la Corona con sus tropas y un barco en el Caribe', null), 'conquista')}
        ${card('Cuatro fases', 'Controla el 60% de las regiones para pasar de Perú a Sudamérica y a América. El Mundo llegará en una próxima versión.', phases(g.seed), 'mapa')}
      </div>
      <div class="in-keys" aria-label="Atajos de teclado">${KEYS.map(([k, l]) => `<span><kbd>${k}</kbd>${l}</span>`).join('')}</div>
      <footer class="in-foot"><span class="small muted">Arrastra para desplazar · rueda para acercar · botón derecho para girar. Esta guía está en Menú → Cómo se juega.</span>
        <button class="btn primary big" data-close type="button">${ic('sol')}Empezar</button></footer>
    </div>`, 'intro');
  };
})(globalThis.PC = globalThis.PC || {});

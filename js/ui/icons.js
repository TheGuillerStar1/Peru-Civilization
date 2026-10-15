// Iconos tocapu: pictogramas tejidos sobre una rejilla de 9×9 (a = hilo principal, b = hilo de contraste).
// Se usan en la interfaz (SVG) y en los estandartes 3D de las unidades (canvas).
(function (PC) {
  'use strict';

  const I = PC.ICONS = {
    sol: ['....a....', '.a..a..a.', '..aaaaa..', '..abbba..', 'aaabbbaaa', '..abbba..', '..aaaaa..', '.a..a..a.', '....a....'],
    oro: ['....a....', '...aaa...', '..aabaa..', '.aabbbaa.', 'aabbbbbaa', '.aabbbaa.', '..aabaa..', '...aaa...', '....a....'],
    ciencia: ['....a....', '....aa...', '...aaa...', '...aaaa..', '..aaaaa..', '..aaaaaa.', '.aaaaaaa.', 'aaaaaaaaa', 'bbbbbbbbb'],
    cultura: ['aaaaaaaaa', 'a.......a', 'a.aaaaa.a', 'a.a...a.a', 'a.a.b.a.a', 'a.a.aaa.a', 'a.a.....a', 'a.aaaaaaa', 'a........'],
    cohesion: ['...aaa...', '...aba...', '.aaabaaa.', 'aabbbbbaa', 'abbb.bbba', 'aabbbbbaa', '.aaabaaa.', '...aba...', '...aaa...'],
    alimento: ['....a....', '...bab...', '..babab..', '..ababa..', '..babab..', '..ababa..', '...bab...', '..a.a.a..', '.a..a..a.'],
    produccion: ['..aaa....', '.aaaaa...', '.aa.aab..', '..a..b...', '....b....', '...b.....', '..b......', '.b.......', 'b........'],
    poder: ['.aaaaaaa.', 'aabbabbaa', 'abbaaabba', 'aaababaaa', 'abbaaabba', '.abbabba.', '..aaaaa..', '...aaa...', '....a....'],
    ciudad: ['.........', '....a....', '...aaa...', '...aba...', '..aaaaa..', '..abbba..', '.aaaaaaa.', '.abbbbba.', 'aaaaaaaaa'],
    provincias: ['aaaa.aaaa', 'abba.abba', 'abba.abba', 'aaaa.aaaa', '.........', 'aaaa.aaaa', 'abba.abba', 'abba.abba', 'aaaa.aaaa'],
    tecnologia: ['...a.a...', '.aaaaaaa.', '.aa...aa.', 'aa..b..aa', '.a.bbb.a.', 'aa..b..aa', '.aa...aa.', '.aaaaaaa.', '...a.a...'],
    diplomacia: ['aaaa.aaaa', 'abba.abba', '.ab...ba.', '.ab...ba.', '..a...a..', '..a.b.a..', '.aaabaaa.', '....b....', '...bbb...'],
    cronica: ['aaaaaaaaa', '.a.a.a.a.', '.b.a.b.a.', '.a.b.a.b.', '.a.a.a.a.', '.b.a.b.a.', '.a.a.a.b.', '.a...a.a.', '.a...a...'],
    menu: ['.........', 'aaaaaaaaa', 'aabababaa', '.........', 'aaaaaaaaa', 'aabababaa', '.........', 'aaaaaaaaa', 'aabababaa'],
    turno: ['....a....', '....aa...', 'aaaaaaa..', 'aaaaaaaa.', 'aaaabaaaa', 'aaaaaaaa.', 'aaaaaaa..', '....aa...', '....a....'],
    guerra: ['....a....', '..a.a.a..', '...aaa...', '.aaabaaa.', '...aaa...', '..a.a.a..', '....b....', '....b....', '....b....'],
    paz: ['...a.a...', '..aaaaa..', '...aaa...', '....a....', '...bab...', '..b.a.b..', '....a....', '....a....', '....a....'],
    fortificar: ['.........', 'aaaa.aaaa', 'aaaa.aaaa', '.........', 'aa.aaaa.a', 'aa.aaaa.a', '.........', 'aaaa.aaaa', 'aaaa.aaaa'],
    saltar: ['.........', 'a...a....', '.a...a...', '..a...a..', '...a...a.', '..a...a..', '.a...a...', 'a...a....', '.........'],
    auto: ['.aaaaaaa.', 'a.......a', 'a..aaa..a', 'a.a...a.a', 'a.a.b.a.a', 'a.a..a..a', 'a..aa...a', 'a.......a', '.aaaaaaa.'],
    detener: ['.........', '.aaaaaaa.', '.a.....a.', '.a.bbb.a.', '.a.bbb.a.', '.a.bbb.a.', '.a.....a.', '.aaaaaaa.', '.........'],
    cerrar: ['a.......a', '.a.....a.', '..a...a..', '...a.a...', '....a....', '...a.a...', '..a...a..', '.a.....a.', 'a.......a'],
    mejorar: ['....a....', '...aaa...', '..aaaaa..', '.aaaaaaa.', '...aaa...', '...aaa...', '...bbb...', '...bbb...', '...bbb...'],
    salud: ['.........', '...aaa...', '...aaa...', '.aaaaaaa.', '.aaabaaa.', '.aaaaaaa.', '...aaa...', '...aaa...', '.........'],
    movimiento: ['..aa.....', '.aaaa....', '.aaaa....', '..aa..aa.', '.....aaaa', '..aa.aaaa', '.aaaa.aa.', '.aaaa....', '..aa.....'],
    alerta: ['....a....', '...aaa...', '...aba...', '..aabaa..', '..aabaa..', '.aaaaaaa.', '.aaabaaa.', 'aaaaaaaaa', '.........'],
    recurso: ['...aa....', '..abba...', '.abbbba..', '.abbbbaa.', 'abbbbbbba', 'abbbbbbba', '.aabbbaa.', '...aaa...', '.........'],
    infanteria: ['...a...b.', '..aaa..b.', '..aaa..b.', '.aaaaaab.', '..aaa..b.', '..aaa..b.', '..a.a..b.', '..a.a..b.', '..a.a....'],
    distancia: ['....aaa..', '...a...a.', '..a.....a', '.a......a', 'abbbbbbba', '.a......a', '..a.....a', '...a...a.', '....aaa..'],
    montada: ['...aa....', '..aaaa...', '.aaaaaa..', 'aaa.aaaa.', 'aa..aaaaa', '....aaaaa', '...aaaaa.', '..aaaaa..', '..aaaa...'],
    civil: ['.aa......', '.aaa.....', '.aa......', '.aa......', '.aaaaaaa.', '.aaaaaaa.', '.aaaaaaa.', '.a.a.a.a.', '.a.a.a.a.'],
    artilleria: ['.........', '......aaa', '....aaaa.', '..aaaaa..', '.aaaaa...', 'aaaab....', '.abbba...', '..bbb....', '.........'],
    ola: ['.........', '..aa.....', '.a..a....', 'a....a..a', '......aa.', '..aa.....', '.a..a....', 'a....a..a', '......aa.'],
    barco: ['....a....', '....aa...', '....aaa..', '....aaaa.', '....a....', 'aaaaaaaaa', '.aaaaaaa.', '..aaaaa..', 'bbbbbbbbb'],
    corona: ['.........', 'aaaaaaaaa', 'abbbbbbba', 'aaaaaaaaa', 'a.a.a.a.a', 'a.a.a.a.a', 'b.b.b.b.b', '.........', '.........'],
    maravilla: ['....b....', '...bbb...', '....b....', '...aaa...', '..aabaa..', '..aaaaa..', '.aabbbaa.', '.aaaaaaa.', 'aaaaaaaaa'],
    edificio: ['.........', '..aaaaa..', '.a.....a.', 'aaaaaaaaa', 'a.b.b.b.a', 'a.......a', 'a.b...b.a', 'a..aaa..a', 'aaaaaaaaa'],
    mapa: ['aaaaaaaaa', 'a..a....a', 'a.aaa.b.a', 'a..a.bbba', 'a....b..a', 'a.b....aa', 'abbb..aaa', 'a.b...a.a', 'aaaaaaaaa']
  };

  // Icono de cada evento histórico.
  PC.EVENT_ICON = {
    el_nino: 'ola', terremoto: 'alerta', veta: 'oro', mesoamerica: 'barco', tupac_viaje: 'barco', guerra_sucesion: 'corona',
    epidemia: 'alerta', llegada_espanoles: 'barco', caida_capital: 'guerra', corona_desiste: 'paz', embajada_europea: 'diplomacia',
    contacto_inverso: 'barco', florecimiento: 'cultura', propuesta_paz: 'paz', tupac_amaru: 'guerra', independencia: 'sol',
    guano: 'oro', guerra_pacifico: 'guerra', caucho: 'recurso', reforma_agraria: 'alimento', bancarrota: 'alerta', revuelta: 'alerta',
    fase2: 'mapa', fase3: 'mapa', propuesta_alianza: 'diplomacia', llamada_aliado: 'guerra', exigencia_tributo: 'oro'
  };
  PC.unitIconKey = function (type) {
    const U = PC.UNITS[type];
    if (U.commander) return 'corona';
    if (type === 'caravana') return 'oro';
    if (U.cat === 'civil') return 'civil';
    if (type === 'canon') return 'artilleria';
    if (U.ranged) return 'distancia';
    if (['jinete', 'caballero', 'blindado'].includes(type)) return 'montada';
    if (type === 'explorador') return 'movimiento';
    return 'infanteria';
  };

  function svgFrom(grid, a, b) {
    let r = '';
    grid.forEach((row, y) => {
      for (let x = 0; x < 9; x++) {
        const ch = row[x];
        if (ch === 'a') r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${a}"/>`;
        else if (ch === 'b') r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${b}"/>`;
      }
    });
    return r;
  }
  // Icono SVG. Por defecto usa currentColor y el color de contraste --ico-b.
  PC.icon = function (name, cls, a, b) {
    const g = I[name] || I.recurso;
    return `<svg class="ico ${cls || ''}" viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true">${svgFrom(g, a || 'currentColor', b || 'var(--ico-b, currentColor)')}</svg>`;
  };

  // Emblema tocapu único por civilización (7×7 simétrico dentro de un marco), derivado de su clave.
  const emblemCache = {};
  PC.emblemGrid = function (key) {
    if (emblemCache[key]) return emblemCache[key];
    let h = 2166136261;
    for (const ch of key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
    const g = [];
    for (let y = 0; y < 9; y++) g.push(new Array(9).fill('.'));
    for (let i = 0; i < 9; i++) { g[0][i] = g[8][i] = g[i][0] = g[i][8] = 'a'; }
    for (let y = 2; y < 7; y++) {
      for (let x = 2; x <= 4; x++) {
        const v = rnd();
        const ch = v < 0.42 ? 'a' : v < 0.62 ? 'b' : '.';
        g[y][x] = ch; g[y][8 - x] = ch;
      }
    }
    g[4][4] = 'b';
    const out = g.map((row) => row.join(''));
    emblemCache[key] = out;
    return out;
  };
  PC.emblem = function (key, color, cls) {
    return `<svg class="ico emblem ${cls || ''}" viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true"><rect width="9" height="9" fill="${color}"/>${svgFrom(PC.emblemGrid(key), '#1a1426', '#efe4cc')}</svg>`;
  };
  // Dibuja una rejilla en un canvas 2D (para texturas 3D).
  PC.drawGrid = function (ctx, grid, x0, y0, cell, a, b) {
    grid.forEach((row, y) => {
      for (let x = 0; x < 9; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        ctx.fillStyle = ch === 'a' ? a : b;
        ctx.fillRect(x0 + x * cell, y0 + y * cell, cell, cell);
      }
    });
  };
})(globalThis.PC = globalThis.PC || {});

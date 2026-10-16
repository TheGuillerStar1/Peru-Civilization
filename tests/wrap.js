// Mapa continuo (como en Civilization): al salir por un borde lateral se llega al opuesto.
// Comprueba vecindad, distancia, rutas y guardado con y sin la opción; sin ella el mapa se comporta como siempre.
'use strict';
const assert = require('assert');
const PC = require('./engine');

const ok = (name) => console.log('  ok  ', name);
console.log('Mapa continuo');


// ---- sin la opción: nada cambia (ni en la fase 2)
PC.newGame({ scenario: 'tahuantinsuyo', culture: 'inca', seed: 11, autoplay: false, wrap: false });
assert.strictEqual(!!PC.G.map.wrap, false);
PC.startPhase2();
let m = PC.G.map;
assert.strictEqual(m.kind, 'sudamerica');
assert.strictEqual(!!m.wrap, false);
assert.ok(m.tiles.some((t) => !t), 'sin la opción el mapa sigue teniendo vacío alrededor');
assert.strictEqual(PC.tileCR(-1, 5), null, 'sin continuidad, salir por la izquierda no existe');
ok('sin la opción el mapa tiene bordes como siempre');

// ---- con la opción: el mapa del Perú es una región con bordes; desde Sudamérica da la vuelta
PC.newGame({ scenario: 'tahuantinsuyo', culture: 'inca', seed: 11, autoplay: false, wrap: true });
assert.strictEqual(PC.G.wrap, true);
assert.strictEqual(!!PC.G.map.wrap, false, 'el Perú conserva sus bordes');
PC.startPhase2();
m = PC.G.map;
assert.strictEqual(m.kind, 'sudamerica');
assert.strictEqual(m.wrap, true);
assert.ok(m.tiles.every(Boolean), 'el rectángulo entero está lleno (el vacío pasa a ser mar)');
const a = PC.tileCR(0, 6), b = PC.tileCR(m.cols - 1, 6);
assert.ok(a && b);
assert.strictEqual(PC.tileCR(-1, 6), b, 'c = -1 es la última columna');
assert.strictEqual(PC.tileCR(m.cols, 6), a, 'c = cols es la primera columna');
assert.strictEqual(PC.dist(a, b), 1, 'las casillas de ambos bordes son vecinas');
assert.ok(PC.neighbors(a).includes(b) && PC.neighbors(b).includes(a), 'el vecindario es simétrico a través del borde');
assert.strictEqual(PC.tileCR(3, -1), null, 'arriba y abajo siguen siendo bordes');
ok('los bordes laterales se tocan: vecindad y distancia');

let bad = 0;
m.tiles.forEach((t) => { if (t.r > 0 && t.r < m.rows - 1 && PC.neighbors(t).length !== 6) bad++; });
assert.strictEqual(bad, 0, 'todas las casillas interiores tienen 6 vecinas, también en los bordes laterales');
ok('todas las casillas interiores tienen 6 vecinas');

for (let k = 0; k < 300; k++) {
  const t1 = m.tiles[(k * 37) % m.tiles.length], t2 = m.tiles[(k * 91 + 5) % m.tiles.length];
  assert.strictEqual(PC.dist(t1, t2), PC.dist(t2, t1));
  assert.ok(PC.dist(t1, t2) <= Math.ceil(m.cols / 2) + m.rows);
}
ok('la distancia es simétrica y toma el camino corto');

// el mar de las casillas nuevas es navegable y no tiene región
assert.ok(PC.tileCR(0, 6).terrain === 'oceano' && !PC.tileCR(0, 6).region);
ok('las casillas de relleno son mar sin región');

// guardado: la opción viaja con la partida
PC.load(PC.serialize());
assert.strictEqual(PC.G.map.wrap, true);
assert.strictEqual(PC.tileCR(-1, 6), PC.tileCR(PC.G.map.cols - 1, 6));
ok('el guardado conserva el mapa continuo');

// partida larga con la opción: no se rompe
PC.newGame({ scenario: 'tahuantinsuyo', culture: 'inca', seed: 5, autoplay: true, wrap: true });
for (let k = 0; k < 30; k++) PC.endTurn();
PC.startPhase2();
for (let k = 0; k < 30; k++) PC.endTurn();
assert.ok(PC.G.turn >= 60 && PC.G.map.wrap);
ok('60 turnos de IA, con salto a Sudamérica, sin errores');
console.log('WRAP OK');

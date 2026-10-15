// Carga el motor en Node para las pruebas. La lista de archivos se toma de tests/smoke.js (FILES)
// para que haya una sola lista que mantener cuando se añaden módulos nuevos.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'smoke.js'), 'utf8');
const m = src.match(/const FILES = (\[[\s\S]*?\]);/);
if (!m) throw new Error('No se encontró la lista FILES en tests/smoke.js');
const FILES = new Function(`return ${m[1]}`)();
global.PC = global.PC || {};
FILES.forEach((f) => require(path.join(ROOT, f)));
module.exports = global.PC;

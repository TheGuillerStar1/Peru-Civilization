// Reglas del juego: terrenos, recursos, mejoras, tecnologías, unidades, edificios y maravillas.
(function (PC) {
  'use strict';

  // f=alimento p=producción g=oro. move: costo de movimiento (Infinity = intransitable). def: bono defensivo.
  // attr: desgaste (HP por turno) para unidades militares fuera de territorio propio/caminos/ríos.
  PC.TERRAIN = {
    oceano:    { name: 'Mar de Grau', zone: 'mar', f: 1, p: 0, g: 1, move: Infinity, def: 0, attr: 0, color: '#1d4f72' },
    desierto:  { name: 'Desierto costero', zone: 'costa', f: 0, p: 1, g: 0, move: 2, def: 0, attr: 10, color: '#d8c08a' },
    valle:     { name: 'Valle costero (oasis)', zone: 'costa', f: 3, p: 1, g: 1, move: 1, def: 0, attr: 0, color: '#8fb35a' },
    sierra:    { name: 'Valle interandino', zone: 'sierra', f: 2, p: 1, g: 0, move: 1, def: 0.25, attr: 0, color: '#a99a62' },
    puna:      { name: 'Puna / Altiplano', zone: 'sierra', f: 1, p: 1, g: 0, move: 1, def: 0.1, attr: 5, color: '#b8ad86' },
    cordillera:{ name: 'Cordillera', zone: 'sierra', f: 0, p: 2, g: 0, move: 3, def: 0.5, attr: 20, color: '#8a8580' },
    lago:      { name: 'Lago', zone: 'sierra', f: 2, p: 0, g: 1, move: Infinity, def: 0, attr: 0, color: '#3a7fa8' },
    ceja:      { name: 'Ceja de selva', zone: 'selva', f: 1, p: 2, g: 0, move: 2, def: 0.25, attr: 10, color: '#4f8a4a' },
    selva:     { name: 'Selva baja', zone: 'selva', f: 2, p: 1, g: 0, move: 2, def: 0.25, attr: 15, color: '#2f6b3a' },
    // Terrenos usados en fases continentales.
    llanura:   { name: 'Llanura', zone: 'llano', f: 2, p: 1, g: 0, move: 1, def: 0, attr: 0, color: '#9cb86a' },
    pampa:     { name: 'Pampa', zone: 'llano', f: 3, p: 1, g: 0, move: 1, def: 0, attr: 0, color: '#b4c77a' },
    estepa:    { name: 'Estepa', zone: 'llano', f: 1, p: 1, g: 0, move: 1, def: 0, attr: 5, color: '#c4b98e' },
    bosque:    { name: 'Bosque templado', zone: 'selva', f: 1, p: 2, g: 0, move: 2, def: 0.25, attr: 5, color: '#3f7a55' }
  };
  PC.ZONE_NAME = { costa: 'Costa', sierra: 'Sierra', selva: 'Selva', mar: 'Mar', llano: 'Llanos' };

  // reveal: tecnología necesaria para ver el recurso. kind: estrategico | lujo | alimento
  PC.RESOURCES = {
    oro:      { name: 'Oro', icon: '', kind: 'lujo', f: 0, p: 0, g: 3, mineral: true },
    plata:    { name: 'Plata', icon: '', kind: 'lujo', f: 0, p: 0, g: 3, mineral: true },
    cobre:    { name: 'Cobre', icon: '', kind: 'estrategico', f: 0, p: 1, g: 1, mineral: true },
    estano:   { name: 'Estaño', icon: '', kind: 'estrategico', f: 0, p: 1, g: 1, mineral: true },
    hierro:   { name: 'Hierro', icon: '', kind: 'estrategico', f: 0, p: 2, g: 0, mineral: true, reveal: 'metal_cobre' },
    carbon:   { name: 'Carbón', icon: '', kind: 'estrategico', f: 0, p: 2, g: 0, mineral: true, reveal: 'metal_cobre' },
    mercurio: { name: 'Mercurio', icon: '', kind: 'estrategico', f: 0, p: 1, g: 2, mineral: true, reveal: 'orfebreria' },
    salitre:  { name: 'Salitre', icon: '', kind: 'estrategico', f: 0, p: 1, g: 1, mineral: true, reveal: 'quimica' },
    guano:    { name: 'Guano', icon: '', kind: 'estrategico', f: 1, p: 0, g: 2, mineral: true },
    petroleo: { name: 'Petróleo', icon: '', kind: 'estrategico', f: 0, p: 1, g: 1, mineral: true, reveal: 'electricidad' },
    caucho:   { name: 'Caucho', icon: '', kind: 'lujo', f: 0, p: 0, g: 2 },
    alpacas:  { name: 'Llamas y alpacas', icon: '', kind: 'alimento', f: 1, p: 1, g: 1 },
    coca:     { name: 'Coca', icon: '', kind: 'lujo', f: 1, p: 0, g: 1 },
    cacao:    { name: 'Cacao', icon: '', kind: 'lujo', f: 0, p: 0, g: 2 },
    castana:  { name: 'Castaña', icon: '', kind: 'lujo', f: 1, p: 0, g: 1 },
    algodon:  { name: 'Algodón', icon: '', kind: 'lujo', f: 0, p: 1, g: 1 },
    maiz:     { name: 'Maíz', icon: '', kind: 'alimento', f: 2, p: 0, g: 0 },
    papa:     { name: 'Papa', icon: '', kind: 'alimento', f: 2, p: 0, g: 0 },
    quinua:   { name: 'Quinua', icon: '', kind: 'alimento', f: 2, p: 0, g: 0 },
    vid:      { name: 'Vid', icon: '', kind: 'lujo', f: 0, p: 0, g: 2 },
    spondylus:{ name: 'Spondylus', icon: '', kind: 'lujo', f: 0, p: 0, g: 2 },
    sal:      { name: 'Sal', icon: '', kind: 'lujo', f: 1, p: 0, g: 1 },
    pesca:    { name: 'Anchoveta', icon: '', kind: 'alimento', f: 2, p: 0, g: 0 }
  };

  // Peligros de la fauna amazónica: históricamente la selva era muy difícil de penetrar para los pueblos andinos
  // y los europeos. chance: probabilidad por turno; dmg: daño; civil: también afecta a colonos y trabajadores.
  PC.FAUNA = {
    jaguar:    { name: 'Jaguar (otorongo)', icon: '', chance: 0.18, dmg: 22, text: 'Un otorongo embosca a' },
    serpiente: { name: 'Serpientes (shushupe, jergón)', icon: '', chance: 0.22, dmg: 16, text: 'Una shushupe muerde a' },
    caiman:    { name: 'Caimanes negros', icon: '', chance: 0.18, dmg: 20, text: 'Los caimanes atacan a' },
    pirana:    { name: 'Pirañas y anguilas', icon: '', chance: 0.15, dmg: 14, text: 'Las pirañas hieren a' },
    mosquitos: { name: 'Mosquitos (malaria, fiebre amarilla)', icon: '', chance: 0.32, dmg: 12, disease: true, text: 'Las fiebres (malaria) debilitan a' }
  };

  PC.IMPROVEMENTS = {
    chacra:     { name: 'Chacra', tech: 'agricultura', terrains: ['valle', 'sierra', 'puna', 'selva', 'ceja', 'llanura', 'pampa'], f: 1, turns: 3 },
    andenes:    { name: 'Andenes', tech: 'andenes', terrains: ['sierra', 'ceja', 'cordillera'], f: 2, turns: 4 },
    canal:      { name: 'Canal de riego', tech: 'irrigacion', terrains: ['desierto', 'valle'], f: 2, turns: 4, noAttr: true },
    mina:       { name: 'Mina', tech: 'orfebreria', terrains: ['sierra', 'puna', 'cordillera', 'desierto'], p: 2, turns: 5, mineralOnly: false },
    corral:     { name: 'Corral', tech: 'camelidos', terrains: ['puna', 'sierra', 'estepa'], f: 1, p: 1, turns: 3, needsRes: ['alpacas'] },
    plantacion: { name: 'Plantación', tech: 'textileria', terrains: ['valle', 'ceja', 'selva', 'sierra'], g: 2, turns: 4, needsRes: ['coca', 'cacao', 'algodon', 'vid', 'castana', 'caucho'] },
    pozo:       { name: 'Pozo petrolero', tech: 'petroleo', terrains: null, p: 3, g: 2, turns: 5, needsRes: ['petroleo'] }
  };
  PC.ROAD = { name: 'Camino (Qhapaq Ñan)', tech: 'caminos', turns: 2 };

  PC.ERAS = [
    { id: 0, name: 'Arcaico', color: '#c9a66b' },
    { id: 1, name: 'Formativo', color: '#c98b5a' },
    { id: 2, name: 'Desarrollos Regionales', color: '#b86f4b' },
    { id: 3, name: 'Horizonte Imperial', color: '#a8553f' },
    { id: 4, name: 'Encuentro de Mundos', color: '#8a5a8f' },
    { id: 5, name: 'Pólvora y Acero', color: '#5d6b9a' },
    { id: 6, name: 'Ilustración', color: '#4f86a8' },
    { id: 7, name: 'Industrial', color: '#4f9a86' },
    { id: 8, name: 'Moderna', color: '#6a9a4f' }
  ];

  // hy: año histórico aproximado (para las facciones IA). null = tecnología de historia alternativa.
  // needs: requiere controlar al menos uno de esos recursos. needsFlag: requiere un hecho histórico.
  const T = (id, name, era, cost, req, extra) => Object.assign({ id, name, era, cost, req: req || [] }, extra || {});
  PC.TECHS = [
    T('agricultura', 'Domesticación de plantas', 0, 20, [], { hy: -5000, desc: 'Chacras. Papa, frijol, calabaza y ají.' }),
    T('pesca', 'Pesca con redes de algodón', 0, 20, [], { hy: -5000, desc: 'El mar rinde +1 alimento.' }),
    T('camelidos', 'Domesticación de camélidos', 0, 28, ['agricultura'], { hy: -4000, desc: 'Corrales. La puna rinde +1 producción.' }),
    T('textileria', 'Textilería', 0, 30, ['agricultura'], { hy: -3500, desc: 'Honderos, taller textil, plantaciones.' }),
    T('astronomia', 'Astronomía andina', 0, 34, ['agricultura'], { hy: -3000, desc: 'Observatorio solar. Calendario agrícola.' }),
    T('arq_monumental', 'Arquitectura monumental', 0, 40, ['astronomia'], { hy: -3000, desc: 'Huacas y la Ciudad Sagrada de Caral.' }),
    T('ceramica', 'Cerámica', 1, 50, ['agricultura'], { hy: -1800, desc: 'Almacenar excedentes: +15% crecimiento.' }),
    T('quipu', 'Quipu', 1, 60, ['textileria', 'astronomia'], { hy: -2500, desc: 'Casa de quipucamayocs. +2 ciudades sin perder cohesión.' }),
    T('guerra', 'Guerra ritual organizada', 1, 55, ['textileria'], { hy: -1600, desc: 'Macaneros y pucarás (murallas).' }),
    T('irrigacion', 'Canales de irrigación', 1, 60, ['ceramica'], { hy: -1500, desc: 'Canales: el desierto florece.' }),
    T('orfebreria', 'Orfebrería', 1, 65, ['ceramica'], { hy: -1500, desc: 'Minas y taller de orfebres. Revela mercurio.' }),
    T('culto', 'Culto de Chavín', 1, 65, ['arq_monumental'], { hy: -1200, desc: 'Templo oracular y Chavín de Huántar.' }),
    T('navegacion', 'Navegación de balsas', 2, 90, ['pesca', 'textileria'], { hy: -500, desc: 'Las unidades pueden embarcarse. Puertos.' }),
    T('metal_cobre', 'Metalurgia del cobre arsenical', 2, 100, ['orfebreria'], { hy: 100, needs: ['cobre'], desc: 'Requiere COBRE. Lanceros, fundiciones. Revela hierro y carbón.' }),
    T('andenes', 'Andenería', 2, 100, ['irrigacion'], { hy: 300, desc: 'Andenes: +2 alimento en sierra y ceja de selva.' }),
    T('puquios', 'Puquios', 2, 90, ['irrigacion'], { hy: 300, desc: 'Acueductos subterráneos: valles +1 alimento.' }),
    T('medicina', 'Herbolaria y trepanación', 2, 95, ['astronomia', 'culto'], { hy: -200, desc: 'Hampi wasi. Menos desgaste.' }),
    T('caminos', 'Red de caminos', 2, 110, ['quipu'], { hy: 600, desc: 'Caminos y tambos. Sin desgaste en caminos.' }),
    T('administracion', 'Administración decimal', 3, 160, ['quipu', 'caminos'], { hy: 700, desc: 'Awqa runa, acllahuasi. +4 ciudades sin perder cohesión.' }),
    T('qollqas', 'Qollqas (almacenes estatales)', 3, 150, ['administracion', 'ceramica'], { hy: 1000, desc: 'Protege contra El Niño y hambrunas.' }),
    T('bronce', 'Bronce estañífero', 3, 170, ['metal_cobre'], { hy: 1000, needs: ['estano'], desc: 'Requiere ESTAÑO. +1 defensa a todas las unidades.' }),
    T('puentes', 'Puentes colgantes', 3, 140, ['caminos'], { hy: 1300, desc: 'Las cordilleras cuestan menos y desgastan la mitad.' }),
    T('mitmaq', 'Mitmaqkuna', 3, 160, ['administracion'], { hy: 1450, desc: 'Las ciudades conquistadas se integran: +cohesión.' }),
    T('amazonia', 'Conocimiento amazónico', 3, 140, ['medicina'], { hy: null, desc: 'Visión normal y medio desgaste en la selva. Arqueros amazónicos.' }),
    T('hierro', 'Metalurgia del hierro', 4, 260, ['metal_cobre'], { hy: null, needs: ['hierro'], desc: 'Requiere HIERRO. Infantería de hierro, forjas.' }),
    T('quimica', 'Química andina', 4, 240, ['medicina', 'metal_cobre'], { hy: null, desc: 'Revela el salitre.' }),
    T('navegacion_altura', 'Navegación de altura', 4, 250, ['navegacion', 'astronomia'], { hy: 1470, desc: 'Astilleros. Expediciones por el Pacífico.' }),
    T('rueda', 'Rueda y poleas', 4, 220, ['caminos', 'metal_cobre'], { hy: null, desc: '+10% producción en todas las ciudades.' }),
    T('escritura', 'Escritura fonética', 4, 260, ['quipu', 'administracion'], { hy: 1560, desc: 'Yachaywasi (escuelas). +2 ciudades de capacidad.' }),
    T('variolizacion', 'Variolización', 4, 300, ['medicina', 'quimica'], { hy: null, desc: 'Protege contra las epidemias.' }),
    T('acero', 'Acero', 5, 400, ['hierro'], { hy: null, needs: ['carbon'], desc: 'Requiere CARBÓN. +2 ataque a unidades de hierro.' }),
    T('polvora', 'Pólvora', 5, 400, ['quimica', 'hierro'], { hy: null, needs: ['salitre', 'guano'], desc: 'Requiere SALITRE o GUANO. Polvorines.' }),
    T('navegacion_oceanica', 'Navegación oceánica', 5, 420, ['navegacion_altura', 'hierro'], { hy: null, desc: 'Cruzar océanos: contacto con otros continentes.' }),
    T('imprenta', 'Imprenta', 5, 380, ['escritura', 'metal_cobre'], { hy: 1584, desc: '+2 ciudades de capacidad.' }),
    T('equitacion', 'Equitación', 5, 300, ['camelidos'], { hy: 1540, needsFlag: 'caballos', desc: 'Requiere CABALLOS (contacto con Europa). Caballería.' }),
    T('arcabuz', 'Armas de fuego', 6, 550, ['polvora'], { hy: 1600, desc: 'Arcabuceros.' }),
    T('artilleria', 'Artillería', 6, 650, ['arcabuz', 'acero'], { hy: 1650, desc: 'Cañones.' }),
    T('universidad', 'Universidad', 6, 600, ['imprenta'], { hy: 1700, desc: 'Universidades.' }),
    T('banca', 'Banca y comercio', 6, 550, ['imprenta'], { hy: 1700, desc: 'Casas de cambio.' }),
    T('vapor', 'Máquina de vapor', 7, 900, ['acero', 'universidad'], { hy: 1830, needs: ['carbon'], desc: 'Requiere CARBÓN. Fábricas. Minas +1 producción.' }),
    T('fertilizantes', 'Química del guano', 7, 850, ['universidad', 'quimica'], { hy: 1845, needs: ['guano', 'salitre'], desc: 'Valles y chacras +1 alimento.' }),
    T('ferrocarril', 'Ferrocarril', 7, 1100, ['vapor'], { hy: 1870, desc: 'Estaciones. +1 movimiento en caminos.' }),
    T('fusil', 'Fusil de retrocarga', 7, 1000, ['artilleria', 'vapor'], { hy: 1870, desc: 'Fusileros.' }),
    T('electricidad', 'Electricidad', 7, 1200, ['vapor', 'universidad'], { hy: 1900, desc: 'Centrales. Revela el petróleo.' }),
    T('medicina_moderna', 'Medicina moderna', 8, 1400, ['universidad', 'variolizacion'], { hy: 1930, desc: 'Hospitales.' }),
    T('petroleo', 'Industria petrolera', 8, 1500, ['electricidad'], { hy: 1920, needs: ['petroleo'], desc: 'Requiere PETRÓLEO. Pozos y refinerías.' }),
    T('radio', 'Radio y telecomunicaciones', 8, 1500, ['electricidad'], { hy: 1930, desc: 'Infantería moderna, radioemisoras.' }),
    T('motor', 'Motor de combustión', 8, 1700, ['petroleo'], { hy: 1940, desc: 'Blindados.' }),
    T('computacion', 'Computación', 8, 2200, ['radio'], { hy: 1980, desc: 'Centros tecnológicos.' })
  ];
  PC.TECH = {};
  PC.TECHS.forEach((t) => { PC.TECH[t.id] = t; });

  // Unidades. ranged: ataca sin represalia. noAttrIn: zonas sin desgaste.
  const U = (id, name, o) => Object.assign({ id, name, cat: 'military', atk: 0, def: 1, moves: 2, cost: 20, icon: '•' }, o);
  PC.UNITS = {
    colono:     U('colono', 'Ayllu colonizador', { cat: 'civil', cost: 40, icon: '', desc: 'Funda una ciudad (cuesta 1 población).' }),
    trabajador: U('trabajador', "Ayllu de mit'a", { cat: 'civil', cost: 25, icon: '', desc: 'Construye chacras, andenes, canales, minas y caminos.' }),
    explorador: U('explorador', 'Chaski explorador', { def: 1, moves: 3, cost: 15, icon: '', halfAttr: true, desc: 'Explora rápido; medio desgaste.' }),
    guerrero:   U('guerrero', 'Guerrero con porra', { atk: 4, def: 3, cost: 20, icon: '' }),
    hondero:    U('hondero', 'Hondero', { atk: 5, def: 2, ranged: true, cost: 25, tech: 'textileria', icon: '' }),
    macanero:   U('macanero', 'Macanero', { atk: 7, def: 6, cost: 35, tech: 'guerra', icon: '' }),
    lancero:    U('lancero', 'Lancero de cobre', { atk: 9, def: 9, cost: 45, tech: 'metal_cobre', needs: ['cobre', 'estano'], icon: '' }),
    awqa:       U('awqa', 'Awqa runa (ejército imperial)', { atk: 11, def: 10, cost: 55, tech: 'administracion', icon: '' }),
    arquero:    U('arquero', 'Arquero amazónico', { atk: 8, def: 4, ranged: true, cost: 40, tech: 'amazonia', icon: '', noAttrIn: ['selva'] }),
    infante_hierro: U('infante_hierro', 'Infantería de hierro', { atk: 14, def: 14, cost: 70, tech: 'hierro', needs: ['hierro'], icon: '' }),
    arcabucero: U('arcabucero', 'Arcabucero', { atk: 18, def: 14, cost: 90, tech: 'arcabuz', icon: '' }),
    jinete:     U('jinete', 'Caballería', { atk: 18, def: 10, moves: 4, cost: 90, tech: 'equitacion', icon: '' }),
    canon:      U('canon', 'Cañón', { atk: 22, def: 6, ranged: true, cost: 110, tech: 'artilleria', icon: '' }),
    fusilero:   U('fusilero', 'Fusilero', { atk: 26, def: 24, cost: 130, tech: 'fusil', icon: '' }),
    infanteria: U('infanteria', 'Infantería moderna', { atk: 36, def: 34, cost: 180, tech: 'radio', icon: '' }),
    blindado:   U('blindado', 'Blindado', { atk: 48, def: 38, moves: 3, cost: 240, tech: 'motor', needs: ['petroleo'], icon: '' }),
    apu:        U('apu', 'Apu (comandante)', { atk: 0, def: 4, cost: 50, tech: 'guerra', commander: true, icon: '',
                  desc: 'Comandante histórico: +20% de ataque y defensa a tus unidades en su casilla y en las adyacentes. Puede arengarlas para curarlas.' }),
    caravana:   U('caravana', 'Caravana de llamas', { cat: 'civil', cost: 45, tech: 'camelidos', icon: '',
                  desc: 'Llévala a una ciudad extranjera en paz para abrir una ruta comercial: oro para ambos y mejores relaciones.' }),
    // Unidades exclusivas de facciones externas.
    conquistador: U('conquistador', 'Conquistador', { atk: 16, def: 14, moves: 3, cost: 999, icon: '', unique: true }),
    caballero:  U('caballero', 'Caballero español', { atk: 20, def: 12, moves: 4, cost: 999, icon: '', unique: true }),
    aliado:     U('aliado', 'Auxiliar indígena', { atk: 8, def: 7, cost: 999, icon: '', unique: true })
  };

  // Líneas de mejora: una unidad antigua puede modernizarse (pagando oro) a la mejor unidad disponible de su línea.
  PC.UNIT_LINES = {
    infanteria: ['guerrero', 'macanero', 'lancero', 'awqa', 'infante_hierro', 'arcabucero', 'fusilero', 'infanteria'],
    distancia: ['hondero', 'arquero', 'canon'],
    montada: ['jinete', 'blindado']
  };

  // Edificios. stab: cohesión. def: bono defensivo de la ciudad. coastal: requiere costa.
  const B = (id, name, cost, tech, y, o) => Object.assign({ id, name, cost, tech, y }, o || {});
  PC.BUILDINGS = {
    huaca:        B('huaca', 'Huaca (templo)', 40, 'arq_monumental', { c: 2 }, { stab: 3 }),
    taller_textil:B('taller_textil', 'Taller textil', 45, 'textileria', { p: 1, g: 2 }),
    observatorio: B('observatorio', 'Observatorio solar', 50, 'astronomia', { s: 2 }),
    muralla:      B('muralla', 'Pucará (murallas)', 50, 'guerra', {}, { def: 0.5 }),
    casa_quipu:   B('casa_quipu', 'Casa de quipucamayocs', 70, 'quipu', { s: 3 }),
    taller_orfebre: B('taller_orfebre', 'Taller de orfebres', 70, 'orfebreria', { g: 3, c: 1 }),
    oraculo:      B('oraculo', 'Templo oracular', 80, 'culto', { c: 3 }, { stab: 4 }),
    puerto:       B('puerto', 'Caleta y puerto', 80, 'navegacion', { f: 2, g: 2 }, { coastal: true }),
    fundicion:    B('fundicion', 'Huayrachina (fundición)', 90, 'metal_cobre', { p: 3 }),
    tambo:        B('tambo', 'Tambo', 80, 'caminos', { g: 1 }, { stab: 2, heal: 15 }),
    hampi_wasi:   B('hampi_wasi', 'Hampi wasi (casa de salud)', 100, 'medicina', { f: 1 }, { stab: 3 }),
    qollqa:       B('qollqa', 'Qollqas', 100, 'qollqas', { f: 2 }, { stab: 2 }),
    acllahuasi:   B('acllahuasi', 'Acllahuasi', 120, 'administracion', { p: 1, g: 2, c: 2 }),
    forja:        B('forja', 'Forja', 150, 'hierro', { p: 4 }),
    yachaywasi:   B('yachaywasi', 'Yachaywasi (escuela)', 160, 'escritura', { s: 4, c: 1 }),
    astillero:    B('astillero', 'Astillero', 160, 'navegacion_altura', { p: 2, g: 2 }, { coastal: true }),
    polvorin:     B('polvorin', 'Polvorín', 200, 'polvora', { p: 2 }, { def: 0.25 }),
    universidad:  B('universidad', 'Universidad', 300, 'universidad', { s: 7 }),
    banco:        B('banco', 'Casa de cambio', 250, 'banca', { g: 6 }),
    fabrica:      B('fabrica', 'Fábrica', 450, 'vapor', { p: 8 }),
    estacion:     B('estacion', 'Estación ferroviaria', 400, 'ferrocarril', { p: 4, g: 4 }),
    hospital:     B('hospital', 'Hospital', 400, 'medicina_moderna', { f: 3 }, { stab: 5 }),
    central:      B('central', 'Central eléctrica', 550, 'electricidad', { p: 8 }),
    refineria:    B('refineria', 'Refinería', 600, 'petroleo', { p: 6, g: 6 }),
    radioemisora: B('radioemisora', 'Radioemisora', 500, 'radio', { c: 5 }, { stab: 5 }),
    centro_tec:   B('centro_tec', 'Centro tecnológico', 800, 'computacion', { s: 15 })
  };

  // Maravillas: únicas en el mundo. gstab: cohesión global. gmove: +movimiento global.
  PC.WONDERS = {
    caral:        B('caral', 'Ciudad Sagrada de Caral', 120, 'arq_monumental', { c: 4, s: 1 }, { gstab: 5, wonder: true }),
    chavin:       B('chavin', 'Chavín de Huántar', 200, 'culto', { c: 6 }, { gstab: 8, wonder: true }),
    nasca:        B('nasca', 'Líneas de Nasca', 200, 'astronomia', { c: 5, s: 3 }, { wonder: true, minEra: 1 }),
    huacas_moche: B('huacas_moche', 'Huacas del Sol y de la Luna', 220, 'orfebreria', { p: 3, c: 4, g: 3 }, { wonder: true }),
    chan_chan:    B('chan_chan', 'Chan Chan', 300, 'irrigacion', { g: 6, c: 3 }, { wonder: true }),
    kuelap:       B('kuelap', 'Fortaleza de Kuélap', 280, 'guerra', { c: 2 }, { def: 1.0, gdef: 0.15, wonder: true }),
    sacsayhuaman: B('sacsayhuaman', 'Sacsayhuamán', 420, 'administracion', { c: 4 }, { def: 1.0, gstab: 5, wonder: true }),
    machu_picchu: B('machu_picchu', 'Machu Picchu', 480, 'andenes', { c: 8, f: 2 }, { gstab: 8, wonder: true, minEra: 3 }),
    qhapaq_nan:   B('qhapaq_nan', 'Qhapaq Ñan', 450, 'puentes', { g: 3 }, { gmove: 1, wonder: true }),
    coricancha:   B('coricancha', 'Coricancha', 400, 'bronce', { g: 5, c: 6 }, { gstab: 5, wonder: true }),
    san_marcos:   B('san_marcos', 'Universidad de San Marcos', 700, 'universidad', { s: 12, c: 3 }, { wonder: true }),
    ferrocarril_central: B('ferrocarril_central', 'Ferrocarril Central Andino', 1200, 'ferrocarril', { p: 10, g: 5 }, { gmove: 1, wonder: true })
  };

  // Niveles de dificultad de la IA.
  //   aiYield: multiplicador de producción/ciencia/oro de la IA | aiAggr: agresividad | spain: tamaño de las invasiones
  //   epidemic: severidad de las epidemias | altTech: costo de tecnologías de historia alternativa (sin fecha histórica)
  //   histTechs: la IA recibe las tecnologías en su fecha real | histAI: los imperios históricos se expanden en su época
  PC.DIFFICULTY = {
    facil:    { name: 'Fácil', aiYield: 0.75, aiAggr: 0.5, spain: 0.6, epidemic: 0.6, altTech: 1, startGold: 60, histTechs: false, histAI: false,
                desc: 'IA lenta y pacífica, invasiones pequeñas. Para aprender.' },
    medio:    { name: 'Medio', aiYield: 1, aiAggr: 1, spain: 1, epidemic: 1, altTech: 1, startGold: 20, histTechs: false, histAI: false,
                desc: 'Equilibrado.' },
    dificil:  { name: 'Difícil', aiYield: 1.3, aiAggr: 1.6, spain: 1.4, epidemic: 1.1, altTech: 1.15, startGold: 0, histTechs: false, histAI: false,
                desc: 'IA más productiva y agresiva; la conquista llega con más fuerza.' },
    realista: { name: 'Realista', aiYield: 1.15, aiAggr: 1.3, spain: 1.6, epidemic: 1.25, altTech: 1.6, startGold: 0, histTechs: true, histAI: true,
                desc: 'Lo más apegado a la historia: las culturas avanzan a su ritmo real, Wari, Chimú y los Incas se expanden en su época, ' +
                      'las epidemias y la conquista golpean con fuerza histórica y desviarse de la historia cuesta mucho más.' }
  };
  PC.diff = () => PC.DIFFICULTY[(PC.G && PC.G.difficulty) || 'medio'];

  // Imperios que, en dificultad Realista, se expanden en su ventana histórica.
  PC.HIST_EMPIRES = [
    { key: 'wari', from: 600, to: 1000 }, { key: 'tiwanaku', from: 500, to: 1000 }, { key: 'chimu', from: 1000, to: 1470 },
    { key: 'inca', from: 1438, to: 1527 }
  ];

  // Ritmo del calendario: años por turno según la época.
  PC.yearStep = function (year, speed) {
    let s;
    if (year < -1000) s = 50; else if (year < 500) s = 30; else if (year < 1300) s = 20;
    else if (year < 1500) s = 5; else if (year < 1600) s = 2; else if (year < 1800) s = 10;
    else if (year < 1950) s = 5; else s = 2;
    return speed === 'rapida' ? s * 2 : s;
  };
  PC.END_YEAR = 2050;
})(globalThis.PC = globalThis.PC || {});

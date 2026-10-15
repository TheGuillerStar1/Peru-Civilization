// Contenido continental (v0.1.2): maravillas de las Fases 2 y 3, la cultura republicana del Perú y escenarios nuevos.
(function (PC) {
  'use strict';
  const W = (id, name, cost, tech, y, o) => Object.assign({ id, name, cost, tech, y, wonder: true }, o || {});

  // Maravillas continentales. phases: fases en que se pueden construir; regions: la ciudad debe estar en una de esas regiones.
  // hist: año histórico aproximado (para las divergencias). Las comprueba js/core/continent.js.
  const SA = ['sudamerica', 'america'], AM = ['america'];
  Object.assign(PC.WONDERS, {
    puerta_sol:      W('puerta_sol', 'Puerta del Sol de Tiwanaku', 260, 'astronomia', { c: 5, s: 3 }, { gstab: 4, phases: SA, regions: ['altiplano'], hist: 600 }),
    cerro_rico:      W('cerro_rico', 'Cerro Rico de Potosí', 520, 'metal_cobre', { g: 10, p: 2 }, { phases: SA, regions: ['altiplano'], hist: 1545 }),
    teotihuacan:     W('teotihuacan', 'Teotihuacan', 260, 'arq_monumental', { c: 6, p: 2 }, { gstab: 5, phases: AM, regions: ['valle_mexico'], hist: 200 }),
    tenochtitlan:    W('tenochtitlan', 'Tenochtitlan', 420, 'irrigacion', { f: 4, g: 3, c: 3 }, { gstab: 4, phases: AM, regions: ['valle_mexico'], hist: 1325 }),
    chichen_itza:    W('chichen_itza', 'Chichén Itzá', 300, 'astronomia', { c: 5, s: 4 }, { phases: AM, regions: ['yucatan'], hist: 900 }),
    tikal:           W('tikal', 'Tikal', 280, 'escritura', { c: 4, s: 3, g: 2 }, { phases: AM, regions: ['guatemala'], hist: 500 }),
    cahokia:         W('cahokia', 'Cahokia', 240, 'arq_monumental', { f: 3, c: 3 }, { gstab: 3, phases: AM, regions: ['misisipi'], hist: 1050 }),
    canal_panama:    W('canal_panama', 'Canal de Panamá', 1400, 'ferrocarril', { g: 12, p: 2 }, { gmove: 1, coastal: true, phases: AM, regions: ['istmo'], hist: 1914 }),
    cristo_redentor: W('cristo_redentor', 'Cristo Redentor', 1100, 'radio', { c: 12 }, { gstab: 10, phases: SA, regions: ['sudeste'], hist: 1931 })
  });

  // La república peruana (escenarios del siglo XIX en adelante).
  PC.CULTURES.peru = { name: 'República del Perú', leader: 'Gobierno del Perú', color: '#c0392b', region: 'rimac',
    techs: null, bonus: { gold: 1, stab: 5, cheap: ['ferrocarril', 'fertilizantes'] },
    desc: 'El Perú independiente. +1 oro por ciudad, +5 cohesión; ferrocarril y química del guano más baratos.' };
  PC.FACTIONS.peru = { name: 'Perú', color: '#c0392b', region: 'rimac' };

  // Escenarios. Campos extra (los aplica js/core/continent.js tras crear la partida):
  //   fired: eventos que ya ocurrieron | flags: banderas iniciales | rename: nombres de facciones | wars: rivales en guerra contigo
  //   modern: sustituye las tropas antiguas por unidades de su época | buildings: edificios extra en la capital | startPhase: fase inicial
  const PASADO = ['mesoamerica', 'tupac_viaje', 'contacto_inverso', 'embajada_europea', 'llegada_espanoles', 'epidemia', 'guerra_sucesion', 'corona_desiste', 'caida_capital'];
  const selva = (y) => [['ashaninka', 'selva_central', 'Gran Pajonal'], ['shipibo', 'ucayali', 'Pucallpa'], ['awajun', 'maranon', 'Cenepa'], ['achuar', 'pastaza', 'Andoas'],
    ['matsigenka', 'manu', 'Boca Manu'], ['harakbut', 'madre_de_dios', 'Laberinto']].map(([id, r, n]) => ({ id, cities: [[r, n, y ? 2 : 1]] }));
  Object.assign(PC.SCENARIOS, {
    cajamarca: {
      name: 'Cajamarca (1532)', year: 1532,
      desc: 'Atahualpa acaba de vencer a Huáscar y descansa en Cajamarca cuando Pizarro desembarca en Tumbes. El imperio está dividido y la viruela avanza. ¿Repetirás la historia?',
      playable: ['inca'], startText: 'El imperio ya existe: tu capital es el Cusco y Atahualpa espera en Cajamarca.',
      playerCities: [{ region: 'cusco', name: 'Cusco', pop: 8 }, { region: 'cajamarca', name: 'Cajamarca', pop: 4 }, { region: 'moche', name: 'Chan Chan', pop: 4 },
        { region: 'mantaro', name: 'Hatun Xauxa', pop: 3 }, { region: 'titicaca', name: 'Hatuncolla', pop: 3 }, { region: 'huanuco', name: 'Huánuco Pampa', pop: 3 },
        { region: 'rimac', name: 'Pachacámac', pop: 3 }, { region: 'tumbes', name: 'Tumbes', pop: 2 }],
      rivals: [{ id: 'chachapoyas', cities: [['chachapoyas', 'Kuélap', 3]] }].concat(selva(false)),
      fired: ['mesoamerica', 'tupac_viaje'], flags: { crisisSucesoria: true }, spawns: false
    },
    independencia: {
      name: 'Independencia (1820)', year: 1820,
      desc: 'La Expedición Libertadora desembarca en Paracas y el norte se pronuncia por la independencia. El virrey aún domina Lima, el Cusco y el sur. Expulsa a los realistas.',
      playable: ['peru'], startText: 'Empiezas con las ciudades patriotas del norte y de la costa sur.',
      playerCities: [{ region: 'moche', name: 'Trujillo', pop: 5 }, { region: 'chira_piura', name: 'Piura', pop: 3 }, { region: 'lambayeque', name: 'Lambayeque', pop: 3 },
        { region: 'norte_chico', name: 'Huaura', pop: 2 }, { region: 'chincha', name: 'Pisco', pop: 2 }],
      rivals: [{ id: 'espana', cities: [['rimac', 'Lima', 8], ['cusco', 'Cusco', 6], ['arequipa', 'Arequipa', 5], ['ayacucho', 'Huamanga', 3], ['titicaca', 'Puno', 3], ['mantaro', 'Huancayo', 3]] }]
        .concat(selva(true)),
      fired: PASADO.concat(['tupac_amaru', 'independencia']), flags: { virreinato: false }, rename: { espana: 'Ejército realista' }, wars: ['espana'],
      playerName: 'Perú libre', modern: 3, buildings: ['universidad'], spawns: false
    },
    pacifico: {
      name: 'Guerra del Pacífico (1879)', year: 1879,
      desc: 'Chile ocupa Antofagasta y el Perú, aliado secreto de Bolivia, es arrastrado a la guerra por el salitre. Grau, Bolognesi y Cáceres esperan tus órdenes.',
      playable: ['peru'], startText: 'Gobiernas el Perú republicano: de Tumbes a Tarapacá.',
      playerCities: [{ region: 'rimac', name: 'Lima', pop: 9 }, { region: 'moche', name: 'Trujillo', pop: 5 }, { region: 'arequipa', name: 'Arequipa', pop: 5 },
        { region: 'cusco', name: 'Cusco', pop: 5 }, { region: 'tacna', name: 'Tacna', pop: 3 }, { region: 'moquegua', name: 'Moquegua', pop: 3 },
        { region: 'chira_piura', name: 'Piura', pop: 3 }, { region: 'mantaro', name: 'Huancayo', pop: 3 }, { region: 'iquitos', name: 'Iquitos', pop: 2 }],
      rivals: selva(true),
      fired: PASADO.concat(['tupac_amaru', 'independencia', 'guano']), flags: { republica: true }, playerName: 'República del Perú',
      modern: 4, buildings: ['universidad', 'banco', 'estacion'], spawns: false
    },
    sudamerica1810: {
      name: 'Sudamérica (1810)', year: 1810,
      desc: 'Fase 2 desde el inicio. Las juntas de Caracas, Buenos Aires, Santiago y Bogotá rompen con la Corona. El Perú decide su lugar en un continente que nace.',
      playable: ['peru'], startText: 'Empiezas directamente en el mapa de Sudamérica, con las ciudades del Perú.',
      playerCities: [{ region: 'rimac', name: 'Lima', pop: 8 }, { region: 'cusco', name: 'Cusco', pop: 5 }, { region: 'arequipa', name: 'Arequipa', pop: 4 },
        { region: 'moche', name: 'Trujillo', pop: 4 }, { region: 'ayacucho', name: 'Huamanga', pop: 3 }, { region: 'chachapoyas', name: 'Chachapoyas', pop: 2 }],
      rivals: [], fired: PASADO.concat(['tupac_amaru']), playerName: 'Perú', modern: 3, buildings: ['universidad'], startPhase: 'sudamerica', spawns: false
    }
  });
})(globalThis.PC = globalThis.PC || {});

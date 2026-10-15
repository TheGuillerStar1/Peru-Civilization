// Culturas jugables, facciones históricas y escenarios.
(function (PC) {
  'use strict';

  // bonus: modificadores de la civilización.
  //   culture, science, gold, prod: suma por ciudad | stab: cohesión | atk: % ataque
  //   zoneYield: {zona: {f,p,g}} | selvaNative: sin desgaste ni niebla en selva | cheap: tecnologías con descuento
  PC.CULTURES = {
    caral:    { name: 'Caral-Supe', leader: 'Consejo de sacerdotes de Caral', color: '#e0b04a', region: 'norte_chico',
                techs: ['agricultura', 'pesca', 'textileria'], bonus: { culture: 2, stab: 10, cheap: ['astronomia', 'arq_monumental', 'quipu'] },
                desc: 'La primera civilización de América (3000 a.C.). Pacífica: +2 cultura por ciudad, +10 cohesión, astronomía y quipu más baratos.' },
    sechin:   { name: 'Sechín', leader: 'Señores guerreros de Casma', color: '#c0392b', region: 'santa_casma',
                techs: ['agricultura', 'pesca'], bonus: { atk: 25, cheap: ['guerra', 'metal_cobre'] },
                desc: 'Los muros de Cerro Sechín muestran la guerra más antigua del Perú. +25% de ataque; guerra y metalurgia más baratas.' },
    kotosh:   { name: 'Kotosh', leader: 'Sacerdotes de las Manos Cruzadas', color: '#9b59b6', region: 'huanuco',
                techs: ['agricultura'], bonus: { zoneYield: { sierra: { p: 1 } }, cheap: ['andenes', 'irrigacion', 'culto'] },
                desc: 'Tradición religiosa de la sierra. +1 producción en casillas de sierra; andenes y culto más baratos.' },
    paracas:  { name: 'Paracas', leader: 'Linajes de la Necrópolis', color: '#16a085', region: 'ica_nasca',
                techs: ['agricultura', 'pesca', 'textileria'], bonus: { gold: 2, cheap: ['medicina', 'navegacion', 'puquios'] },
                desc: 'Maestros textiles y cirujanos. +2 oro por ciudad; medicina, navegación y puquios más baratos.' },
    titicaca: { name: 'Pueblos del Titicaca', leader: 'Curacas de Qaluyu', color: '#2980b9', region: 'titicaca',
                techs: ['agricultura', 'camelidos'], bonus: { zoneYield: { sierra: { f: 1 } }, cheap: ['metal_cobre', 'bronce'] },
                desc: 'Cuna de la papa y los camélidos. +1 alimento en sierra y puna; bronce más barato (tienen el estaño).' },
    cusco:    { name: 'Ayllus del Cusco', leader: 'Linaje de Manco Cápac', color: '#d35400', region: 'cusco',
                techs: ['agricultura'], bonus: { capacity: 3, cheap: ['caminos', 'administracion', 'mitmaq'] },
                desc: 'Proto-incas. +3 de capacidad administrativa; caminos y administración más baratos.' },
    amazonia: { name: 'Pueblos arawak', leader: 'Consejo de los Asháninka', color: '#27ae60', region: 'selva_central',
                techs: ['agricultura'], bonus: { selvaNative: true, zoneYield: { selva: { f: 1 } }, cheap: ['amazonia', 'medicina'] },
                desc: 'Señores de la selva: sin desgaste ni niebla en la Amazonía, +1 alimento en selva.' },
    inca:     { name: 'Tahuantinsuyo', leader: 'Pachacútec', color: '#d35400', region: 'cusco',
                techs: null, bonus: { capacity: 4, cheap: ['administracion', 'mitmaq', 'caminos', 'puentes'] },
                desc: 'El imperio de los cuatro suyos. +4 capacidad administrativa.' }
  };

  // Facciones IA (también usadas como culturas que "aparecen" en su fecha histórica).
  PC.FACTIONS = {
    sechin: { name: 'Sechín', color: '#c0392b', region: 'santa_casma' },
    kotosh: { name: 'Kotosh', color: '#9b59b6', region: 'huanuco' },
    caral: { name: 'Caral-Supe', color: '#e0b04a', region: 'norte_chico' },
    paracas: { name: 'Paracas', color: '#16a085', region: 'ica_nasca' },
    titicaca: { name: 'Qaluyu', color: '#2980b9', region: 'titicaca' },
    cusco: { name: 'Ayllus del Cusco', color: '#d35400', region: 'cusco' },
    huaca_prieta: { name: 'Huaca Prieta', color: '#7f8c8d', region: 'moche' },
    ashaninka: { name: 'Asháninka', color: '#27ae60', region: 'selva_central', selva: true },
    shipibo: { name: 'Shipibo-Konibo', color: '#1abc9c', region: 'ucayali', selva: true },
    awajun: { name: 'Awajún', color: '#229954', region: 'maranon', selva: true },
    cocama: { name: 'Cocama', color: '#52be80', region: 'iquitos', selva: true },
    harakbut: { name: 'Harakbut', color: '#45b39d', region: 'madre_de_dios', selva: true },
    achuar: { name: 'Achuar', color: '#58d68d', region: 'pastaza', selva: true },
    matses: { name: 'Matsés', color: '#239b56', region: 'yavari', selva: true },
    yine: { name: 'Yine', color: '#48c9b0', region: 'purus', selva: true },
    matsigenka: { name: 'Matsigenka', color: '#28b463', region: 'manu', selva: true },
    chavin: { name: 'Chavín', color: '#8e44ad', region: 'huaylas' },
    vicus: { name: 'Vicús', color: '#a04000', region: 'chira_piura' },
    pukara: { name: 'Pukara', color: '#5dade2', region: 'titicaca' },
    moche: { name: 'Moche', color: '#e74c3c', region: 'moche' },
    nasca: { name: 'Nasca', color: '#f39c12', region: 'ica_nasca' },
    lima: { name: 'Cultura Lima', color: '#b7950b', region: 'rimac' },
    recuay: { name: 'Recuay', color: '#7d3c98', region: 'huaylas' },
    tiwanaku: { name: 'Tiwanaku', color: '#2471a3', region: 'titicaca' },
    wari: { name: 'Wari', color: '#c0392b', region: 'ayacucho' },
    sican: { name: 'Lambayeque (Sicán)', color: '#f1c40f', region: 'lambayeque' },
    chachapoyas: { name: 'Chachapoyas', color: '#196f3d', region: 'chachapoyas' },
    chimu: { name: 'Chimú', color: '#922b21', region: 'moche' },
    chincha: { name: 'Chincha', color: '#117a65', region: 'chincha' },
    ychsma: { name: 'Ychsma', color: '#a9cce3', region: 'rimac' },
    chanka: { name: 'Chanka', color: '#6c3483', region: 'apurimac' },
    huanca: { name: 'Huanca', color: '#b9770e', region: 'mantaro' },
    colla: { name: 'Colla', color: '#1f618d', region: 'titicaca' },
    lupaca: { name: 'Lupaca', color: '#5499c7', region: 'altos_tacna' },
    cajamarca: { name: 'Caxamarca', color: '#873600', region: 'cajamarca' },
    huaylas: { name: 'Huaylas', color: '#76448a', region: 'huaylas' },
    inca: { name: 'Incas', color: '#d35400', region: 'cusco' },
    // Externas
    espana: { name: 'Expedición española', color: '#f4d03f', region: 'tumbes', external: true },
    chile: { name: 'Chile', color: '#e8e8e8', region: 'tacna', external: true },
    rebeldes: { name: 'Rebeldes', color: '#566573', region: null }
  };

  // Culturas que aparecen en su fecha histórica (escenario Orígenes).
  PC.SPAWNS = [
    { id: 'chavin', year: -1200 }, { id: 'paracas', year: -800 }, { id: 'vicus', year: -500 }, { id: 'pukara', year: -500 },
    { id: 'moche', year: 100 }, { id: 'nasca', year: 100 }, { id: 'lima', year: 100 }, { id: 'recuay', year: 200 },
    { id: 'tiwanaku', year: 500 }, { id: 'wari', year: 600 }, { id: 'sican', year: 750 }, { id: 'chachapoyas', year: 800 },
    { id: 'chimu', year: 900 }, { id: 'chincha', year: 1000 }, { id: 'chanka', year: 1100 }, { id: 'huanca', year: 1100 },
    { id: 'colla', year: 1100 }, { id: 'inca', year: 1200 }
  ];

  PC.SCENARIOS = {
    origenes: {
      name: 'Orígenes (3000 a.C.)', year: -3000,
      desc: 'Empieza en el Arcaico con una cultura temprana. Las grandes culturas aparecerán en su fecha... salvo que tú ocupes antes su tierra.',
      playable: ['caral', 'sechin', 'kotosh', 'paracas', 'titicaca', 'cusco', 'amazonia'],
      rivals: ['caral', 'sechin', 'kotosh', 'huaca_prieta', 'titicaca', 'ashaninka', 'shipibo', 'awajun', 'cocama', 'harakbut', 'achuar', 'matses', 'yine', 'matsigenka'],
      spawns: true
    },
    tahuantinsuyo: {
      name: 'Tahuantinsuyo (1438)', year: 1438,
      desc: 'Pachacútec acaba de vencer a los Chankas. Unifica los Andes antes de que lleguen los barcos del norte (≈1532).',
      playable: ['inca'],
      playerCities: [{ region: 'cusco', name: 'Cusco', pop: 6 }, { region: 'cusco', name: 'Ollantaytambo', pop: 3 }, { region: 'apurimac', name: 'Andahuaylas', pop: 2 }],
      playerTechs: 'hy:1438',
      rivals: [
        { id: 'chimu', cities: [['moche', 'Chan Chan', 6], ['lambayeque', 'Túcume', 3], ['chira_piura', 'Piura', 2], ['santa_casma', 'Casma', 2]] },
        { id: 'chanka', cities: [['ayacucho', 'Vilcas', 3]] },
        { id: 'chachapoyas', cities: [['chachapoyas', 'Kuélap', 3]] },
        { id: 'colla', cities: [['titicaca', 'Hatuncolla', 4]] },
        { id: 'lupaca', cities: [['altos_tacna', 'Chucuito', 2]] },
        { id: 'huanca', cities: [['mantaro', 'Hatun Xauxa', 4]] },
        { id: 'chincha', cities: [['chincha', 'Chincha', 3], ['ica_nasca', 'Ica', 2]] },
        { id: 'ychsma', cities: [['rimac', 'Pachacámac', 3]] },
        { id: 'cajamarca', cities: [['cajamarca', 'Caxamarca', 3]] },
        { id: 'huaylas', cities: [['huaylas', 'Huaraz', 2]] },
        { id: 'ashaninka', cities: [['selva_central', 'Gran Pajonal', 2]] },
        { id: 'shipibo', cities: [['ucayali', 'Pucallpa', 2]] },
        { id: 'awajun', cities: [['maranon', 'Cenepa', 2]] },
        { id: 'cocama', cities: [['iquitos', 'Nauta', 2]] },
        { id: 'achuar', cities: [['pastaza', 'Andoas', 1]] },
        { id: 'matsigenka', cities: [['manu', 'Boca Manu', 1]] },
        { id: 'harakbut', cities: [['madre_de_dios', 'Laberinto', 1]] }
      ],
      spawns: false
    }
  };

  // Nombres de ciudades por región (para colonos).
  PC.CITY_NAMES = {
    tumbes: ['Tumbes', 'Zarumilla'], chira_piura: ['Piura', 'Sullana', 'Paita', 'Narihualá'], lambayeque: ['Túcume', 'Sipán', 'Batán Grande', 'Chiclayo'],
    moche: ['Chan Chan', 'Huanchaco', 'Pacatnamú', 'Chicama'], santa_casma: ['Casma', 'Sechín', 'Chimbote', 'Nepeña'],
    norte_chico: ['Caral', 'Áspero', 'Supe', 'Huaura', 'Barranca'], rimac: ['Pachacámac', 'Lima', 'Maranga', 'Callao', 'Carabayllo'],
    chincha: ['Chincha', 'Cañete', 'Pisco', 'Tambo Colorado'], ica_nasca: ['Cahuachi', 'Ica', 'Nasca', 'Palpa'],
    camana: ['Camaná', 'Majes', 'Ocoña'], moquegua: ['Moquegua', 'Ilo', 'Omo'], tacna: ['Tacna', 'Locumba', 'Ite'],
    huancabamba: ['Huancabamba', 'Ayabaca', 'Caxas'], cajamarca: ['Caxamarca', 'Kuntur Wasi', 'Cumbemayo', 'Celendín'],
    huamachuco: ['Huamachuco', 'Marcahuamachuco', 'Pataz'], huaylas: ['Chavín', 'Huaraz', 'Yungay', 'Pomabamba'],
    huanuco: ['Kotosh', 'Huánuco Pampa', 'Tantamayo'], pasco: ['Pumpu', 'Cerro de Pasco', 'Tarma'],
    mantaro: ['Hatun Xauxa', 'Huancayo', 'Tunanmarca', 'Concepción'], huancavelica: ['Huancavelica', 'Huaytará', 'Castrovirreyna'],
    ayacucho: ['Wari', 'Huamanga', 'Vilcashuamán', 'Pikimachay'], apurimac: ['Andahuaylas', 'Abancay', 'Sondor'],
    cusco: ['Cusco', 'Ollantaytambo', 'Pisac', 'Urubamba', 'Tipón'], arequipa: ['Arequipa', 'Chivay', 'Yanque', 'Cotahuasi'],
    titicaca: ['Hatuncolla', 'Pukara', 'Chucuito', 'Juli', 'Puno'], altos_tacna: ['Candarave', 'Tarata', 'Cerro Baúl'],
    chachapoyas: ['Kuélap', 'Chachapoyas', 'Revash', 'Gran Pajatén'], huallaga: ['Moyobamba', 'Lamas', 'Tarapoto'],
    maranon: ['Cenepa', 'Bagua', 'Borja'], putumayo: ['El Estrecho', 'Santa Clotilde'], iquitos: ['Iquitos', 'Nauta', 'Caballococha'],
    ucayali: ['Pucallpa', 'Contamana', 'Atalaya'], selva_central: ['Gran Pajonal', 'La Merced', 'Satipo', 'Oxapampa'],
    vilcabamba: ['Vilcabamba', 'Espíritu Pampa', 'Quillabamba'], madre_de_dios: ['Puerto Maldonado', 'Laberinto', 'Iñapari'],
    pastaza: ['Andoas', 'Intuto'], yavari: ['Angamos', 'Islandia'], requena: ['Requena', 'Lagunas'], tingo_maria: ['Tingo María', 'Puerto Bermúdez'],
    purus: ['Puerto Esperanza', 'Sepahua'], manu: ['Manu', 'Boca Manu'], tambopata: ['Tambopata', 'Sandia', 'San Gabán']
  };
})(globalThis.PC = globalThis.PC || {});

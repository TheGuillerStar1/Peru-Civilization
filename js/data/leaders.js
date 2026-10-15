// Líderes históricos (al estilo de Civilization VII: el líder es independiente de la civilización),
// agendas de la IA y nombres de comandantes.
(function (PC) {
  'use strict';

  // Bonos de líder (se suman a los de la cultura):
  //   atkCity: % de ataque contra ciudades | noConqPenalty: las conquistas no restan cohesión
  //   exploreMove: +movimiento a exploradores y unidades embarcadas | voyage: el viaje al poniente siempre triunfa
  //   capacity: capacidad administrativa | capitalProd: producción en la capital | growth: % de crecimiento
  //   goldMines: oro extra en minas de oro y plata | valleFood: alimento extra en valles | defense: % de defensa
  //   heal: curación extra | warStab: cohesión durante guerras contra potencias | atkVsExternal: % contra invasores
  //   selvaNoAttr: sin desgaste en selva | mountainDef: % de defensa en sierra y cordillera | influence: influencia por turno
  //   seaDef: % de defensa de las unidades embarcadas | cityDef: % de defensa de las ciudades y de sus guarniciones
  //   zoneYield / gold / stab: como en las culturas (rendimiento por zona, oro por ciudad, cohesión)
  PC.LEADERS = {
    pachacutec: { name: 'Pachacútec', title: 'Sapa Inca, 1438–1471', agenda: 'conquistador', color: '#8a2232',
      desc: '"El que transforma el mundo". +25% de ataque contra ciudades; las ciudades conquistadas no restan cohesión.',
      bonus: { atkCity: 25, noConqPenalty: true } },
    tupac_yupanqui: { name: 'Túpac Yupanqui', title: 'Sapa Inca, 1471–1493', agenda: 'explorador', color: '#2f5f8f',
      desc: 'Navegante del Pacífico. +1 movimiento a exploradores y unidades embarcadas; el viaje al poniente siempre triunfa.',
      bonus: { exploreMove: 1, voyage: true } },
    huayna_capac: { name: 'Huayna Cápac', title: 'Sapa Inca, 1493–1525', agenda: 'expansionista', color: '#b07a1a',
      desc: 'Administrador del imperio en su apogeo. +3 de capacidad administrativa y +3 de producción en la capital.',
      bonus: { capacity: 3, capitalProd: 3 } },
    mama_ocllo: { name: 'Mama Ocllo', title: 'Coya fundadora, según el mito', agenda: 'pacifico', color: '#6a2a5a',
      desc: 'Enseñó a hilar y a sembrar. Las ciudades crecen un 20% más rápido.',
      bonus: { growth: 20 } },
    senor_sipan: { name: 'Señor de Sipán', title: 'Gobernante moche, siglo III', agenda: 'mercader', color: '#8a3a1f',
      desc: 'Orfebrería sin igual. +2 de oro en minas de oro y plata; orfebrería y metalurgia más baratas.',
      bonus: { goldMines: 2, cheap: ['orfebreria', 'metal_cobre'] } },
    taycanamo: { name: 'Taycanamo', title: 'Fundador de Chimor, siglo X', agenda: 'mercader', color: '#1f6f6a',
      desc: 'Llegó por mar al valle de Moche. +1 de alimento en valles costeros; canales y puquios más baratos.',
      bonus: { valleFood: 1, cheap: ['irrigacion', 'puquios'] } },
    sacerdote_chavin: { name: 'Sumo sacerdote de Chavín', title: 'Oráculo de Huántar, 900 a.C.', agenda: 'devoto', color: '#6f6a5f',
      desc: 'Peregrinos de costa, sierra y selva. +3 de influencia por turno; culto y arquitectura monumental más baratos.',
      bonus: { influence: 3, cheap: ['culto', 'arq_monumental'] } },
    manco_inca: { name: 'Manco Inca', title: 'Inca de Vilcabamba, 1533–1544', agenda: 'conquistador', color: '#3f5a2a',
      desc: 'La resistencia desde las montañas. Sin desgaste en la selva y +50% de defensa en sierra y cordillera.',
      bonus: { selvaNoAttr: true, mountainDef: 50 } },
    micaela_bastidas: { name: 'Micaela Bastidas', title: 'Estratega de la gran rebelión, 1780', agenda: 'pacifico', color: '#2a4a7a',
      desc: 'Organizó la logística de la rebelión. +25% de defensa y las unidades se curan 10 puntos más por turno.',
      bonus: { defense: 25, heal: 10 } },
    tupac_amaru_ii: { name: 'Túpac Amaru II', title: 'Curaca de Tinta, 1780', agenda: 'conquistador', color: '#5a1f2a',
      desc: 'Líder de la mayor rebelión andina. +25% de ataque contra invasores y +10 de cohesión en guerras contra potencias.',
      bonus: { atkVsExternal: 25, warStab: 10 } },
    juan_santos: { name: 'Juan Santos Atahualpa', title: 'Rebelde de la selva central, 1742', agenda: 'conquistador', color: '#4f6a2a',
      desc: 'Unió a asháninkas y yaneshas contra la Colonia. Sin desgaste en la selva, +1 de producción en la selva y conocimiento amazónico más barato.',
      bonus: { selvaNoAttr: true, zoneYield: { selva: { p: 1 } }, cheap: ['amazonia'] } },
    parado_bellido: { name: 'María Parado de Bellido', title: 'Heroína de Huamanga, 1822', agenda: 'pacifico', color: '#7a2a3a',
      desc: '"No he venido aquí para delatar". +10 de cohesión y +10 de cohesión en guerras contra potencias.',
      bonus: { stab: 10, warStab: 10 } },
    jose_olaya: { name: 'José Olaya', title: 'Pescador y mensajero de Chorrillos, 1823', agenda: 'explorador', color: '#2a6a8a',
      desc: 'Cruzaba a nado las líneas realistas. +1 de alimento y +1 de oro en el mar; +1 movimiento a exploradores y unidades embarcadas.',
      bonus: { zoneYield: { mar: { f: 1, g: 1 } }, exploreMove: 1 } },
    ramon_castilla: { name: 'Ramón Castilla', title: 'Presidente del Perú, 1845–1851 y 1855–1862', agenda: 'expansionista', color: '#2a2f4a',
      desc: 'Abolió la esclavitud y el tributo indígena en la era del guano. +2 de oro por ciudad, +5 de cohesión; guano y ferrocarril más baratos.',
      bonus: { gold: 2, stab: 5, cheap: ['fertilizantes', 'ferrocarril'] } },
    miguel_grau: { name: 'Miguel Grau', title: 'Almirante del Huáscar, 1879', agenda: 'explorador', color: '#1f2f5a',
      desc: '"El Caballero de los Mares". +1 movimiento y +100% de defensa a las unidades embarcadas; navegación oceánica y vapor más baratos.',
      bonus: { exploreMove: 1, seaDef: 100, cheap: ['navegacion_oceanica', 'vapor'] } },
    francisco_bolognesi: { name: 'Francisco Bolognesi', title: 'Defensor de Arica, 1880', agenda: 'conquistador', color: '#3a3f2a',
      desc: '"Hasta quemar el último cartucho". +30% de defensa en las ciudades y sus guarniciones; artillería más barata.',
      bonus: { cityDef: 30, cheap: ['artilleria'] } },
    andres_caceres: { name: 'Andrés A. Cáceres', title: 'El Brujo de los Andes, 1882', agenda: 'conquistador', color: '#4a3a2a',
      desc: 'La campaña de la Breña. +25% de defensa en sierra y cordillera y +20% de ataque contra invasores.',
      bonus: { mountainDef: 25, atkVsExternal: 20 } }
  };

  // Agendas: guían la actitud de la IA hacia el jugador (le agrada / le desagrada).
  PC.AGENDAS = {
    conquistador: { name: 'Conquistador', likes: 'Ejércitos poderosos', dislikes: 'Vecinos débiles junto a sus fronteras' },
    explorador: { name: 'Explorador', likes: 'Quien navega y explora', dislikes: 'Quien le cierra las fronteras' },
    expansionista: { name: 'Expansionista', likes: 'Imperios grandes y bien gobernados', dislikes: 'Quien funda ciudades cerca de él' },
    pacifico: { name: 'Pacífico', likes: 'La paz duradera', dislikes: 'Quien está en muchas guerras' },
    mercader: { name: 'Mercader', likes: 'Las rutas comerciales y el oro', dislikes: 'Quien no comercia con él' },
    devoto: { name: 'Devoto', likes: 'Las civilizaciones con mucha cultura', dislikes: 'Quien destruye templos y ciudades' }
  };

  // Líderes de las facciones IA (histórico o arquetípico cuando no se conoce el nombre).
  PC.AI_LEADERS = {
    chimu: ['Minchançaman', 'Último rey de Chimor', 'mercader'], sican: ['Naylamp', 'Fundador mítico de Lambayeque', 'mercader'],
    chanka: ['Anccu Hualloc', 'Caudillo chanka', 'conquistador'], colla: ['Chuchi Cápac', 'Señor de Hatuncolla', 'expansionista'],
    lupaca: ['Cari', 'Señor de Chucuito', 'devoto'], chachapoyas: ['Chuqui Sota', 'Curaca chachapoya', 'conquistador'],
    huanca: ['Apu Alaya', 'Curaca de Hatun Xauxa', 'mercader'], chincha: ['Guavia Rucana', 'Señor de Chincha', 'mercader'],
    ychsma: ['Taurichumbi', 'Curaca de Pachacámac', 'devoto'], cajamarca: ['Guzmango Cápac', 'Señor de Caxamarca', 'pacifico'],
    huaylas: ['Huacachillac', 'Curaca de Huaylas', 'pacifico'], inca: ['Pachacútec', 'Sapa Inca', 'conquistador'],
    wari: ['Señor de Wari', 'Gobernante de Huamanga', 'expansionista'], tiwanaku: ['Mallku de Tiwanaku', 'Señor del lago', 'devoto'],
    moche: ['Señor de Sipán', 'Gobernante moche', 'mercader'], nasca: ['Sacerdote de Cahuachi', 'Señor de las líneas', 'devoto'],
    chavin: ['Sumo sacerdote de Chavín', 'Oráculo de Huántar', 'devoto'], paracas: ['Linaje de Wari Kayan', 'Señores de la Necrópolis', 'pacifico'],
    caral: ['Consejo de Caral', 'Sacerdotes de la Ciudad Sagrada', 'pacifico'], sechin: ['Señor de Sechín', 'Guerreros de Casma', 'conquistador'],
    kotosh: ['Sacerdote de Kotosh', 'Templo de las Manos Cruzadas', 'devoto'], huaca_prieta: ['Pescadores de Huaca Prieta', 'Aldea del Chicama', 'pacifico'],
    titicaca: ['Curacas de Qaluyu', 'Pastores del lago', 'expansionista'], pukara: ['Señor de Pukara', 'Centro del altiplano', 'devoto'],
    vicus: ['Señor de Vicús', 'Alto Piura', 'mercader'], lima: ['Curaca de Maranga', 'Valle del Rímac', 'mercader'],
    recuay: ['Señor de Recuay', 'Callejón de Huaylas', 'conquistador'], cusco: ['Linaje de Manco Cápac', 'Ayllus del Cusco', 'expansionista'],
    espana: ['Francisco Pizarro', 'Gobernador de Nueva Castilla', 'conquistador'], chile: ['Aníbal Pinto', 'Presidente de Chile', 'conquistador'],
    ashaninka: ['Pinkátsari asháninka', 'Jefe de la selva central', 'pacifico'], shipibo: ['Curaca shipibo', 'Pueblo del Ucayali', 'mercader'],
    awajun: ['Pamuk awajún', 'Guerreros del Cenepa', 'conquistador'], cocama: ['Curaca cocama', 'Navegantes del Amazonas', 'mercader'],
    harakbut: ['Wayorí harakbut', 'Pueblo de Madre de Dios', 'pacifico'], achuar: ['Uunt achuar', 'Pueblo del Pastaza', 'conquistador'],
    matses: ['Jefe matsés', 'Pueblo del Yavarí', 'pacifico'], yine: ['Jefe yine', 'Navegantes del Urubamba', 'mercader'],
    matsigenka: ['Jefe matsigenka', 'Pueblo del Manu', 'pacifico']
  };
  // Modelo 3D de los líderes de la IA según su arquetipo.
  const AI_MODEL = { espana: 'conquistador', chile: 'republicano', chavin: 'sacerdote', kotosh: 'sacerdote', nasca: 'sacerdote', ychsma: 'sacerdote',
    tiwanaku: 'sacerdote', pukara: 'sacerdote', lupaca: 'sacerdote', caral: 'sacerdote', chimu: 'senor_costa', sican: 'senor_costa', moche: 'senor_costa',
    vicus: 'senor_costa', lima: 'senor_costa', chincha: 'senor_costa', inca: 'pachacutec' };
  PC.leaderOf = function (civ) {
    if (civ.leaderId && PC.LEADERS[civ.leaderId]) { const L = PC.LEADERS[civ.leaderId]; return { name: L.name, title: L.title, agenda: L.agenda, model: civ.leaderId }; }
    const F = PC.FACTIONS[civ.key] || {};
    const H = PC.historicalLeader && PC.G && !civ.isPlayer ? PC.historicalLeader(civ.key, PC.G.year, civ.name) : null;
    if (H) return H;
    const model = AI_MODEL[civ.key] || (F.selva || civ.selva ? 'amazonico' : 'curaca');
    const a = PC.AI_LEADERS[civ.key];
    if (a) return { name: a[0], title: a[1], agenda: a[2], model };
    return { name: 'Curaca de ' + civ.name, title: 'Señorío independiente', agenda: ['pacifico', 'mercader', 'conquistador', 'devoto'][civ.id % 4], model };
  };

  PC.COMMANDER_NAMES = {
    andino: ['Apo Mayta', 'Cápac Yupanqui', 'Rumiñahui', 'Quisquis', 'Calcuchímac', 'Ollanta', 'Titu Cusi Yupanqui', 'Huaypar', 'Challco Chima', 'Illa Túpac'],
    espana: ['Hernando de Soto', 'Diego de Almagro', 'Sebastián de Belalcázar', 'Hernando Pizarro'],
    moderno: ['Andrés A. Cáceres', 'Francisco Bolognesi', 'Miguel Grau', 'Ramón Castilla', 'Alfonso Ugarte', 'Leoncio Prado', 'Lizardo Montero', 'Pedro Ruiz Gallo']
  };
})(globalThis.PC = globalThis.PC || {});

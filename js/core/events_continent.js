// Eventos continentales de las Fases 2 y 3 (v0.1.2): de la Doctrina Monroe a la crisis del petróleo.
(function (PC) {
  'use strict';
  const G = () => PC.G;
  const CONT = ['sudamerica', 'america'];
  const find = (keys) => G().civs.find((c) => c.alive && !c.isPlayer && [].concat(keys).includes(c.key) && PC.civCities(c).length);
  const ARG = ['argentina', 'rio_plata'], MEX = ['mexico', 'nueva_espana'], BOL = ['bolivia', 'charcas'];
  const ownsRes = (civ, r) => G().map.tiles.some((t) => t && t.owner === civ.id && t.res === r);
  const cityIn = (civ, region) => PC.civCities(civ).find((c) => PC.tile(c.t).region === region);
  const warm = (keys, p, v) => keys.forEach((k) => { const c = find(k); if (c) PC.rel(c, p).att += v; });
  const fallback = (title) => ({ title, img: '', text: 'Los protagonistas de esta historia ya no están en el mapa.', choices: [{ label: 'Seguir', effect: () => 'La historia toma otro rumbo.' }] });

  PC.TRIGGERS.push(
    { id: 'doctrina_monroe', once: true, check: (g) => g.phase === 'america' && g.year >= 1823 && g.year < 1860 && find('trece_colonias') },
    { id: 'triple_alianza', once: true, check: (g) => CONT.includes(g.phase) && g.year >= 1864 && g.year < 1880 && find('paraguay') && (find('brasil') || find(ARG)) },
    { id: 'canal_panama', once: true, check: (g) => g.phase === 'america' && g.year >= 1904 && g.year < 1940 && !g.wonders.canal_panama },
    { id: 'revolucion_mexicana', once: true, check: (g) => g.phase === 'america' && g.year >= 1910 && g.year < 1930 && find(MEX) },
    { id: 'guerra_chaco', once: true, check: (g) => CONT.includes(g.phase) && g.year >= 1932 && g.year < 1945 && find(BOL) && find('paraguay') },
    { id: 'guerra_fria', once: true, check: (g) => CONT.includes(g.phase) && g.year >= 1947 && g.year < 1965 },
    { id: 'crisis_petroleo', once: true, check: (g) => CONT.includes(g.phase) && g.year >= 1973 && g.year < 1990 }
  );
  const E = PC.EVENTS;

  E.doctrina_monroe = (g, p) => {
    const us = find('trece_colonias');
    if (!us) return fallback('La Doctrina Monroe');
    return {
      title: 'La Doctrina Monroe', img: '',
      text: `"América para los americanos": ${us.name} advierte a Europa que no tolerará nuevas colonias en el continente. ¿Protección o tutela?`,
      choices: [
        { label: 'Acoger la doctrina', hint: '+relación con ' + us.name + ', +cohesión', effect: () => { PC.rel(us, p).att += 20; PC.addStabMod(p, 'Escudo continental', 4, 10); return 'Las potencias europeas miran hacia otro lado.'; } },
        { label: 'Proponer una liga hispanoamericana', hint: '−40 oro; +relación con las repúblicas del sur, −relación con ' + us.name, cond: p.gold >= 40, effect: () => {
          p.gold -= 40; PC.rel(us, p).att -= 15;
          g.civs.forEach((c) => { if (c.alive && !c.isPlayer && !c.external && !c.colonial && c.id !== us.id) PC.rel(c, p).att += 10; });
          PC.diverge('El Perú responde a Monroe con una liga hispanoamericana: el sueño del Congreso de Panamá se cumple.');
          return 'Las repúblicas del sur firman un pacto de defensa mutua.'; } },
        { label: 'Rechazarla: América no tiene dueño', hint: '+15 influencia, −relación con ' + us.name, effect: () => { p.influence = (p.influence || 0) + 15; PC.rel(us, p).att -= 25; return 'Tu respuesta resuena en las cancillerías.'; } }
      ]
    };
  };

  E.triple_alianza = (g, p) => {
    const par = find('paraguay');
    const allies = [find('brasil'), find(ARG), find('uruguay')].filter(Boolean);
    if (!par || !allies.length) return fallback('La Guerra de la Triple Alianza');
    const war = () => allies.forEach((c) => { PC.declareWar(c, par, true); PC.addStabMod(par, 'Guerra total', -10, 15); });
    return {
      title: 'La Guerra de la Triple Alianza', img: '',
      text: `Francisco Solano López lleva al Paraguay a la guerra contra ${allies.map((c) => c.name).join(', ')}. Será la guerra más sangrienta de Sudamérica.`,
      choices: [
        { label: 'Mantenerse al margen', hint: 'La guerra estalla como en la historia', effect: () => { war(); return 'La guerra devasta al Paraguay durante seis años.'; } },
        { label: 'Mediar entre los vecinos', hint: '−30 influencia; la guerra no estalla', cond: (p.influence || 0) >= 30, effect: () => {
          p.influence -= 30; [par].concat(allies).forEach((c) => { PC.rel(c, p).att += 10; });
          PC.diverge('La mediación peruana evita la Guerra de la Triple Alianza: el Paraguay conserva su población y su industria.');
          return 'Los cancilleres firman un acuerdo de límites.'; } },
        { label: 'Apoyar al Paraguay', hint: 'Guerra contra la Triple Alianza; el Paraguay será tu amigo', cond: !PC.isAlly(p.id, allies[0].id), effect: () => {
          war(); PC.declareWar(p, allies[0]); PC.rel(par, p).att += 40;
          PC.diverge(`El Perú entra en la Guerra de la Triple Alianza del lado del Paraguay (${PC.fmtYear(g.year)}).`);
          return 'Tus regimientos marchan hacia el Chaco y el río Paraguay.'; } }
      ]
    };
  };

  E.canal_panama = (g, p) => {
    const us = find('trece_colonias'), col = find(['colombia', 'nueva_granada']);
    const mine = cityIn(p, 'istmo');
    return {
      title: 'El Canal de Panamá', img: '',
      text: 'Tras el fracaso francés, el istmo vuelve a ser el centro del mundo: un canal uniría el Atlántico y el Pacífico. ' +
        (mine ? `Tu ciudad de ${mine.name} controla el paso.` : 'Las potencias se disputan la concesión.'),
      choices: [
        { label: 'Construir el canal con tus ingenieros', hint: 'Tu ciudad del istmo empieza el canal con 500 de producción', cond: !!(mine && PC.canBuild(mine, 'wonder', 'canal_panama')), effect: () => {
          mine.build = { kind: 'wonder', id: 'canal_panama' }; mine.prod += 500;
          PC.diverge('El Canal de Panamá lo construye una potencia nacida en los Andes.');
          return `Las dragas empiezan a trabajar en ${mine.name}.`; } },
        { label: 'Concesión a ' + (us ? us.name : 'una compañía extranjera'), hint: '+120 oro en derechos de paso', effect: () => {
          p.gold += 120; if (us) PC.rel(us, p).att += 10; return 'El canal abre en 1914 y el comercio del Pacífico se dispara.'; } },
        { label: 'Un canal latinoamericano', hint: '−150 oro; +progreso, +relación con tus vecinos', cond: p.gold >= 150, effect: () => {
          p.gold -= 150; p.progress += 150; if (col) PC.rel(col, p).att += 20; if (us) PC.rel(us, p).att -= 15;
          PC.addStabMod(p, 'Orgullo continental', 5, 12);
          PC.diverge('Un consorcio latinoamericano construye y administra el Canal de Panamá.');
          return 'Ingenieros de todo el sur trabajan juntos en el istmo.'; } }
      ]
    };
  };

  E.revolucion_mexicana = (g, p) => {
    const mex = find(MEX);
    if (!mex) return fallback('La Revolución mexicana');
    const rebels = () => {
      const cs = PC.civCities(mex);
      PC.addStabMod(mex, 'Revolución', -15, 15);
      if (cs.length < 4) return;
      const reb = PC.addCiv({ key: 'rebeldes', name: 'Ejército Libertador del Sur', color: '#7b6f5d' });
      Object.keys(mex.techs).forEach((t) => PC.grantTech(reb, t, true));
      const half = cs.filter((c, i) => i % 3 === 2 && c.id !== mex.capitalId);
      half.forEach((c) => { c.civ = reb.id; PC.tile(c.t).owner = reb.id; g.units.filter((u) => u.t === c.t && u.civ === mex.id).forEach((u) => { u.civ = reb.id; }); });
      reb.capitalId = half.length ? half[0].id : null;
      if (half.length) PC.declareWar(reb, mex, true); else reb.alive = false;
    };
    return {
      title: 'La Revolución mexicana', img: '',
      text: `Tras treinta años de Porfirio Díaz, Madero llama a la rebelión. Zapata en el sur y Villa en el norte se levantan: "¡Tierra y libertad!". ${mex.name} se desangra.`,
      choices: [
        { label: 'Simpatizar con Zapata y Villa', hint: 'La revolución estalla; +relación con ' + mex.name + ', +cohesión', effect: () => {
          rebels(); PC.rel(mex, p).att += 10; PC.addStabMod(p, 'Tierra y libertad', 4, 10); return 'Las ideas agraristas llegan a tus haciendas.'; } },
        { label: 'Apoyar a Porfirio Díaz', hint: '−60 oro; la revolución fracasa; −cohesión', cond: p.gold >= 60, effect: () => {
          p.gold -= 60; PC.rel(mex, p).att += 15; PC.addStabMod(p, 'Apoyo a la dictadura', -4, 8);
          PC.diverge('Porfirio Díaz sofoca la Revolución mexicana con ayuda extranjera.'); return 'El viejo dictador se aferra al poder.'; } },
        { label: 'Mediar una transición pacífica', hint: '−25 influencia; no hay guerra civil', cond: (p.influence || 0) >= 25, effect: () => {
          p.influence -= 25; PC.rel(mex, p).att += 20;
          PC.diverge('Una transición negociada evita la guerra civil en México: no hay Revolución mexicana.'); return 'Díaz renuncia y Madero convoca elecciones limpias.'; } }
      ]
    };
  };

  E.guerra_chaco = (g, p) => {
    const bol = find(BOL), par = find('paraguay');
    if (!bol || !par) return fallback('La Guerra del Chaco');
    return {
      title: 'La Guerra del Chaco', img: '',
      text: `${bol.name} y ${par.name} se disputan el Chaco Boreal, donde las compañías petroleras sospechan grandes yacimientos. Miles morirán de sed en el monte.`,
      choices: [
        { label: 'Mantenerse neutral', hint: 'La guerra estalla como en la historia', effect: () => { PC.declareWar(bol, par, true); return 'Comienza la guerra más dura del siglo XX en Sudamérica.'; } },
        { label: 'Convocar una conferencia de paz', hint: '−30 influencia; el Chaco se reparte por arbitraje', cond: (p.influence || 0) >= 30, effect: () => {
          p.influence -= 30; PC.rel(bol, p).att += 10; PC.rel(par, p).att += 10;
          PC.diverge('El Chaco Boreal se reparte por arbitraje en Lima: no hay Guerra del Chaco.'); return 'Ambos países firman el Tratado de Lima.'; } },
        { label: 'Apoyar a ' + bol.name, hint: 'Guerra contra ' + par.name + '; ' + bol.name + ' será tu amigo', cond: !PC.isAlly(p.id, par.id), effect: () => {
          PC.declareWar(bol, par, true); PC.declareWar(p, par); PC.rel(bol, p).att += 30;
          PC.diverge('El Perú combate en el Chaco junto a Bolivia.'); return 'Tus tropas cruzan el altiplano hacia el Chaco.'; } }
      ]
    };
  };

  E.guerra_fria = (g, p) => {
    const us = find('trece_colonias');
    return {
      title: 'La Guerra Fría', img: '',
      text: 'El mundo se parte en dos bloques. Washington ofrece ayuda económica a cambio de lealtad; Moscú, ciencia y armas. Muchos prefieren no elegir.',
      choices: [
        { label: 'Alinearse con Washington', hint: '+150 oro en ayuda; −cohesión' + (us ? ', +relación con ' + us.name : ''), effect: () => {
          p.gold += 150; if (us) PC.rel(us, p).att += 20; PC.addStabMod(p, 'Dependencia', -3, 10); return 'Llegan créditos y asesores militares.'; } },
        { label: 'Tercera posición: no alineados', hint: '+cohesión, +20 influencia', effect: () => {
          p.influence = (p.influence || 0) + 20; PC.addStabMod(p, 'Soberanía', 6, 12); return 'Tu país se suma al Movimiento de Países No Alineados.'; } },
        { label: 'Acercarse al bloque soviético', hint: '+progreso científico; −cohesión' + (us ? ', −relación con ' + us.name : ''), effect: () => {
          p.progress += 200; if (us) PC.rel(us, p).att -= 30; PC.addStabMod(p, 'Tensión ideológica', -6, 10);
          PC.diverge(`${p.name} se acerca al bloque soviético en plena Guerra Fría.`); return 'Técnicos soviéticos instalan laboratorios y fábricas.'; } }
      ]
    };
  };

  E.crisis_petroleo = (g, p) => {
    const oil = ownsRes(p, 'petroleo');
    return {
      title: 'La crisis del petróleo', img: '',
      text: 'El embargo de los países árabes cuadruplica el precio del crudo. ' + (oil ? 'Tus pozos valen ahora una fortuna.' : 'Sin petróleo propio, tu economía se tambalea.'),
      choices: [
        { label: 'Vender caro nuestro petróleo', hint: '+250 oro, +cohesión', cond: oil, effect: () => { p.gold += 250; PC.addStabMod(p, 'Bonanza petrolera', 4, 10); return 'Los petrodólares llenan el tesoro.'; } },
        { label: 'Fundar una OPEP americana', hint: '+150 oro; +relación con Venezuela, Ecuador y México', cond: oil, effect: () => {
          p.gold += 150; warm([['venezuela'], ['ecuador', 'quito'], MEX], p, 15); const us = find('trece_colonias'); if (us) PC.rel(us, p).att -= 15;
          PC.diverge(`${p.name} lidera una organización americana de exportadores de petróleo.`); return 'Los productores del continente fijan juntos el precio.'; } },
        { label: 'Subsidiar los combustibles', hint: '−150 oro, +cohesión', cond: p.gold >= 150, effect: () => { p.gold -= 150; PC.addStabMod(p, 'Gasolina barata', 3, 8); return 'Los precios se contienen… por ahora.'; } },
        { label: 'Racionar y ahorrar', hint: '−cohesión', effect: () => { PC.addStabMod(p, 'Racionamiento', -6, 10); return 'Colas en los grifos y apagones.'; } }
      ]
    };
  };
})(globalThis.PC = globalThis.PC || {});

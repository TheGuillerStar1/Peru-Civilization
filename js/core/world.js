// Historia viva de los rivales: sucesión de líderes, independencias y cambios de nombre, colonizaciones en los
// mapas continentales, iniciativas diplomáticas de la IA (lazos, guerras conjuntas, ultimátums) y el congreso
// de los pueblos, donde todos votan resoluciones (como el Congreso Mundial de Civilization).
(function (PC) {
  'use strict';
  const G = () => PC.G;
  const alive = () => G().civs.filter((c) => c.alive);
  const pow = (c) => Math.max(1, PC.power(c));

  // ¿El jugador conoce a esta civilización? (ha visto alguna de sus ciudades o unidades)
  PC.hasMet = function (civ) {
    if (civ.isPlayer) return true;
    if (civ.metPlayer) return true;
    const met = PC.civCities(civ).some((c) => PC.isExplored(c.t)) || PC.civUnits(civ).some((u) => PC.isExplored(u.t));
    if (met) civ.metPlayer = true;
    return met;
  };
  const quietUnlessMet = (civ) => (PC.hasMet(civ) ? undefined : []);

  // Registro de agresiones (para el congreso y la reputación).
  const baseDeclare = PC.declareWar;
  PC.declareWar = function (a, b, quiet) {
    if (a.id === b.id || PC.atWar(a.id, b.id)) return;
    const g = G();
    a.aggr = (a.aggr || []).filter((t) => g.turn - t < 60);
    a.aggr.push(g.turn);
    // Romper la tregua del congreso indigna a todos los miembros.
    if (g.congress && g.congress.truce > g.turn && !a.external && !b.external) {
      alive().forEach((c) => { if (c.id !== a.id && c.id !== b.id && !c.external) PC.rel(c, a).att -= 12; });
      if (a.isPlayer) PC.addStabMod(a, 'Rompes la tregua del congreso', -8, 10);
      PC.log(`${a.name} rompe la tregua del ${congressName()}.`, 'war');
    }
    return baseDeclare(a, b, quiet);
  };
  PC.truceBlocks = function (a, b) {
    const g = G();
    return !!(g.congress && g.congress.truce > g.turn && !a.external && !b.external);
  };

  // Influencia extra por las embajadas (lazos diplomáticos).
  const baseInfluence = PC.influenceIncome;
  PC.influenceIncome = function (civ) {
    const emb = alive().filter((o) => o.id !== civ.id && PC.rel(civ, o).embassy).length;
    return baseInfluence(civ) + Math.min(3, Math.floor(emb / 2));
  };

  // Nuevas acciones del jugador: embajadas y pedir ayuda militar.
  const myFoesFor = (p, ai) => alive().filter((x) => x.id !== ai.id && x.id !== p.id && PC.atWar(p.id, x.id) && !PC.atWar(ai.id, x.id) && !PC.isAlly(ai.id, x.id));
  const NEW_ACTIONS = [
    { id: 'lazos', name: 'Abrir embajadas', desc: 'Lazos diplomáticos permanentes: la relación mejora con el tiempo y cada dos embajadas dan +1 de influencia.', inf: 10,
      why: (p, ai) => [PC.atWar(p.id, ai.id) && 'No en plena guerra', PC.rel(p, ai).embassy && 'Ya tienen embajadas'].filter(Boolean),
      chance: (p, ai) => PC.clamp(0.55 + PC.rel(ai, p).att / 60, 0.1, 0.97),
      run: (p, ai) => { PC.rel(p, ai).embassy = PC.rel(ai, p).embassy = true; PC.rel(ai, p).att += 5; return `Se abren embajadas con ${ai.name}.`; } },
    { id: 'ayuda', name: 'Pedir ayuda en tu guerra', desc: 'Que declare la guerra a tu enemigo más fuerte. Más fácil si son aliados.', inf: 30,
      why: (p, ai) => [PC.atWar(p.id, ai.id) && 'Están en guerra entre ustedes', !myFoesFor(p, ai).length && 'No tienes guerras en las que pueda ayudarte',
        !PC.isAlly(p.id, ai.id) && PC.rel(ai, p).att < 30 && 'Necesitas una alianza o una actitud de 30', ai.external && 'Las potencias extranjeras no te ayudan'].filter(Boolean),
      chance: (p, ai) => (PC.isAlly(p.id, ai.id) ? 0.85 : PC.clamp(0.2 + (PC.rel(ai, p).att - 30) / 60, 0.1, 0.8)),
      run: (p, ai) => { const foe = myFoesFor(p, ai).sort((a, b) => PC.power(b) - PC.power(a))[0]; PC.declareWar(ai, foe); ai.invade = foe.id; PC.rel(ai, p).att += 5; return `${ai.name} declara la guerra a ${foe.name} a tu lado.`; } }
  ];
  const at = PC.DIPLO_ACTIONS.findIndex((a) => a.id === 'denunciar');
  PC.DIPLO_ACTIONS.splice(at, 0, ...NEW_ACTIONS);
  NEW_ACTIONS.forEach((a) => { PC.DIPLO[a.id] = a; });

  // ---------------------------------------------------------------- Sucesión de líderes y nombres
  const INDEPENDENT = ['Gran Colombia', 'Venezuela', 'Ecuador', 'Bolivia', 'Chile', 'Provincias Unidas del Río de la Plata', 'Imperio del Brasil', 'Imperio Mexicano',
    'Provincias Unidas del Centro de América', 'Estados Unidos', 'Cuba', 'Canadá', 'Guayanas'];
  function successionTick() {
    const g = G(), p = PC.player();
    alive().forEach((c) => {
      if (c.isPlayer) return;
      const nm = PC.historicalName(c.key, g.year);
      if (nm && nm !== c.name && !c.fixedName) {
        const old = c.name;
        c.name = nm;
        if (c.lastNameSet) PC.log(`${old} pasa a llamarse ${nm}.`, 'history', quietUnlessMet(c));
        if (INDEPENDENT.includes(nm) && c.colonial) {
          c.colonial = false; c.external = false;
          PC.log(`${nm} proclama su independencia.`, 'history', quietUnlessMet(c));
        }
      }
      c.lastNameSet = true;
      const L = PC.leaderOf(c);
      if (c.lastLeader && c.lastLeader !== L.name) {
        PC.log(`${L.name} sucede a ${c.lastLeader} al frente de ${c.name}.`, 'history', quietUnlessMet(c));
        // Un nuevo líder trae su propia agenda: las viejas rencillas se suavizan.
        if (p) { const r = PC.rel(c, p); r.att = Math.round(r.att * 0.6); }
        c.reigns = (c.reigns || []).concat([{ name: c.lastLeader, until: g.year }]).slice(-8);
      }
      c.lastLeader = L.name;
    });
  }

  // ---------------------------------------------------------------- Colonizaciones continentales
  const EURO_TECHS = ['metal_cobre', 'hierro', 'acero', 'quimica', 'polvora', 'arcabuz', 'equitacion', 'navegacion_oceanica'];
  PC.continentGeo = function () {
    const g = G();
    if (g.phase === 'sudamerica') return PC.GEO_SA;
    if (g.phase !== 'america') return null;
    // En América se suman las colonizaciones de Sudamérica (Brasil, Nueva Granada, el Plata, Chile…).
    if (!PC._geoAmerica) PC._geoAmerica = Object.assign({}, PC.GEO_AM, { colonize: PC.GEO_AM.colonize.concat(PC.GEO_SA.colonize.filter((c) => !PC.GEO_AM.colonize.some((k) => k[1] === c[1]))) });
    return PC._geoAmerica;
  };
  // Lugar de desembarco: mejor costa libre de la región; si toda es ajena, se toma por la fuerza un tramo de costa.
  function coastalSite(regionIds, civ) {
    const g = G(), min = g.map.minCityDist || 3;
    const rank = (t) => (t.owner ? (PC.civ(t.owner).isPlayer ? 2 : 1) : 0) * 100 - (PC.isCoastalTile(t) ? 50 : 0) - PC.TERRAIN[t.terrain].f * 3;
    for (const d of [min, 2]) {
      const cand = g.map.tiles.filter((t) => t && regionIds.includes(t.region) && !['oceano', 'lago', 'cordillera'].includes(t.terrain) && !t.cityId &&
        !g.units.some((u) => u.t === t.i) && !g.cities.some((c) => PC.dist(PC.tile(c.t), t) < d));
      cand.sort((a, b) => rank(a) - rank(b));
      if (cand.length) return cand[0];
    }
    return null;
  }
  // Nombres coloniales y nombres de reserva más naturales que «Región 2».
  const COLONIAL_NAMES = {
    es: ['Santa Fe', 'San Miguel', 'Santiago', 'Trinidad', 'Concepción', 'San Juan', 'Villa Rica', 'Santa Cruz', 'San Felipe', 'Nombre de Dios', 'San Cristóbal', 'Santa María', 'San Agustín', 'Guadalupe'],
    pt: ['São Vicente', 'Olinda', 'São Sebastião', 'Santos', 'Vila Rica', 'Santa Catarina', 'São Luís', 'Porto Real'],
    fr: ['Port-Royal', 'Trois-Rivières', 'Ville-Marie', 'Louisbourg', 'Nueva Orleans', 'Détroit', 'Fort Saint-Louis'],
    en: ['Jamestown', 'Plymouth', 'Boston', 'Charleston', 'Filadelfia', 'Nueva York', 'Baltimore', 'Savannah'],
    nl: ['Nueva Ámsterdam', 'Fort Zeelandia', 'Nueva Middelburg'], ru: ['Novo-Arjánguelsk', 'Kodiak', 'Fuerte Ross']
  };
  const baseCityName = PC.cityName;
  PC.cityName = function (civ, t) {
    const used = new Set(G().cities.map((c) => c.name));
    if (civ && civ.crown && COLONIAL_NAMES[civ.crown]) { const n = COLONIAL_NAMES[civ.crown].find((x) => !used.has(x)); if (n) return n; }
    const name = baseCityName(civ, t);
    const m = /^(.*) (\d+)$/.exec(name);
    const rg = G().map.regions.find((r) => r.id === t.region);
    if (!m || !rg) return name;
    const forms = [`Nueva ${rg.name}`, `${rg.name} Alta`, `${rg.name} Baja`, `Puerto de ${rg.name}`, `Villa de ${rg.name}`];
    return forms.find((x) => !used.has(x)) || name;
  };
  function colonizationTick() {
    const g = G(), geo = PC.continentGeo();
    if (!geo || !geo.colonize) return;
    geo.colonize.forEach(([year, key, name, color, region, n, crown]) => {
      const id = 'col_' + key;
      if (g.fired[id] || g.year < year) return;
      g.fired[id] = true;
      if (g.civs.some((c) => c.alive && c.key === key) || g.year > year + 120) return;
      const civ = PC.addCiv({ key, name: PC.historicalName(key, g.year) || name, color });
      civ.colonial = true; civ.crown = crown;
      // Acero, caballos y alianzas con pueblos rivales: ventaja militar de las expediciones.
      civ.bonus = Object.assign({}, civ.bonus, { atk: Math.round(40 * (PC.diff().spain || 1)), atkCity: 30 });
      PC.baselineTechs(g.year).concat(EURO_TECHS).forEach((t) => PC.grantTech(civ, t, true));
      civ.gold = 150;
      let at = coastalSite([region], civ), fort = true;
      if (!at) {
        // Región densamente poblada: la expedición desembarca sin fundar y conquista por las armas.
        fort = false;
        const land = g.map.tiles.filter((t) => t && t.region === region && !['oceano', 'lago', 'cordillera'].includes(t.terrain) && !t.cityId && !g.units.some((u) => u.t === t.i));
        land.sort((a, b) => PC.isCoastalTile(b) - PC.isCoastalTile(a));
        at = land[0];
      }
      if (!at) {
        // Regiones diminutas (p. ej. el Golfo de México): se desembarca en la tierra libre más cercana, mejor si es costa.
        const rt = g.map.tiles.filter((t) => t && t.region === region);
        const near = g.map.tiles.filter((t) => t && !['oceano', 'lago', 'cordillera'].includes(t.terrain) && !t.cityId && !g.units.some((u) => u.t === t.i));
        const sc = (t) => Math.min(...rt.map((r) => PC.dist(t, r))) * 2 - (PC.isCoastalTile(t) ? 3 : 0);
        at = near.filter((t) => sc(t) <= 7).sort((a, b) => sc(a) - sc(b))[0];
      }
      if (!at) { civ.alive = false; return; }
      const host = at.owner && PC.civ(at.owner);
      // La epidemia golpea primero a los pueblos de la costa donde desembarcan.
      alive().forEach((o) => { if (!o.colonial && !o.isPlayer && !o.external) PC.civCities(o).forEach((ct) => { if (PC.dist(PC.tile(ct.t), at) <= 6) ct.pop = Math.max(1, Math.round(ct.pop * 0.6)); }); });
      if (fort) {
        at.owner = null;
        const c = PC.foundCity(civ, at, null, 2);
        c.culture = 30; c.expanded = true; PC.claimTiles(c, 1);
      }
      // Si el Perú derrotó a la Corona, la expansión española llega debilitada.
      let k = PC.diff().spain || 1;
      if (crown === 'es' && g.flags.coronaDesiste) k *= 0.5;
      const units = Math.max(3, Math.round(n * 1.5 * k));
      for (let i = 0; i < units; i++) PC.spawnUnit(civ, i % 3 === 2 ? 'caballero' : 'conquistador', at);
      PC.spawnUnit(civ, 'colono', at);
      PC.log(`${civ.name} se establece en ${g.map.regions.find((r) => r.id === region).name} (${PC.fmtYear(g.year)}).`, 'history', quietUnlessMet(civ));
      // La viruela se adelanta a los conquistadores.
      if (!g.fired.epidemia_continente) {
        g.fired.epidemia_continente = true;
        alive().forEach((o) => { if (!o.colonial && !o.isPlayer && !o.external) PC.civCities(o).forEach((ct) => { ct.pop = Math.max(1, Math.round(ct.pop * 0.7)); }); });
        PC.log('Las epidemias traídas de Europa diezman a los pueblos del continente.', 'history');
      }
      const p = PC.player();
      if (host && host.isPlayer) PC.queueEvent('colonos_llegan', { from: civ.id });
      else if (host && host.alive && !host.colonial) { PC.declareWar(civ, host, true); PC.rel(civ, host).aggressor = true; }
      if (p && !(host && host.isPlayer) && PC.civCities(p).some((pc) => PC.dist(PC.tile(pc.t), at) <= 6)) PC.queueEvent('colonos_llegan', { from: civ.id });
      civ.colony = { region, n: units, waves: 1, last: g.turn, year };
    });
    // Las coronas envían refuerzos a las colonias sin ciudades; tras tres intentos, la colonia fracasa.
    // En Realista la metrópoli insiste más (más oleadas, más seguidas y durante más años), como en la historia.
    const real = !!PC.diff().histAI;
    const every = real ? 6 : 8, span = real ? 120 : 80, maxWaves = real ? 5 : 3;
    alive().forEach((c) => {
      if (!c.colony) return;
      const cl = c.colony;
      if (PC.civCities(c).length) {
        cl.lost = null;
        // Flujo constante de soldados y colonos desde la metrópoli durante las primeras décadas.
        if (g.year < cl.year + span && g.turn - cl.last >= every) {
          const cap = PC.cityById(c.capitalId) || PC.civCities(c)[0];
          PC.spawnUnit(c, PC.aiBestUnit(c), PC.tile(cap.t)); PC.spawnUnit(c, 'conquistador', PC.tile(cap.t));
          if (real) PC.spawnUnit(c, PC.aiBestUnit(c), PC.tile(cap.t));
          if (PC.civCities(c).length < (real ? 4 : 3)) PC.spawnUnit(c, 'colono', PC.tile(cap.t));
          c.gold += real ? 70 : 40; cl.last = g.turn;
        }
        return;
      }
      if (cl.lost === null || cl.lost === undefined) cl.lost = g.turn;
      if (cl.waves < maxWaves && g.turn - cl.last >= every && g.year < cl.year + 100) {
        const land = g.map.tiles.filter((t) => t && t.region === cl.region && PC.isCoastalTile(t) && !['oceano', 'lago', 'cordillera'].includes(t.terrain) && !t.cityId && !g.units.some((u) => u.t === t.i));
        if (land.length) {
          const at = PC.pick(land);
          for (let i = 0; i < cl.n + (real ? 2 : 0); i++) PC.spawnUnit(c, i % 3 === 2 ? 'caballero' : 'conquistador', at);
          PC.spawnUnit(c, 'colono', at);
          PC.log(`Llegan refuerzos de ultramar para ${c.name}.`, 'war', quietUnlessMet(c));
        }
        cl.waves++; cl.last = g.turn;
      } else if ((cl.waves >= maxWaves || g.year >= cl.year + 100) && (!PC.civUnits(c).some(PC.isMil) || g.turn - Math.max(cl.last, cl.lost) > 25)) {
        c.alive = false; g.units = g.units.filter((u) => u.civ !== c.id);
        PC.log(`La colonia de ${c.name} fracasa: los pueblos del continente la expulsan.`, 'history');
        PC.diverge(`${c.name} no logra establecerse en el continente.`);
      }
    });
  }
  // Facciones sin ciudades ni unidades desaparecen.
  function cleanupTick() {
    const g = G();
    alive().forEach((c) => { if (!c.isPlayer && !c.colony && !PC.civCities(c).length && !PC.civUnits(c).length) c.alive = false; });
    void g;
  }

  // ---------------------------------------------------------------- Iniciativas diplomáticas de la IA
  function shareBorder(a, b) {
    const g = G();
    const mine = new Set(g.map.tiles.filter((t) => t && t.owner === a.id).map((t) => t.i));
    return g.map.tiles.some((t) => t && t.owner === b.id && PC.neighbors(t).some((n) => mine.has(n.i)));
  }
  function aiInitiatives() {
    const g = G(), p = PC.player();
    const ais = alive().filter((c) => !c.isPlayer && !c.external && PC.civCities(c).length);
    // Entre las IA: denuncias y embajadas.
    if (ais.length >= 2 && PC.chance(0.3)) {
      const a = PC.pick(ais), b = PC.pick(ais);
      if (a !== b && !PC.atWar(a.id, b.id)) {
        const r = PC.rel(a, b);
        if (r.att < -40 && (!r.denounced || g.turn - r.denounced > 15)) {
          r.denounced = g.turn; PC.rel(b, a).att -= 15;
          PC.log(`${PC.leaderOf(a).name} (${a.name}) denuncia a ${b.name}.`, 'war', PC.hasMet(a) && PC.hasMet(b) ? undefined : []);
        } else if (r.att > 15 && !r.embassy) {
          r.embassy = PC.rel(b, a).embassy = true; r.att += 5; PC.rel(b, a).att += 5;
        }
      }
    }
    if (!p || !p.alive) return;
    ais.forEach((ai) => {
      if (!PC.hasMet(ai)) return;
      const r = PC.rel(ai, p), mine = PC.rel(p, ai), ag = PC.leaderOf(ai).agenda;
      const war = PC.atWar(ai.id, p.id);
      if (war) return;
      // Lazos diplomáticos (embajadas)
      if (!mine.embassy && r.att > 5 && PC.chance(0.02)) { PC.queueEvent('propuesta_lazos', { from: ai.id }); return; }
      // Paso libre para los exploradores
      if (ag === 'explorador' && !mine.borders && r.att > 20 && PC.chance(0.015)) { PC.queueEvent('propuesta_paso', { from: ai.id }); return; }
      // Guerra conjunta contra un enemigo común
      const foes = alive().filter((x) => x.id !== p.id && x.id !== ai.id && PC.atWar(ai.id, x.id) && !PC.atWar(p.id, x.id) && !PC.isAlly(p.id, x.id) && !x.external);
      if (foes.length && r.att > 25 && PC.chance(0.03)) { PC.queueEvent('guerra_conjunta', { from: ai.id, foe: foes[0].id }); return; }
      // Ultimátum: un vecino poderoso y hostil exige que retires tus tropas o le cedas una ciudad
      if (['conquistador', 'expansionista'].includes(ag) && r.att < -25 && pow(ai) > pow(p) * 1.3 && !PC.isAlly(ai.id, p.id) && !PC.truceBlocks(ai, p) &&
        g.turn - (r.ultimatum || -99) > 25 && shareBorder(ai, p) && PC.chance(0.03)) {
        r.ultimatum = g.turn; PC.queueEvent('ultimatum', { from: ai.id });
      }
    });
  }

  // ---------------------------------------------------------------- Congreso
  function congressName() {
    const y = G().year;
    if (y < 1532) return 'Asamblea del oráculo de Pachacámac';
    if (y < 1826) return 'Junta de los pueblos';
    if (y < 1889) return 'Congreso Anfictiónico';
    if (y < 1948) return 'Conferencia Panamericana';
    return 'Organización de Estados Americanos';
  }
  PC.congressName = congressName;
  PC.CONGRESS_EVERY = 20;
  PC.congressMembers = () => alive().filter((c) => !c.external && PC.civCities(c).length && (c.isPlayer || PC.hasMet(c)));
  PC.congressVotes = function (civ) {
    const g = G();
    return 1 + Math.floor(PC.civCities(civ).length / 5) + (g.congress && g.congress.host === civ.id ? 1 : 0);
  };
  const aggressions = (c) => (c.aggr || []).filter((t) => G().turn - t < 40).length;
  const hashVote = (c, salt) => (PC.hash2(c.id, G().turn, salt) < 0.5 ? 1 : -1);

  // Cada resolución: target(miembros) → civ objetivo o null; vote(civ, objetivo) → 1, −1 o 0; apply(objetivo); tick(objetivo) por turno.
  PC.RESOLUTIONS = {
    condena: { name: 'Condena del agresor',
      desc: (t) => `Condenar a ${t.name} por sus guerras de agresión: todos los miembros lo verán con recelo (−20 de actitud) y sufre −6 de cohesión.`,
      target: (ms) => ms.filter((c) => aggressions(c) >= 1).sort((a, b) => aggressions(b) - aggressions(a))[0] || null,
      vote: (c, t) => (c === t || PC.isAlly(c.id, t.id) ? -1 : PC.atWar(c.id, t.id) ? 1 : PC.leaderOf(c).agenda === 'pacifico' ? 1 : PC.leaderOf(c).agenda === 'conquistador' ? -1 : PC.rel(c, t).att < 10 ? 1 : -1),
      apply: (t) => { alive().forEach((c) => { if (c !== t) PC.rel(c, t).att -= 20; }); PC.addStabMod(t, 'Condena del congreso', -6, 10); } },
    embargo: { name: 'Embargo comercial',
      desc: (t) => `Cortar el comercio con ${t.name}: se cancelan sus rutas comerciales y pierde oro cada turno hasta la próxima sesión.`,
      target: (ms) => ms.slice().sort((a, b) => PC.score(b) - PC.score(a))[0] || null,
      vote: (c, t) => (c === t || PC.isAlly(c.id, t.id) ? -1 : PC.atWar(c.id, t.id) ? 1 : PC.leaderOf(c).agenda === 'mercader' ? -1 : PC.rel(c, t).att < -10 ? 1 : PC.rel(c, t).att > 20 ? -1 : hashVote(c, 11)),
      apply: (t) => { alive().forEach((c) => { if (c !== t && PC.cancelRoutes) PC.cancelRoutes(c.id, t.id); }); },
      tick: (t) => { t.gold -= 3 + PC.eraOf(t); } },
    tregua: { name: 'Tregua general',
      desc: () => 'Todas las guerras entre los miembros terminan y nadie puede declarar la guerra hasta la próxima sesión sin indignar al resto.',
      target: (ms) => (ms.some((a) => ms.some((b) => PC.atWar(a.id, b.id))) ? null : false),
      vote: (c) => {
        const wars = alive().filter((o) => PC.atWar(c.id, o.id) && !o.external);
        if (wars.some((o) => pow(o) > pow(c) * 1.1)) return 1;
        if (wars.length) return -1;
        const ag = PC.leaderOf(c).agenda;
        return ag === 'conquistador' ? -1 : ['pacifico', 'mercader', 'devoto'].includes(ag) ? 1 : hashVote(c, 12);
      },
      apply: () => {
        const ms = PC.congressMembers();
        ms.forEach((a) => ms.forEach((b) => { if (a.id < b.id && PC.atWar(a.id, b.id)) PC.makePeace(a, b); }));
        G().congress.truce = G().turn + PC.CONGRESS_EVERY;
      } },
    comercio: { name: 'Fomento del comercio',
      desc: () => 'Cada ruta comercial da 2 de oro extra por turno a su dueño hasta la próxima sesión.',
      target: () => null,
      vote: (c) => (PC.leaderOf(c).agenda === 'mercader' || PC.civRoutes(c.id).length ? 1 : PC.leaderOf(c).agenda === 'conquistador' ? -1 : hashVote(c, 13)),
      tick: () => { alive().forEach((c) => { c.gold += 2 * PC.civRoutes(c.id).length; }); } },
    patrimonio: { name: 'Patrimonio de los pueblos',
      desc: () => 'Las maravillas son patrimonio común: cada una da 3 de cultura por turno a su dueño hasta la próxima sesión.',
      target: () => null,
      vote: (c) => { const w = Object.values(G().wonders).filter((x) => x === c.id).length; return w || PC.leaderOf(c).agenda === 'devoto' ? 1 : hashVote(c, 14); },
      tick: () => { Object.values(G().wonders).forEach((id) => { const c = PC.civ(id); if (c && c.alive) c.culture += 3; }); } },
    desarme: { name: 'Limitación de armamentos',
      desc: () => 'Cada miembro paga 1 de oro por turno por cada unidad militar que supere el doble de sus ciudades.',
      target: () => null,
      vote: (c) => { const avg = PC.congressMembers().reduce((s, o) => s + pow(o), 0) / Math.max(1, PC.congressMembers().length); return PC.leaderOf(c).agenda === 'conquistador' ? -1 : pow(c) < avg ? 1 : -1; },
      tick: () => { PC.congressMembers().forEach((c) => { const mil = PC.civUnits(c).filter(PC.isMil).length; c.gold -= Math.max(0, mil - PC.civCities(c).length * 2); }); } },
    sede: { name: 'Sede permanente',
      desc: (t) => `Establecer la sede del congreso en la capital de ${t.name}: gana 1 voto extra, +2 de influencia y +2 de cultura por turno.`,
      target: (ms) => ms.slice().sort((a, b) => b.culture - a.culture)[0] || null,
      vote: (c, t) => (c === t ? 1 : PC.atWar(c.id, t.id) ? -1 : PC.rel(c, t).att > 15 ? 1 : PC.rel(c, t).att < -15 ? -1 : 0),
      apply: (t) => { G().congress.host = t.id; },
      tick: (t) => { if (G().congress.host === t.id) { t.influence = (t.influence || 0) + 2; t.culture += 2; } } }
  };

  const ensureCongress = () => { const g = G(); if (!g.congress) g.congress = { next: null, active: [], sessions: 0, host: null, truce: 0, history: [] }; return g.congress; };
  function congressTick() {
    const g = G();
    const cg = ensureCongress();
    // Efectos vigentes
    cg.active = cg.active.filter((a) => a.until > g.turn);
    cg.active.forEach((a) => { const R = PC.RESOLUTIONS[a.id], t = a.target ? PC.civ(a.target) : null; if (R.tick && (!a.target || (t && t.alive))) R.tick(t); });
    const ms = PC.congressMembers();
    if (ms.length < 3 || g.turn < 25 || g.year < -1500) return;
    if (cg.next === null) { cg.next = g.turn + 5; return; }
    if (g.turn < cg.next) return;
    cg.next = g.turn + PC.CONGRESS_EVERY;
    const opts = Object.keys(PC.RESOLUTIONS).map((id) => ({ id, t: PC.RESOLUTIONS[id].target(ms) })).filter((o) => o.t !== false)
      .filter((o) => !['condena', 'embargo', 'sede'].includes(o.id) || o.t);
    if (!opts.length) return;
    const o = PC.pick(opts);
    if (o.id === 'sede' && o.t && cg.host === o.t.id) return;
    PC.queueEvent('congreso', { res: o.id, target: o.t ? o.t.id : null });
  }

  PC.congressForecast = function (res, target) {
    const R = PC.RESOLUTIONS[res], t = target ? PC.civ(target) : null;
    let yes = 0, no = 0;
    const votes = {};
    PC.congressMembers().forEach((c) => {
      if (c.isPlayer) return;
      const v = R.vote(c, t);
      votes[c.id] = v;
      if (v > 0) yes += PC.congressVotes(c); else if (v < 0) no += PC.congressVotes(c);
    });
    return { yes, no, votes };
  };
  PC.congressResolve = function (res, target, playerVote, extra) {
    const g = G(), p = PC.player();
    const R = PC.RESOLUTIONS[res], t = target ? PC.civ(target) : null;
    ensureCongress();
    if (t && !t.alive) return `La sesión se suspende: ${t.name} ya no existe.`;
    const f = PC.congressForecast(res, target);
    const pv = PC.congressVotes(p) + (extra || 0);
    let { yes, no } = f;
    if (playerVote > 0) yes += pv; else if (playerVote < 0) no += pv;
    const pass = yes > no;
    // Los demás recuerdan cómo votaste.
    if (playerVote) Object.keys(f.votes).forEach((id) => { const c = PC.civ(+id); if (f.votes[id]) PC.rel(c, p).att += f.votes[id] === playerVote ? 4 : -4; });
    if (t && !t.isPlayer && playerVote > 0 && ['condena', 'embargo'].includes(res)) PC.rel(t, p).att -= 15;
    g.congress.sessions++;
    const text = `${congressName()}: ${pass ? 'se aprueba' : 'se rechaza'} «${R.name}»${t ? ` (${t.name})` : ''} por ${yes} votos contra ${no}.`;
    PC.log(text, 'history');
    if (pass) {
      if (R.apply) R.apply(t);
      if (R.tick) g.congress.active.push({ id: res, target: t ? t.id : null, until: g.turn + PC.CONGRESS_EVERY });
    }
    (g.congress.history = g.congress.history || []).push({ year: g.year, res, target: t ? t.name : null, yes, no, pass });
    if (g.congress.history.length > 20) g.congress.history.shift();
    return text;
  };

  // ---------------------------------------------------------------- Eventos nuevos
  const E = PC.EVENTS;
  E.congreso = (g, p, d) => {
    const R = PC.RESOLUTIONS[d.res], t = d.target ? PC.civ(d.target) : null;
    const f = PC.congressForecast(d.res, d.target);
    const mv = PC.congressVotes(p);
    const canBuy = (p.influence || 0) >= 30;
    const self = t && t.isPlayer;
    return {
      title: `${congressName()}: ${R.name}`, img: '',
      text: `Los delegados de ${PC.congressMembers().length} pueblos se reúnen. Propuesta: ${R.desc(t || p)} ${self ? 'La propuesta va contra ti. ' : ''}` +
        `Votos previstos de los demás: ${f.yes} a favor y ${f.no} en contra. Tú tienes ${mv} voto${mv > 1 ? 's' : ''}.`,
      choices: [
        { label: 'Votar a favor', hint: 'Agrada a quienes votan como tú', effect: () => PC.congressResolve(d.res, d.target, 1, 0) },
        { label: 'A favor, con todo tu peso', hint: '+3 votos por 30 de influencia', cond: canBuy, effect: () => { p.influence -= 30; return PC.congressResolve(d.res, d.target, 1, 3); } },
        { label: 'Votar en contra', hint: 'Agrada a quienes votan como tú', effect: () => PC.congressResolve(d.res, d.target, -1, 0) },
        { label: 'En contra, con todo tu peso', hint: '+3 votos por 30 de influencia', cond: canBuy, effect: () => { p.influence -= 30; return PC.congressResolve(d.res, d.target, -1, 3); } },
        { label: 'Abstenerse', hint: 'Nadie se ofende', effect: () => PC.congressResolve(d.res, d.target, 0, 0) }
      ]
    };
  };
  E.propuesta_lazos = (g, p, d) => {
    const c = PC.civ(d.from), L = PC.leaderOf(c);
    return {
      title: `${L.name} propone abrir embajadas`, img: '',
      text: `${L.name}, ${L.title.toLowerCase()} de ${c.name}, quiere establecer lazos diplomáticos: embajadas permanentes en ambas capitales. Mejoran la relación con el tiempo y cada dos embajadas dan +1 de influencia por turno.`,
      choices: [
        { label: 'Abrir embajadas', hint: '+10 de actitud', cond: c.alive && !PC.atWar(p.id, c.id), effect: () => { PC.rel(p, c).embassy = PC.rel(c, p).embassy = true; PC.rel(c, p).att += 10; return `Se abren embajadas con ${c.name}.`; } },
        { label: 'Declinar', hint: '−5 de actitud', effect: () => { PC.rel(c, p).att -= 5; return 'Declinas la propuesta.'; } }
      ]
    };
  };
  E.propuesta_paso = (g, p, d) => {
    const c = PC.civ(d.from), L = PC.leaderOf(c);
    return {
      title: `${L.name} pide paso libre`, img: '',
      text: `${L.name} quiere que sus exploradores y mercaderes crucen tu territorio, y ofrece lo mismo a los tuyos.`,
      choices: [
        { label: 'Firmar el pacto de paso libre', hint: '+5 de actitud', cond: c.alive && !PC.atWar(p.id, c.id), effect: () => { PC.rel(p, c).borders = PC.rel(c, p).borders = true; PC.rel(c, p).att += 5; return `Pacto de paso libre con ${c.name}.`; } },
        { label: 'Cerrar las fronteras', hint: '−5 de actitud', effect: () => { PC.rel(c, p).att -= 5; return 'Tus fronteras siguen cerradas.'; } }
      ]
    };
  };
  E.guerra_conjunta = (g, p, d) => {
    const c = PC.civ(d.from), foe = PC.civ(d.foe), L = PC.leaderOf(c);
    const pay = Math.min(Math.max(0, Math.floor(c.gold / 3)), 40 + PC.eraOf(c) * 20);
    return {
      title: `${L.name} te propone una guerra conjunta`, img: '',
      text: `${c.name} está en guerra con ${foe.name}. ${L.name} te ofrece ${pay} de oro si entras en la guerra a su lado.`,
      choices: [
        { label: `Declarar la guerra a ${foe.name}`, hint: `+${pay} de oro y +20 de actitud de ${c.name}`, cond: c.alive && foe.alive && !PC.atWar(p.id, foe.id) && PC.atWar(c.id, foe.id), effect: () => {
          c.gold -= pay; p.gold += pay; PC.rel(c, p).att += 20; PC.rel(p, foe).denounced = g.turn - 5; PC.declareWar(p, foe); return `Entras en la guerra contra ${foe.name} junto a ${c.name}.`; } },
        { label: 'Mantenerse al margen', hint: '−5 de actitud', effect: () => { PC.rel(c, p).att -= 5; return 'Prefieres no intervenir.'; } }
      ]
    };
  };
  E.ultimatum = (g, p, d) => {
    const c = PC.civ(d.from), L = PC.leaderOf(c);
    const mine = PC.civCities(p).filter((x) => x.id !== p.capitalId);
    const cc = PC.civCities(c);
    const city = mine.sort((a, b) => Math.min(...cc.map((o) => PC.dist(PC.tile(o.t), PC.tile(a.t)))) - Math.min(...cc.map((o) => PC.dist(PC.tile(o.t), PC.tile(b.t)))))[0];
    const amt = Math.min(Math.max(0, Math.floor(p.gold)), 60 + PC.eraOf(c) * 30);
    return {
      title: `Ultimátum de ${L.name}`, img: '',
      text: `${L.name} (${c.name}) concentra sus ejércitos en la frontera y exige ${city ? `que le cedas ${city.name} o ` : ''}${amt} de oro. Si te niegas, invadirá tu territorio.`,
      choices: [
        { label: `Pagar ${amt} de oro`, hint: 'Evitas la guerra; −cohesión', cond: c.alive, effect: () => { p.gold -= amt; c.gold += amt; PC.rel(c, p).att += 15; PC.addStabMod(p, 'Ultimátum aceptado', -4, 8); return `Pagas a ${c.name} y la invasión se detiene.`; } },
        ...(city ? [{ label: `Ceder ${city.name}`, hint: 'Pierdes la ciudad; paz asegurada', cond: c.alive, effect: () => { PC.captureCity(city, c.id); PC.rel(c, p).att += 25; PC.addStabMod(p, 'Cesión territorial', -8, 12); return `${city.name} pasa a manos de ${c.name}.`; } }] : []),
        { label: 'Rechazar el ultimátum', hint: 'Probable invasión', effect: () => {
          PC.rel(c, p).att -= 15;
          if (c.alive && PC.chance(0.75)) { PC.rel(c, p).denounced = g.turn - 5; PC.declareWar(c, p); PC.rel(c, p).aggressor = true; c.invade = p.id; return `${c.name} invade tu territorio.`; }
          return `${L.name} retrocede… por ahora.`; } }
      ]
    };
  };
  E.colonos_llegan = (g, p, d) => {
    const c = PC.civ(d.from), L = PC.leaderOf(c);
    return {
      title: `Llegan los europeos: ${c.name}`, img: '',
      text: `Barcos europeos desembarcan cerca de tus tierras. ${L.name}, ${L.title.toLowerCase()}, funda un asentamiento y pide comerciar… pero trae soldados con armas de hierro y caballos.`,
      choices: [
        { label: 'Recibirlos y comerciar', hint: 'Paz; +lazos diplomáticos', cond: c.alive, effect: () => { PC.rel(p, c).embassy = PC.rel(c, p).embassy = true; PC.rel(c, p).att += 15; return `Se abren relaciones con ${c.name}.`; } },
        { label: 'Expulsarlos', hint: 'Guerra inmediata', cond: c.alive, effect: () => { PC.rel(p, c).denounced = g.turn - 5; PC.declareWar(p, c); PC.diverge(`Los pueblos del continente expulsan a ${c.name} desde su primer desembarco.`); return `Guerra contra ${c.name}.`; } }
      ]
    };
  };

  // ---------------------------------------------------------------- Encadenado al tic diplomático
  const baseTick = PC.diplomacyTick;
  PC.diplomacyTick = function () {
    if (baseTick) baseTick();
    successionTick();
    colonizationTick();
    cleanupTick();
    aiInitiatives();
    congressTick();
  };
})(globalThis.PC = globalThis.PC || {});

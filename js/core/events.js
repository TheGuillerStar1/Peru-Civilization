// Historia dinámica: aparición de culturas, la llegada europea, eventos con decisiones y divergencias.
(function (PC) {
  'use strict';
  const G = () => PC.G;

  PC.diverge = function (text) {
    G().divergences.push({ year: G().year, text });
    PC.log(`Divergencia histórica: ${text}`, 'history');
  };
  PC.queueEvent = function (id, data) {
    const g = G();
    if (g.eventQueue.some((e) => e.id === id && JSON.stringify(e.data || {}) === JSON.stringify(data || {}))) return;
    g.eventQueue.push({ id, data: data || {} });
  };
  const cap = (civ) => PC.cityById(civ.capitalId);
  const coastalCities = (civ) => PC.civCities(civ).filter((c) => PC.TILE_ZONE(c) === 'costa');
  PC.TILE_ZONE = (city) => PC.tile(city.t).zone;
  const ownsRes = (civ, r) => PC.G.map.tiles.some((t) => t && t.owner === civ.id && t.res === r);
  const ownsRegion = (civ, ids) => PC.G.map.tiles.some((t) => t && t.owner === civ.id && ids.includes(t.region));
  const find = (key) => G().civs.find((c) => c.key === key && c.alive);

  // ---------------------------------------------------------------- Fuerzas externas
  PC.makeExternal = function (key, name, techs) {
    const F = PC.FACTIONS[key];
    let civ = G().civs.find((c) => c.key === key);
    if (!civ) civ = PC.addCiv({ key, name: name || F.name, color: F.color, external: true });
    civ.alive = true;
    techs.forEach((t) => PC.grantTech(civ, t, true));
    return civ;
  };
  function landingTile(regionIds) {
    const g = G();
    const tiles = g.map.tiles.filter((t) => t && regionIds.includes(t.region) && !t.cityId && t.terrain !== 'cordillera' &&
      !g.units.some((u) => u.t === t.i));
    return tiles.sort((a, b) => (PC.isCoastalTile(b) - PC.isCoastalTile(a)) || (a.r - b.r))[0] ||
      g.map.tiles.find((t) => t && regionIds.includes(t.region) && t.terrain !== 'oceano' && !t.cityId) || null;
  }
  PC.spainWave = function (n) {
    const g = G();
    const spain = find('espana') || PC.makeExternal('espana', null, []);
    const own = PC.civCities(spain);
    let at = own.length ? PC.tile(own[0].t) : (landingTile(['tumbes', 'chira_piura', 'peru_norte']) || g.map.tiles.find((t) => t && t.zone === 'costa' && !t.cityId));
    // Las oleadas posteriores desembarcan en la costa más cercana a la capital enemiga.
    const target = PC.player().capitalId && PC.cityById(PC.player().capitalId);
    if (g.flags.spainWaves >= 1 && target) {
      const coast = g.map.tiles.filter((t) => t && t.zone === 'costa' && !t.cityId && PC.isCoastalTile(t) && !g.units.some((u) => u.t === t.i));
      coast.sort((a, b) => PC.dist(a, PC.tile(target.t)) - PC.dist(b, PC.tile(target.t)));
      if (coast.length) at = coast[0];
    }
    const types = ['conquistador', 'caballero', 'conquistador', 'conquistador', 'caballero', 'conquistador'];
    for (let i = 0; i < n; i++) PC.spawnUnit(spain, types[i % types.length], at);
    g.flags.spainWaves = (g.flags.spainWaves || 0) + 1;
    g.flags.spainLastWave = g.turn;
    return at;
  };
  PC.spawnSpain = function () {
    const g = G();
    const player = PC.player();
    const spain = PC.makeExternal('espana', null, PC.baselineTechs(1532).concat(['metal_cobre', 'hierro', 'acero', 'quimica', 'polvora', 'arcabuz', 'equitacion', 'navegacion_altura', 'navegacion_oceanica']));
    spain.gold = 300;
    const pe = PC.eraOf(player);
    const n = Math.round((4 + (pe >= 5 ? 2 : 0) + (pe >= 6 ? 2 : 0)) * PC.diff().spain);
    const at = PC.spainWave(n);
    // Aliados indígenas: pueblos resentidos con el jugador.
    let allies = 0;
    g.civs.forEach((c) => {
      if (!c.alive || c.isPlayer || c.external || allies >= 4) return;
      if (PC.atWar(c.id, player.id) || PC.rel(c, player).att < (PC.diff().histAI ? 5 : -25)) { PC.spawnUnit(spain, 'aliado', at); allies++; PC.declareWar(c, player, true); PC.rel(c, spain).att = 40; }
    });
    const resentful = PC.civCities(player).filter((c) => c.conquered).length;
    const extra = Math.min(3, Math.floor(resentful * (player.stability < 50 ? 0.7 : 0.3)));
    for (let i = 0; i < extra; i++) { PC.spawnUnit(spain, 'aliado', at); allies++; }
    if (allies) PC.log(`${allies} contingentes de pueblos sometidos o rivales se suman a los españoles.`, 'war');
    g.flags.espanaLlego = g.year;
    return spain;
  };

  // ---------------------------------------------------------------- Ganchos del motor
  PC.onCityCaptured = function (city, old, nc, wasCapital) {
    const g = G();
    if (old.isPlayer && wasCapital && nc.key === 'espana' && !g.fired.caida_capital) { g.fired.caida_capital = true; PC.queueEvent('caida_capital', {}); }
    if (nc.isPlayer && old.key === 'espana') PC.addStabMod(nc, 'Victoria sobre los invasores', 8, 12);
  };
  PC.onImprovement = function (u, t) {
    const civ = PC.civ(u.civ);
    if (civ.isPlayer && t.imp === 'mina' && ['oro', 'plata'].includes(t.res) && !G().fired.veta) { G().fired.veta = true; PC.queueEvent('veta', { res: t.res }); }
  };
  PC.onTech = function (civ, id) {
    const g = G();
    if (!civ.isPlayer) return;
    if (id === 'hierro' && g.year < 1532) PC.diverge(`${civ.name} forja hierro en ${PC.fmtYear(g.year)}, siglos antes que en la historia real.`);
    if (id === 'polvora' && g.year < 1532) PC.diverge(`${civ.name} inventa la pólvora andina en ${PC.fmtYear(g.year)}.`);
    if (id === 'variolizacion' && g.year < 1525) PC.diverge('La variolización andina protegerá a tu pueblo de las epidemias.');
    if (id === 'navegacion_oceanica' && g.year < 1500 && !g.fired.contacto_inverso) { g.fired.contacto_inverso = true; PC.queueEvent('contacto_inverso', {}); }
    if (id === 'vapor' && g.year < 1780) PC.diverge(`Revolución industrial andina en ${PC.fmtYear(g.year)}.`);
    if (id === 'navegacion_altura' && !g.fired.tupac_viaje) { g.fired.tupac_viaje = true; PC.queueEvent('tupac_viaje', {}); }
  };
  PC.onWonder = function (civ, id) {
    if (!civ.isPlayer) return;
    const hist = { caral: -2600, chavin: -900, nasca: 300, huacas_moche: 400, chan_chan: 1100, kuelap: 900, sacsayhuaman: 1450, machu_picchu: 1450, qhapaq_nan: 1450, coricancha: 1440, san_marcos: 1551, ferrocarril_central: 1870 }[id];
    if (hist !== undefined && Math.abs(G().year - hist) > 400) PC.diverge(`${PC.WONDERS[id].name} se alza en ${PC.fmtYear(G().year)} (históricamente ≈ ${PC.fmtYear(hist)}).`);
  };

  // ---------------------------------------------------------------- Aparición de culturas
  function spawnTick() {
    const g = G();
    if (!PC.SCENARIOS[g.scenario].spawns) return;
    const player = PC.player();
    PC.SPAWNS.forEach((sp) => {
      if (g.spawned[sp.id] || g.year < sp.year) return;
      g.spawned[sp.id] = true;
      if (sp.id === player.key || g.civs.some((c) => c.key === sp.id && c.alive)) return;
      const F = PC.FACTIONS[sp.id];
      const rg = g.map.regions.find((r) => r.id === F.region);
      if (!rg) return;
      const ownerCity = g.cities.find((c) => PC.tile(c.t).region === rg.id);
      const owners = new Set(rg.tiles.map((i) => PC.tile(i).owner).filter(Boolean));
      if (ownerCity && ownerCity.civ === player.id) { PC.queueEvent('florecimiento', { faction: sp.id, city: ownerCity.id }); return; }
      const civ = PC.addCiv({ key: sp.id, name: F.name, color: F.color, selva: F.selva });
      PC.baselineTechs(g.year).forEach((t) => PC.grantTech(civ, t, true));
      if (ownerCity) {
        // Sucesión cultural: la nueva cultura surge de la anterior y toma sus ciudades de la provincia.
        const host = PC.civ(ownerCity.civ);
        Object.keys(host.techs).forEach((t) => PC.grantTech(civ, t, true));
        const taken = PC.civCities(host).filter((c) => PC.tile(c.t).region === rg.id || c.id === ownerCity.id);
        taken.forEach((c) => {
          c.civ = civ.id; c.pop += 1; c.conquered = false; c.origCiv = civ.id;
          PC.tilesWithin(PC.tile(c.t), 2).forEach((t) => { if (t.owner === host.id) t.owner = civ.id; });
          g.units.filter((u) => u.t === c.t && u.civ === host.id).forEach((u) => { u.civ = civ.id; });
        });
        civ.capitalId = taken[0].id;
        PC.spawnUnit(civ, PC.aiBestUnit(civ), PC.tile(taken[0].t));
        if (!PC.civCities(host).length) { host.alive = false; g.units.filter((u) => u.civ === host.id).forEach((u) => { u.civ = civ.id; }); }
        else if (host.capitalId === ownerCity.id) host.capitalId = PC.civCities(host)[0].id;
        PC.log(`La cultura ${F.name} surge en ${rg.name}, heredera de ${host.name}.`, 'history');
        return;
      }
      const t = PC.bestSiteInRegion(rg.id, civ);
      if (!t || (t.owner && t.owner !== civ.id)) { civ.alive = false; return; }
      const c = PC.foundCity(civ, t, null, 2 + Math.floor(PC.eraOf(civ) / 2));
      c.culture = 30; c.expanded = true; PC.claimTiles(c, 2);
      PC.spawnUnit(civ, PC.aiBestUnit(civ), t); PC.spawnUnit(civ, PC.aiBestUnit(civ), t);
      PC.spawnUnit(civ, 'colono', t);
      PC.log(`Surge la cultura ${F.name} en ${rg.name}${owners.size ? '' : ''}.`, 'history');
    });
  }

  // ---------------------------------------------------------------- Tic histórico
  // Dificultad Realista: la historia "empuja" hacia lo que realmente ocurrió.
  function realismTick() {
    const g = G();
    const D = PC.diff();
    if (D.histTechs) {
      const base = PC.baselineTechs(g.year);
      g.civs.forEach((c) => {
        if (!c.alive || c.isPlayer || c.external) return;
        base.forEach((t) => { if (!c.techs[t] && PC.TECH[t].req.every((r) => c.techs[r])) PC.grantTech(c, t, true); });
      });
    }
    if (!D.histAI) return;
    // La epidemia también diezma a las facciones IA (la viruela no distinguía fronteras).
    if (g.year >= 1525 && !g.flags.epidemiaIA) {
      g.flags.epidemiaIA = true;
      g.cities.forEach((c) => { if (!PC.civ(c.civ).isPlayer && !PC.civ(c.civ).external) c.pop = Math.max(1, Math.round(c.pop * 0.6)); });
    }
    PC.HIST_EMPIRES.forEach((he) => {
      const civ = g.civs.find((c) => c.key === he.key && c.alive && !c.isPlayer);
      if (!civ || g.year < he.from || g.year > he.to) return;
      const capital = PC.cityById(civ.capitalId);
      if (!capital) return;
      if (g.turn % 3 === 0) PC.spawnUnit(civ, PC.aiBestUnit(civ), PC.tile(capital.t));
      civ.stability = Math.max(civ.stability, 70);
      // Declara la guerra al vecino más débil si no tiene ya una guerra de expansión.
      if (!g.civs.some((o) => o.alive && PC.atWar(civ.id, o.id) && PC.rel(civ, o).aggressor)) {
        const targets = g.civs.filter((o) => o.alive && o.id !== civ.id && !o.external && PC.civCities(o).length &&
          PC.civCities(o).some((c) => PC.dist(PC.tile(c.t), PC.tile(capital.t)) <= 9))
          .sort((a, b) => PC.power(a) - PC.power(b));
        if (targets.length && PC.chance(0.25)) { PC.declareWar(civ, targets[0]); PC.rel(civ, targets[0]).aggressor = true; }
      }
    });
    // Guerra civil histórica: si una facción IA gobierna un gran imperio en 1529, se fractura.
    if (g.year >= 1529 && !g.flags.guerraCivilIA) {
      g.flags.guerraCivilIA = true;
      const big = g.civs.filter((c) => c.alive && !c.isPlayer && !c.external && PC.civCities(c).length >= 5).sort((a, b) => PC.civCities(b).length - PC.civCities(a).length)[0];
      if (big) {
        const cs = PC.civCities(big), half = cs.filter((c, i) => i % 2 === 1);
        const reb = PC.addCiv({ key: 'rebeldes', name: big.name + ' (facción de Quito)', color: '#7b6f5d' });
        Object.keys(big.techs).forEach((t) => PC.grantTech(reb, t, true));
        half.forEach((c) => { c.civ = reb.id; PC.tile(c.t).owner = reb.id; g.units.filter((u) => u.t === c.t && u.civ === big.id).forEach((u) => { u.civ = reb.id; }); });
        reb.capitalId = half.length ? half[0].id : null;
        if (half.length) { PC.declareWar(reb, big); PC.log(`Guerra civil en ${big.name}: el imperio se divide.`, 'history'); }
      }
    }
  }

  PC.historyTick = function () {
    const g = G();
    const player = PC.player();
    spawnTick();
    realismTick();
    // Oleadas españolas mientras dure la guerra de conquista.
    const spain = find('espana');
    if (g.flags.espanaGuerra && spain && !g.flags.coronaDesiste && !g.flags.virreinatoAI) {
      const presence = PC.civUnits(spain).length + PC.civCities(spain).length;
      if (g.year < 1600 && g.turn - (g.flags.spainLastWave || 0) >= 5 && (g.flags.spainWaves < (PC.diff().histAI ? 8 : 5) || PC.civCities(spain).length)) {
        const at = PC.spainWave(Math.max(2, Math.round((3 + Math.min(3, g.flags.spainWaves)) * PC.diff().spain)));
        PC.log(`Llegan refuerzos españoles a ${at.region ? g.map.regions.find((r) => r.id === at.region).name : 'la costa'}.`, 'war');
      }
      const noFoothold = !PC.civCities(spain).length;
      if (noFoothold && g.flags.spainWaves >= (PC.diff().histAI ? 6 : 3) && (!presence || g.year >= 1600) && !g.fired.corona_desiste) {
        g.fired.corona_desiste = true; PC.queueEvent('corona_desiste', {});
      }
      if (g.year >= 1600 && PC.civCities(spain).length) {
        g.flags.virreinatoAI = true; spain.name = 'Virreinato del Perú'; spain.external = false;
        PC.log('La Corona organiza sus conquistas como el Virreinato del Perú.', 'history');
      }
    }
    if (spain && g.flags.espanaGuerra && !PC.civUnits(spain).length && !PC.civCities(spain).length && g.flags.coronaDesiste) spain.alive = false;
    // Fase 2
    if (!g.fired.fase2 && PC.playerRegionCount() >= PC.phaseNeed()) { g.fired.fase2 = true; PC.queueEvent('fase2', {}); }
    void player;
  };

  // ---------------------------------------------------------------- Disparadores
  PC.TRIGGERS = [
    { id: 'el_nino', cooldown: 14, check: (g, p) => g.year > -2500 && coastalCities(p).length && PC.chance(0.035) },
    { id: 'terremoto', cooldown: 16, check: (g, p) => PC.civCities(p).length >= 2 && PC.chance(0.018) },
    { id: 'mesoamerica', once: true, check: (g, p) => g.year > -1000 && p.techs.navegacion && PC.chance(0.04) },
    { id: 'guerra_sucesion', once: true, check: (g, p) => ((g.year >= 1300 && g.year < 1750 && p.stability < 50) || g.flags.crisisSucesoria) && PC.civCities(p).length >= 5 && PC.chance(g.flags.crisisSucesoria ? 0.5 : 0.06) },
    { id: 'epidemia', once: true, check: (g) => g.year >= 1520 && g.year < 1560 && PC.chance(0.5) },
    { id: 'llegada_espanoles', once: true, check: (g) => g.year >= 1530 && (PC.chance(0.5) || g.year >= 1536) && !g.flags.contactoInverso },
    { id: 'embajada_europea', once: true, check: (g) => g.year >= 1520 && g.flags.contactoInverso },
    { id: 'tupac_amaru', once: true, check: (g) => g.year >= 1780 && g.flags.virreinato },
    { id: 'independencia', once: true, check: (g) => g.year >= 1821 },
    { id: 'guano', once: true, check: (g, p) => g.year >= 1840 && g.year < 1890 && ownsRes(p, 'guano') && PC.chance(0.25) },
    { id: 'guerra_pacifico', once: true, check: (g, p) => g.year >= 1879 && g.year < 1890 && (ownsRes(p, 'salitre') || ownsRegion(p, ['tacna', 'altos_tacna', 'moquegua'])) },
    { id: 'caucho', once: true, check: (g, p) => g.year >= 1880 && g.year < 1920 && ownsRes(p, 'caucho') && PC.chance(0.2) },
    { id: 'reforma_agraria', once: true, check: (g) => g.year >= 1960 && g.year < 1980 && PC.chance(0.2) },
    { id: 'bancarrota', cooldown: 10, check: (g, p) => p.gold < -30 },
    { id: 'revuelta', cooldown: 8, check: (g, p) => p.stability < 28 && PC.civCities(p).length >= 3 && PC.chance(0.12) }
  ];
  PC.checkEvents = function () {
    const g = G();
    const p = PC.player();
    if (!p || !p.alive) return;
    PC.TRIGGERS.forEach((tr) => {
      if (tr.once && g.fired[tr.id]) return;
      if (tr.cooldown && g.cooldown[tr.id] && g.turn - g.cooldown[tr.id] < tr.cooldown) return;
      let ok = false;
      try { ok = tr.check(g, p); } catch (e) { ok = false; }
      if (!ok) return;
      if (tr.once) g.fired[tr.id] = true;
      g.cooldown[tr.id] = g.turn;
      PC.queueEvent(tr.id, {});
    });
    if (g.autoplay) while (g.eventQueue.length) PC.resolveEvent(PC.autoChoice());
  };
  PC.autoChoice = function () {
    const ev = PC.currentEvent();
    const ok = ev.choices.map((c, i) => (c.cond === false ? -1 : i)).filter((i) => i >= 0);
    return PC.pick(ok);
  };

  // ---------------------------------------------------------------- Definición de eventos
  // Cada evento: (g, jugador, data) => { title, img, text, choices: [{label, hint, cond, effect: () => texto}] }
  const E = PC.EVENTS = {};

  E.el_nino = (g, p) => ({
    title: 'Fenómeno El Niño', img: '',
    text: 'El mar se calienta, las anchovetas desaparecen y lluvias torrenciales arrasan los canales de la costa. Los valles costeros sufren.',
    choices: [
      { label: 'Abrir las qollqas', hint: 'Requiere Qollqas. Sin pérdidas.', cond: !!p.techs.qollqas, effect: () => {
        if (g.year > 450 && g.year < 700) PC.diverge('Gracias a sus almacenes, la costa norte sobrevive a los Niños del siglo VI que acabaron con los moche.');
        return 'Los almacenes estatales alimentan a la población. Nadie pasa hambre.'; } },
      { label: 'Ofrendas en las huacas', hint: '−20 oro, pérdidas parciales, +cultura', effect: () => {
        p.gold -= 20; p.culture += 15;
        coastalCities(p).forEach((c) => { c.food = 0; });
        return 'Los sacerdotes ofrecen spondylus al mar. Las cosechas se pierden, pero la fe se fortalece.'; } },
      { label: 'Resistir', hint: 'Las ciudades costeras pierden 1 de población', effect: () => {
        coastalCities(p).forEach((c) => { if (c.pop > 1) c.pop--; c.food = 0; });
        PC.addStabMod(p, 'El Niño', -6, 8);
        return 'El hambre golpea a los valles costeros.'; } }
    ]
  });

  E.terremoto = (g, p) => {
    const c = PC.pick(PC.civCities(p));
    const pirka = p.techs.administracion || p.techs.andenes;
    return {
      title: `Terremoto en ${c.name}`, img: '',
      text: pirka ? `La tierra tiembla en ${c.name}. La mampostería andina de piedras encajadas resiste mucho mejor que el adobe.`
        : `Un violento sismo sacude ${c.name}. Muros de adobe y templos se derrumban.`,
      choices: [
        { label: 'Reconstruir con mit\'a', hint: '−30 oro, sin pérdidas', cond: p.gold >= 30, effect: () => { p.gold -= 30; return `${c.name} se reconstruye rápidamente.`; } },
        { label: 'Aceptar las pérdidas', hint: pirka ? '−1 población' : 'Pierdes un edificio y 1 población', effect: () => {
          if (c.pop > 1) c.pop--;
          const normal = c.buildings.filter((b) => !PC.WONDERS[b]);
          if (!pirka && normal.length) { const b = PC.pick(normal); c.buildings = c.buildings.filter((x) => x !== b); return `Se pierde ${PC.BUILDINGS[b].name}.`; }
          return 'Los daños son menores.'; } }
      ]
    };
  };

  E.veta = (g, p, d) => ({
    title: `Una veta de ${PC.RESOURCES[d.res].name.toLowerCase()}`, img: '',
    text: 'Tus mineros han abierto una veta riquísima. En los Andes el oro es "sudor del Sol" y la plata "lágrimas de la Luna": ¿para los dioses o para el Estado?',
    choices: [
      { label: 'Para los dioses', hint: '+40 cultura, +cohesión', effect: () => { p.culture += 40; PC.addStabMod(p, 'Ofrendas de metales', 6, 15); return 'Los templos se cubren de láminas de oro.'; } },
      { label: 'Para el Estado', hint: '+90 oro', effect: () => { p.gold += 90; return 'El tesoro estatal crece.'; } }
    ]
  });

  E.mesoamerica = (g, p) => ({
    title: 'Mercaderes del norte', img: '',
    text: 'Balsas de comerciantes llegan desde tierras lejanas del norte (Mesoamérica) buscando conchas spondylus. Traen semillas, ideas y rumores de grandes ciudades.',
    choices: [
      { label: 'Comerciar', hint: '+40 oro, +progreso científico', effect: () => { p.gold += 40; p.progress += 60; return 'El intercambio enriquece a ambos pueblos.'; } },
      { label: 'Abrir una ruta permanente', hint: '−40 oro; +1 alimento… y conocimiento futuro', cond: p.gold >= 40, effect: () => {
        p.gold -= 40; g.flags.rutaNorte = true; p.progress += 120; PC.diverge('Se establece una ruta marítima permanente entre los Andes y Mesoamérica.');
        return 'Navegantes de tu pueblo aprenden las rutas del norte.'; } }
    ]
  });

  E.tupac_viaje = (g, p) => ({
    title: 'Viaje al poniente', img: '',
    text: 'Según Sarmiento de Gamboa, Túpac Yupanqui navegó al oeste hasta las islas Avachumbi y Ninachumbi. Tus navegantes proponen una gran expedición por el Pacífico.',
    choices: [
      { label: 'Zarpar al poniente', hint: '−50 oro. 65%: descubrimientos; 35%: naufragio', cond: p.gold >= 50, effect: () => {
        p.gold -= 50;
        if (p.bonus.voyage || PC.chance(0.65)) { g.flags.polinesia = true; p.progress += 150; p.gold += 60; PC.diverge('Una flota andina llega a Polinesia y regresa con camote, conocimientos y oro.'); return 'La expedición regresa triunfal tras meses en el mar.'; }
        PC.addStabMod(p, 'Naufragio', -5, 6); return 'Las balsas nunca regresan.'; } },
      { label: 'No arriesgar', hint: 'Sin efecto', effect: () => 'Las balsas se quedan en la costa.' }
    ]
  });

  E.guerra_sucesion = (g, p) => {
    const cities = PC.civCities(p);
    return {
      title: 'Guerra de sucesión', img: '',
      text: g.flags.crisisSucesoria ? 'El soberano y su heredero murieron en la epidemia. Dos hermanos —como Huáscar y Atahualpa— reclaman el trono.'
        : 'La muerte del soberano enfrenta a dos facciones de la nobleza por el poder.',
      choices: [
        { label: 'Apoyar al hermano guerrero', hint: '+2 unidades, −cohesión', effect: () => {
          const c = cap(p); PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(c.t)); PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(c.t));
          PC.addStabMod(p, 'Purga de la nobleza', -12, 10); g.flags.crisisSucesoria = false; return 'El guerrero se impone tras una breve guerra.'; } },
        { label: 'Apoyar al hermano administrador', hint: '−60 oro, +cohesión', cond: p.gold >= 60, effect: () => {
          p.gold -= 60; PC.addStabMod(p, 'Sucesión pacífica', 8, 10); g.flags.crisisSucesoria = false;
          if (g.year > 1525 && g.year < 1535) PC.diverge('No hay guerra civil entre Huáscar y Atahualpa: el imperio enfrenta unido lo que venga.');
          return 'Los curacas negocian una sucesión ordenada.'; } },
        { label: 'Que decida la guerra', hint: 'Las ciudades más lejanas se separan', effect: () => {
          g.flags.crisisSucesoria = false;
          const capital = PC.tile(cap(p).t);
          const far = cities.filter((c) => c.id !== p.capitalId).sort((a, b) => PC.dist(PC.tile(b.t), capital) - PC.dist(PC.tile(a.t), capital)).slice(0, Math.floor(cities.length / 3));
          if (!far.length) return 'La guerra termina sin cambios.';
          const reb = PC.addCiv({ key: 'rebeldes', name: 'Facción de ' + far[0].name, color: '#7b6f5d' });
          Object.keys(p.techs).forEach((t) => PC.grantTech(reb, t, true));
          far.forEach((c) => { c.civ = reb.id; PC.tilesWithin(PC.tile(c.t), 2).forEach((t) => { if (t.owner === p.id) t.owner = reb.id; }); PC.tile(c.t).owner = reb.id; PC.spawnUnit(reb, PC.aiBestUnit(reb), PC.tile(c.t)); });
          reb.capitalId = far[0].id;
          g.units.filter((u) => u.civ === p.id && far.some((c) => c.t === u.t)).forEach((u) => { u.civ = reb.id; });
          PC.declareWar(reb, p);
          return `${far.length} ciudades siguen al pretendiente rival. ¡Guerra civil!`; } }
      ]
    };
  };

  E.epidemia = (g, p) => {
    const vario = !!p.techs.variolizacion;
    return {
      title: 'Una peste desconocida', img: '',
      text: vario ? 'Una enfermedad terrible llega desde el norte, adelantándose a unos extranjeros. Pero tus médicos conocen la variolización.'
        : 'Una enfermedad nunca vista (viruela) avanza desde el norte, antes incluso que los extranjeros que la traen. Muere gente de todas las clases, también la familia real.',
      choices: vario ? [
        { label: 'Aplicar la variolización', hint: 'Pérdidas mínimas', effect: () => {
          PC.civCities(p).slice(0, 2).forEach((c) => { if (c.pop > 1) c.pop--; });
          PC.diverge('La epidemia de viruela de 1525 apenas afecta a tu pueblo: no hay colapso demográfico.');
          return 'Tu pueblo resiste la epidemia.'; } }
      ] : [
        { label: 'Cuarentena en los tambos', hint: 'Requiere Caminos. Pierdes ~25% de la población', cond: !!p.techs.caminos, effect: () => {
          PC.civCities(p).forEach((c) => { c.pop = Math.max(1, Math.round(c.pop * (1 - 0.25 * PC.diff().epidemic))); });
          PC.addStabMod(p, 'Epidemia', -8, 10); return 'Los chasquis aíslan los pueblos, pero muchos mueren.'; } },
        { label: 'Rogar a las huacas', hint: 'Pierdes ~40% de la población; crisis sucesoria', effect: () => {
          if (PC.diff().histAI) g.flags.crisisSucesoria = true;
          PC.civCities(p).forEach((c) => { c.pop = Math.max(1, Math.round(c.pop * (1 - 0.4 * PC.diff().epidemic))); });
          PC.addStabMod(p, 'Epidemia', -15, 12); g.flags.crisisSucesoria = PC.civCities(p).length >= 5;
          return 'La peste diezma a la población y mata al soberano y a su heredero.'; } }
      ]
    };
  };

  E.llegada_espanoles = (g, p) => {
    const real = PC.diff().histAI;
    const strong = real ? (PC.power(p) >= 200 && p.techs.hierro && p.techs.polvora) : (PC.power(p) >= 120 && (p.techs.hierro || p.techs.polvora));
    return {
      title: 'Hombres barbudos en Tumbes', img: '',
      text: 'Unas casas flotantes llegan a la costa norte. Sus hombres visten metal brillante, montan animales enormes y portan palos que escupen fuego. Dicen venir en nombre de un rey lejano y de su dios.' +
        (strong ? ' Tus guerreros, sin embargo, también conocen el hierro.' : ''),
      choices: [
        { label: 'Recibirlos en Cajamarca', hint: 'Lo que ocurrió en la historia… salvo que seas muy fuerte', effect: () => {
          PC.spawnSpain(); const spain = find('espana');
          if (strong) { PC.civUnits(spain).forEach((u) => PC.removeUnit(u)); g.flags.espanaAliada = true; g.flags['caballos_' + p.id] = true; PC.diverge('El encuentro de Cajamarca termina en un tratado entre iguales.'); return 'Los extranjeros, impresionados por tu ejército, piden comerciar. Traen caballos.'; }
          const c = cap(p); c.pop = Math.max(1, c.pop - 2); p.gold = Math.floor(p.gold * 0.4);
          PC.addStabMod(p, 'El soberano cautivo', -25, 15);
          PC.declareWar(spain, p); g.flags.espanaGuerra = true;
          return 'Es una emboscada. El soberano es capturado y se paga un rescate de oro y plata. Comienza la guerra de conquista.'; } },
        { label: 'Emboscarlos en la costa', hint: real ? 'Guerra, golpeas primero (−25% vida enemiga)' : 'Guerra, pero golpeas primero (−40% vida enemiga)', effect: () => {
          const spain = PC.spawnSpain(); PC.civUnits(spain).forEach((u) => { u.hp = real ? 75 : 60; });
          PC.declareWar(p, spain); g.flags.espanaGuerra = true;
          PC.diverge('Los invasores son emboscados en la costa antes de llegar a Cajamarca.');
          return 'Tus guerreros caen sobre los extranjeros por sorpresa.'; } },
        { label: 'Ofrecer una alianza comercial', hint: real ? 'Requiere Hierro y Pólvora. Paz y caballos' : 'Requiere Hierro o Pólvora. Paz y caballos', cond: real ? !!(p.techs.hierro && p.techs.polvora) : !!(p.techs.hierro || p.techs.polvora), effect: () => {
          PC.spawnSpain(); const spain = find('espana');
          PC.civUnits(spain).forEach((u) => PC.removeUnit(u));
          g.flags.espanaAliada = true; g.flags['caballos_' + p.id] = true; p.gold += 80;
          if (p.techs.hierro) PC.grantTech(p, 'acero');
          PC.addStabMod(p, 'Misioneros extranjeros', -5, 10);
          PC.diverge('En lugar de conquista, hay comercio: los Andes reciben caballos y acero sin perder su soberanía.');
          return 'Se firma un tratado. Llegan caballos, acero… y misioneros.'; } },
        { label: 'Cerrar la costa y fortificarse', hint: 'Guerra defensiva: murallas gratis en ciudades costeras', effect: () => {
          const spain = PC.spawnSpain(); PC.declareWar(p, spain); g.flags.espanaGuerra = true;
          coastalCities(p).forEach((c) => { if (!c.buildings.includes('muralla')) c.buildings.push('muralla'); c.hp = 100; });
          PC.civUnits(p).forEach((u) => { u.fort = true; });
          return 'Los pucarás de la costa se refuerzan. Que vengan.'; } }
      ]
    };
  };

  E.caida_capital = (g, p) => ({
    title: 'Ha caído la capital', img: '',
    text: 'Los invasores ocupan tu capital y se apoderan de sus tesoros. Como Manco Inca en 1536, debes decidir: resistir desde las montañas y la selva, o aceptar ser vasallo.',
    choices: [
      { label: 'Resistencia (Vilcabamba)', hint: '+2 unidades y moral de resistencia', cond: PC.civCities(p).length > 0, effect: () => {
        const c = cap(p); if (c) { PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(c.t)); PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(c.t)); }
        PC.addStabMod(p, 'Espíritu de resistencia', 12, 15); return 'Desde las montañas, la resistencia continúa.'; } },
      { label: 'Aceptar el vasallaje', hint: 'Paz; pagas 30% de tu oro como tributo', effect: () => {
        const spain = find('espana'); if (spain) PC.makePeace(p, spain);
        p.tribute = 0.3; g.flags.virreinato = true; g.flags.coronaDesiste = true; g.flags.virreinatoAI = true;
        if (spain) { spain.name = 'Virreinato del Perú'; spain.external = false; }
        return 'Te conviertes en un curacazgo vasallo dentro del Virreinato.'; } }
    ]
  });

  E.corona_desiste = (g, p) => ({
    title: 'La Corona desiste', img: '',
    text: 'Tras repetidas derrotas, los consejeros del rey extranjero declaran que la conquista de los Andes es imposible. Los Andes siguen siendo libres.',
    choices: [
      { label: 'Aprovechar el botín de guerra', hint: 'Caballos, armas capturadas y oro', effect: () => {
        g.flags.coronaDesiste = true; g.flags['caballos_' + p.id] = true; g.flags.soberano = true; p.gold += 150;
        const sp = find('espana'); if (sp) PC.civUnits(sp).forEach((u) => PC.removeUnit(u));
        if (p.techs.metal_cobre) PC.grantTech(p, 'hierro');
        const spain = find('espana'); if (spain) PC.makePeace(p, spain);
        PC.diverge('La conquista española fracasa: el Perú andino conserva su soberanía.');
        return 'Los caballos capturados y las armas de acero ahora son tuyos.'; } }
    ]
  });

  E.embajada_europea = (g, p) => ({
    title: 'Embajada europea', img: '',
    text: 'Gracias a tus viajes oceánicos, los reinos de Europa ya conocen tu poder. Sus barcos llegan como embajadores, no como conquistadores.',
    choices: [
      { label: 'Intercambio de conocimientos', hint: 'Caballos y +progreso científico', effect: () => {
        g.flags['caballos_' + p.id] = true; g.flags.soberano = true; p.progress += 250;
        return 'Se intercambian caballos, trigo y libros por papa, quinina y quipus.'; } },
      { label: 'Exigir tributo por comerciar', hint: '+200 oro, −cohesión', effect: () => {
        g.flags['caballos_' + p.id] = true; g.flags.soberano = true; p.gold += 200; PC.addStabMod(p, 'Tensiones con Europa', -5, 10);
        return 'Los europeos pagan por acceder a tus puertos.'; } }
    ]
  });

  E.contacto_inverso = (g, p) => ({
    title: 'Más allá del océano', img: '',
    text: 'Tus naves oceánicas pueden cruzar el mar. ¿Navegar hacia el oriente —hacia Europa y África— o hacia el poniente, hacia Asia?',
    choices: [
      { label: 'Expedición a Europa', hint: 'Contacto inverso: cambia la llegada europea', effect: () => {
        g.flags.contactoInverso = true; p.progress += 150;
        PC.diverge(`Una flota andina llega a la península ibérica en ${PC.fmtYear(g.year)}: los europeos te descubren a ti… porque tú los descubriste antes.`);
        return 'Tus navegantes regresan con noticias de reinos, caballos y pólvora.'; } },
      { label: 'Expedición a Asia', hint: '+oro y especias', effect: () => { p.gold += 150; g.flags.rutaAsia = true; return 'Tus balsas oceánicas llegan a las islas de las especias.'; } }
    ]
  });

  E.florecimiento = (g, p, d) => {
    const F = PC.FACTIONS[d.faction];
    const city = PC.cityById(d.city);
    return {
      title: `${F.name} florece en tu civilización`, img: '',
      text: `En la historia real, la cultura ${F.name} surgió por esta época en esta región. Como ya es tu territorio, sus innovaciones nacen dentro de tu pueblo${city ? ', en ' + city.name : ''}.`,
      choices: [
        { label: 'Integrar a sus artesanos', hint: '+cultura y +progreso científico', effect: () => { p.culture += 30; p.progress += 50 + PC.eraOf(p) * 30; return `La tradición ${F.name} enriquece tu cultura.`; } },
        { label: 'Fomentar una nueva ciudad', hint: 'Un colono gratis', effect: () => { if (city) PC.spawnUnit(p, 'colono', PC.tile(city.t)); return 'Un nuevo ayllu parte a fundar un pueblo.'; } }
      ]
    };
  };

  E.propuesta_paz = (g, p, d) => {
    const c = PC.civ(d.from);
    const L = PC.leaderOf(c);
    const score = PC.rel(p, c).warScore || 0;
    const live = c.alive && PC.atWar(p.id, c.id);
    // Las condiciones dependen de quién va ganando la guerra.
    if (score <= -20) {
      const amt = Math.min(Math.max(0, Math.floor(p.gold)), 50 + PC.eraOf(c) * 25);
      return {
        title: `${L.name} ofrece la paz… a un precio`, img: '',
        text: `${L.name}, ${L.title.toLowerCase()} de ${c.name}, va ganando la guerra (puntaje ${-score}). Exige ${amt} de oro para retirar sus tropas.`,
        choices: [
          { label: `Pagar ${amt} de oro`, hint: 'Paz inmediata', cond: live, effect: () => { p.gold -= amt; c.gold += amt; PC.makePeace(p, c); return 'Pagas las reparaciones y se firma la paz.'; } },
          { label: 'Rechazar', hint: 'La guerra continúa', effect: () => 'Rechazas sus condiciones.' }
        ]
      };
    }
    const offer = score >= 20 ? Math.min(Math.max(0, Math.floor(c.gold)), 30 + PC.eraOf(c) * 20) : 0;
    return {
      title: `${L.name} propone la paz`, img: '',
      text: `Los mensajeros de ${c.name} llegan de parte de ${L.name}${offer ? ` y ofrecen ${offer} de oro si cesan los combates` : ' y proponen poner fin a la guerra'}.`,
      choices: [
        { label: offer ? `Aceptar la paz y ${offer} de oro` : 'Aceptar la paz', hint: '+cohesión', cond: live, effect: () => { if (offer) { c.gold -= offer; p.gold += offer; } PC.makePeace(p, c); PC.addStabMod(p, 'Paz', 4, 6); return 'Se firma la paz.'; } },
        { label: 'Rechazar', hint: 'La guerra continúa', effect: () => 'La guerra continúa.' }
      ]
    };
  };

  E.propuesta_alianza = (g, p, d) => {
    const c = PC.civ(d.from), L = PC.leaderOf(c);
    return {
      title: `${L.name} propone una alianza`, img: '',
      text: `${L.name}, ${L.title.toLowerCase()}, aprecia a tu pueblo (${PC.attName(PC.rel(c, p).att).toLowerCase()}) y propone defenderse mutuamente. Si alguien ataca a uno, el otro entrará en la guerra.`,
      choices: [
        { label: 'Sellar la alianza', hint: 'Aliados para la defensa', cond: c.alive && !PC.atWar(p.id, c.id), effect: () => { PC.rel(p, c).ally = PC.rel(c, p).ally = true; PC.rel(c, p).att += 10; return `Alianza con ${c.name}.`; } },
        { label: 'Declinar con cortesía', hint: 'Sin cambios', effect: () => { PC.rel(c, p).att -= 5; return 'Declinas la alianza.'; } }
      ]
    };
  };

  E.llamada_aliado = (g, p, d) => {
    const ally = PC.civ(d.ally), foe = PC.civ(d.enemy);
    return {
      title: `${ally.name} te llama a la guerra`, img: '',
      text: `${foe.name} ha atacado a tu aliado ${ally.name}. ${PC.leaderOf(ally).name} te recuerda el pacto y pide que entres en la guerra.`,
      choices: [
        { label: `Declarar la guerra a ${foe.name}`, hint: 'Honras la alianza', cond: foe.alive && !PC.atWar(p.id, foe.id), effect: () => { PC.declareWar(p, foe); PC.rel(ally, p).att += 15; return `Entras en la guerra junto a ${ally.name}.`; } },
        { label: 'Abandonar al aliado', hint: 'La alianza se rompe y tu reputación cae', effect: () => {
          PC.rel(p, ally).ally = PC.rel(ally, p).ally = false; PC.rel(ally, p).att -= 40;
          g.civs.forEach((c) => { if (c.alive && c.id !== p.id) PC.rel(c, p).att -= 5; });
          return `Abandonas a ${ally.name}.`; } }
      ]
    };
  };

  E.exigencia_tributo = (g, p, d) => {
    const c = PC.civ(d.from), L = PC.leaderOf(c);
    const amt = Math.min(Math.max(0, Math.floor(p.gold)), 40 + PC.eraOf(c) * 25);
    return {
      title: `${L.name} exige tributo`, img: '',
      text: `Emisarios de ${c.name}, mucho más poderoso que tú, exigen ${amt} de oro como señal de sumisión. Negarse puede costar una guerra.`,
      choices: [
        { label: `Pagar ${amt} de oro`, hint: 'Mejora su actitud', cond: c.alive, effect: () => { p.gold -= amt; c.gold += amt; PC.rel(c, p).att += 20; PC.addStabMod(p, 'Humillación', -3, 6); return 'Pagas el tributo.'; } },
        { label: 'Negarse', hint: 'Puede declararte la guerra', effect: () => {
          PC.rel(c, p).att -= 20;
          if (PC.chance(0.5) && c.alive) { PC.declareWar(c, p); return `${c.name} te declara la guerra.`; }
          return `${L.name} se retira ofendido.`; } }
      ]
    };
  };

  E.tupac_amaru = (g, p) => {
    const spain = find('espana');
    return {
      title: 'La rebelión de Túpac Amaru II', img: '',
      text: 'José Gabriel Condorcanqui, curaca de Tinta, se alza contra los abusos de los corregidores. Con Micaela Bastidas, llama a todos los pueblos andinos a la rebelión.',
      choices: [
        { label: '¡Unirse a la rebelión!', hint: 'Guerra contra el Virreinato; ciudades serranas se te unen', cond: !!spain, effect: () => {
          p.tribute = 0; g.flags.virreinato = false;
          PC.declareWar(p, spain);
          let flipped = 0;
          PC.civCities(spain).forEach((c) => { if (PC.tile(c.t).zone === 'sierra' && PC.chance(0.6)) { PC.captureCity(c, p.id); flipped++; } });
          const base = cap(p) || PC.civCities(p)[0];
          if (base) for (let i = 0; i < 3; i++) PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(base.t));
          PC.diverge('La gran rebelión andina de 1780 triunfa en la sierra.');
          return `${flipped} ciudades de la sierra se unen a la rebelión.`; } },
        { label: 'Esperar', hint: 'La rebelión es aplastada', effect: () => { PC.addStabMod(p, 'Represión colonial', -6, 10); return 'Túpac Amaru II es ejecutado en la plaza del Cusco.'; } }
      ]
    };
  };

  E.independencia = (g, p) => {
    const spain = find('espana');
    if (spain && PC.civCities(spain).length) {
      return {
        title: 'La Corriente Libertadora', img: '',
        text: 'Las expediciones de San Martín y Bolívar llegan para expulsar al poder virreinal. "El Perú es desde este momento libre e independiente…"',
        choices: [
          { label: 'Unirse a los libertadores', hint: 'Las ciudades virreinales pasan a tu control', effect: () => {
            p.tribute = 0; g.flags.virreinato = false; g.flags.republica = true;
            PC.civCities(spain).forEach((c) => PC.captureCity(c, p.id));
            PC.civCities(p).forEach((c) => { c.conquered = false; });
            p.name = 'República del Perú';
            return 'Tras Junín y Ayacucho, nace la República del Perú.'; } }
        ]
      };
    }
    return {
      title: 'Tiempos de reformas', img: '',
      text: 'Las ideas de la Ilustración recorren el mundo. ¿Cómo debe gobernarse tu Estado en la nueva era?',
      choices: [
        { label: 'República', hint: '+oro, +cohesión', effect: () => { p.gold += 100; PC.addStabMod(p, 'Nueva constitución', 8, 15); g.flags.republica = true; p.name = 'República del Perú'; return 'Se proclama la república.'; } },
        { label: 'Monarquía andina constitucional', hint: '+cultura, +cohesión duradera', effect: () => {
          p.culture += 80; PC.addStabMod(p, 'Legitimidad dinástica', 6, 30); p.name = 'Reino Andino del Tahuantinsuyo';
          PC.diverge('El Tahuantinsuyo entra a la era moderna como monarquía constitucional.'); return 'Un descendiente de los incas jura la constitución.'; } }
      ]
    };
  };

  E.guano = (g, p) => ({
    title: 'La era del guano', img: '',
    text: 'Europa paga fortunas por el guano de tus islas como fertilizante. ¿Qué hacer con esta riqueza que no durará para siempre?',
    choices: [
      { label: 'Invertir en industria', hint: 'Fábrica gratis en la capital', effect: () => {
        const c = cap(p); if (c && !c.buildings.includes('fabrica')) c.buildings.push('fabrica');
        PC.diverge('La riqueza del guano se invierte en industria en lugar de gastarse.'); return 'Las chimeneas se alzan en la capital.'; } },
      { label: 'Gastar en el Estado', hint: '+300 oro (y deuda futura)', effect: () => { p.gold += 300; PC.addStabMod(p, 'Prosperidad falaz', 6, 10); g.flags.deuda = g.turn; return 'La bonanza parece infinita…'; } }
    ]
  });

  E.guerra_pacifico = (g, p) => ({
    title: 'Guerra del Pacífico', img: '',
    text: 'Chile reclama el salitre del sur y declara la guerra. Sus regimientos modernos desembarcan en la costa sur.',
    choices: [
      { label: 'Defender con todo (Grau y Bolognesi)', hint: '−100 oro, +2 unidades', effect: () => { startChile(p); p.gold -= 100; const c = cap(p); if (c) { PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(c.t)); PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(c.t)); } return '¡A las armas!'; } },
      { label: 'Negociar (ceder el sur)', hint: 'Pierdes Tacna y su salitre; paz', effect: () => {
        const ch = PC.makeExternal('chile', null, PC.baselineTechs(1879));
        PC.civCities(p).filter((c) => ['tacna', 'altos_tacna'].includes(PC.tile(c.t).region)).forEach((c) => PC.captureCity(c, ch.id));
        g.map.tiles.forEach((t) => { if (t && t.owner === p.id && ['tacna'].includes(t.region)) t.owner = ch.id; });
        PC.addStabMod(p, 'Humillación', -12, 15); return 'Se firma un tratado doloroso.'; } }
    ]
  });
  function startChile(p) {
    const ch = PC.makeExternal('chile', null, PC.baselineTechs(1879));
    const g = G();
    // En la Fase 2, Chile ya existe en el mapa: sus tropas parten desde sus propias ciudades.
    const chCity = PC.civCities(ch)[0];
    const at = (g.phase === 'peru' ? landingTile(['tacna', 'moquegua']) : null) || (chCity && PC.tile(chCity.t)) ||
      landingTile(['atacama', 'chile_central']) || PC.tile(PC.civCities(p).sort((a, b) => PC.tile(b.t).r - PC.tile(a.t).r)[0].t);
    const t = Object.keys(p.techs).length > 40 ? 'fusilero' : 'fusilero';
    for (let i = 0; i < 6; i++) PC.spawnUnit(ch, i % 3 === 2 ? 'canon' : t, at);
    PC.declareWar(ch, p);
    g.flags.chileGuerra = true;
  }

  E.caucho = (g, p) => ({
    title: 'La fiebre del caucho', img: '',
    text: 'La industria mundial necesita caucho. Las caucherías de la Amazonía prometen fortunas… a costa de los pueblos indígenas.',
    choices: [
      { label: 'Explotación libre', hint: '+250 oro; guerra con pueblos amazónicos', effect: () => {
        p.gold += 250; PC.addStabMod(p, 'Atrocidades caucheras', -10, 15);
        g.civs.filter((c) => c.alive && c.selva && !c.isPlayer).forEach((c) => PC.declareWar(c, p));
        return 'Iquitos se llena de palacetes… y la selva de sufrimiento.'; } },
      { label: 'Regular y proteger', hint: '+100 oro, +cohesión', effect: () => {
        p.gold += 100; PC.addStabMod(p, 'Justicia amazónica', 6, 15);
        PC.diverge('La fiebre del caucho se regula: no hay atrocidades del Putumayo.'); return 'Se protegen los territorios indígenas.'; } }
    ]
  });

  E.reforma_agraria = (g, p) => ({
    title: 'La cuestión de la tierra', img: '',
    text: 'Grandes haciendas concentran la tierra mientras millones de campesinos andinos no tienen dónde sembrar.',
    choices: [
      { label: 'Reforma agraria', hint: '−100 oro, +cohesión, +alimento', effect: () => { p.gold -= 100; PC.addStabMod(p, 'La tierra es de quien la trabaja', 10, 20); PC.civCities(p).forEach((c) => { c.food += 20; }); return 'Las haciendas pasan a cooperativas campesinas.'; } },
      { label: 'Mantener el orden', hint: '−cohesión', effect: () => { PC.addStabMod(p, 'Conflicto rural', -10, 15); return 'Las tensiones en el campo crecen.'; } }
    ]
  });

  E.bancarrota = (g, p) => ({
    title: 'Bancarrota', img: '',
    text: 'El tesoro está vacío: no se puede pagar a los ejércitos ni a los funcionarios.',
    choices: [
      { label: 'Préstamo extranjero', hint: '+150 oro, pero tributo del 10%', effect: () => { p.gold += 150; p.tribute = Math.max(p.tribute || 0, 0.1); return 'Los acreedores extranjeros cobran sus intereses.'; } },
      { label: 'Austeridad', hint: 'Se disuelven unidades; −cohesión', effect: () => {
        const mil = PC.civUnits(p).filter(PC.isMil); mil.slice(0, Math.ceil(mil.length / 3)).forEach(PC.removeUnit);
        p.gold = 0; PC.addStabMod(p, 'Austeridad', -8, 8); return 'Se licencian tropas.'; } }
    ]
  });

  E.revuelta = (g, p) => {
    const cs = PC.civCities(p).filter((c) => c.id !== p.capitalId).sort((a, b) => (b.conquered - a.conquered) || (a.pop - b.pop));
    const c = cs[0];
    if (!c) return { title: 'Descontento', img: '', text: 'El pueblo murmura.', choices: [{ label: 'Escuchar', effect: () => 'El descontento amaina.' }] };
    const garrison = g.units.some((u) => u.t === c.t && u.civ === p.id && PC.isMil(u));
    return {
      title: `Revuelta en ${c.name}`, img: '',
      text: `La baja cohesión de tu Estado provoca que ${c.name} se rebele contra el gobierno central.`,
      choices: [
        { label: 'Reprimir', hint: 'Requiere guarnición. −cohesión', cond: garrison, effect: () => { PC.addStabMod(p, 'Represión', -5, 8); c.pop = Math.max(1, c.pop - 1); return 'La revuelta es aplastada.'; } },
        { label: 'Negociar con los curacas', hint: '−60 oro', cond: p.gold >= 60, effect: () => { p.gold -= 60; PC.addStabMod(p, 'Concesiones', 5, 8); return 'Se pactan privilegios locales.'; } },
        { label: 'Dejarla ir', hint: 'La ciudad se independiza', effect: () => {
          const reb = PC.addCiv({ key: 'rebeldes', name: 'Señorío de ' + c.name, color: '#7b6f5d' });
          Object.keys(p.techs).forEach((t) => PC.grantTech(reb, t, true));
          g.units.filter((u) => u.t === c.t && u.civ === p.id).forEach((u) => { u.civ = reb.id; });
          c.civ = reb.id; reb.capitalId = c.id; PC.tilesWithin(PC.tile(c.t), 2).forEach((t) => { if (t.owner === p.id) t.owner = reb.id; });
          return `${c.name} se declara independiente.`; } }
      ]
    };
  };

  E.fase2 = (g, p) => ({
    title: '¡El Perú está unificado!', img: '',
    text: `Controlas ${PC.playerRegionCount()} de ${g.map.regions.length} provincias. Tu civilización está lista para proyectarse sobre todo el continente.`,
    choices: [
      { label: 'Avanzar a la Fase 2: Sudamérica', hint: 'Nuevo mapa continental, conservas tecnologías y ciudades', cond: !!PC.startPhase2, effect: () => { PC.startPhase2(); return 'Comienza la Fase 2: Sudamérica.'; } },
      { label: 'Seguir en el Perú', hint: 'Podrás avanzar más tarde desde el menú', effect: () => { g.flags.fase2Disponible = true; return 'Tu historia continúa en los Andes.'; } }
    ]
  });

  // ---------------------------------------------------------------- Resolución
  PC.currentEvent = function () {
    const g = G();
    if (!g.eventQueue.length) return null;
    const q = g.eventQueue[0];
    const ev = E[q.id](g, PC.player(), q.data);
    ev.id = q.id;
    ev.choices.forEach((c) => { if (c.cond === undefined) c.cond = true; });
    return ev;
  };
  PC.resolveEvent = function (i) {
    const g = G();
    const ev = PC.currentEvent();
    if (!ev) return null;
    const ch = ev.choices[i];
    g.eventQueue.shift();
    if (!ch || ch.cond === false) return null;
    const res = ch.effect();
    PC.log(`${ev.title}: ${ch.label}. ${res || ''}`, 'event');
    PC.updateVisibility();
    return res;
  };
})(globalThis.PC = globalThis.PC || {});

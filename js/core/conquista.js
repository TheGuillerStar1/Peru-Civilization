// La Conquista (v0.1.3): campaña de varios turnos en la que la Corona de Castilla y la de Portugal abren frentes por América.
// Cada frente tiene su comandante histórico, sus aliados indígenas y su desenlace; los pueblos deciden si resisten, forman una
// liga, pactan con los invasores o los traicionan; el jugador puede liderar la resistencia o colaborar con la Corona.
// El estado vive en g.conquista (se guarda con la partida); toda la aleatoriedad pasa por PC.chance, así que es determinista.
(function (PC) {
  'use strict';
  const G = () => PC.G;
  const alive = () => G().civs.filter((c) => c.alive);
  const pow = (c) => Math.max(1, PC.power(c));
  const player = () => PC.player();

  // ---------------------------------------------------------------- Parámetros de equilibrio (v0.1.3)
  // K = fuerza de la Corona según la dificultad (PC.diff().spain: Fácil 0.6, Medio 1, Difícil 1.4, Realista 1.6), ajustada por
  // frente con F.tenacity (data/conquista.js: >0 la Corona se afianza con más facilidad, <0 el pueblo resiste mejor).
  // Objetivo (12+ semillas): Fácil 30-45% de frentes conquistados, Medio 55-70%, Difícil 75-90%, Realista 80-90% con los
  // frentes históricos (México, Perú, Charcas, N. Granada, Plata) cayendo casi siempre.
  const TUNE = {
    reinfEvery: 5, reinfSpan: 36, reinfSpanBonus: 8, reinfCap: 14, // refuerzos de ultramar: cada N turnos, durante N (+bono si K>1) turnos
    settle: 28,                       // turnos de guerra tras los cuales el frente se decide por mayoría de ciudades
    earlyShare: 0.34,                 // fracción de ciudades indígenas que debe quedar (×K) para dar el frente por perdido pronto
    pullBase: 12, pullRate: 0.22,     // propensión base a pactar con la Corona y probabilidad por revisión (cada 4 turnos)
    maxDefect: 0.3,                   // como máximo esta fracción de los pueblos del frente se alía con la Corona
    returnChance: 0.3,                // probabilidad por revisión de que un aliado de la Corona vuelva a la resistencia (si ella flaquea)
    aiLeagueAtt: -20, aiLeagueChance: 0.5, // liga espontánea: actitud mutua mínima y probabilidad por revisión
    vassalChance: 0.3,                // probabilidad de que un pueblo que pierde su capital jure vasallaje (si no, resiste desde otra ciudad)
    crownAtk: 40, crownAtkCity: 30,   // bono de ataque (%) y de ataque a ciudades de una Corona colonial con K = 1
    peruScore: 32                    // frente del Perú: ciudades×10 + tropas de la Corona necesarias para darlo por conquistado
  };
  // Calibración fina por dificultad (medida con el banco de pruebas): Medio algo más difícil para la Corona, Fácil algo menos.
  const calib = (s) => (s < 0.8 ? 1.05 : s < 1.2 ? 0.92 : 1);
  const kOf = (F) => PC.clamp((PC.diff().spain || 1) * calib(PC.diff().spain || 1) * (1 + (F.tenacity || 0)) * (F.hist && PC.diff().histAI ? 1.45 : 1), 0.3, 2.8);

  // Puntuación (ciudades×10 + tropas) que la Corona necesita en el Perú: más baja en Difícil/Realista y más alta en Fácil.
  const peruNeed = (K) => (K < 1.2 ? TUNE.peruScore * Math.pow(K / 1.2, 1.3) : Math.max(14, TUNE.peruScore - 18 * (K - 1.2) / 0.72));

  // ---------------------------------------------------------------- Estado
  function S() {
    const g = G();
    if (!g.conquista) g.conquista = { fronts: {}, league: null, pact: null, intro: false, ended: {}, chronicle: [] };
    return g.conquista;
  }
  function FS(F) {
    const c = S();
    if (!c.fronts[F.id]) c.fronts[F.id] = { state: 'pendiente', since: 0, started: false, nativeStart: 0, stance: {}, captures: 0, lost: 0, cmdIdx: 0, cmdUnit: null, cmdName: null, cmdDead: null, role: null, resolved: null, reqTurn: -99 };
    return c.fronts[F.id];
  }
  // Regiones donde se combate: en el mapa del Perú, el frente del Perú abarca todo el mapa.
  function regionIds(F) {
    const g = G();
    if (g.phase === 'peru') return F.id === 'peru' ? g.map.regions.map((r) => r.id) : [];
    return F.regions.filter((id) => g.map.regions.some((r) => r.id === id));
  }
  const frontsHere = () => PC.CONQUISTA_FRONTS.filter((F) => F.phases.includes(G().phase) && regionIds(F).length);
  let keyCache = { turn: -1, phase: '', map: null, keys: null };
  function crownKeys() {
    const g = G();
    if (keyCache.turn !== g.turn || keyCache.phase !== g.phase || keyCache.map !== g.map || !keyCache.keys) keyCache = { turn: g.turn, phase: g.phase, map: g.map, keys: new Set(frontsHere().map((F) => F.crown)) };
    return keyCache.keys;
  }
  const isCrown = (c) => !c.isPlayer && crownKeys().has(c.key);
  const crownOf = (F) => G().civs.find((c) => c.key === F.crown && c.alive && !c.isPlayer);
  const inRegions = (civ, regs) => PC.civCities(civ).filter((x) => regs.has(PC.tile(x.t).region));
  function nativesOf(F) {
    const regs = new Set(regionIds(F)), ck = crownKeys();
    return alive().filter((c) => !c.isPlayer && !ck.has(c.key) && !c.colonial && !c.external && inRegions(c, regs).length);
  }
  // Ciudades del bando indígena que resiste en el frente (las del jugador cuentan salvo que haya pactado con la Corona;
  // los pueblos aliados o vasallos de la Corona ya no cuentan: han cambiado de bando).
  const nativeCities = (F) => {
    const regs = new Set(regionIds(F)), st = FS(F);
    return nativesOf(F).reduce((s, c) => s + (['corona', 'vasallo'].includes(st.stance[c.id]) ? 0 : inRegions(c, regs).length), 0) + (G().conquista && G().conquista.pact ? 0 : inRegions(player(), regs).length);
  };
  const crownCities = (F, crown) => inRegions(crown, new Set(regionIds(F))).length;
  const crownMil = (crown) => PC.civUnits(crown).filter((u) => PC.isMil(u) && !PC.UNITS[u.type].commander).length;
  const inLeague = (c) => !!(S().league && S().league.members.includes(c.id));
  const stanceOf = (st, c) => st.stance[c.id] || 'neutral';
  const crownEnemy = (c) => alive().some((o) => isCrown(o) && PC.atWar(c.id, o.id));
  function involved(F) {
    const p = player(), regs = new Set(regionIds(F)), crown = crownOf(F);
    return inRegions(p, regs).length > 0 || !!(crown && PC.atWar(p.id, crown.id)) || nativesOf(F).some(inLeague);
  }
  function note(text, F, type, show) {
    const c = S();
    c.chronicle.push({ turn: G().turn, year: G().year, text, front: F ? F.id : null });
    if (c.chronicle.length > 80) c.chronicle.shift();
    PC.log(text, type || 'war', show ? undefined : []);
  }
  const unally = (a, b) => { PC.rel(a, b).ally = PC.rel(b, a).ally = false; };

  // ---------------------------------------------------------------- Comandantes
  function spawnCommander(F, st, crown) {
    const base = PC.civCities(crown)[0], mil = PC.civUnits(crown).filter(PC.isMil)[0];
    const at = base ? PC.tile(base.t) : mil ? PC.tile(mil.t) : null;
    if (!at) return;
    const u = PC.spawnUnit(crown, 'capitan', at);
    if (!u) return;
    u.name = F.commanders[Math.min(st.cmdIdx, F.commanders.length - 1)];
    st.cmdUnit = u.id; st.cmdName = u.name;
    note(`${u.name} llega al mando de la expedición de ${F.crownName} en ${F.name}.`, F, 'war', involved(F));
  }
  function commanderTick(F, st, crown) {
    const g = G();
    if (st.cmdUnit !== null && !g.units.some((u) => u.id === st.cmdUnit)) {
      note(`${st.cmdName} cae en combate en ${F.name}: la expedición de ${F.crownName} queda sin mando.`, F, 'history', involved(F));
      crown.gold = Math.max(0, crown.gold - 40);
      PC.civUnits(crown).filter(PC.isMil).forEach((u) => { u.hp = Math.max(30, u.hp - 15); });
      st.cmdUnit = null; st.cmdDead = g.turn; st.cmdIdx++; st.cmdName = null;
    }
    if (st.cmdUnit === null && (st.cmdDead === null || g.turn - st.cmdDead >= 10) && st.cmdIdx <= F.commanders.length + 1 && PC.civUnits(crown).some(PC.isMil)) spawnCommander(F, st, crown);
  }

  // ---------------------------------------------------------------- Pueblos: resistir, aliarse con la Corona, volver
  // Propensión (0-90) de un pueblo a pactar con los invasores.
  function pull(F, st, civ, crown) {
    const p = player();
    let v = TUNE.pullBase;
    if (F.aliados.includes(civ.key)) v += 35;
    const ag = PC.leaderOf(civ).agenda;
    v += ag === 'mercader' ? 10 : ag === 'conquistador' ? 8 : ag === 'pacifico' ? 5 : ag === 'devoto' ? -10 : 0;
    const att = PC.rel(civ, p).att;
    v += att < -20 ? 20 : att > 25 ? -20 : 0;
    if (PC.atWar(civ.id, p.id)) v += 20;
    v += pow(civ) < pow(crown) * 0.7 ? 12 : pow(civ) > pow(crown) * 1.5 ? -15 : 0;
    v += Math.min(16, st.captures * 4);
    if (inLeague(civ)) v -= 35;
    return PC.clamp(v, 0, 90);
  }
  function sideWithCrown(F, st, civ, crown) {
    const p = player();
    const wasPlayerAlly = !!PC.rel(p, civ).ally || inLeague(civ);
    leaveLeague(civ);
    breakPairs(st, civ);
    if (PC.atWar(civ.id, crown.id)) PC.makePeace(civ, crown);
    PC.rel(civ, crown).ally = PC.rel(crown, civ).ally = true;
    PC.rel(civ, crown).att = Math.max(PC.rel(civ, crown).att, 40); PC.rel(crown, civ).att = Math.max(PC.rel(crown, civ).att, 40);
    st.stance[civ.id] = 'corona'; civ.crownAlly = crown.id;
    if (PC.rel(p, civ).ally) { unally(p, civ); PC.rel(civ, p).att -= 40; }
    // Auxiliares y caballos para el bando que gana.
    const base = PC.civCities(crown)[0];
    const at = base ? PC.tile(base.t) : null;
    if (at) { PC.spawnUnit(crown, 'aliado', at); PC.spawnUnit(crown, 'aliado', at); }
    if (!civ.techs.equitacion) PC.grantTech(civ, 'equitacion', true);
    // Los enemigos de la Corona pasan a ser enemigos del traidor.
    let n = 0;
    alive().forEach((o) => {
      if (n >= 3 || o === civ || isCrown(o) || PC.atWar(civ.id, o.id) || PC.isAlly(civ.id, o.id) || PC.civCities(o).length === 0) return;
      if (PC.atWar(crown.id, o.id) || (wasPlayerAlly && o.isPlayer)) { if (!PC.truceBlocks || !PC.truceBlocks(civ, o)) { PC.declareWar(civ, o, true); n++; } }
    });
    const why = F.aliados.includes(civ.key) ? 'a cambio de cobrarse viejas deudas con sus vecinos' : PC.leaderOf(civ).agenda === 'mercader' ? 'a cambio de comercio y hierro' : 'por miedo a las armas extranjeras';
    note(`${PC.leaderOf(civ).name} (${civ.name}) se alía con ${F.crownName} ${why}.`, F, 'war', involved(F) || wasPlayerAlly);
    if (wasPlayerAlly) PC.queueEvent('traicion_aliado', { from: civ.id, front: F.id });
  }
  function returnToResistance(F, st, civ, crown) {
    unally(civ, crown);
    if (civ.tributaryOf === crown.id) civ.tributaryOf = null;
    PC.rel(civ, crown).att -= 30;
    st.stance[civ.id] = 'neutral'; civ.crownAlly = null;
    note(`${civ.name} rompe con ${F.crownName} y vuelve a la resistencia.`, F, 'war', involved(F));
  }
  // Ligas espontáneas entre pueblos del frente (guardadas en st.pares): se rompen si uno de los dos se pasa a la Corona.
  function breakPairs(st, civ) {
    st.pares = (st.pares || []).filter((pr) => {
      if (!pr.includes(civ.id)) return true;
      const o = PC.civ(pr[0] === civ.id ? pr[1] : pr[0]);
      if (o) { unally(civ, o); PC.rel(o, civ).att -= 15; PC.rel(civ, o).att -= 15; }
      return false;
    });
  }
  // Dos pueblos del mismo frente, en guerra con la Corona y que se aprecian, se alían entre sí sin depender del jugador.
  function spontaneousLeague(F, st, crown, ns) {
    const c = ns.filter((n) => PC.atWar(n.id, crown.id) && !n.crownAlly && !n.tributaryOf && ['resiste', 'liga'].includes(stanceOf(st, n)));
    if (c.length < 2 || !PC.chance(TUNE.aiLeagueChance)) return;
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
      const a = c[i], b = c[j];
      if (PC.isAlly(a.id, b.id) || PC.atWar(a.id, b.id) || PC.rel(a, b).att < TUNE.aiLeagueAtt || PC.rel(b, a).att < TUNE.aiLeagueAtt) continue;
      PC.rel(a, b).ally = PC.rel(b, a).ally = true;
      PC.rel(a, b).att += 10; PC.rel(b, a).att += 10;
      (st.pares = st.pares || []).push([a.id, b.id]);
      note(`${a.name} y ${b.name} sellan una liga contra ${F.crownName}.`, F, 'war', involved(F) || PC.hasMet(a) || PC.hasMet(b));
      return;
    }
  }
  function stanceTick(F, st, crown) {
    const g = G();
    if ((g.turn - st.since) % 4 !== 0) return;
    const ns = nativesOf(F);
    Object.keys(st.stance).forEach((id) => { const c = PC.civ(+id); if ((!c || !c.alive || !PC.civCities(c).length) && st.stance[id] !== 'caido') st.stance[id] = 'caido'; });
    const defected = ns.filter((c) => ['corona', 'vasallo'].includes(stanceOf(st, c))).length;
    ns.forEach((civ) => {
      let cur = stanceOf(st, civ);
      if (civ.crownAlly) { // aliado de una Corona de una fase anterior: se conserva el vínculo si sigue viva
        const cr = PC.civ(civ.crownAlly);
        if (!cr || !cr.alive) civ.crownAlly = null;
        else if (cur === 'neutral' && cr.id === crown.id) cur = st.stance[civ.id] = 'corona';
      }
      if (cur === 'vasallo' || cur === 'caido') return;
      if (cur === 'corona') {
        // Si la Corona flaquea (pocas ciudades y tropas, o muchas bajas), los aliados vuelven a la resistencia.
        const weak = (crownCities(F, crown) <= 1 && crownMil(crown) <= 5) || (crownMil(crown) <= 2) || st.lost > st.captures + 2;
        if (weak && PC.chance(TUNE.returnChance)) returnToResistance(F, st, civ, crown);
        return;
      }
      if (inLeague(civ)) st.stance[civ.id] = 'liga';
      else if (PC.atWar(civ.id, crown.id)) st.stance[civ.id] = 'resiste';
      if (defected >= Math.ceil(ns.length * TUNE.maxDefect)) return;
      const pr = pull(F, st, civ, crown);
      if (PC.chance(pr / 100 * TUNE.pullRate * (0.4 + 0.6 * kOf(F)))) sideWithCrown(F, st, civ, crown);
    });
    spontaneousLeague(F, st, crown, ns);
  }

  // ---------------------------------------------------------------- La Corona ataca
  function aggression(F, st, crown) {
    const g = G(), p = player();
    if ((g.turn - st.since) % 3 !== 0 || crownMil(crown) < 3) return;
    const wars = alive().filter((o) => !o.isPlayer && PC.atWar(o.id, crown.id)).length;
    if (wars >= 2 + (crownMil(crown) > 8 ? 1 : 0)) return;
    const anchors = PC.civCities(crown).map((c) => PC.tile(c.t)).concat(PC.civUnits(crown).filter(PC.isMil).slice(0, 6).map((u) => PC.tile(u.t)));
    if (!anchors.length) return;
    let best = null, bs = Infinity;
    nativesOf(F).forEach((n) => {
      if (PC.atWar(crown.id, n.id) || ['corona', 'vasallo'].includes(stanceOf(st, n)) || PC.isAlly(crown.id, n.id) || (PC.truceBlocks && PC.truceBlocks(crown, n))) return;
      const cs = PC.civCities(n);
      if (!cs.length) return;
      const d = Math.min(...cs.flatMap((c) => anchors.map((a) => PC.dist(PC.tile(c.t), a))));
      if (d > 14) return;
      const s = d - Math.min(6, pow(crown) / pow(n) * 2);
      if (s < bs) { bs = s; best = n; }
    });
    if (best) {
      if (!PC.chance(0.6)) return;
      PC.rel(crown, best).denounced = g.turn - 5; // el Requerimiento hace de denuncia formal
      PC.declareWar(crown, best);
      PC.rel(crown, best).aggressor = true; crown.invade = best.id;
      st.stance[best.id] = inLeague(best) ? 'liga' : 'resiste';
      // Los aliados indígenas de la Corona se suman a la campaña.
      nativesOf(F).filter((n) => stanceOf(st, n) === 'corona' && !PC.atWar(n.id, best.id) && !PC.isAlly(n.id, best.id)).forEach((n) => { if (PC.chance(0.7)) PC.declareWar(n, best, true); });
      return;
    }
    // Sin pueblos que atacar, la Corona presenta el Requerimiento al jugador si tiene ciudades en el frente.
    if (F.id !== 'peru' && !S().pact && !PC.atWar(p.id, crown.id) && g.turn - st.reqTurn > 25 && inRegions(p, new Set(regionIds(F))).length) {
      st.reqTurn = g.turn;
      PC.queueEvent('requerimiento', { from: crown.id, front: F.id });
    }
  }

  // ---------------------------------------------------------------- Refuerzos de ambos bandos
  // La Corona recibe refuerzos de ultramar durante las primeras décadas; los pueblos en guerra levantan tropas.
  function reinforce(F, st, crown) {
    const g = G(), age = g.turn - st.since;
    const K = kOf(F);
    if (crown.external || age < 1 || age > TUNE.reinfSpan + (K > 1 ? TUNE.reinfSpanBonus : 0) || age % TUNE.reinfEvery !== 0 || crownMil(crown) >= Math.round(TUNE.reinfCap * Math.max(1, K))) return;
    const base = PC.civCities(crown)[0];
    if (!base) return;
    const k = Math.max(1, Math.round((2 + (st.cmdUnit !== null ? 1 : 0)) * K));
    for (let i = 0; i < k; i++) PC.spawnUnit(crown, i % 3 === 2 ? 'caballero' : 'conquistador', PC.tile(base.t));
    crown.gold += 30;
    if (age === 5 || age === 20) note(`Llegan refuerzos de ultramar para ${F.crownName} en ${F.name}.`, F, 'war', involved(F));
  }
  function levies(F, st, crown) {
    if ((G().turn - st.since) % 6 !== 0) return;
    nativesOf(F).forEach((n) => {
      if (['corona', 'vasallo'].includes(stanceOf(st, n)) || !PC.atWar(n.id, crown.id)) return;
      const cs = PC.civCities(n);
      if (!cs.length || PC.civUnits(n).filter(PC.isMil).length >= cs.length * 3 + 2) return;
      PC.spawnUnit(n, PC.aiBestUnit(n), PC.tile(cs[0].t));
      // La resistencia levanta más tropas en Fácil y en los frentes donde la Corona lo tuvo difícil (K < 1).
      if (inLeague(n) || kOf(F) < 0.9) PC.spawnUnit(n, PC.aiBestUnit(n), PC.tile(cs[0].t));
    });
  }

  // ---------------------------------------------------------------- Desenlace de cada frente
  function resolve(F, st, state, crown) {
    const g = G();
    st.state = state; st.resolved = { turn: g.turn, year: g.year };
    st.role = involved(F) ? (S().league && nativesOf(F).some(inLeague) ? 'liga' : 'frontera') : null;
    st.leagueAtEnd = !!(S().league && S().league.members.length);
    if (state === 'resistida') {
      note(`¡${F.name} resiste! ${F.crownName} no logra afianzarse.`, F, 'history', involved(F));
      PC.diverge(`${F.crownName} no logra conquistar ${F.name} (${PC.fmtYear(g.year)}).`);
    } else {
      note(`${F.name} cae en poder de ${F.crownName}.`, F, 'history', involved(F));
    }
    if (involved(F)) PC.queueEvent('frente_resuelto', { front: F.id, outcome: state, from: crown ? crown.id : undefined });
  }
  function resolveTick(F, st, crown) {
    const g = G();
    const age = g.turn - st.since, cc = crownCities(F, crown), nc = nativeCities(F), K = kOf(F);
    if (F.crown === 'espana') {
      if (g.flags.coronaDesiste && !g.flags.virreinato && !g.flags.virreinatoAI) return resolve(F, st, 'resistida', crown);
      if ((g.flags.virreinato || g.flags.virreinatoAI) && cc >= 3) return resolve(F, st, 'conquistada', crown);
      // Pasados 30 turnos decide el pie que la Corona ha logrado: ciudades y tropas (peruScore, escalado por la dificultad).
      if (age >= 30) resolve(F, st, g.flags.virreinatoAI || cc >= 2 || cc * 10 + crownMil(crown) >= peruNeed(K) ? 'conquistada' : 'resistida', crown);
      return;
    }
    if (age >= 6 && cc === 0 && crownMil(crown) === 0) return resolve(F, st, 'resistida', crown);
    if (age >= 8 && cc >= 2 && nc <= Math.floor(st.nativeStart * PC.clamp(TUNE.earlyShare * K * K, 0.05, 0.7))) return resolve(F, st, 'conquistada', crown);
    // Pasadas unas décadas el frente se estabiliza: gana quien tiene la mayor parte de las ciudades (la Corona, con más ventaja a mayor K).
    if (age >= TUNE.settle) resolve(F, st, cc >= 2 && cc * 2 * K * K * K >= nc ? 'conquistada' : 'resistida', crown);
  }

  // ---------------------------------------------------------------- Ciclo de vida de un frente
  function activate(F, st, crown) {
    const g = G();
    // Acero, caballos y aliados indígenas: la ventaja militar de la expedición crece con la dificultad y el frente (K).
    if (crown.colonial) crown.bonus = Object.assign({}, crown.bonus, { atk: Math.round(TUNE.crownAtk * kOf(F)), atkCity: Math.round(TUNE.crownAtkCity * kOf(F)) });
    st.state = 'activo'; st.since = g.turn; st.stance = {}; st.pares = []; st.nativeStart = Math.max(1, nativeCities(F)); st.cmdUnit = null; st.cmdDead = null;
    if (!st.started) {
      st.started = true;
      note(`${F.crownName} abre un frente en ${F.name} (${PC.fmtYear(g.year)}). ${F.text}`, F, 'war', involved(F) || !S().intro);
      if (!S().intro && g.year < 1700) { S().intro = true; PC.queueEvent('conquista_inicio', { from: crown.id, front: F.id }); }
    }
  }
  function tickFront(F) {
    const g = G(), st = FS(F), crown = crownOf(F);
    if (st.state === 'resistida' || st.state === 'conquistada') return;
    if (st.state === 'pendiente') {
      if (!crown) {
        if (g.year >= F.year + PC.CONQUISTA_SETTLE && !st.started) { st.state = 'resistida'; st.resolved = { turn: g.turn, year: g.year, silent: true }; }
        // Un frente ya iniciado cuya Corona desapareció al cambiar de fase: la expedición fracasó.
        else if (st.started && g.year >= F.year) { st.state = 'resistida'; st.resolved = { turn: g.turn, year: g.year, silent: true }; }
        return;
      }
      if (g.year < F.year && !st.started) return;
      // Una fase que empieza mucho después de la fecha: la Conquista ya es historia.
      if (g.year >= F.year + PC.CONQUISTA_SETTLE && !st.started) { st.state = 'conquistada'; st.resolved = { turn: g.turn, year: g.year, silent: true }; return; }
      activate(F, st, crown);
    }
    if (st.state !== 'activo') return;
    if (!crown) { resolve(F, st, 'resistida', null); return; }
    commanderTick(F, st, crown);
    reinforce(F, st, crown);
    levies(F, st, crown);
    stanceTick(F, st, crown);
    aggression(F, st, crown);
    resolveTick(F, st, crown);
  }

  // Cae una ciudad: contabilidad de los frentes y suerte de los pueblos que pierden su capital.
  const baseCaptured = PC.onCityCaptured;
  PC.onCityCaptured = function (city, old, nc, wasCapital) {
    if (baseCaptured) baseCaptured(city, old, nc, wasCapital);
    if (!isCrown(nc) && !isCrown(old)) return;
    const reg = PC.tile(city.t).region;
    const F = frontsHere().find((f) => regionIds(f).includes(reg) && (f.crown === nc.key || f.crown === old.key));
    if (!F) return;
    const st = FS(F);
    if (st.state !== 'activo') return;
    if (isCrown(nc) && !isCrown(old)) {
      st.captures++;
      if (old.isPlayer) {
        if (wasCapital && nc.key !== 'espana' && !G().fired['caida_' + F.id]) { G().fired['caida_' + F.id] = true; PC.queueEvent('caida_capital_conquista', { from: nc.id, front: F.id }); }
        return;
      }
      if (!wasCapital || !old.alive) return;
      const left = PC.civCities(old);
      if (!left.length) return;
      if (PC.chance(TUNE.vassalChance)) {
        old.tributaryOf = nc.id; PC.rel(old, nc).ally = PC.rel(nc, old).ally = true; st.stance[old.id] = 'vasallo';
        if (PC.atWar(old.id, nc.id)) PC.makePeace(old, nc);
        note(`Sin su capital, ${old.name} jura vasallaje a ${F.crownName}.`, F, 'war', involved(F));
      } else {
        old.capitalId = left[0].id;
        const best = PC.aiBestUnit(old);
        PC.spawnUnit(old, best, PC.tile(left[0].t)); PC.spawnUnit(old, best, PC.tile(left[0].t));
        note(`${old.name} pierde su capital y resiste desde ${left[0].name}.`, F, 'war', involved(F));
      }
    } else if (isCrown(old) && !isCrown(nc)) {
      st.lost++;
      if (nc.isPlayer) PC.addStabMod(nc, 'Victoria sobre los invasores', 6, 10);
    }
  };

  // ---------------------------------------------------------------- Liga de resistencia
  PC.conquistaLeague = () => (G().conquista ? G().conquista.league : null);
  PC.CONQUISTA_LEAGUE_COST = 40;
  PC.conquistaCandidates = function () {
    const p = player();
    const set = new Set();
    frontsHere().forEach((F) => { if (FS(F).state === 'activo') nativesOf(F).forEach((c) => set.add(c)); });
    alive().forEach((c) => { if (!c.isPlayer && !isCrown(c) && !c.external && crownEnemy(c)) set.add(c); });
    return Array.from(set).filter((c) => !c.isPlayer && PC.civCities(c).length && (PC.hasMet(c) || G().autoplay) && !PC.atWar(p.id, c.id) && !c.crownAlly && !c.tributaryOf && !inLeague(c));
  };
  function addMember(civ) {
    const c = S(), p = player(), L = c.league;
    L.members.forEach((id) => { const m = PC.civ(id); if (PC.atWar(m.id, civ.id)) PC.makePeace(m, civ); PC.rel(m, civ).ally = PC.rel(civ, m).ally = true; });
    if (PC.atWar(p.id, civ.id)) PC.makePeace(p, civ);
    PC.rel(p, civ).ally = PC.rel(civ, p).ally = true; PC.rel(civ, p).att += 10;
    L.members.push(civ.id);
    civ.bonus = Object.assign({}, civ.bonus, { atk: (civ.bonus.atk || 0) + 10 }); civ.ligaBonus = true;
    frontsHere().forEach((F) => { const st = FS(F); if (st.state === 'activo') st.stance[civ.id] = 'liga'; });
  }
  function leaveLeague(civ) {
    const L = S().league;
    if (!L || !L.members.includes(civ.id)) return;
    L.members = L.members.filter((id) => id !== civ.id);
    if (civ.ligaBonus) { civ.bonus = Object.assign({}, civ.bonus, { atk: Math.max(0, (civ.bonus.atk || 0) - 10) }); civ.ligaBonus = false; }
  }
  function dissolveLeague(reason) {
    const c = S();
    if (!c.league) return;
    c.league.members.slice().forEach((id) => { const m = PC.civ(id); if (m) { leaveLeague(m); PC.rel(m, player()).att -= 20; } });
    c.league = null;
    note(`La liga de resistencia se disuelve${reason ? ' (' + reason + ')' : ''}.`, null, 'history', true);
  }
  PC.conquistaFormLeague = function () {
    const c = S(), p = player(), g = G();
    if (c.league) return { ok: false, text: 'Ya lideras una liga de resistencia.' };
    if (c.pact) return { ok: false, text: 'No puedes liderar la resistencia mientras pactas con la Corona.' };
    if ((p.influence || 0) < PC.CONQUISTA_LEAGUE_COST) return { ok: false, text: `Necesitas ${PC.CONQUISTA_LEAGUE_COST} de influencia.` };
    const cands = PC.conquistaCandidates();
    if (!cands.length) return { ok: false, text: 'No hay pueblos conocidos a los que convocar.' };
    p.influence -= PC.CONQUISTA_LEAGUE_COST;
    c.league = { leader: p.id, founded: g.turn, year: g.year, members: [] };
    const joined = [];
    cands.forEach((civ) => {
      const threatened = frontsHere().some((F) => FS(F).state === 'activo' && nativesOf(F).includes(civ));
      const ch = PC.clamp(0.3 + PC.rel(civ, p).att / 120 + (crownEnemy(civ) ? 0.35 : 0) + (threatened ? 0.15 : 0) + (PC.leaderOf(civ).agenda === 'devoto' ? 0.05 : 0), 0.05, 0.92);
      if (PC.chance(ch)) { addMember(civ); joined.push(civ); }
    });
    if (!joined.length) {
      c.league = null; p.influence += Math.floor(PC.CONQUISTA_LEAGUE_COST / 2);
      return { ok: false, text: 'Ningún pueblo acepta: desconfían de tus promesas. Recuperas la mitad de la influencia.' };
    }
    const text = `La liga de resistencia reúne a ${joined.length} pueblo${joined.length > 1 ? 's' : ''}: ${joined.map((x) => x.name).join(', ')}.`;
    note(text, null, 'history', true);
    PC.diverge(`${p.name} forja una liga de resistencia contra los invasores (${PC.fmtYear(g.year)}).`);
    return { ok: true, text, members: joined.map((x) => x.id) };
  };
  PC.conquistaLeaveLeague = function () {
    if (!S().league) return { ok: false, text: 'No hay liga.' };
    dissolveLeague('el jugador la abandona');
    return { ok: true, text: 'Abandonas la liga de resistencia.' };
  };
  function leagueTick() {
    const c = S(), L = c.league;
    if (!L) return;
    L.members = L.members.filter((id) => { const m = PC.civ(id); return m && m.alive && PC.civCities(m).length; });
    if (!L.members.length) { c.league = null; note('La liga de resistencia se disuelve: ya no quedan miembros.', null, 'history', true); return; }
    // Guerra común: si la Corona ataca a un miembro, todos le declaran la guerra.
    alive().filter(isCrown).forEach((cr) => {
      if (!L.members.some((id) => PC.atWar(id, cr.id))) return;
      L.members.forEach((id) => { const m = PC.civ(id); if (!PC.atWar(m.id, cr.id) && !PC.isAlly(m.id, cr.id) && PC.chance(0.5)) PC.declareWar(m, cr, true); });
    });
  }

  // ---------------------------------------------------------------- Pacto con la Corona
  PC.conquistaPact = function () {
    const c = S(), p = player(), g = G();
    if (c.pact) return { ok: false, text: 'Ya tienes un pacto con la Corona.' };
    const crowns = alive().filter(isCrown);
    if (!crowns.length) return { ok: false, text: 'No hay ninguna Corona con la que pactar.' };
    c.pact = { since: g.turn, year: g.year, betrayed: false };
    crowns.forEach((cr) => {
      if (PC.atWar(p.id, cr.id)) PC.makePeace(p, cr);
      PC.rel(p, cr).ally = PC.rel(cr, p).ally = true;
      PC.rel(cr, p).att = Math.max(PC.rel(cr, p).att, 30);
    });
    dissolveLeague('el jugador pacta con la Corona');
    alive().forEach((n) => { if (!n.isPlayer && !isCrown(n)) PC.rel(n, p).att -= 30; });
    p.gold += 150;
    if (!p.techs.equitacion) PC.grantTech(p, 'equitacion', true);
    if (!p.techs.hierro && p.techs.metal_cobre) PC.grantTech(p, 'hierro', true);
    PC.addStabMod(p, 'Colaboración con la Corona', -10, 12);
    if (g.flags) g.flags.espanaAliada = true;
    const text = `Pactas con ${crowns.map((x) => x.name).join(' y ')}: oro, caballos y acero a cambio de la lealtad de tus vecinos.`;
    note(text, null, 'history', true);
    PC.diverge(`${p.name} se alía con la Corona en lugar de resistir (${PC.fmtYear(g.year)}).`);
    return { ok: true, text };
  };
  PC.conquistaBreakPact = function () {
    const c = S(), p = player();
    if (!c.pact) return { ok: false, text: 'No tienes ningún pacto.' };
    c.pact = null;
    alive().filter(isCrown).forEach((cr) => { unally(p, cr); PC.rel(cr, p).att -= 60; if (!PC.atWar(p.id, cr.id) && PC.chance(0.7)) { PC.rel(cr, p).denounced = G().turn - 5; PC.declareWar(cr, p); PC.rel(cr, p).aggressor = true; cr.invade = p.id; } });
    PC.addStabMod(p, 'Rompes el pacto', -5, 8);
    note('Rompes el pacto con la Corona: los invasores no perdonan.', null, 'war', true);
    return { ok: true, text: 'Rompes el pacto con la Corona.' };
  };
  function pactTick() {
    const c = S(), g = G(), p = player();
    if (!c.pact) return;
    alive().filter(isCrown).forEach((cr) => { if (PC.atWar(p.id, cr.id)) PC.makePeace(p, cr); PC.rel(p, cr).ally = PC.rel(cr, p).ally = true; });
    // Los pueblos que resisten no perdonan al colaborador.
    if (g.turn % 6 === 0) {
      const n = alive().find((o) => !o.isPlayer && !isCrown(o) && !o.external && PC.civCities(o).length && crownEnemy(o) && PC.rel(o, p).att < -35 && !PC.atWar(o.id, p.id));
      if (n) { PC.rel(n, p).denounced = g.turn - 5; PC.declareWar(n, p); }
    }
    // Como Pizarro con Atahualpa: la Corona puede romper el pacto cuando se siente fuerte.
    if (g.turn - c.pact.since >= 12 && !c.pact.betrayed && PC.chance(0.04)) {
      const cr = alive().find((o) => isCrown(o) && PC.civCities(o).length >= 2 && pow(o) > pow(p) * 1.3);
      if (cr) { c.pact.betrayed = true; PC.queueEvent('corona_traiciona', { from: cr.id }); }
    }
  }

  // ---------------------------------------------------------------- Ciclo general
  function reset() {
    const c = S();
    c.league = null;
    Object.keys(c.fronts).forEach((id) => {
      const st = c.fronts[id];
      st.stance = {}; st.pares = []; st.cmdUnit = null; st.cmdName = null; st.cmdDead = null;
      if (st.state === 'activo') st.state = 'pendiente';
    });
  }
  ['startPhase2', 'startPhase3'].forEach((name) => {
    const base = PC[name];
    if (!base) return;
    PC[name] = function () {
      const before = G().phase;
      base.apply(this, arguments);
      if (G().phase !== before) { keyCache = { turn: -1, phase: '', map: null, keys: null }; if (G().conquista) reset(); }
    };
  });
  const baseTick = PC.diplomacyTick;
  PC.diplomacyTick = function () {
    if (baseTick) baseTick();
    const g = G();
    if (!PC.player()) return;
    const t0 = PC.conqProfile ? Date.now() : 0;
    frontsHere().forEach(tickFront);
    leagueTick();
    pactTick();
    // El piloto automático también convoca la liga de vez en cuando si hay un frente en guerra y le alcanza la influencia.
    if (g.autoplay && !S().league && !S().pact && g.turn % 4 === 0 && frontsHere().some((F) => FS(F).state === 'activo') && (PC.player().influence || 0) >= PC.CONQUISTA_LEAGUE_COST && PC.chance(0.3)) PC.conquistaFormLeague();
    if (PC.conqProfile) PC.conqMs = (PC.conqMs || 0) + (Date.now() - t0);
    // Fin de la Conquista en esta fase: todos los frentes decididos.
    const here = frontsHere(), c = S();
    if (c.intro && !c.ended[g.phase] && here.length && here.every((F) => ['resistida', 'conquistada'].includes(FS(F).state)) && here.some((F) => !FS(F).resolved || !FS(F).resolved.silent)) {
      c.ended[g.phase] = true;
      PC.queueEvent('conquista_fin', {});
    }
  };

  // ---------------------------------------------------------------- Vista para la interfaz
  PC.conquistaActive = () => !!(G().conquista && G().conquista.intro) || frontsHere().some((F) => FS(F).state === 'activo');
  PC.conquistaFront = (id) => PC.CONQUISTA_FRONT[id];
  PC.conquistaView = function () {
    const g = G(), c = S(), p = player();
    const fronts = frontsHere().map((F) => {
      const st = FS(F), crown = crownOf(F), regs = new Set(regionIds(F));
      const natives = nativesOf(F).map((n) => ({ id: n.id, key: n.key, name: n.name, color: n.color, stance: stanceOf(st, n), stanceText: PC.CONQUISTA_STANCE[stanceOf(st, n)],
        cities: inRegions(n, regs).length, leader: PC.leaderOf(n).name, atWar: !!(crown && PC.atWar(n.id, crown.id)) }));
      Object.keys(st.stance).forEach((id) => { if (st.stance[id] === 'caido' && !natives.some((x) => x.id === +id)) { const n = PC.civ(+id); if (n) natives.push({ id: n.id, key: n.key, name: n.name, color: n.color, stance: 'caido', stanceText: PC.CONQUISTA_STANCE.caido, cities: 0, leader: PC.leaderOf(n).name, atWar: false }); } });
      return { id: F.id, name: F.name, year: F.year, text: F.text, state: st.state, stateText: PC.CONQUISTA_STATE[st.state], silent: !!(st.resolved && st.resolved.silent),
        crownId: crown ? crown.id : null, crownName: F.crownName, crownCiv: crown ? crown.name : null, crownColor: crown ? crown.color : null, crownLeader: crown ? PC.leaderOf(crown).name : null,
        commander: st.cmdName, commanders: F.commanders, since: st.since, age: st.started ? g.turn - st.since : 0, resolved: st.resolved,
        regions: Array.from(regs).map((id) => (g.map.regions.find((r) => r.id === id) || {}).name).filter(Boolean),
        crownCities: crown ? crownCities(F, crown) : 0, crownTroops: crown ? crownMil(crown) : 0, nativeCities: nativeCities(F), nativeStart: st.nativeStart, captures: st.captures, lost: st.lost,
        natives, involved: involved(F), role: st.role, atWarWithPlayer: !!(crown && PC.atWar(p.id, crown.id)) };
    });
    const L = c.league;
    return { active: PC.conquistaActive(), fronts, pact: c.pact, canLeague: !L && !c.pact && PC.conquistaCandidates().length > 0 && (p.influence || 0) >= PC.CONQUISTA_LEAGUE_COST,
      leagueCost: PC.CONQUISTA_LEAGUE_COST, influence: Math.round(p.influence || 0),
      league: L ? { founded: L.founded, age: g.turn - L.founded, members: L.members.map((id) => PC.civ(id)).filter(Boolean).map((m) => ({ id: m.id, name: m.name, color: m.color, key: m.key })) } : null,
      tally: { resistida: fronts.filter((f) => f.state === 'resistida').length, conquistada: fronts.filter((f) => f.state === 'conquistada').length, activo: fronts.filter((f) => f.state === 'activo').length, pendiente: fronts.filter((f) => f.state === 'pendiente').length },
      chronicle: c.chronicle.slice(-30).reverse() };
  };

  // ---------------------------------------------------------------- Legados de la Conquista
  const resolvedFronts = (g, state) => Object.keys((g.conquista || { fronts: {} }).fronts).filter((id) => { const f = g.conquista.fronts[id]; return f.state === state && !(f.resolved && f.resolved.silent); });
  PC.LEGACIES.push(
    { id: 'frente', era: 'Encuentro de Mundos', name: 'Expulsar a la Corona de un frente de la Conquista', check: (g) => resolvedFronts(g, 'resistida').some((id) => g.conquista.fronts[id].role) },
    { id: 'liga', era: 'Encuentro de Mundos', name: 'Ganar un frente con una liga de resistencia', check: (g) => resolvedFronts(g, 'resistida').some((id) => g.conquista.fronts[id].role === 'liga' && g.conquista.fronts[id].leagueAtEnd) },
    { id: 'todos_frentes', era: 'Encuentro de Mundos', name: 'Resistir tres o más frentes de la Conquista', check: (g) => resolvedFronts(g, 'resistida').length >= 3 }
  );

  // ---------------------------------------------------------------- Eventos
  const E = PC.EVENTS;
  const coastalCities = (civ) => PC.civCities(civ).filter((c) => PC.isCoastal(c));
  const leaderName = (c) => (c ? PC.leaderOf(c).name : 'La Corona');

  E.conquista_inicio = (g, p, d) => {
    const crown = PC.civ(d.from), F = PC.CONQUISTA_FRONT[d.front];
    const cands = PC.conquistaCandidates().length;
    return {
      title: 'Comienza la Conquista', img: '',
      text: `${leaderName(crown)} desembarca en ${F.name} en nombre de ${F.crownName}. ${F.text} Es solo el primero: en pocos años habrá frentes abiertos desde el Caribe hasta el Plata. ` +
        'Cada pueblo decidirá si resistir, pactar con los extranjeros o aprovechar la guerra para cobrarse viejas deudas con sus vecinos.',
      choices: [
        { label: 'Convocar la liga de resistencia', hint: `${PC.CONQUISTA_LEAGUE_COST} de influencia · los pueblos vecinos pueden unirse y pelear juntos`, cond: !S().league && !S().pact && cands > 0 && (p.influence || 0) >= PC.CONQUISTA_LEAGUE_COST, effect: () => PC.conquistaFormLeague().text },
        { label: 'Fortificar tus fronteras', hint: 'Murallas en tus ciudades costeras y una unidad más en cada una', effect: () => {
          coastalCities(p).forEach((c) => { if (!c.buildings.includes('muralla')) c.buildings.push('muralla'); c.hp = 100; });
          PC.civCities(p).forEach((c) => PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(c.t)));
          return 'Los pucarás se refuerzan; que vengan.'; } },
        { label: 'Pactar con la Corona', hint: 'Alianza con los invasores: oro, caballos y acero, pero te odiarán tus vecinos', cond: !S().pact, effect: () => PC.conquistaPact().text },
        { label: 'Observar y esperar', hint: 'No te comprometes con nadie', effect: () => 'Esperas a ver cómo se mueven los demás.' }
      ]
    };
  };

  E.frente_resuelto = (g, p, d) => {
    const F = PC.CONQUISTA_FRONT[d.front], won = d.outcome === 'resistida';
    return {
      title: won ? `¡${F.name} resiste!` : `Cae ${F.name}`, img: '',
      text: won ? `Tras años de lucha, ${F.crownName} se retira de ${F.name}. Los pueblos del frente han escrito una historia distinta de la que contaron los cronistas.`
        : `${F.crownName} se afianza en ${F.name}. Las ciudades se rebautizan y los antiguos señores quedan como vasallos o como recuerdo.`,
      choices: won ? [
        { label: 'Celebrar la victoria', hint: '+20 de influencia y +cohesión', effect: () => { p.influence = (p.influence || 0) + 20; PC.addStabMod(p, 'Victoria sobre los invasores', 6, 10); return 'La noticia recorre el continente.'; } }
      ] : [
        { label: 'Estudiar al enemigo', hint: 'Aprendes las armas que usaron contra ti', effect: () => {
          const crown = PC.civ(d.from);
          const t = crown ? ['equitacion', 'hierro', 'acero', 'polvora', 'arcabuz'].find((x) => crown.techs[x] && !p.techs[x]) : null;
          if (t) { PC.grantTech(p, t, true); return `Aprendes ${PC.TECH[t].name}.`; }
          return 'No hay nada nuevo que aprender.'; } },
        { label: 'Prepararse para la próxima', hint: 'Una unidad más en cada ciudad', effect: () => { PC.civCities(p).forEach((c) => PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(c.t))); return 'Se refuerzan las guarniciones.'; } }
      ]
    };
  };

  E.traicion_aliado = (g, p, d) => {
    const c = PC.civ(d.from), F = PC.CONQUISTA_FRONT[d.front], L = PC.leaderOf(c);
    const price = 60 + PC.eraOf(c) * 25;
    return {
      title: `${L.name} traiciona la alianza`, img: '',
      text: `${L.name}, de ${c.name}, ha pactado en secreto con ${F.crownName}. Sus mensajeros ya no llegan a tus ciudades y sus tropas marchan junto a los invasores.`,
      choices: [
        { label: 'Declararle la guerra', hint: 'Que pague la traición', cond: c.alive && !PC.atWar(p.id, c.id), effect: () => { PC.rel(p, c).denounced = g.turn - 5; PC.declareWar(p, c); return `Guerra contra ${c.name}.`; } },
        { label: `Comprar su lealtad (${price} de oro)`, hint: 'Puede volver a la resistencia', cond: c.alive && p.gold >= price, effect: () => {
          p.gold -= price;
          const F2 = PC.CONQUISTA_FRONT[d.front], st = FS(F2), crown = PC.civ(c.crownAlly);
          if (PC.chance(0.5) && crown) { returnToResistance(F2, st, c, crown); return `${c.name} rompe con la Corona.`; }
          return `${L.name} se queda con tu oro y con los invasores.`; } },
        { label: 'Denunciarlo ante los pueblos', hint: 'Los demás desconfían de él y te respetan', cond: c.alive, effect: () => {
          PC.rel(p, c).denounced = g.turn;
          alive().forEach((o) => { if (!o.isPlayer && o.id !== c.id && !isCrown(o)) { PC.rel(o, c).att -= 12; PC.rel(o, p).att += 6; } });
          return `Los pueblos condenan a ${c.name}.`; } },
        { label: 'Dejarlo ir', hint: 'Sin consecuencias', effect: () => 'Sigues adelante sin él.' }
      ]
    };
  };

  E.requerimiento = (g, p, d) => {
    const crown = PC.civ(d.from), F = PC.CONQUISTA_FRONT[d.front], L = PC.leaderOf(crown);
    const L2 = S().league;
    return {
      title: `${L.name} te lee el Requerimiento`, img: '',
      text: `Un escribano lee, en una lengua que nadie entiende, que debes reconocer al rey lejano y a su dios o la guerra será por tu culpa. ${L.name} espera en ${F.name} con sus soldados.`,
      choices: [
        { label: 'Aceptar el vasallaje', hint: 'Paz y alianza con la Corona; pierdes la confianza de tus vecinos', cond: crown.alive && !S().pact, effect: () => PC.conquistaPact().text },
        { label: 'Rechazar el Requerimiento', hint: 'Guerra con la Corona; +cohesión por tu dignidad', cond: crown.alive, effect: () => {
          PC.addStabMod(p, 'Dignidad', 4, 8);
          if (!PC.atWar(p.id, crown.id)) { PC.declareWar(crown, p); PC.rel(crown, p).aggressor = true; crown.invade = p.id; }
          return `Rechazas el Requerimiento: ${crown.name} te declara la guerra.`; } },
        { label: 'Pedir ayuda a la liga', hint: 'Los miembros de la liga entran en la guerra a tu lado', cond: !!L2 && crown.alive, effect: () => {
          PC.addStabMod(p, 'Frente común', 6, 10);
          if (!PC.atWar(p.id, crown.id)) { PC.declareWar(crown, p); PC.rel(crown, p).aggressor = true; crown.invade = p.id; }
          return 'Tus aliados juran luchar contigo.'; } }
      ]
    };
  };

  E.corona_traiciona = (g, p, d) => {
    const crown = PC.civ(d.from), L = PC.leaderOf(crown);
    const price = 150 + PC.eraOf(p) * 25;
    const target = PC.civCities(p).filter((c) => c.id !== p.capitalId).sort((a, b) => Math.min(...PC.civCities(crown).map((o) => PC.dist(PC.tile(o.t), PC.tile(a.t)))) - Math.min(...PC.civCities(crown).map((o) => PC.dist(PC.tile(o.t), PC.tile(b.t)))))[0];
    return {
      title: `${L.name} rompe el pacto`, img: '',
      text: `Como Pizarro con Atahualpa, ${L.name} decide que el aliado ya no hace falta: sus tropas ocupan ${target ? target.name : 'tus fronteras'} y exigen rendición.`,
      choices: [
        { label: 'Resistir', hint: 'Guerra contra la Corona; la liga puede reformarse', cond: crown.alive, effect: () => {
          const c = S(); c.pact = null;
          unally(p, crown); if (target) PC.captureCity(target, crown.id);
          PC.rel(crown, p).denounced = g.turn - 5; if (!PC.atWar(p.id, crown.id)) { PC.declareWar(crown, p); PC.rel(crown, p).aggressor = true; crown.invade = p.id; }
          PC.addStabMod(p, 'Traición de la Corona', 6, 10);
          return `${crown.name} te declara la guerra y ocupa ${target ? target.name : 'una ciudad'}.`; } },
        { label: `Sobornar al capitán (${price} de oro)`, hint: 'El pacto sigue en pie, por ahora', cond: crown.alive && p.gold >= price, effect: () => { p.gold -= price; PC.rel(crown, p).att += 20; return 'El soborno funciona… esta vez.'; } },
        { label: 'Huir a las montañas', hint: 'Pierdes la ciudad, pero conservas el ejército y la dignidad', effect: () => {
          S().pact = null; unally(p, crown);
          if (target) PC.captureCity(target, crown.id);
          PC.civCities(p).forEach((c) => PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(c.t)));
          PC.addStabMod(p, 'Espíritu de resistencia', 8, 12); return 'Te refugias en la sierra y reorganizas la resistencia.'; } }
      ]
    };
  };

  E.caida_capital_conquista = (g, p, d) => {
    const crown = PC.civ(d.from), F = PC.CONQUISTA_FRONT[d.front];
    return {
      title: 'Ha caído la capital', img: '',
      text: `Las tropas de ${F.crownName} ocupan tu capital y se apoderan de sus tesoros. Debes decidir: resistir desde las montañas y la selva, o aceptar el vasallaje.`,
      choices: [
        { label: 'Resistir desde el interior', hint: '+2 unidades y moral de resistencia', cond: PC.civCities(p).length > 0, effect: () => {
          const c = PC.civCities(p)[0]; if (c) { p.capitalId = c.id; PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(c.t)); PC.spawnUnit(p, PC.aiBestUnit(p), PC.tile(c.t)); }
          PC.addStabMod(p, 'Espíritu de resistencia', 12, 15); return 'Desde el interior, la resistencia continúa.'; } },
        { label: 'Aceptar el vasallaje', hint: 'Paz; pagas el 30% de tu oro como tributo', cond: crown.alive, effect: () => {
          if (PC.atWar(p.id, crown.id)) PC.makePeace(p, crown);
          p.tribute = Math.max(p.tribute || 0, 0.3); return `Te conviertes en vasallo de ${F.crownName}.`; } }
      ]
    };
  };

  E.conquista_fin = (g, p) => {
    const v = PC.conquistaView();
    const res = v.fronts.filter((f) => f.state === 'resistida' && !f.silent), con = v.fronts.filter((f) => f.state === 'conquistada' && !f.silent);
    return {
      title: 'La Conquista ha terminado', img: '',
      text: `${res.length ? `${res.length} frente${res.length > 1 ? 's' : ''} resistió: ${res.map((f) => f.name).join(', ')}. ` : 'Ningún frente logró resistir. '}` +
        `${con.length ? `${con.length} cayó${con.length > 1 ? 'eron' : ''} en poder de la Corona: ${con.map((f) => f.name).join(', ')}. ` : ''}` +
        `${S().pact ? 'Tu pueblo colaboró con los invasores. ' : S().league ? 'Tu liga de resistencia sigue en pie. ' : ''}La historia de este continente ya no será la que cuentan los cronistas.`,
      choices: [{ label: 'Seguir escribiendo la historia', effect: () => { PC.diverge(res.length ? `La Conquista fracasa en ${res.length} frente${res.length > 1 ? 's' : ''}.` : 'La Conquista triunfa en todos los frentes.'); return 'La crónica continúa.'; } }]
    };
  };
})(globalThis.PC = globalThis.PC || {});

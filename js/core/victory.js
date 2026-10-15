// Condiciones de victoria: dominación, cultural, diplomática e histórica (legados), y fotos de la partida
// cada 10 turnos para la pantalla final. Al llegar a 2050 sin victoria gana la mayor puntuación.
(function (PC) {
  'use strict';
  const G = () => PC.G;
  const V = () => { const g = G(); if (!g.victory) g.victory = { won: null, ended: false, legados: {}, votos: 0 }; return g.victory; };
  const ownWonders = (civ) => Object.values(G().wonders).filter((w) => w === civ.id).length;
  const civTiles = (civ) => G().map.tiles.reduce((s, t) => s + (t && t.owner === civ.id ? 1 : 0), 0);
  const civPop = (civ) => PC.civCities(civ).reduce((s, c) => s + c.pop, 0);
  const regionsOf = (civ, rc) => Object.values(rc || PC.regionControl()).filter((v) => v === civ.id).length;

  PC.VICTORY_DOM = 0.6;       // fracción de regiones de América
  PC.VICTORY_WONDERS = 6;
  PC.VICTORY_VOTES = 5;
  PC.VICTORY_LEGACIES = 6;
  // Cultura acumulada que exige la victoria cultural según la era del jugador.
  PC.cultureGoal = (civ) => 1500 * (PC.eraOf(civ) + 2);

  // Legados: objetivos históricos por era. Se cumplen una vez y quedan anotados.
  PC.LEGACIES = [
    { id: 'andes', era: 'Horizonte Imperial', name: 'Unificar los Andes antes de 1500', check: (g, p) => g.year < 1500 && (g.phase !== 'peru' || PC.playerRegionCount() >= PC.phaseNeed()) },
    { id: 'diez', era: 'Desarrollos Regionales', name: 'Gobernar 10 ciudades', check: (g, p) => PC.civCities(p).length >= 10 },
    { id: 'qhapaq', era: 'Horizonte Imperial', name: 'Construir el Qhapaq Ñan', check: (g, p) => g.wonders.qhapaq_nan === p.id },
    { id: 'tres', era: 'Formativo', name: 'Tres maravillas antes del año 1000', check: (g, p) => g.year < 1000 && ownWonders(p) >= 3 },
    { id: 'polinesia', era: 'Horizonte Imperial', name: 'Llegar a Polinesia', check: (g) => !!g.flags.polinesia },
    { id: 'resistir', era: 'Encuentro de Mundos', name: 'Resistir la conquista española', check: (g) => !!g.flags.coronaDesiste && !g.flags.virreinato },
    { id: 'soberano', era: 'Ilustración', name: 'Ser una nación soberana o una república', check: (g) => !!(g.flags.soberano || g.flags.republica) },
    { id: 'industrial', era: 'Industrial', name: 'Alcanzar la era industrial antes de 1850', check: (g, p) => g.year < 1850 && PC.eraOf(p) >= 7 },
    { id: 'moderna', era: 'Moderna', name: 'Alcanzar la era moderna antes de 1950', check: (g, p) => g.year < 1950 && PC.eraOf(p) >= 8 },
    { id: 'america', era: 'Moderna', name: 'Llevar tu civilización a toda América (Fase 3)', check: (g) => g.phase === 'america' }
  ];

  // Avance hacia cada victoria: { id, name, pct (0-1), parts: [[etiqueta, valor, meta]], done }
  PC.victoryProgress = function () {
    const g = G(), p = PC.player(), v = V();
    const rc = PC.regionControl();
    const regs = g.map.regions.length, mine = regionsOf(p, rc);
    const domGoal = Math.ceil(regs * PC.VICTORY_DOM);
    const cg = g.congress || {};
    const leg = Object.keys(v.legados).length;
    const cult = PC.cultureGoal(p);
    const min1 = (x) => Math.max(0, Math.min(1, x));
    return [
      { id: 'dominacion', name: 'Dominación', desc: `Controla el ${Math.round(PC.VICTORY_DOM * 100)}% de las regiones de América (Fase 3).`,
        parts: g.phase === 'america' ? [['Regiones de América', mine, domGoal]] : [['Fase 3 · América', 0, 1], ['Regiones de esta fase', mine, regs]],
        pct: g.phase === 'america' ? min1(mine / domGoal) : min1(mine / Math.max(1, regs) / PC.VICTORY_DOM) * 0.5 },
      { id: 'cultural', name: 'Cultural', desc: `Posee ${PC.VICTORY_WONDERS} maravillas y una cultura acumulada alta para tu era.`,
        parts: [['Maravillas', ownWonders(p), PC.VICTORY_WONDERS], ['Cultura', Math.round(p.culture), cult]],
        pct: (min1(ownWonders(p) / PC.VICTORY_WONDERS) + min1(p.culture / cult)) / 2 },
      { id: 'diplomatica', name: 'Diplomática', desc: `Sé sede de «${PC.congressName ? PC.congressName() : 'la asamblea de los pueblos'}» y vota en el bando ganador de ${PC.VICTORY_VOTES} resoluciones.`,
        parts: [['Sede del congreso', cg.host === p.id ? 1 : 0, 1], ['Votos ganadores', v.votos, PC.VICTORY_VOTES]],
        pct: ((cg.host === p.id ? 1 : 0) + min1(v.votos / PC.VICTORY_VOTES)) / 2 },
      { id: 'historica', name: 'Histórica', desc: `Cumple ${PC.VICTORY_LEGACIES} de los ${PC.LEGACIES.length} legados de la historia.`,
        parts: [['Legados', leg, PC.VICTORY_LEGACIES]], pct: min1(leg / PC.VICTORY_LEGACIES) }
    ].map((o) => Object.assign(o, { done: o.pct >= 1 }));
  };

  const TEXT = {
    dominacion: (p) => `${p.name} domina América: del Ártico a la Tierra del Fuego obedecen a un poder nacido en los Andes.`,
    cultural: (p) => `Las maravillas y el arte de ${p.name} asombran al mundo. Tu cultura es la medida de todas las demás.`,
    diplomatica: (p) => `${p.name} es la sede de «${PC.congressName ? PC.congressName() : 'la asamblea de los pueblos'}» y su palabra decide el destino de los pueblos.`,
    historica: (p) => `${p.name} ha cambiado el curso de la historia: sus legados se recordarán por siglos.`
  };
  const KIND = { dominacion: 'Dominación', cultural: 'Cultural', diplomatica: 'Diplomática', historica: 'Histórica', puntuacion: 'Puntuación' };
  PC.VICTORY_KIND = KIND;

  // Puntuación con las regiones propias de cada civilización (PC.score cuenta las del jugador).
  PC.scoreOf = (civ, rc) => PC.score(civ) + (civ.isPlayer ? 0 : (regionsOf(civ, rc) - PC.playerRegionCount()) * 10);
  PC.scoreRanking = function () {
    const rc = PC.regionControl();
    return G().civs.filter((c) => c.alive && !c.external).map((c) => ({ civ: c, score: PC.scoreOf(c, rc) })).sort((a, b) => b.score - a.score);
  };

  function checkLegacies() {
    const g = G(), p = PC.player(), v = V();
    PC.LEGACIES.forEach((L) => {
      if (v.legados[L.id]) return;
      let ok = false;
      try { ok = L.check(g, p); } catch (e) { ok = false; }
      if (ok) { v.legados[L.id] = g.year; PC.log(`Legado cumplido: ${L.name}.`, 'history'); }
    });
  }
  PC.checkVictory = function () {
    const g = G(), v = V(), p = PC.player();
    if (!p || !p.alive) return;
    checkLegacies();
    if (v.won || g.gameOver) return;
    const won = PC.victoryProgress().find((o) => o.done);
    if (!won) return;
    v.won = { kind: won.id, year: g.year, turn: g.turn };
    PC.diverge && PC.diverge(`Victoria ${KIND[won.id].toLowerCase()} de ${p.name}.`);
    g.gameOver = { win: true, kind: won.id, text: `${PC.fmtYear(g.year)} · Victoria ${KIND[won.id].toLowerCase()}. ${TEXT[won.id](p)}` };
  };

  // Fotos compactas cada 10 turnos: [turno, año, { civ: [población, casillas, poder, cultura] }]
  PC.HISTORY_MAX = 80;
  PC.snapshot = function () {
    const g = G();
    const row = {};
    g.civs.filter((c) => c.alive && !c.external).forEach((c) => { row[c.id] = [civPop(c), civTiles(c), PC.power(c), Math.round(c.culture)]; });
    g.history = g.history || [];
    const last = g.history[g.history.length - 1];
    if (last && last[0] === g.turn) g.history.pop();
    g.history.push([g.turn, g.year, row]);
    // Al pasar del límite se aclara la serie: se queda una de cada dos fotos (siempre la primera y la última).
    if (g.history.length > PC.HISTORY_MAX) g.history = g.history.filter((h, i, a) => i % 2 === 0 || i === a.length - 1);
  };

  // Registra si el jugador votó en el bando ganador de cada resolución.
  const baseResolve = PC.congressResolve;
  if (baseResolve) {
    PC.congressResolve = function (res, target, playerVote, extra) {
      const cg = G().congress, s = cg ? cg.sessions : 0;
      const out = baseResolve.apply(this, arguments);
      const c2 = G().congress;
      if (playerVote && c2 && c2.sessions > s) {
        const h = c2.history[c2.history.length - 1];
        if (h && (h.pass ? playerVote > 0 : playerVote < 0)) V().votos++;
      }
      return out;
    };
  }

  const baseWorld = PC.worldTick;
  PC.worldTick = function () {
    const g = G(), v = V();
    const before = g.gameOver;
    baseWorld.apply(this, arguments);
    if (g.turn % 10 === 0) PC.snapshot();
    const p = PC.player();
    const endYear = g.gameOver && !before && g.gameOver.win && g.year >= PC.END_YEAR;
    if (endYear) {
      g.gameOver = null;
      if (v.ended) return;   // ya se cerró la crónica: el jugador eligió seguir jugando
      v.ended = true;
      PC.snapshot();
      const rk = PC.scoreRanking();
      const first = rk[0], mine = rk.find((r) => r.civ.isPlayer);
      const pos = rk.indexOf(mine) + 1;
      if (v.won) g.gameOver = { win: true, kind: v.won.kind, text: `Has llegado a ${PC.fmtYear(g.year)}: fin de la crónica, con tu victoria ya escrita.` };
      else if (first && first.civ.isPlayer) g.gameOver = { win: true, kind: 'puntuacion', text: `Has llegado a ${PC.fmtYear(g.year)} con la mayor puntuación (${mine.score}). La crónica te corona.` };
      else g.gameOver = { win: false, kind: 'puntuacion', survived: true, text: `Has llegado a ${PC.fmtYear(g.year)}, pero ${first.civ.name} te supera en puntuación (${first.score} frente a ${mine ? mine.score : 0}). Quedas en el puesto ${pos}.` };
      return;
    }
    if (g.gameOver && !before && !v.over) { v.over = true; PC.snapshot(); }
    PC.checkVictory();
    if (g.gameOver && v.won && v.won.turn === g.turn) PC.snapshot();
  };
})(globalThis.PC = globalThis.PC || {});

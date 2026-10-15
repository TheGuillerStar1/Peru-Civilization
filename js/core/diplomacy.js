// Diplomacia (inspirada en Civilization VII): influencia, tratados, alianzas, guerras formales o sorpresa,
// paz con condiciones según el puntaje de guerra, tributo, vasallaje y anexión por reciprocidad.
(function (PC) {
  'use strict';
  const G = () => PC.G;

  PC.influenceIncome = (civ) => 1 + Math.min(5, Math.floor((civ.lastCult || 0) / 10)) + (civ.bonus.influence || 0) + Math.min(2, PC.civRoutes ? PC.civRoutes(civ.id).length : 0);
  PC.relState = function (a, b) {
    if (PC.atWar(a.id, b.id)) return 'guerra';
    if (b.tributaryOf === a.id) return 'tributario';
    if (a.tributaryOf === b.id) return 'protector';
    if (PC.rel(a, b).ally) return 'alianza';
    return 'paz';
  };
  PC.REL_NAME = { guerra: 'En guerra', alianza: 'Aliados', paz: 'En paz', tributario: 'Tributario tuyo', protector: 'Tu protector' };
  PC.attName = (v) => (v >= 50 ? 'Amistoso' : v >= 20 ? 'Favorable' : v > -20 ? 'Neutral' : v > -50 ? 'Receloso' : 'Hostil');
  PC.isAlly = (a, b) => !!(PC.rel(a, b).ally || PC.civ(b).tributaryOf === a || PC.civ(a).tributaryOf === b);

  const pow = (c) => Math.max(1, PC.power(c));
  const common = (p, ai) => G().civs.filter((x) => x.alive && x.id !== p.id && x.id !== ai.id && PC.atWar(p.id, x.id) && PC.atWar(ai.id, x.id)).length;

  // Cada acción: inf (influencia), gold, why(p, ai) → motivos que la impiden, chance(p, ai) → probabilidad (o null si es segura), run(p, ai) → texto.
  PC.DIPLO_ACTIONS = [
    { id: 'regalo', name: 'Enviar regalos', desc: 'Telas finas, spondylus y metales: mejora su actitud hacia ti.', inf: 15, gold: 25,
      why: (p, ai) => (PC.atWar(p.id, ai.id) ? ['No en plena guerra'] : []),
      run: (p, ai) => { PC.rel(ai, p).att += 15; return `${PC.leaderOf(ai).name} recibe tus regalos con agrado.`; } },
    { id: 'paso', name: 'Pacto de paso libre', desc: 'Tus unidades cruzan su territorio sin ofenderlos, y viceversa.', inf: 20,
      why: (p, ai) => [PC.atWar(p.id, ai.id) && 'No en plena guerra', PC.rel(p, ai).borders && 'Ya tienen el pacto'].filter(Boolean),
      chance: (p, ai) => PC.clamp(0.45 + PC.rel(ai, p).att / 80, 0.05, 0.95),
      run: (p, ai) => { PC.rel(p, ai).borders = PC.rel(ai, p).borders = true; PC.rel(ai, p).att += 5; return `Firman un pacto de paso libre con ${ai.name}.`; } },
    { id: 'alianza', name: 'Proponer una alianza', desc: 'Se defienden mutuamente: si alguien ataca a uno, el otro entra en la guerra.', inf: 50,
      why: (p, ai) => [PC.atWar(p.id, ai.id) && 'No en plena guerra', PC.isAlly(p.id, ai.id) && 'Ya son aliados', PC.rel(ai, p).att < 20 && 'Su actitud debe ser al menos favorable (20)', ai.external && 'Las potencias extranjeras no se alían contigo'].filter(Boolean),
      chance: (p, ai) => PC.clamp(0.25 + (PC.rel(ai, p).att - 20) / 80 + common(p, ai) * 0.2 + (pow(p) > pow(ai) ? 0.1 : -0.1), 0.05, 0.95),
      run: (p, ai) => { PC.rel(p, ai).ally = PC.rel(ai, p).ally = true; PC.rel(ai, p).att += 10; return `Alianza sellada con ${ai.name}.`; } },
    { id: 'romper', name: 'Romper la alianza', desc: 'Dejan de estar obligados a defenderse. Les sentará muy mal.', inf: 0,
      why: (p, ai) => (PC.rel(p, ai).ally ? [] : ['No son aliados']),
      run: (p, ai) => { PC.rel(p, ai).ally = PC.rel(ai, p).ally = false; PC.rel(ai, p).att -= 30; PC.addStabMod(p, 'Alianza rota', -3, 6); return `Rompes la alianza con ${ai.name}.`; } },
    { id: 'denunciar', name: 'Denunciar', desc: 'Condena pública. Prepara una guerra formal (sin penalización tras 3 turnos) y agrada a sus enemigos.', inf: 10,
      why: (p, ai) => [PC.atWar(p.id, ai.id) && 'Ya están en guerra', PC.isAlly(p.id, ai.id) && 'Primero rompe la alianza', (PC.rel(p, ai).denounced && G().turn - PC.rel(p, ai).denounced < 10) && 'Ya los denunciaste hace poco'].filter(Boolean),
      run: (p, ai) => {
        PC.rel(p, ai).denounced = G().turn; PC.rel(ai, p).att -= 25;
        G().civs.forEach((c) => { if (c.alive && c.id !== p.id && c.id !== ai.id && PC.rel(c, ai).att < -10) PC.rel(c, p).att += 8; });
        return `Denuncias públicamente a ${ai.name}.`;
      } },
    { id: 'tributo', name: 'Exigir tributo', desc: 'Si eres mucho más fuerte, pagan oro. Si no, se ofenden.', inf: 5,
      why: (p, ai) => [PC.atWar(p.id, ai.id) && 'No en plena guerra', PC.isAlly(p.id, ai.id) && 'No a un aliado', pow(p) < pow(ai) * 1.5 && 'Necesitas al menos 1,5 veces su poder'].filter(Boolean),
      chance: (p, ai) => PC.clamp((pow(p) / pow(ai) - 1.5) / 2 + 0.3, 0.05, 0.9),
      run: (p, ai) => { const amt = Math.min(Math.max(0, Math.floor(ai.gold)), 30 + PC.eraOf(ai) * 20); ai.gold -= amt; p.gold += amt; PC.rel(ai, p).att -= 20; return `${ai.name} paga ${amt} de oro como tributo.`; },
      fail: (p, ai) => { PC.rel(ai, p).att -= 10; return `${PC.leaderOf(ai).name} se niega a pagar tributo.`; } },
    { id: 'vasallaje', name: 'Ofrecer protección', desc: 'El señorío se vuelve tributario: te paga oro cada turno y lucha a tu lado.', inf: 60,
      why: (p, ai) => [PC.atWar(p.id, ai.id) && 'No en plena guerra', ai.external && 'No con potencias extranjeras', PC.civCities(ai).length > 2 && 'Solo con señoríos de 1 o 2 ciudades',
        pow(p) < pow(ai) * 2 && 'Necesitas el doble de su poder', ai.tributaryOf && 'Ya es tributario de alguien', PC.rel(ai, p).att < 0 && 'Su actitud no puede ser negativa'].filter(Boolean),
      chance: (p, ai) => PC.clamp(0.35 + PC.rel(ai, p).att / 100 + (pow(p) / pow(ai) - 2) * 0.1, 0.1, 0.9),
      run: (p, ai) => { ai.tributaryOf = p.id; PC.rel(p, ai).ally = PC.rel(ai, p).ally = true; return `${ai.name} acepta tu protección y se vuelve tributario.`; } },
    { id: 'anexar', name: 'Anexar por reciprocidad', desc: 'Regalos y banquetes: el señorío se incorpora pacíficamente a tu estado.', inf: 40,
      why: (p, ai) => PC.annexIssues(p, ai),
      run: (p, ai) => { PC.annex(p, ai); return `${ai.name} se incorpora a ${p.name}.`; } },
    { id: 'guerra', name: 'Declarar la guerra', desc: 'Formal si los denunciaste hace 3 turnos o más; si no, es una guerra sorpresa: −8 de cohesión y todos desconfían de ti.', inf: 0,
      why: (p, ai) => [PC.atWar(p.id, ai.id) && 'Ya están en guerra', PC.isAlly(p.id, ai.id) && 'Primero rompe la alianza o el vasallaje'].filter(Boolean),
      run: (p, ai) => {
        const d = PC.rel(p, ai).denounced;
        const formal = d && G().turn - d >= 3;
        PC.declareWar(p, ai);
        if (!formal) {
          PC.addStabMod(p, 'Guerra sorpresa', -8, 10);
          G().civs.forEach((c) => { if (c.alive && c.id !== p.id && c.id !== ai.id) PC.rel(c, p).att -= 10; });
          return `Guerra sorpresa contra ${ai.name}. Los demás pueblos desconfían de ti.`;
        }
        return `Declaras formalmente la guerra a ${ai.name}.`;
      } },
    { id: 'paz', name: 'Proponer la paz', desc: 'Paz sin condiciones.', inf: 10,
      why: (p, ai) => [!PC.atWar(p.id, ai.id) && 'No están en guerra', (ai.key === 'espana' && G().flags.espanaGuerra && !G().flags.coronaDesiste) && 'La Corona no negocia mientras dure la conquista'].filter(Boolean),
      chance: (p, ai) => PC.peaceChance(p, ai),
      run: (p, ai) => { PC.makePeace(p, ai); return `Paz con ${ai.name}.`; },
      fail: (p, ai) => { PC.rel(p, ai).since = G().turn - 2; return `${PC.leaderOf(ai).name} rechaza la paz.`; } },
    { id: 'paz_oro', name: 'Paz con reparaciones', desc: 'Vas ganando: exige oro a cambio de la paz (puntaje de guerra 20 o más).', inf: 15,
      why: (p, ai) => [!PC.atWar(p.id, ai.id) && 'No están en guerra', (PC.rel(p, ai).warScore || 0) < 20 && 'Necesitas un puntaje de guerra de 20 o más', (ai.key === 'espana' && G().flags.espanaGuerra && !G().flags.coronaDesiste) && 'La Corona no negocia'].filter(Boolean),
      chance: (p, ai) => PC.clamp(0.3 + ((PC.rel(p, ai).warScore || 0) - 20) / 60, 0.1, 0.95),
      run: (p, ai) => { const amt = Math.min(Math.max(0, Math.floor(ai.gold)), 60 + PC.eraOf(ai) * 30); ai.gold -= amt; p.gold += amt; PC.makePeace(p, ai); PC.rel(ai, p).att -= 15; return `${ai.name} paga ${amt} de oro de reparaciones y firma la paz.`; },
      fail: (p, ai) => `${PC.leaderOf(ai).name} rechaza pagar reparaciones.` },
    { id: 'paz_ciudad', name: 'Paz a cambio de una ciudad', desc: 'Victoria clara: exige su ciudad más cercana a tu territorio (puntaje de guerra 45 o más).', inf: 25,
      why: (p, ai) => [!PC.atWar(p.id, ai.id) && 'No están en guerra', (PC.rel(p, ai).warScore || 0) < 45 && 'Necesitas un puntaje de guerra de 45 o más', PC.civCities(ai).length < 2 && 'Les queda una sola ciudad: tómala por las armas', (ai.key === 'espana' && G().flags.espanaGuerra && !G().flags.coronaDesiste) && 'La Corona no negocia'].filter(Boolean),
      chance: (p, ai) => PC.clamp(0.25 + ((PC.rel(p, ai).warScore || 0) - 45) / 60, 0.1, 0.9),
      run: (p, ai) => {
        const mine = PC.civCities(p);
        const c = PC.civCities(ai).filter((x) => x.id !== ai.capitalId).sort((a, b) => Math.min(...mine.map((m) => PC.dist(PC.tile(m.t), PC.tile(a.t)))) - Math.min(...mine.map((m) => PC.dist(PC.tile(m.t), PC.tile(b.t)))))[0];
        PC.makePeace(p, ai);
        if (c) { c.civ = p.id; c.conquered = true; PC.tilesWithin(PC.tile(c.t), 2).forEach((t) => { if (t.owner === ai.id) t.owner = p.id; }); G().units = G().units.filter((u) => !(u.t === c.t && u.civ === ai.id)); }
        PC.rel(ai, p).att -= 25;
        return c ? `${ai.name} cede ${c.name} y firma la paz.` : `Paz con ${ai.name}.`;
      },
      fail: (p, ai) => `${PC.leaderOf(ai).name} prefiere seguir luchando antes que ceder una ciudad.` }
  ];
  PC.DIPLO = {};
  PC.DIPLO_ACTIONS.forEach((a) => { PC.DIPLO[a.id] = a; });
  PC.diploIssues = function (p, ai, id) {
    const a = PC.DIPLO[id];
    const r = a.why(p, ai).slice();
    if ((p.influence || 0) < a.inf) r.push(`Necesitas ${a.inf} de influencia`);
    if (a.gold && p.gold < a.gold) r.push(`Necesitas ${a.gold} de oro`);
    return r;
  };
  PC.diploDo = function (p, ai, id) {
    const a = PC.DIPLO[id];
    if (PC.diploIssues(p, ai, id).length) return { ok: false, text: '' };
    p.influence -= a.inf; if (a.gold) p.gold -= a.gold;
    const ch = a.chance ? a.chance(p, ai) : 1;
    if (PC.chance(ch)) { const text = a.run(p, ai); PC.log(text, 'event', [p.id, ai.id]); return { ok: true, text }; }
    const text = a.fail ? a.fail(p, ai) : `${PC.leaderOf(ai).name} rechaza tu propuesta.`;
    PC.log(text, 'event', [p.id]);
    return { ok: false, text };
  };

  // --- Paz y anexión (también usadas por otros módulos)
  PC.peaceChance = function (player, ai) {
    if (ai.external && G().flags.espanaGuerra && ai.key === 'espana' && !G().flags.coronaDesiste) return 0;
    if (!PC.atWar(player.id, ai.id)) return 0;
    const ratio = PC.power(player) / Math.max(1, PC.power(ai));
    const turns = G().turn - PC.rel(player, ai).since;
    const score = (PC.rel(player, ai).warScore || 0) / 100;
    return PC.clamp(0.15 + (ratio - 1) * 0.3 + turns * 0.02 + score, 0, 0.95);
  };
  PC.proposePeace = function (player, ai) { return PC.diploDo(player, ai, 'paz').ok; };
  PC.annexCost = function (player, ai) {
    const cities = PC.civCities(ai);
    return Math.round(cities.reduce((s, c) => s + 30 + c.pop * 15, 0) * (1 + PC.eraOf(ai) * 0.25));
  };
  PC.annexIssues = function (player, ai) {
    const out = [];
    if (ai.external) out.push('No se puede anexar a una potencia extranjera');
    if (PC.atWar(player.id, ai.id)) out.push('Están en guerra');
    if (PC.civCities(ai).length > 3) out.push('Tiene más de 3 ciudades');
    if (PC.power(player) < PC.power(ai) * 2.5) out.push('Necesitas 2,5 veces su poder militar');
    if (player.culture < ai.culture) out.push('Necesitas más cultura que ellos');
    if (PC.rel(ai, player).att < -20) out.push('Su actitud hacia ti es hostil');
    if (player.gold < PC.annexCost(player, ai)) out.push(`Necesitas ${PC.annexCost(player, ai)} de oro para los regalos`);
    return out;
  };
  PC.annex = function (player, ai) {
    if (PC.annexIssues(player, ai).length) return false;
    const g = G();
    player.gold -= PC.annexCost(player, ai);
    PC.civCities(ai).forEach((c) => { c.civ = player.id; c.conquered = false; });
    g.map.tiles.forEach((t) => { if (t && t.owner === ai.id) t.owner = player.id; });
    g.units.forEach((u) => { if (u.civ === ai.id) u.civ = player.id; });
    ai.alive = false;
    PC.log(`${ai.name} se incorpora pacíficamente a ${player.name} mediante la reciprocidad andina.`, 'history');
    PC.addStabMod(player, 'Incorporación pacífica', 4, 10);
    PC.updateVisibility();
    return true;
  };

  // --- Las alianzas arrastran a la guerra
  PC.onWarDeclared = function (a, b) {
    const g = G();
    PC.rel(a, b).ally = PC.rel(b, a).ally = false;
    if (b.tributaryOf === a.id) b.tributaryOf = null;
    if (a.tributaryOf === b.id) a.tributaryOf = null;
    g.civs.forEach((c) => {
      if (!c.alive || c.id === a.id || c.id === b.id) return;
      // Aliados y tributarios del atacado
      if (PC.isAlly(b.id, c.id) && !PC.atWar(c.id, a.id)) {
        if (c.isPlayer) { if (PC.queueEvent) PC.queueEvent('llamada_aliado', { ally: b.id, enemy: a.id }); }
        else if (!PC.isAlly(c.id, a.id)) PC.declareWar(c, a);
      }
      // Tributarios del atacante lo siguen
      if (c.tributaryOf === a.id && !PC.atWar(c.id, b.id) && !c.isPlayer) PC.declareWar(c, b, true);
    });
  };

  // --- Tic diplomático: influencia, tributos, agendas y propuestas de la IA
  PC.diplomacyTick = function () {
    const g = G();
    const p = PC.player();
    g.civs.forEach((c) => {
      if (!c.alive) return;
      c.influence = (c.influence || 0) + PC.influenceIncome(c);
      if (c.tributaryOf) {
        const lord = PC.civ(c.tributaryOf);
        if (!lord || !lord.alive) c.tributaryOf = null;
        else { const amt = 2 + PC.eraOf(c); c.gold -= amt; lord.gold += amt; }
      }
    });
    if (!p || !p.alive) return;
    const pCities = PC.civCities(p).length;
    const pWars = g.civs.filter((o) => o.alive && PC.atWar(p.id, o.id)).length;
    const myTiles = new Set(g.map.tiles.filter((t) => t && t.owner === p.id).map((t) => t.i));
    g.civs.forEach((ai) => {
      if (!ai.alive || ai.isPlayer || ai.external) return;
      const r = PC.rel(ai, p);
      const ag = PC.leaderOf(ai).agenda;
      let d = 0;
      if (ag === 'conquistador') d += pow(p) > pow(ai) * 1.5 ? 0.3 : pow(p) < pow(ai) * 0.7 ? -0.5 : 0;
      if (ag === 'pacifico') d += pWars ? -0.4 * pWars : 0.25;
      if (ag === 'mercader') d += (g.routes || []).some((x) => (x.a === p.id && x.b === ai.id) || (x.b === p.id && x.a === ai.id)) ? 0.5 : -0.15;
      if (ag === 'devoto') d += p.culture > ai.culture ? 0.35 : -0.1;
      if (ag === 'expansionista') d += pCities > PC.civCities(ai).length + 2 ? -0.3 : 0.1;
      if (ag === 'explorador') d += r.borders ? 0.35 : -0.05;
      // Intrusión: tropas del jugador en su territorio sin pacto de paso
      if (!r.borders && !PC.atWar(ai.id, p.id)) {
        const intr = g.units.filter((u) => u.civ === p.id && PC.isMil(u) && PC.tile(u.t).owner === ai.id).length;
        d -= Math.min(3, intr);
      }
      if (r.ally) d += 0.3;
      r.att = PC.clamp(r.att + d, -100, 100);
      // Propuestas de la IA
      if (!PC.atWar(ai.id, p.id)) {
        if (!PC.isAlly(ai.id, p.id) && r.att > 45 && PC.chance(0.03)) PC.queueEvent('propuesta_alianza', { from: ai.id });
        else if (ag === 'conquistador' && r.att < -10 && pow(ai) > pow(p) * 1.8 && PC.chance(0.025)) PC.queueEvent('exigencia_tributo', { from: ai.id });
        if (r.att < -45 && !r.denounced) { r.denounced = g.turn; PC.log(`${PC.leaderOf(ai).name} (${ai.name}) te denuncia públicamente.`, 'war', [p.id]); }
      }
    });
    // Alianzas y rutas entre facciones IA
    const ais = g.civs.filter((c) => c.alive && !c.isPlayer && !c.external);
    if (PC.chance(0.15)) {
      const a = PC.pick(ais), b = PC.pick(ais);
      if (a && b && a !== b && !PC.atWar(a.id, b.id) && !PC.isAlly(a.id, b.id) && PC.rel(a, b).att > 35 && PC.rel(b, a).att > 35) {
        PC.rel(a, b).ally = PC.rel(b, a).ally = true;
        PC.log(`${a.name} y ${b.name} sellan una alianza.`, 'war');
      }
      if (a && b && a !== b && PC.leaderOf(a).agenda === 'mercader' && !PC.atWar(a.id, b.id) && PC.civRoutes(a.id).length < PC.maxRoutes(a)) {
        const ca = PC.civCities(a)[0], cb = PC.civCities(b)[0];
        if (ca && cb && PC.dist(PC.tile(ca.t), PC.tile(cb.t)) <= 8) { g.routes = g.routes || []; g.routes.push({ from: ca.id, to: cb.id, a: a.id, b: b.id, turn: g.turn }); PC.rel(a, b).att += 10; PC.rel(b, a).att += 10; }
      }
    }
    // Rutas cuyas ciudades cambiaron de dueño o desaparecieron
    if (g.routes) g.routes = g.routes.filter((r) => { const f = PC.cityById(r.from), t = PC.cityById(r.to); return f && t && f.civ !== t.civ && !PC.atWar(f.civ, t.civ); });
  };
})(globalThis.PC = globalThis.PC || {});

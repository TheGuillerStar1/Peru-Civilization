// Diplomacia del jugador: guerra, paz y anexión por reciprocidad (el método inca de incorporar señoríos).
(function (PC) {
  'use strict';

  PC.peaceChance = function (player, ai) {
    if (ai.external && PC.G.flags.espanaGuerra && ai.key === 'espana' && !PC.G.flags.coronaDesiste) return 0;
    if (!PC.atWar(player.id, ai.id)) return 0;
    const ratio = PC.power(player) / Math.max(1, PC.power(ai));
    const turns = PC.G.turn - PC.rel(player, ai).since;
    return PC.clamp(0.15 + (ratio - 1) * 0.35 + turns * 0.02, 0, 0.95);
  };
  PC.proposePeace = function (player, ai) {
    const p = PC.peaceChance(player, ai);
    if (PC.chance(p)) { PC.makePeace(player, ai); return true; }
    PC.rel(player, ai).since = PC.G.turn - 2; // evita insistir cada turno
    PC.log(`${ai.name} rechaza la paz.`, 'war');
    return false;
  };
  PC.annexCost = function (player, ai) {
    const cities = PC.civCities(ai);
    return Math.round(cities.reduce((s, c) => s + 30 + c.pop * 15, 0) * (1 + PC.eraOf(ai) * 0.25));
  };
  PC.annexIssues = function (player, ai) {
    const out = [];
    if (ai.external) out.push('No se puede anexar a una potencia extranjera');
    if (PC.atWar(player.id, ai.id)) out.push('Están en guerra');
    if (PC.civCities(ai).length > 3) out.push('Tiene más de 3 ciudades');
    if (PC.power(player) < PC.power(ai) * 2.5) out.push('Necesitas 2,5× su poder militar');
    if (player.culture < ai.culture) out.push('Necesitas más cultura que ellos');
    if (PC.rel(ai, player).att < -20) out.push('Su actitud hacia ti es hostil');
    if (player.gold < PC.annexCost(player, ai)) out.push(`Necesitas ${PC.annexCost(player, ai)} de oro para los regalos`);
    return out;
  };
  PC.annex = function (player, ai) {
    if (PC.annexIssues(player, ai).length) return false;
    const g = PC.G;
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
})(globalThis.PC = globalThis.PC || {});

// Grandes proyectos de ciudad: convierten oro en cohesión, producción, crecimiento o investigación.
// El coste y el efecto suben con la era, así que el oro acumulado siempre tiene un uso.
(function (PC) {
  'use strict';
  const G = () => PC.G;
  const COOLDOWN = 6; // turnos entre dos proyectos iguales en la misma ciudad

  PC.PROJECTS = {
    inti_raymi: { name: 'Inti Raymi', icon: 'cohesion', base: 60, desc: 'Gran fiesta del Sol: +cohesión durante 8 turnos y cultura en la ciudad',
      run: (city, civ, era) => {
        civ.stabMods = civ.stabMods.filter((m) => m.name !== 'Inti Raymi');
        PC.addStabMod(civ, 'Inti Raymi', 6, 8);
        const c = 10 + era * 6; city.culture += c; civ.culture += c;
        return `+6 cohesión y +${c} cultura`;
      } },
    obras_publicas: { name: 'Obras públicas', icon: 'produccion', base: 50, desc: 'Mit\'a de caminos, canales y depósitos: producción y alimento',
      run: (city, civ, era) => {
        const p = 20 + era * 12, f = 10 + era * 4;
        // En las maravillas rinde la mitad: no sustituye a la compra.
        city.prod += city.build && city.build.kind === 'wonder' ? Math.round(p / 2) : p; city.food += f;
        return `+${p} producción y +${f} alimento`;
      } },
    mision_cientifica: { name: 'Misión científica', icon: 'ciencia', base: 60, desc: 'Sabios, quipucamayoc y viajeros: progreso en la investigación',
      run: (city, civ, era) => { const s = 30 + era * 22; civ.progress += s; return `+${s} investigación`; } }
  };
  PC.projectCost = (civ, id) => Math.round(PC.PROJECTS[id].base * (1 + PC.eraOf(civ) * 0.75));

  // Opciones de una ciudad con su coste y si están disponibles.
  PC.projectOptions = function (city) {
    const civ = PC.civ(city.civ), g = G();
    const cd = city.projects || {};
    return Object.keys(PC.PROJECTS).map((id) => {
      const P = PC.PROJECTS[id], cost = PC.projectCost(civ, id);
      const wait = Math.max(0, (cd[id] || 0) - g.turn);
      return { id, name: P.name, icon: P.icon, desc: P.desc, cost, wait, ok: !wait && civ.gold >= cost };
    });
  };
  PC.startProject = function (city, id) {
    const g = G(), civ = PC.civ(city.civ);
    const o = PC.projectOptions(city).find((x) => x.id === id);
    if (!o || !o.ok) return null;
    civ.gold -= o.cost;
    city.projects = Object.assign({}, city.projects, { [id]: g.turn + COOLDOWN });
    const res = PC.PROJECTS[id].run(city, civ, PC.eraOf(civ));
    g.projStats = g.projStats || {};
    if (civ.isPlayer) g.projStats[id] = (g.projStats[id] || 0) + 1;
    if (civ.isPlayer) PC.log(`${city.name} celebra ${o.name}: ${res}.`, 'city', [civ.id]);
    return res;
  };

  // La IA y el piloto automático gastan el oro sobrante (guardan una reserva para comprar y modernizar).
  PC.aiProjects = function (civ) {
    if (!civ.alive || civ.external || civ.gold <= 0) return;
    const cities = PC.civCities(civ).slice().sort((a, b) => b.pop - a.pop);
    let done = 0;
    for (const city of cities) {
      if (done >= 2) break;
      const opts = PC.projectOptions(city).filter((o) => o.ok && civ.gold > o.cost * 3 + 120);
      if (!opts.length) continue;
      const pref = civ.stability < 65 ? 'inti_raymi' : city.build && city.build.kind !== 'riqueza' ? 'obras_publicas' : 'mision_cientifica';
      const o = opts.find((x) => x.id === pref) || opts.find((x) => x.id !== 'inti_raymi') || opts[0];
      if (PC.startProject(city, o.id)) done++;
    }
  };
  const baseProcess = PC.processCiv;
  PC.processCiv = function (civ) {
    baseProcess(civ);
    if (civ.alive && (!civ.isPlayer || G().autoplay)) PC.aiProjects(civ);
  };
})(globalThis.PC = globalThis.PC || {});

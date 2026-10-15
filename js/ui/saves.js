// Ranuras de guardado: 3 manuales y 2 automáticas rotativas en este navegador.
// Cada ranura guarda la partida en su propia clave y un índice ligero con año, fase y civilización.
(function (PC) {
  'use strict';
  const LEGACY = 'peru-civ-save'; // clave de la versión anterior (una sola partida)
  const INDEX = 'peru-civ-ranuras';
  const MANUAL = ['m1', 'm2', 'm3'], AUTO = ['a1', 'a2'];
  const keyOf = (slot) => (slot === 'legado' ? LEGACY : 'peru-civ-ranura-' + slot);
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }
  };
  const readIndex = () => { try { return JSON.parse(ls.get(INDEX)) || {}; } catch (e) { return {}; } };
  // Resumen de una partida (de PC.G o de su JSON ya leído).
  function metaOf(d) {
    const pc = (d.civs || []).find((c) => c.isPlayer) || {};
    const ph = (PC.PHASES || []).find((p) => p.id === d.phase);
    return { civ: pc.name || '', year: d.year, turn: d.turn, phase: ph ? ph.name : '', difficulty: d.difficulty || '', time: Date.now() };
  }
  const S = PC.Saves = { MANUAL, AUTO };
  S.label = (slot) => (slot === 'legado' ? 'Partida anterior' : MANUAL.includes(slot) ? 'Ranura ' + slot.slice(1) : 'Automática ' + slot.slice(1));
  // Lista de ranuras con su resumen (la clave antigua se lee una vez para mostrarla).
  S.list = function () {
    const idx = readIndex();
    const out = MANUAL.concat(AUTO).map((slot) => ({ slot, auto: AUTO.includes(slot), meta: ls.get(keyOf(slot)) ? idx[slot] || null : null }));
    if (!idx.legadoVisto) {
      const raw = ls.get(LEGACY);
      if (raw) { try { idx.legado = Object.assign(metaOf(JSON.parse(raw)), { time: 0 }); } catch (e) { idx.legado = null; } }
      idx.legadoVisto = true; ls.set(INDEX, JSON.stringify(idx));
    }
    if (idx.legado && ls.get(LEGACY)) out.push({ slot: 'legado', auto: false, legacy: true, meta: idx.legado });
    return out;
  };
  S.get = (slot) => ls.get(keyOf(slot));
  S.save = function (slot, json) {
    json = json || PC.serialize();
    let ok = ls.set(keyOf(slot), json);
    // Si no cabe, se sacrifica la automática más vieja y se intenta otra vez.
    if (!ok) { const old = S.oldestAuto(slot); if (old) { ls.del(keyOf(old)); ok = ls.set(keyOf(slot), json); } }
    if (!ok) return false;
    const idx = readIndex();
    idx[slot] = metaOf(PC.G);
    ls.set(INDEX, JSON.stringify(idx));
    return true;
  };
  S.oldestAuto = function (except) {
    const idx = readIndex();
    return AUTO.filter((s) => s !== except && ls.get(keyOf(s))).sort((a, b) => (idx[a] || {}).time - (idx[b] || {}).time)[0] || null;
  };
  // Guardado automático rotativo: escribe sobre la ranura automática más antigua.
  S.autosave = function (json) {
    const idx = readIndex();
    const slot = AUTO.slice().sort((a, b) => ((ls.get(keyOf(a)) && idx[a]) ? idx[a].time : -1) - ((ls.get(keyOf(b)) && idx[b]) ? idx[b].time : -1))[0];
    return S.save(slot, json);
  };
  // La partida más reciente (para «Continuar»).
  S.latest = function () {
    const xs = S.list().filter((x) => x.meta).sort((a, b) => b.meta.time - a.meta.time);
    return xs[0] || null;
  };
  // Botones de las ranuras para la pantalla «Cargar partida» y el diálogo de guardar.
  S.html = function (esc, mode) {
    const items = S.list().filter((x) => (mode === 'save' ? !x.auto && !x.legacy : x.meta));
    if (!items.length) return '';
    return `<div class="slots">${items.map((x) => {
      const m = x.meta;
      const when = m && m.time ? new Date(m.time).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '';
      const info = m ? `${esc(m.civ)} · ${PC.fmtYear(m.year)} · turno ${m.turn}${m.phase ? ' · ' + esc(m.phase) : ''}` : 'Vacía';
      return `<button type="button" class="mm slot${x.auto ? ' auto' : ''}" data-${mode === 'save' ? 'saveslot' : 'loadslot'}="${x.slot}">
        <b>${esc(S.label(x.slot))}${when ? `<em>${esc(when)}</em>` : ''}</b><small>${info}</small></button>`;
    }).join('')}</div>`;
  };
})(globalThis.PC = globalThis.PC || {});

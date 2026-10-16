// Lista de pendientes del turno (P0.1): filas accionables sobre el botón de fin de turno.
// Cada fila lleva al sitio donde se resuelve (investigación, ciudad, unidad, amenaza o consejo)
// y desaparece sola cuando el pendiente se resuelve. Nada de aquí bloquea el turno: solo informa.
// API pública: UI.tasks = { el, render }; render() devuelve el número de pendientes.
(function (PC) {
  'use strict';
  const UI = PC.UI, R = PC.R;
  const T = UI.tasks = { el: null, render: () => 0 };
  const MAX_CIUDADES = 4;   // filas de ciudad visibles antes de «y N más…»
  const MAX_AMENAZAS = 2;   // filas de amenaza visibles
  const MAX_CONSEJO = 90;   // caracteres del consejo en la fila

  // Escapado propio: no depende de que ui.js esté cargado (equivale a UI.esc).
  const esc = (s) => (UI.esc ? UI.esc(s) : String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  // Texto plano de un fragmento con etiquetas: quita el marcado y devuelve las entidades a su carácter.
  function plano(html) {
    return String(html == null ? '' : html)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ').trim();
  }
  function recorta(txt, max) {
    if (txt.length <= max) return txt;
    return txt.slice(0, max - 1).replace(/\s+\S*$/, '').trim() + '…';
  }

  // Reúne los pendientes en el orden pedido. Solo consulta el motor; nunca lo modifica.
  function collect() {
    const g = PC.G, p = PC.player ? PC.player() : null;
    const out = { filas: [], amenazas: [], n: 0 };
    if (!g || !p) return out;

    // 1. Investigación sin elegir.
    let techs = [];
    try { techs = PC.availableTechs(p) || []; } catch (e) { techs = []; }
    if (!p.research && techs.length) {
      out.filas.push(`<li class="task"><span class="task-ico">${PC.icon('tecnologia')}</span>` +
        `<button type="button" class="task-go" data-task="research"><b>Elegir investigación</b><em>Elegir</em></button></li>`);
      out.n++;
    }

    // 2. Ciudades sin producción.
    let ciudades = [];
    try { ciudades = (PC.civCities(p) || []).filter((c) => !c.build); } catch (e) { ciudades = []; }
    ciudades.slice(0, MAX_CIUDADES).forEach((c) => {
      out.filas.push(`<li class="task"><span class="task-ico">${PC.icon('produccion')}</span>` +
        `<button type="button" class="task-go" data-task="city" data-city="${esc(c.id)}"><b>«${esc(c.name)}» necesita producción</b><em>Abrir</em></button></li>`);
      out.n++;
    });
    if (ciudades.length > MAX_CIUDADES) out.filas.push(`<div class="task-more">y ${ciudades.length - MAX_CIUDADES} más…</div>`);

    // 3. Unidades sin órdenes: una sola fila con el recuento; el botón cicla con UI.nextUnit().
    let sinOrdenes = [];
    try { sinOrdenes = UI.needsOrders ? (PC.civUnits(p) || []).filter(UI.needsOrders) : []; } catch (e) { sinOrdenes = []; }
    if (sinOrdenes.length) {
      const texto = sinOrdenes.length === 1 ? '1 unidad espera órdenes' : sinOrdenes.length + ' unidades esperan órdenes';
      out.filas.push(`<li class="task"><span class="task-ico">${PC.icon('movimiento')}</span>` +
        `<button type="button" class="task-go" data-task="idle"><b>${texto}</b><em>Siguiente</em></button></li>`);
      out.n++;
    }

    // 4. Amenazas cerca de nuestras ciudades (las publica advisor.js; si no está, no hay filas).
    let amenazas = [];
    try { amenazas = UI.threats ? (UI.threats() || []) : []; } catch (e) { amenazas = []; }
    out.amenazas = amenazas;
    amenazas.slice(0, MAX_AMENAZAS).forEach((th, i) => {
      if (!th || !th.city || !th.civ) return;
      const enemigos = (th.foes && th.foes.length) || 0;
      const quien = enemigos === 1 ? '1 unidad' : enemigos + ' unidades';
      out.filas.push(`<li class="task war"><span class="task-ico">${PC.icon('alerta')}</span>` +
        `<button type="button" class="task-go" data-task="threat" data-i="${i}"><b>${quien} de ${esc(th.civ.name)} cerca de ${esc(th.city.name)}</b><em>Ver</em></button></li>`);
      out.n++;
    });

    // 5. Consejo vigente (P0.2). Solo los consejos con identificador: las amenazas ya tienen su fila
    // arriba y no deben salir duplicadas. Si el consejero no está cargado, no hay fila.
    let consejo = null;
    try { consejo = (UI.advisor && UI.advisor.peek) ? UI.advisor.peek() : null; } catch (e) { consejo = null; }
    const dicho = consejo && consejo.id ? recorta(plano(consejo.html), MAX_CONSEJO) : '';
    if (dicho) {
      out.filas.push(`<li class="task advice"><span class="task-ico">${PC.icon('cronica')}</span>` +
        `<button type="button" class="task-go" data-task="advice"><b>${esc(dicho)}</b><em>Ir</em></button></li>`);
      out.n++;
    }
    return out;
  }

  // Crea #tasks si el documento no lo trae (otra sesión puede reescribir index.html).
  function mount() {
    T.el = document.querySelector('#tasks');
    if (T.el) return T.el;
    const endbar = document.querySelector('.endbar');
    const side = document.querySelector('#side');
    const hijo = document.createElement('div');
    hijo.id = 'tasks';
    hijo.hidden = true;
    if (endbar && endbar.insertBefore) endbar.insertBefore(hijo, endbar.firstChild || null);
    else if (side && side.appendChild) side.appendChild(hijo);
    else return null;
    T.el = document.querySelector('#tasks');
    return T.el;
  }

  function oculto() {
    const hud = document.querySelector('#hud');
    return !PC.G || PC.G.preview || PC.G.gameOver || !!UI.modal || !hud || !!hud.hidden;
  }

  // Escribe #tasks y #end-status, ajusta #btn-end.waiting y devuelve el número de pendientes.
  function render() {
    try {
      const el = T.el || mount();
      const status = document.querySelector('#end-status');
      const boton = document.querySelector('#btn-end');
      // Sin partida jugable no se muestra nada y no hay pendientes que anunciar.
      if (!el || oculto()) {
        if (el) el.hidden = true;
        if (boton) boton.classList.remove('waiting');
        return 0;
      }
      bind(); // por si el documento se reconstruyó y #tasks es un nodo nuevo
      const info = collect();
      if (!info.filas.length) {
        el.hidden = true;
        el.innerHTML = '';
        if (status) status.textContent = 'Todo listo.';
        if (boton) boton.classList.remove('waiting');
        return 0;
      }
      el.innerHTML = `<div class="task-head"><b>Lo que falta este turno</b><span class="task-count">${info.n}</span></div>` +
        `<ul class="task-list">${info.filas.join('')}</ul>`;
      el.hidden = false;
      if (status) status.textContent = info.n === 1 ? 'Falta 1 cosa.' : `Faltan ${info.n} cosas.`;
      if (boton) boton.classList.toggle('waiting', true);
      T.amenazas = info.amenazas;
      return info.n;
    } catch (e) {
      // Ante cualquier duda, la lista se aparta: el botón de fin de turno sigue funcionando.
      try { if (T.el) T.el.hidden = true; } catch (e2) { /* nada que hacer */ }
      return 0;
    }
  }
  T.render = render;
  T.amenazas = [];

  // Un solo escucha delegado: lee data-task y el dataset del botón pulsado.
  function bind() {
    const el = T.el || mount();
    if (!el || T.bound) return;
    T.bound = true;
    el.addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('[data-task]') : null;
      if (!b) return;
      const d = b.dataset || {};
      if (d.task === 'research') {
        const nav = document.querySelector('[data-modal="techs"]');
        if (nav && nav.click) nav.click();
        else if (UI.openTechs) UI.openTechs();
      } else if (d.task === 'city') {
        const c = PC.cityById ? (PC.cityById(+d.city) || PC.cityById(d.city)) : null;
        if (c) { if (R.centerOn) R.centerOn(PC.tile(c.t)); if (UI.selectCity) UI.selectCity(c.id); }
      } else if (d.task === 'idle') {
        if (UI.nextUnit) UI.nextUnit();
      } else if (d.task === 'threat') {
        const th = T.amenazas[+d.i];
        if (th && th.tile && R.centerOn) R.centerOn(th.tile);
      } else if (d.task === 'advice') {
        const av = (UI.advisor && UI.advisor.peek) ? UI.advisor.peek() : null;
        if (av && av.tile && R.centerOn) R.centerOn(av.tile);
      }
      render();
    });
  }

  // Eventos: 'refresh' se emite después de renderTop(), así que el texto corto de #end-status queda a nuestro favor.
  UI.on('refresh', render);
  UI.on('turn', render);
  UI.on('start', () => { render(); bind(); });
  UI.on('menu', render);
  window.addEventListener('DOMContentLoaded', () => {
    mount();
    bind();
    UI.addOption('pendientes', 'Lista de pendientes del turno sobre el botón Terminar turno', true, render);
    render();
  });
})(globalThis.PC = globalThis.PC || {});

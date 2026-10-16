// Botón «Novedades» del menú: abre el registro de versiones y parches (PC.CHANGELOG).
// Marca con «Nuevo» la versión que el jugador aún no ha visto (se recuerda en el navegador).
(function (PC) {
  'use strict';
  const UI = PC.UI, KEY = 'pc_novedades_vista';
  const seen = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const mark = () => { try { localStorage.setItem(KEY, PC.VERSION); } catch (e) { /* sin almacenamiento */ } };

  function shots(e) {
    if (!e.capturas) return '';
    return '<div class="news-shots">' + e.capturas.map(([src, pie]) =>
      `<figure><img src="${UI.esc(src)}" alt="${UI.esc(pie)}"><figcaption class="small muted">${UI.esc(pie)}</figcaption></figure>`).join('') + '</div>';
  }
  function html() {
    const esc = UI.esc;
    return '<h2>Novedades</h2><div class="news">' + PC.CHANGELOG.map((e) =>
      `<section class="news-item"><h3>v${esc(e.v)} · ${esc(e.titulo)} <small class="muted">${e.tipo === 'parche' ? 'Parche' : 'Versión'} · ${esc(e.fecha)}</small></h3><ul>` +
      e.cambios.map((c) => `<li>${esc(c)}</li>`).join('') + '</ul>' + shots(e) + '</section>').join('') + '</div>';
  }
  function open() { UI.openModal(html(), 'info'); mark(); const b = document.querySelector('#btn-news .nuevo'); if (b) b.remove(); }

  document.addEventListener('DOMContentLoaded', () => {
    const b = document.querySelector('#btn-news'); if (!b) return;
    if (seen() !== PC.VERSION) b.querySelector('b').insertAdjacentHTML('beforeend', ' <span class="nuevo">Nuevo</span>');
    b.addEventListener('click', open);
  });
})(window.PC);

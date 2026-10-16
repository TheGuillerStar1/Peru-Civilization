// Registro de cambios del juego (el más reciente primero). Lo muestra el botón «Novedades» del menú
// y se refleja en la sección «Novedades» del README. Al publicar una versión o un parche, se añade
// una entrada nueva arriba: { v: versión, fecha, titulo, tipo: 'version' | 'parche', cambios: [...] }.
(function (PC) {
  'use strict';
  PC.VERSION = '0.1.4';
  PC.CHANGELOG = [
    { v: '0.1.4', fecha: '2026-10-16', tipo: 'version', titulo: 'Líderes renovados y mejoras de jugabilidad (P0)',
      cambios: [
        'Lista de pendientes del turno (P0.1): filas accionables sobre el botón de fin de turno (investigación, ciudades sin producción, unidades sin órdenes y amenazas) que llevan al sitio donde se resuelven.',
        'Consejero permanente (P0.2): 15 consejos por condición, sin el techo del turno 30; puedes posponerlos o desactivarlos.',
        'Crónica consultable (P0.4): filtros por tipo, búsqueda sin acentos, últimos 20 turnos y salto a la ciudad mencionada.',
        'Vitrinas 3D manipulables en el menú: arrastra para girar, rueda para acercar y doble clic para reencuadrar.',
        'Líderes 3D rediseñados: más legibles y fieles a sus versiones históricas (llautu y mascapaicha de los Sapa Inca, tocados de Taycanamo y del Señor de Sipán, capa de Pachacútec, manto de Mama Ocllo, cañón de Bolognesi, poncho de Cáceres).',
        'Nuevo botón «Novedades» en el menú con este registro de versiones y parches.'
      ] },
    { v: '0.1.4', fecha: '2026-10-16', tipo: 'parche', titulo: 'Parche: modelos de líderes que no se dibujaban',
      cambios: [
        'Corregido: Pachacútec, Túpac Yupanqui, Huayna Cápac, Manco Inca, Ramón Castilla y Miguel Grau fallaban al dibujarse por nombres de piezas renombrados.',
        'Corregido: constantes duplicadas que impedían cargar el render 3D.',
        'Corregido: hueco visible entre la falda y el pecho en los líderes con vestido largo.',
        'Corregido: la borla del llautu tapaba los ojos y varios tocados flotaban sobre la cabeza.'
      ] },
    { v: '0.1.3', fecha: '2026-09', tipo: 'version', titulo: 'La Conquista',
      cambios: ['Campaña de 11 frentes con comandantes, alianzas y traiciones, liga de resistencia y pacto con la Corona.'] }
  ];
})(window.PC = window.PC || {});

// Registro de cambios del juego (el más reciente primero). Lo muestra el botón «Novedades» del menú
// y se refleja en la sección «Novedades» del README. Al publicar una versión o un parche, se añade
// una entrada nueva arriba: { v: versión, fecha, titulo, tipo: 'version' | 'parche', cambios: [...], capturas: [[archivo, pie], ...] }
  // (las capturas viven en docs/img/ y se enseñan en la ventana Novedades y en el README).
(function (PC) {
  'use strict';
  PC.VERSION = '0.1.5';
  PC.CHANGELOG = [
    { v: '0.1.5', fecha: '2026-10-16', tipo: 'version', titulo: 'Más claro de jugar y arranque rápido',
      cambios: [
        'Movimiento: al seleccionar una unidad, el panel muestra sus puntos de movimiento (círculos y cifras) y explica cómo mover; al pasar el ratón por una casilla clara se ve cuánto cuesta llegar y cuánto te queda.',
        'Las unidades ya no saltan solas a la siguiente: tras mover, la unidad sigue seleccionada con un aviso de lo que le queda, y pasas a otra con N o Tab. Quien prefiera el salto automático lo activa en Opciones.',
        'Producción: cada ciudad sin orden recibe una recomendación con un botón («Producir X») y su motivo; lo elegido queda marcado con «✔ en producción» y aparece un aviso con los turnos que tardará. Los grandes proyectos pasan al final y dicen cuánto oro te falta.',
        'Tecnologías: explicación al abrir la ventana, leyenda de colores, tecnología recomendada para empezar y aviso al elegir con los turnos que tardará.',
        'Paso del tiempo: al terminar el turno, una banda con el sol avanzando y el año que corre del turno que acaba al que empieza (se desactiva en Opciones).',
        'Logo nuevo: una chakana con el sol, en la pestaña del navegador, en el menú y como icono al instalar en el móvil.',
        'Menú más compacto en pantallas pequeñas (portátiles bajos y móviles) y arranque más ligero: se ve al instante una imagen del mapa y la maqueta 3D la reemplaza con un fundido.'
      ],
      capturas: [
        ['docs/img/15-produccion-recomendada.jpg', 'Producción: recomendación con su motivo y lista con lo elegido marcado.'],
        ['docs/img/16-tecnologias-guia.jpg', 'Tecnologías: explicación, leyenda y tecnología recomendada.'],
        ['docs/img/17-movimiento.jpg', 'Movimiento: puntos que te quedan y cómo mover.']
      ] },
    { v: '0.1.4', fecha: '2026-10-16', tipo: 'version', titulo: 'Líderes renovados y mejoras de jugabilidad (P0)',
      cambios: [
        'Lista de pendientes del turno (P0.1): filas accionables sobre el botón de fin de turno (investigación, ciudades sin producción, unidades sin órdenes y amenazas) que llevan al sitio donde se resuelven.',
        'Consejero permanente (P0.2): 15 consejos por condición, sin el techo del turno 30; puedes posponerlos o desactivarlos.',
        'Crónica consultable (P0.4): filtros por tipo, búsqueda sin acentos, últimos 20 turnos y salto a la ciudad mencionada.',
        'Vitrinas 3D manipulables en el menú: arrastra para girar, rueda para acercar y doble clic para reencuadrar.',
        'Líderes 3D rediseñados: más legibles y fieles a sus versiones históricas (llautu y mascapaicha de los Sapa Inca, tocados de Taycanamo y del Señor de Sipán, capa de Pachacútec, manto de Mama Ocllo, cañón de Bolognesi, poncho de Cáceres).',
        'Nuevo botón «Novedades» en el menú con este registro de versiones y parches.'
      ],
      capturas: [
        ['docs/img/11-lideres-renovados.jpg', 'Pachacútec con su llautu, la mascapaicha sobre la frente y la yacolla crema.'],
        ['docs/img/12-lideres-andinos.jpg', 'Señor de Sipán y Mama Ocllo: tocados pegados a la cabeza y manto nuevo.'],
        ['docs/img/13-pendientes-consejero.jpg', 'Lista de pendientes del turno y consejero permanente.'],
        ['docs/img/14-cronica.jpg', 'Crónica con filtros por tipo, búsqueda y salto a la ciudad.']
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

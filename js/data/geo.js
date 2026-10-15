// Datos geográficos del Perú (coordenadas reales lon, lat). Ver docs/INVESTIGACION_HISTORICA.md §14.
(function (PC) {
  'use strict';

  PC.GEO_PERU = {
    latTop: 0.2, latBottom: -18.5, rowLat: 0.8,
    // Contorno simplificado del país.
    outline: [
      [-80.3, -3.4], [-81.3, -4.3], [-81.2, -5.1], [-80.9, -6.0], [-79.9, -6.9], [-79.4, -7.8], [-78.6, -9.1],
      [-77.6, -10.8], [-77.1, -12.0], [-76.4, -13.4], [-75.5, -14.4], [-75.1, -15.4], [-74.1, -15.9],
      [-72.6, -16.6], [-71.4, -17.6], [-70.4, -18.35], [-69.9, -17.6], [-69.5, -17.2], [-69.2, -16.5],
      [-68.9, -16.2], [-69.0, -15.3], [-68.7, -14.0], [-68.7, -12.5], [-69.6, -10.95], [-70.6, -11.0],
      [-70.6, -9.5], [-72.2, -10.0], [-73.2, -9.4], [-73.9, -7.4], [-73.0, -5.2], [-70.0, -4.3],
      [-70.7, -3.8], [-72.0, -2.4], [-73.6, -1.3], [-74.8, -0.1], [-75.6, -0.15], [-75.2, -0.9],
      [-75.6, -1.6], [-77.0, -2.6], [-78.3, -3.4], [-78.6, -4.6], [-79.1, -5.0], [-79.8, -4.4], [-80.3, -4.0]
    ],
    // Línea de costa (norte → sur).
    coast: [[-80.3, -3.4], [-81.3, -4.3], [-81.2, -5.1], [-80.9, -6.0], [-79.9, -6.9], [-79.4, -7.8], [-78.6, -9.1],
      [-77.6, -10.8], [-77.1, -12.0], [-76.4, -13.4], [-75.5, -14.4], [-75.1, -15.4], [-74.1, -15.9], [-72.6, -16.6],
      [-71.4, -17.6], [-70.4, -18.35]],
    // Borde oriental de los Andes (inicio de la ceja de selva).
    andesEast: [[-79.0, -4.8], [-77.8, -6.5], [-77.0, -8.5], [-75.8, -10.5], [-74.5, -12.0], [-72.5, -13.0], [-70.5, -14.2], [-69.0, -14.8]],
    coastWidth(lat) { return lat > -6.5 ? 0.9 : lat > -12 ? 0.55 : lat > -15 ? 0.6 : 0.9; },

    // ~35 provincias histórico-geográficas agrupadas en macrozonas.
    regions: [
      // Costa: valles-oasis
      { id: 'tumbes', name: 'Tumbes', zone: 'costa', lon: -80.45, lat: -3.7 },
      { id: 'chira_piura', name: 'Chira-Piura', zone: 'costa', lon: -80.7, lat: -5.1 },
      { id: 'lambayeque', name: 'Lambayeque', zone: 'costa', lon: -79.8, lat: -6.7 },
      { id: 'moche', name: 'Moche-Chicama', zone: 'costa', lon: -79.1, lat: -7.9 },
      { id: 'santa_casma', name: 'Santa-Casma', zone: 'costa', lon: -78.3, lat: -9.3 },
      { id: 'norte_chico', name: 'Norte Chico (Supe)', zone: 'costa', lon: -77.5, lat: -10.7 },
      { id: 'rimac', name: 'Rímac-Lurín', zone: 'costa', lon: -76.9, lat: -12.1 },
      { id: 'chincha', name: 'Cañete-Chincha', zone: 'costa', lon: -76.0, lat: -13.3 },
      { id: 'ica_nasca', name: 'Ica-Nasca', zone: 'costa', lon: -75.2, lat: -14.6 },
      { id: 'camana', name: 'Camaná-Majes', zone: 'costa', lon: -72.6, lat: -16.3 },
      { id: 'moquegua', name: 'Moquegua-Ilo', zone: 'costa', lon: -71.0, lat: -17.3 },
      { id: 'tacna', name: 'Tacna', zone: 'costa', lon: -70.3, lat: -18.0 },
      // Sierra: valles interandinos y altiplano
      { id: 'huancabamba', name: 'Huancabamba-Ayabaca', zone: 'sierra', lon: -79.6, lat: -5.2 },
      { id: 'cajamarca', name: 'Cajamarca', zone: 'sierra', lon: -78.5, lat: -7.1 },
      { id: 'huamachuco', name: 'Huamachuco-Pataz', zone: 'sierra', lon: -77.8, lat: -8.0 },
      { id: 'huaylas', name: 'Callejón de Huaylas', zone: 'sierra', lon: -77.4, lat: -9.4 },
      { id: 'huanuco', name: 'Huánuco', zone: 'sierra', lon: -76.4, lat: -9.9 },
      { id: 'pasco', name: 'Pasco-Junín', zone: 'sierra', lon: -76.1, lat: -10.9 },
      { id: 'mantaro', name: 'Valle del Mantaro', zone: 'sierra', lon: -75.3, lat: -12.0 },
      { id: 'huancavelica', name: 'Huancavelica', zone: 'sierra', lon: -75.0, lat: -13.0 },
      { id: 'ayacucho', name: 'Ayacucho (Huamanga)', zone: 'sierra', lon: -74.2, lat: -13.4 },
      { id: 'apurimac', name: 'Apurímac-Andahuaylas', zone: 'sierra', lon: -73.0, lat: -14.1 },
      { id: 'cusco', name: 'Cusco-Valle Sagrado', zone: 'sierra', lon: -71.98, lat: -13.52 },
      { id: 'arequipa', name: 'Arequipa-Colca', zone: 'sierra', lon: -71.6, lat: -15.8 },
      { id: 'titicaca', name: 'Cuenca del Titicaca', zone: 'sierra', lon: -70.0, lat: -15.4 },
      { id: 'altos_tacna', name: 'Altos de Moquegua-Tacna', zone: 'sierra', lon: -70.2, lat: -17.0 },
      // Selva: ceja de selva y selva baja
      { id: 'chachapoyas', name: 'Chachapoyas', zone: 'selva', lon: -77.9, lat: -6.2 },
      { id: 'huallaga', name: 'Alto Mayo-Huallaga', zone: 'selva', lon: -76.6, lat: -7.2 },
      { id: 'maranon', name: 'Marañón', zone: 'selva', lon: -76.6, lat: -4.6 },
      { id: 'putumayo', name: 'Napo-Putumayo', zone: 'selva', lon: -73.6, lat: -1.6 },
      { id: 'iquitos', name: 'Iquitos-Amazonas', zone: 'selva', lon: -72.5, lat: -4.0 },
      { id: 'ucayali', name: 'Ucayali', zone: 'selva', lon: -74.4, lat: -8.4 },
      { id: 'selva_central', name: 'Selva Central', zone: 'selva', lon: -74.9, lat: -11.0 },
      { id: 'vilcabamba', name: 'Vilcabamba-Urubamba', zone: 'selva', lon: -73.2, lat: -12.4 },
      { id: 'madre_de_dios', name: 'Madre de Dios', zone: 'selva', lon: -70.3, lat: -12.3 },
      { id: 'pastaza', name: 'Pastaza-Tigre', zone: 'selva', lon: -76.0, lat: -2.8 },
      { id: 'yavari', name: 'Yavarí', zone: 'selva', lon: -71.6, lat: -5.6 },
      { id: 'requena', name: 'Bajo Ucayali (Requena)', zone: 'selva', lon: -73.9, lat: -5.9 },
      { id: 'tingo_maria', name: 'Tingo María-Pichis', zone: 'selva', lon: -75.4, lat: -9.4 },
      { id: 'purus', name: 'Purús', zone: 'selva', lon: -71.0, lat: -10.2 },
      { id: 'manu', name: 'Manu', zone: 'selva', lon: -71.6, lat: -12.2 },
      { id: 'tambopata', name: 'Tambopata-Sandia', zone: 'selva', lon: -69.5, lat: -13.6 }
    ],

    // Ríos: los costeros crean valles-oasis; los amazónicos son "carreteras" sin desgaste.
    rivers: [
      { name: 'Amazonas', pts: [[-73.5, -4.5], [-73.2, -3.75], [-72.0, -3.7], [-70.5, -4.0], [-70.0, -4.25]] },
      { name: 'Marañón', pts: [[-77.4, -8.8], [-78.0, -7.2], [-78.2, -5.8], [-77.7, -4.7], [-76.5, -4.6], [-75.0, -4.6], [-73.5, -4.5]] },
      { name: 'Ucayali', pts: [[-73.7, -11.0], [-74.4, -8.5], [-74.6, -7.3], [-74.0, -6.0], [-73.6, -4.5]] },
      { name: 'Huallaga', pts: [[-76.0, -8.5], [-76.6, -7.2], [-76.0, -5.9], [-75.5, -4.6]] },
      { name: 'Napo', pts: [[-75.4, -0.9], [-73.5, -2.4], [-73.1, -3.3]] },
      { name: 'Madre de Dios', pts: [[-71.4, -12.6], [-70.3, -12.4], [-69.2, -12.6], [-68.7, -12.5]] },
      { name: 'Urubamba', pts: [[-72.7, -13.0], [-73.2, -11.8], [-73.7, -11.0]] },
      { name: 'Tumbes', pts: [[-80.3, -3.9], [-80.6, -3.55]], coastal: true },
      { name: 'Chira', pts: [[-80.3, -4.7], [-81.2, -4.9]], coastal: true },
      { name: 'Piura', pts: [[-79.9, -5.4], [-80.9, -5.6]], coastal: true },
      { name: 'La Leche', pts: [[-79.3, -6.5], [-80.1, -6.8]], coastal: true },
      { name: 'Moche-Chicama', pts: [[-78.6, -7.8], [-79.3, -8.0]], coastal: true },
      { name: 'Santa', pts: [[-78.0, -8.95], [-78.7, -9.1]], coastal: true },
      { name: 'Supe-Pativilca', pts: [[-77.1, -10.5], [-77.8, -10.8]], coastal: true },
      { name: 'Rímac', pts: [[-76.4, -11.8], [-77.2, -12.05]], coastal: true },
      { name: 'Cañete-Pisco', pts: [[-75.6, -13.2], [-76.4, -13.6]], coastal: true },
      { name: 'Ica-Nasca', pts: [[-74.9, -14.4], [-75.6, -14.8]], coastal: true },
      { name: 'Majes', pts: [[-72.3, -15.9], [-72.9, -16.6]], coastal: true },
      { name: 'Moquegua', pts: [[-70.7, -17.1], [-71.4, -17.6]], coastal: true },
      { name: 'Caplina', pts: [[-70.0, -17.8], [-70.5, -18.2]], coastal: true }
    ],
    lakes: [{ name: 'Lago Titicaca', lon: -69.6, lat: -15.9 }],
    // Abras históricas: los únicos pasos garantizados por las cordilleras.
    passes: [
      { name: 'Abra de Porculla', lon: -79.5, lat: -5.85 },
      { name: 'Abra de Conococha', lon: -77.3, lat: -10.1 },
      { name: 'Abra de Ticlio', lon: -76.15, lat: -11.6 },
      { name: 'Abra de Huaytará', lon: -75.3, lat: -13.6 },
      { name: 'Abra Málaga', lon: -72.3, lat: -13.1 },
      { name: 'Abra La Raya', lon: -71.0, lat: -14.5 },
      { name: 'Abra de Patapampa', lon: -71.6, lat: -15.7 }
    ],
    // Yacimientos históricos: {recurso, lon, lat, n}
    hotspots: [
      ['oro', -78.5, -7.0, 1], ['oro', -77.6, -7.9, 1], ['oro', -70.3, -12.8, 2], ['oro', -69.8, -14.4, 1],
      ['plata', -76.25, -10.7, 1], ['plata', -75.9, -11.6, 1], ['plata', -77.3, -9.5, 1],
      ['cobre', -70.7, -17.0, 1], ['cobre', -71.6, -16.4, 1], ['cobre', -72.3, -14.1, 1], ['cobre', -77.05, -9.6, 1], ['cobre', -79.0, -6.4, 1],
      ['hierro', -75.1, -15.2, 1], ['hierro', -72.9, -14.3, 1],
      ['carbon', -78.3, -8.1, 1], ['carbon', -77.5, -9.0, 1],
      ['mercurio', -75.0, -12.8, 1],
      ['estano', -70.2, -14.3, 1],
      ['salitre', -70.4, -17.9, 1],
      ['guano', -79.9, -6.9, 1], ['guano', -76.25, -13.6, 1], ['guano', -77.2, -11.9, 1],
      ['petroleo', -81.0, -4.6, 1], ['petroleo', -75.5, -3.5, 1], ['petroleo', -74.7, -8.0, 1],
      ['caucho', -73.2, -3.8, 1], ['caucho', -70.0, -12.0, 1], ['caucho', -74.2, -9.0, 1],
      ['alpacas', -70.3, -15.2, 1], ['alpacas', -71.2, -15.4, 1], ['alpacas', -76.0, -10.8, 1],
      ['coca', -73.0, -12.6, 1], ['coca', -76.5, -8.8, 1],
      ['cacao', -76.6, -6.6, 1], ['castana', -69.8, -12.4, 1],
      ['algodon', -80.5, -5.3, 1], ['algodon', -77.6, -10.6, 1], ['algodon', -75.5, -13.9, 1],
      ['maiz', -72.0, -13.3, 1], ['maiz', -75.2, -12.0, 1], ['maiz', -79.2, -7.9, 1],
      ['papa', -70.0, -15.0, 1], ['papa', -76.3, -9.9, 1], ['papa', -78.4, -7.2, 1], ['quinua', -70.4, -15.7, 1],
      ['vid', -75.6, -14.1, 1], ['spondylus', -80.6, -3.6, 1], ['sal', -72.1, -13.3, 1]
    ]
  };
})(globalThis.PC = globalThis.PC || {});

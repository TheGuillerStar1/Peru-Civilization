// Datos geográficos de Sudamérica para la Fase 2.
(function (PC) {
  'use strict';
  PC.GEO_SA = {
    lonMin: -82.5, latTop: 13, latBottom: -56, dLon: 1.8,
    outline: [
      [-77.4, 8.6], [-76.0, 9.5], [-75.5, 10.5], [-74.8, 11.0], [-73.5, 11.3], [-72.2, 11.9], [-71.3, 11.6], [-70.2, 11.6], [-68.5, 10.6],
      [-66.5, 10.6], [-64.5, 10.3], [-62.5, 10.7], [-61.0, 9.9], [-60.8, 8.5], [-59.0, 7.7], [-58.0, 6.8], [-55.0, 6.0], [-52.5, 5.2],
      [-51.0, 4.3], [-50.0, 1.8], [-50.0, 0.0], [-48.5, -0.8], [-44.5, -2.5], [-41.5, -2.9], [-38.5, -3.7], [-35.3, -5.3], [-34.8, -7.2],
      [-35.1, -9.0], [-37.0, -11.0], [-38.5, -13.0], [-39.0, -15.0], [-39.5, -18.0], [-40.3, -20.3], [-41.0, -22.0], [-43.2, -23.0],
      [-45.0, -23.8], [-47.0, -24.8], [-48.5, -26.5], [-48.8, -28.5], [-50.3, -30.5], [-52.5, -33.0], [-54.0, -34.6], [-56.7, -34.9],
      [-57.8, -34.5], [-57.3, -36.0], [-56.7, -36.5], [-57.6, -38.2], [-62.0, -39.0], [-62.3, -40.6], [-65.0, -41.0], [-64.0, -42.5],
      [-65.0, -45.0], [-67.5, -46.5], [-65.8, -47.8], [-68.0, -50.0], [-68.5, -52.3], [-66.0, -54.8], [-68.0, -55.3], [-71.0, -55.0],
      [-73.0, -53.5], [-75.0, -51.5], [-75.5, -48.0], [-74.5, -45.0], [-73.8, -42.5], [-73.7, -40.0], [-73.5, -37.0], [-72.0, -35.0],
      [-71.6, -33.0], [-71.5, -30.0], [-70.6, -27.0], [-70.4, -23.6], [-70.2, -20.0], [-70.4, -18.35], [-71.4, -17.6], [-72.6, -16.6],
      [-74.1, -15.9], [-75.1, -15.4], [-76.2, -13.9], [-77.1, -12.0], [-78.6, -9.1], [-79.4, -7.8], [-80.9, -6.0], [-81.3, -4.3],
      [-80.3, -3.4], [-79.9, -2.5], [-80.9, -2.2], [-80.5, -0.5], [-80.1, 0.8], [-79.0, 1.5], [-78.5, 2.5], [-77.5, 4.0], [-77.3, 6.0], [-77.9, 7.2]
    ],
    andes: [[-72.5, 10], [-73.5, 7], [-75.5, 4.5], [-77.5, 1], [-78.7, -2], [-79.2, -5], [-77.5, -9], [-75.0, -12], [-71.5, -15.5],
      [-68.5, -18], [-67.5, -22], [-68.8, -27], [-70.0, -32], [-70.6, -36], [-71.5, -41], [-72.5, -46], [-73.3, -50], [-72.5, -53]],
    rivers: [
      { name: 'Amazonas', pts: [[-73.5, -4.5], [-70, -4.2], [-65, -3.4], [-60, -3.1], [-55, -2.3], [-51, -1.0]] },
      { name: 'Madeira', pts: [[-65, -10.5], [-62, -8], [-59, -4.5]] },
      { name: 'Paraná-Plata', pts: [[-51.5, -20], [-54.5, -24], [-58.5, -27.5], [-60.5, -32], [-58.5, -34.3]] },
      { name: 'Orinoco', pts: [[-67.5, 3.5], [-67.3, 6.2], [-64, 8], [-61, 8.6]] },
      { name: 'Magdalena', pts: [[-75.5, 2.5], [-74.7, 6], [-74.8, 10.5]] }
    ],
    lakes: [{ name: 'Lago Titicaca', lon: -69.4, lat: -15.9 }, { name: 'Lago de Maracaibo', lon: -71.6, lat: 9.8 }],
    regions: [
      { id: 'peru_norte', name: 'Perú del Norte', lon: -79.0, lat: -6.5 }, { id: 'peru_centro', name: 'Perú Central', lon: -76.0, lat: -11.5 },
      { id: 'peru_sur', name: 'Perú del Sur', lon: -71.5, lat: -14.8 }, { id: 'amazonia_peruana', name: 'Amazonía peruana', lon: -74.5, lat: -5.5 },
      { id: 'ecuador', name: 'Andes ecuatoriales', lon: -78.5, lat: -1.0 }, { id: 'colombia', name: 'Andes colombianos', lon: -74.5, lat: 4.6 },
      { id: 'caribe', name: 'Caribe colombiano', lon: -75.0, lat: 9.5 }, { id: 'venezuela', name: 'Costa venezolana', lon: -66.9, lat: 10.0 },
      { id: 'llanos', name: 'Llanos del Orinoco', lon: -67.5, lat: 6.5 }, { id: 'guayanas', name: 'Guayanas', lon: -57.0, lat: 4.5 },
      { id: 'amazonas_oeste', name: 'Amazonía occidental', lon: -66.0, lat: -3.5 }, { id: 'amazonas_este', name: 'Amazonía oriental', lon: -54.0, lat: -3.5 },
      { id: 'nordeste', name: 'Nordeste brasileño', lon: -39.0, lat: -8.0 }, { id: 'bahia', name: 'Bahía', lon: -41.0, lat: -13.5 },
      { id: 'centro_oeste', name: 'Mato Grosso', lon: -54.0, lat: -14.0 }, { id: 'sudeste', name: 'Sudeste brasileño', lon: -45.0, lat: -21.0 },
      { id: 'sur_brasil', name: 'Sur de Brasil', lon: -51.5, lat: -27.5 }, { id: 'altiplano', name: 'Altiplano boliviano', lon: -67.5, lat: -18.0 },
      { id: 'oriente', name: 'Oriente boliviano', lon: -63.0, lat: -15.5 }, { id: 'chaco', name: 'Gran Chaco', lon: -61.0, lat: -23.0 },
      { id: 'paraguay', name: 'Paraguay', lon: -56.5, lat: -25.0 }, { id: 'uruguay', name: 'Banda Oriental', lon: -56.0, lat: -32.5 },
      { id: 'noroeste', name: 'Noroeste argentino', lon: -65.5, lat: -26.0 }, { id: 'cuyo', name: 'Cuyo', lon: -68.5, lat: -33.0 },
      { id: 'pampa', name: 'Pampa', lon: -61.0, lat: -35.5 }, { id: 'patagonia', name: 'Patagonia', lon: -68.0, lat: -44.0 },
      { id: 'fuego', name: 'Tierra del Fuego', lon: -69.5, lat: -52.5 }, { id: 'atacama', name: 'Atacama', lon: -69.8, lat: -23.5 },
      { id: 'chile_central', name: 'Chile Central', lon: -71.0, lat: -33.5 }, { id: 'araucania', name: 'Araucanía', lon: -72.5, lat: -39.5 }
    ],
    hotspots: [
      ['plata', -65.75, -19.6, 1], ['estano', -66.5, -18.0, 1], ['oro', -44.0, -19.5, 1], ['oro', -74.5, 6.0, 1], ['cobre', -69.0, -23.0, 1],
      ['cobre', -70.5, -33.5, 1], ['salitre', -69.8, -21.0, 1], ['petroleo', -71.5, 10.0, 1], ['petroleo', -64.0, -22.0, 1],
      ['hierro', -43.9, -20.3, 1], ['carbon', -51.0, -29.0, 1], ['caucho', -62.0, -6.0, 1], ['caucho', -55.0, -4.0, 1],
      ['cacao', -39.5, -14.8, 1], ['alpacas', -68.0, -17.0, 1], ['maiz', -74.0, 4.5, 1], ['papa', -78.5, -1.0, 1],
      ['vid', -68.8, -33.0, 1], ['algodon', -38.5, -7.0, 1], ['quinua', -67.0, -19.0, 1]
    ],
    cityNames: {
      peru_norte: ['Trujillo', 'Chiclayo', 'Piura', 'Cajamarca'], peru_centro: ['Lima', 'Huancayo', 'Huánuco', 'Ica'], peru_sur: ['Cusco', 'Arequipa', 'Puno', 'Tacna'],
      amazonia_peruana: ['Iquitos', 'Pucallpa', 'Moyobamba'], ecuador: ['Quito', 'Tumipampa', 'Guayaquil', 'Riobamba'], colombia: ['Bacatá', 'Tunja', 'Popayán', 'Medellín', 'Cali'],
      caribe: ['Ciénaga', 'Cartagena', 'Santa Marta', 'Barranquilla'], venezuela: ['Caracas', 'Coro', 'Cumaná', 'Maracaibo', 'Valencia'], llanos: ['Barinas', 'Angostura', 'Apure'],
      guayanas: ['Georgetown', 'Paramaribo', 'Cayena'], amazonas_oeste: ['Manaos', 'Tefé', 'Tabatinga', 'Porto Velho'], amazonas_este: ['Belém', 'Santarém', 'Marajó', 'Macapá'],
      nordeste: ['Recife', 'Olinda', 'Fortaleza', 'Natal'], bahia: ['Salvador', 'Ilhéus', 'Porto Seguro'], centro_oeste: ['Cuiabá', 'Goiás', 'Brasilia'],
      sudeste: ['Río de Janeiro', 'São Paulo', 'Ouro Preto', 'Vitória'], sur_brasil: ['Porto Alegre', 'Curitiba', 'Florianópolis'], altiplano: ['Potosí', 'Chuquisaca', 'La Paz', 'Oruro', 'Tiwanaku'],
      oriente: ['Santa Cruz', 'Trinidad', 'Cochabamba'], chaco: ['Tarija', 'Formosa', 'Filadelfia'], paraguay: ['Asunción', 'Encarnación', 'Concepción'],
      uruguay: ['Montevideo', 'Colonia', 'Salto'], noroeste: ['Tucumán', 'Salta', 'Jujuy', 'Santiago del Estero'], cuyo: ['Mendoza', 'San Juan', 'San Luis'],
      pampa: ['Buenos Aires', 'Córdoba', 'Santa Fe', 'Rosario', 'La Plata'], patagonia: ['Carmen de Patagones', 'Rawson', 'Neuquén'], fuego: ['Punta Arenas', 'Ushuaia'],
      atacama: ['Atacama', 'Copiapó', 'Antofagasta', 'Iquique'], chile_central: ['Santiago', 'Valparaíso', 'La Serena', 'Talca'], araucania: ['Concepción', 'Temuco', 'Valdivia', 'Osorno']
    },
    // Facciones según la época: [clave, nombre, color, región, nº de ciudades]
    natives: [
      ['muisca', 'Muiscas', '#c0a040', 'colombia', 3], ['tairona', 'Taironas', '#7aa85a', 'caribe', 2], ['quitu', 'Quitu-Cara', '#a05a2c', 'ecuador', 2],
      ['caribe', 'Caribes', '#3f9f8f', 'venezuela', 2], ['arawak', 'Arawak', '#4f8f4f', 'llanos', 2], ['yanomami', 'Yanomami', '#2f7f4f', 'guayanas', 1],
      ['omagua', 'Omaguas', '#3fbf6f', 'amazonas_oeste', 2], ['marajoara', 'Marajoara', '#bf7f3f', 'amazonas_este', 2], ['tupinamba', 'Tupinambá', '#df6f3f', 'nordeste', 2],
      ['tupi', 'Tupíes', '#ef8f4f', 'sudeste', 2], ['guarani', 'Guaraníes', '#5fbf9f', 'paraguay', 3], ['mojos', 'Mojos', '#6f9f3f', 'oriente', 2],
      ['aymara', 'Señoríos aymaras', '#2f6fbf', 'altiplano', 3], ['diaguita', 'Diaguitas', '#bf5f5f', 'noroeste', 2], ['charrua', 'Charrúas', '#9f9f6f', 'uruguay', 1],
      ['mapuche', 'Mapuches', '#3f5fdf', 'araucania', 3], ['tehuelche', 'Tehuelches', '#afa58f', 'patagonia', 1], ['querandi', 'Querandíes', '#cfbf8f', 'pampa', 1]
    ],
    colonial: [
      ['nueva_granada', 'Virreinato de Nueva Granada', '#f1c40f', 'colombia', 4], ['venezuela', 'Capitanía de Venezuela', '#e67e22', 'venezuela', 2],
      ['quito', 'Real Audiencia de Quito', '#d4ac0d', 'ecuador', 2], ['charcas', 'Audiencia de Charcas', '#b9770e', 'altiplano', 3],
      ['rio_plata', 'Virreinato del Río de la Plata', '#85c1e9', 'pampa', 4], ['chile', 'Capitanía de Chile', '#e8e8e8', 'chile_central', 3],
      ['brasil', 'Brasil portugués', '#27ae60', 'sudeste', 5], ['guayana', 'Guayanas europeas', '#a569bd', 'guayanas', 1],
      ['mapuche', 'Mapuches', '#3f5fdf', 'araucania', 2], ['guarani', 'Misiones guaraníes', '#5fbf9f', 'paraguay', 2]
    ],
    nations: [
      ['colombia', 'Colombia', '#f1c40f', 'colombia', 4], ['venezuela', 'Venezuela', '#e67e22', 'venezuela', 3], ['ecuador', 'Ecuador', '#d4ac0d', 'ecuador', 2],
      ['bolivia', 'Bolivia', '#2ecc71', 'altiplano', 3], ['argentina', 'Argentina', '#85c1e9', 'pampa', 5], ['chile', 'Chile', '#e8e8e8', 'chile_central', 4],
      ['brasil', 'Brasil', '#27ae60', 'sudeste', 7], ['paraguay', 'Paraguay', '#c0392b', 'paraguay', 2], ['uruguay', 'Uruguay', '#5dade2', 'uruguay', 1],
      ['guyana', 'Guyanas', '#a569bd', 'guayanas', 1]
    ]
  };
})(globalThis.PC = globalThis.PC || {});

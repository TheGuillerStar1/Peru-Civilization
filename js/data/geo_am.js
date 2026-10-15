// Datos geográficos de América para la Fase 3 (Norteamérica, Mesoamérica, las Antillas y Sudamérica).
(function (PC) {
  'use strict';
  PC.GEO_AM = {
    // Rejilla: dLon grados por hexágono en el ecuador; la longitud se comprime con la latitud para que
    // Canadá y Alaska no ocupen más que Sudamérica.
    lon0: -95, latTop: 71, latBottom: -56, dLon: 2.1,
    shrink: (lat) => Math.pow(Math.cos(lat * Math.PI / 180), 0.85),
    // Norteamérica y Centroamérica, de Panamá hacia el norte por el Caribe y de vuelta por el Pacífico.
    outlineNA: [
      [-77.4, 8.7], [-79.6, 9.6], [-81.2, 8.8], [-82.6, 9.6], [-83.6, 11.0], [-83.3, 12.5], [-83.4, 14.5], [-83.2, 15.0], [-84.5, 15.9], [-86.0, 15.9],
      [-88.0, 15.8], [-88.6, 15.7], [-88.2, 16.5], [-88.2, 18.4], [-87.5, 19.6], [-86.8, 21.2], [-88.0, 21.5], [-90.3, 21.1], [-90.5, 19.5], [-91.8, 18.6],
      [-94.5, 18.2], [-96.1, 19.2], [-97.2, 20.7], [-97.6, 22.5], [-97.2, 25.8], [-97.4, 27.8], [-94.5, 29.5], [-91.5, 29.3], [-89.4, 28.9], [-88.0, 30.6],
      [-85.5, 30.0], [-84.0, 30.0], [-82.7, 28.0], [-81.8, 26.2], [-80.6, 25.2], [-80.1, 26.8], [-81.0, 29.5], [-81.4, 30.8], [-79.5, 33.0], [-77.0, 34.6],
      [-75.5, 35.3], [-76.0, 37.0], [-75.0, 38.5], [-74.0, 40.5], [-72.0, 41.0], [-70.0, 41.7], [-70.7, 43.0], [-67.0, 44.8], [-65.5, 43.5], [-61.0, 45.3],
      [-60.0, 46.7], [-64.3, 48.8], [-66.0, 50.2], [-60.0, 50.2], [-57.0, 51.5], [-55.7, 53.5], [-58.0, 55.0], [-61.5, 56.5], [-64.0, 59.5], [-64.7, 60.3],
      [-68.0, 58.6], [-70.0, 61.0], [-72.0, 62.3], [-78.0, 62.4], [-77.5, 60.0], [-76.8, 57.0], [-79.0, 55.0], [-79.5, 51.5], [-82.0, 52.9], [-85.0, 55.2],
      [-88.0, 56.5], [-92.5, 57.5], [-94.2, 58.8], [-94.5, 61.0], [-91.5, 62.8], [-90.0, 64.0], [-87.5, 66.5], [-86.0, 68.5], [-90.0, 69.5], [-95.0, 68.5],
      [-98.0, 68.0], [-105.0, 68.5], [-110.0, 68.0], [-115.0, 67.8], [-123.0, 69.5], [-128.0, 70.0], [-135.0, 69.5], [-141.0, 69.7], [-148.0, 70.4],
      [-156.5, 71.3], [-162.0, 70.0], [-166.0, 68.8], [-163.5, 66.5], [-168.0, 65.6], [-165.0, 64.5], [-161.0, 64.3], [-165.5, 62.0], [-164.5, 60.0],
      [-162.0, 58.5], [-157.5, 58.7], [-158.0, 56.8], [-163.0, 55.0], [-159.0, 55.3], [-154.0, 57.0], [-152.0, 59.5], [-149.5, 59.8], [-146.0, 60.8],
      [-141.0, 60.0], [-138.0, 59.0], [-135.5, 57.5], [-133.0, 55.0], [-130.5, 54.0], [-128.5, 52.0], [-127.5, 50.5], [-125.0, 48.5], [-124.6, 46.0],
      [-124.2, 43.0], [-124.4, 40.4], [-123.0, 38.0], [-122.5, 37.0], [-121.0, 35.2], [-118.5, 34.0], [-117.2, 32.6], [-116.6, 31.0], [-115.1, 27.9],
      [-112.2, 24.8], [-109.9, 22.9], [-110.6, 24.3], [-112.0, 26.4], [-113.2, 28.5], [-114.8, 31.6], [-113.0, 31.3], [-110.9, 27.9], [-108.9, 25.6],
      [-106.4, 23.2], [-105.3, 20.5], [-104.3, 19.1], [-102.0, 17.9], [-99.9, 16.8], [-96.5, 15.6], [-94.5, 16.2], [-92.2, 14.5], [-90.0, 13.8],
      [-87.6, 13.2], [-86.5, 12.0], [-85.7, 11.0], [-85.9, 10.0], [-84.7, 9.7], [-83.6, 8.5], [-82.0, 8.2], [-80.0, 7.3], [-78.4, 8.2], [-77.9, 7.2]
    ],
    islands: [
      { name: 'Cuba', pts: [[-84.9, 21.9], [-84.0, 22.8], [-82.0, 23.2], [-80.0, 23.1], [-77.5, 21.8], [-75.7, 21.1], [-74.2, 20.2], [-75.0, 19.9], [-77.7, 19.8], [-78.5, 21.5], [-81.0, 21.7], [-82.5, 22.0], [-84.0, 21.5]] },
      { name: 'La Española', pts: [[-74.4, 18.4], [-72.8, 19.9], [-70.0, 19.7], [-68.4, 18.6], [-70.0, 18.2], [-71.4, 17.6], [-74.4, 18.0]] },
      { name: 'Terranova', pts: [[-59.4, 47.6], [-57.0, 51.5], [-55.4, 51.5], [-55.5, 49.5], [-52.6, 47.5], [-53.5, 46.6], [-56.0, 47.0]] },
      { name: 'Tierra de Baffin', pts: [[-61.5, 66.6], [-65.5, 62.9], [-71.5, 63.2], [-77.5, 64.3], [-80.0, 67.5], [-84.0, 70.0], [-78.0, 72.0], [-70.0, 70.6], [-66.0, 68.0]] }
    ],
    // Islas pequeñas que siempre tienen al menos un hexágono.
    islets: [['Jamaica', -77.3, 18.1], ['Puerto Rico', -66.5, 18.2], ['Trinidad', -61.3, 10.5], ['Bahamas', -77.5, 24.8], ['Guadalupe', -61.5, 16.2]],
    // Cordilleras (de norte a sur): Rocosas y Sierra Madre, cordilleras del Pacífico, Apalaches y el arco volcánico centroamericano.
    rockies: [[-152, 63], [-141, 61.5], [-134, 60], [-126, 57], [-120, 53], [-116, 50], [-113, 47], [-110, 44], [-107, 40], [-106, 36], [-108, 31],
      [-106.5, 27], [-104.5, 23.5], [-103, 20.5], [-100, 19.3], [-97.5, 18.6], [-96, 17], [-93, 16], [-91, 15], [-88.5, 14.3], [-86, 13], [-84, 10], [-82.5, 8.8]],
    pacific: [[-121.5, 49], [-121.8, 44], [-122, 41], [-119.5, 37.5], [-118, 35.5], [-116, 32.5]],
    appalachians: [[-67, 47.5], [-70, 45.5], [-73, 43.5], [-76, 41.5], [-78.5, 39.5], [-81.5, 37], [-84.5, 34]],
    rivers: [
      { name: 'Misisipi', pts: [[-95, 47.5], [-91.5, 44], [-91, 39], [-89.5, 35], [-91, 31], [-89.6, 29.2]] },
      { name: 'Misuri', pts: [[-111, 46.5], [-104, 47.8], [-100.5, 44.5], [-96, 41.3], [-91, 38.8]] },
      { name: 'Ohio', pts: [[-80, 40.4], [-84.5, 39], [-88.5, 37.2]] },
      { name: 'San Lorenzo', pts: [[-76.5, 44.2], [-73.5, 45.5], [-71.2, 46.8], [-68.5, 48.5]] },
      { name: 'Bravo', pts: [[-106.6, 37.5], [-106.6, 32], [-103.5, 29.3], [-99.5, 27.5], [-97.2, 25.9]] },
      { name: 'Colorado', pts: [[-106, 40], [-110, 38.5], [-112.5, 36.2], [-114.6, 34], [-114.8, 32]] },
      { name: 'Yukón', pts: [[-135, 61], [-141, 64.5], [-152, 65.5], [-162, 62.5]] },
      { name: 'Mackenzie', pts: [[-117, 61.2], [-123.5, 64.5], [-134, 68.5]] }
    ],
    lakes: [{ name: 'Lago Superior', lon: -87.5, lat: 47.6 }, { name: 'Lago Míchigan', lon: -87, lat: 43.8 }, { name: 'Lago Hurón', lon: -82.5, lat: 44.8 },
      { name: 'Lago Erie', lon: -81, lat: 42.2 }, { name: 'Gran Lago del Esclavo', lon: -114, lat: 61.7 }, { name: 'Lago Winnipeg', lon: -97.5, lat: 52.5 },
      { name: 'Lago de Nicaragua', lon: -85.3, lat: 11.6 }, { name: 'Lago Titicaca', lon: -69.4, lat: -15.9 }],
    // Regiones de Norte y Centroamérica (las de Sudamérica vienen de PC.GEO_SA).
    regions: [
      { id: 'alaska', name: 'Alaska', lon: -152, lat: 64, macro: 'norteamerica' }, { id: 'yukon', name: 'Yukón', lon: -133, lat: 63, macro: 'norteamerica' },
      { id: 'artico', name: 'Ártico canadiense', lon: -105, lat: 66, macro: 'norteamerica' }, { id: 'baffin', name: 'Tierra de Baffin', lon: -71, lat: 67, macro: 'norteamerica' },
      { id: 'columbia_britanica', name: 'Columbia Británica', lon: -124, lat: 54, macro: 'norteamerica' }, { id: 'praderas_canadienses', name: 'Praderas canadienses', lon: -107, lat: 54, macro: 'norteamerica' },
      { id: 'hudson', name: 'Bahía de Hudson', lon: -88, lat: 54, macro: 'norteamerica' }, { id: 'quebec', name: 'Quebec', lon: -72, lat: 49, macro: 'norteamerica' },
      { id: 'labrador', name: 'Labrador', lon: -62, lat: 54, macro: 'norteamerica' }, { id: 'terranova', name: 'Terranova', lon: -56, lat: 48.5, macro: 'norteamerica' },
      { id: 'pacifico_noroeste', name: 'Noroeste del Pacífico', lon: -121, lat: 46, macro: 'norteamerica' }, { id: 'california', name: 'California', lon: -120, lat: 37, macro: 'norteamerica' },
      { id: 'gran_cuenca', name: 'Gran Cuenca', lon: -115, lat: 41, macro: 'norteamerica' }, { id: 'rocosas', name: 'Montañas Rocosas', lon: -108, lat: 44, macro: 'norteamerica' },
      { id: 'suroeste', name: 'Suroeste', lon: -110, lat: 34, macro: 'norteamerica' }, { id: 'grandes_llanuras', name: 'Grandes Llanuras', lon: -100, lat: 43, macro: 'norteamerica' },
      { id: 'texas', name: 'Texas', lon: -98, lat: 31, macro: 'norteamerica' }, { id: 'grandes_lagos', name: 'Grandes Lagos', lon: -85, lat: 43, macro: 'norteamerica' },
      { id: 'misisipi', name: 'Valle del Misisipi', lon: -90, lat: 36, macro: 'norteamerica' }, { id: 'sureste', name: 'Sureste', lon: -85, lat: 32.5, macro: 'norteamerica' },
      { id: 'florida', name: 'Florida', lon: -81.5, lat: 28, macro: 'norteamerica' }, { id: 'apalaches', name: 'Virginia y los Apalaches', lon: -78.5, lat: 37.5, macro: 'norteamerica' },
      { id: 'nueva_inglaterra', name: 'Nueva Inglaterra', lon: -72, lat: 42.5, macro: 'norteamerica' },
      { id: 'baja_california', name: 'Baja California', lon: -113, lat: 28, macro: 'mesoamerica' }, { id: 'sonora', name: 'Sonora', lon: -110, lat: 29.5, macro: 'mesoamerica' },
      { id: 'chihuahua', name: 'Chihuahua', lon: -105, lat: 28.5, macro: 'mesoamerica' }, { id: 'noreste_mx', name: 'Noreste de México', lon: -100, lat: 25.5, macro: 'mesoamerica' },
      { id: 'occidente_mx', name: 'Occidente de México', lon: -103.5, lat: 20.5, macro: 'mesoamerica' }, { id: 'valle_mexico', name: 'Valle de México', lon: -99.2, lat: 19.4, macro: 'mesoamerica' },
      { id: 'golfo', name: 'Costa del Golfo', lon: -96.5, lat: 20.5, macro: 'mesoamerica' }, { id: 'oaxaca', name: 'Oaxaca', lon: -96.7, lat: 17, macro: 'mesoamerica' },
      { id: 'yucatan', name: 'Yucatán', lon: -89, lat: 20, macro: 'mesoamerica' }, { id: 'guatemala', name: 'Guatemala', lon: -90.5, lat: 15, macro: 'mesoamerica' },
      { id: 'centroamerica', name: 'Centroamérica', lon: -86.5, lat: 13.5, macro: 'mesoamerica' }, { id: 'istmo', name: 'Costa Rica y Panamá', lon: -82, lat: 9, macro: 'mesoamerica' },
      { id: 'cuba', name: 'Cuba', lon: -79.5, lat: 22, macro: 'antillas' }, { id: 'la_espanola', name: 'La Española', lon: -71, lat: 19, macro: 'antillas' },
      { id: 'antillas_menores', name: 'Puerto Rico y las Antillas Menores', lon: -64, lat: 17, macro: 'antillas' }
    ],
    hotspots: [
      ['oro', -120.5, 38.5], ['oro', -139, 64], ['plata', -102.5, 22.8], ['plata', -99.6, 18.5], ['cobre', -110.5, 32.5], ['cobre', -88.5, 47],
      ['hierro', -92.5, 47.5], ['carbon', -78, 40.5], ['carbon', -82, 37.5], ['petroleo', -95, 30], ['petroleo', -97.9, 22.2], ['petroleo', -113, 56],
      ['algodon', -90, 33], ['maiz', -99, 19.5], ['maiz', -93.5, 42], ['cacao', -93, 18], ['cacao', -90, 15.5], ['vid', -122.5, 38.5],
      ['sal', -88.5, 21], ['papa', -78.5, -1.0], ['plata', -65.75, -19.6], ['estano', -66.5, -18.0], ['oro', -44.0, -19.5], ['cobre', -69.0, -23.0],
      ['salitre', -69.8, -21.0], ['petroleo', -71.5, 10.0], ['hierro', -43.9, -20.3], ['caucho', -62.0, -6.0], ['alpacas', -68.0, -17.0], ['guano', -77.5, -11.0]
    ],
    cityNames: {
      alaska: ['Sitka', 'Anchorage', 'Fairbanks', 'Nome', 'Kodiak'], yukon: ['Whitehorse', 'Dawson', 'Yellowknife'], artico: ['Iqaluit', 'Cambridge Bay', 'Inuvik'],
      baffin: ['Pangnirtung', 'Pond Inlet'], columbia_britanica: ['Vancouver', 'Victoria', 'Prince Rupert', 'Kamloops'],
      praderas_canadienses: ['Winnipeg', 'Edmonton', 'Calgary', 'Regina', 'Saskatoon'], hudson: ['Churchill', 'York Factory', 'Moose Factory'],
      quebec: ['Quebec', 'Montreal', 'Trois-Rivières', 'Ottawa', 'Toronto'], labrador: ['Nain', 'Goose Bay'], terranova: ["St. John's", 'Corner Brook'],
      pacifico_noroeste: ['Seattle', 'Portland', 'Spokane', 'Boise'], california: ['Los Ángeles', 'San Francisco', 'San Diego', 'Monterrey de California', 'Sacramento'],
      gran_cuenca: ['Salt Lake City', 'Reno', 'Las Vegas'], rocosas: ['Denver', 'Cheyenne', 'Helena', 'Billings'], suroeste: ['Santa Fe', 'Albuquerque', 'Phoenix', 'Tucson', 'Taos'],
      grandes_llanuras: ['Omaha', 'Kansas City', 'Bismarck', 'Wichita', 'Minneapolis'], texas: ['San Antonio', 'Houston', 'Dallas', 'Austin', 'El Paso'],
      grandes_lagos: ['Chicago', 'Detroit', 'Cleveland', 'Milwaukee', 'Búfalo'], misisipi: ['Cahokia', 'San Luis', 'Nashville', 'Memphis', 'Louisville'],
      sureste: ['Nueva Orleans', 'Atlanta', 'Mobile', 'Charleston', 'Savannah'], florida: ['San Agustín', 'Tampa', 'Miami', 'Pensacola'],
      apalaches: ['Jamestown', 'Richmond', 'Washington', 'Baltimore', 'Filadelfia'], nueva_inglaterra: ['Boston', 'Nueva York', 'Plymouth', 'Albany', 'Providence'],
      baja_california: ['La Paz', 'Loreto', 'Tijuana', 'Ensenada'], sonora: ['Hermosillo', 'Guaymas', 'Álamos'], chihuahua: ['Paquimé', 'Chihuahua', 'Durango', 'Ciudad Juárez'],
      noreste_mx: ['Monterrey', 'Saltillo', 'Zacatecas', 'San Luis Potosí', 'Tampico'], occidente_mx: ['Tzintzuntzan', 'Guadalajara', 'Valladolid de Michoacán', 'Colima', 'Tepic'],
      valle_mexico: ['Tenochtitlan', 'Teotihuacan', 'Texcoco', 'Tlaxcala', 'Cholula', 'Puebla', 'Tula'], golfo: ['Veracruz', 'Cempoala', 'El Tajín', 'Xalapa', 'La Venta'],
      oaxaca: ['Monte Albán', 'Mitla', 'Antequera', 'Tilantongo', 'Tehuantepec'], yucatan: ['Chichén Itzá', 'Mayapán', 'Uxmal', 'Mérida', 'Tulum', 'Campeche'],
      guatemala: ['Tikal', 'Kaminaljuyú', 'Iximché', 'Santiago de los Caballeros', 'Copán', 'Palenque'], centroamerica: ['San Salvador', 'Tegucigalpa', 'León', 'Granada', 'Comayagua'],
      istmo: ['Panamá', 'Cartago', 'Portobelo', 'Nombre de Dios', 'San José'], cuba: ['La Habana', 'Santiago de Cuba', 'Baracoa', 'Camagüey', 'Trinidad'],
      la_espanola: ['Santo Domingo', 'La Isabela', 'Cap-Haïtien', 'Puerto Príncipe', 'Jaragua'], antillas_menores: ['San Juan', 'Basse-Terre', 'Bridgetown', 'Fort-de-France']
    },
    // Facciones de Norte y Centroamérica según la época: [clave, nombre, color, región, nº de ciudades]
    natives: [
      ['mexica', 'Mexicas', '#c0392b', 'valle_mexico', 3], ['maya', 'Mayas', '#16a085', 'yucatan', 3], ['purepecha', 'Purépechas', '#8e44ad', 'occidente_mx', 2],
      ['zapoteca', 'Zapotecas y mixtecos', '#d35400', 'oaxaca', 2], ['taino', 'Taínos', '#48c9b0', 'la_espanola', 2], ['misisipiana', 'Cultura del Misisipi', '#a04000', 'misisipi', 3],
      ['pueblo', 'Pueblos ancestrales', '#dc7633', 'suroeste', 2], ['haudenosaunee', 'Haudenosaunee', '#1e8449', 'grandes_lagos', 2], ['lakota', 'Lakotas', '#b9770e', 'grandes_llanuras', 2],
      ['cheroqui', 'Cheroquis', '#7d6608', 'apalaches', 2], ['inuit', 'Inuit', '#aab7b8', 'artico', 1], ['tlingit', 'Tlingit', '#2e86c1', 'columbia_britanica', 1]
    ],
    colonial: [
      ['nueva_espana', 'Nueva España', '#f4d03f', 'valle_mexico', 5], ['guatemala', 'Capitanía de Guatemala', '#f0b27a', 'guatemala', 2], ['cuba_esp', 'Cuba española', '#f5b041', 'cuba', 2],
      ['nueva_francia', 'Nueva Francia', '#5dade2', 'quebec', 2, 1608], ['trece_colonias', 'Colonias británicas', '#c0392b', 'nueva_inglaterra', 3, 1607],
      ['alaska_rusa', 'América rusa', '#922b21', 'alaska', 1, 1741], ['haudenosaunee', 'Haudenosaunee', '#1e8449', 'grandes_lagos', 2], ['lakota', 'Lakotas', '#b9770e', 'grandes_llanuras', 2],
      ['cheroqui', 'Cheroquis', '#7d6608', 'apalaches', 1], ['comanche', 'Comanches', '#ca6f1e', 'texas', 1, 1700]
    ],
    nations: [
      ['mexico', 'México', '#27ae60', 'valle_mexico', 6], ['trece_colonias', 'Estados Unidos', '#2e4a9e', 'apalaches', 7], ['nueva_francia', 'Canadá', '#d0453a', 'quebec', 3],
      ['guatemala', 'Centroamérica', '#5dade2', 'guatemala', 3], ['cuba_esp', 'Cuba', '#e74c3c', 'cuba', 1, 1902], ['haiti', 'Haití', '#1f3a93', 'la_espanola', 1, 1804],
      ['lakota', 'Lakotas', '#b9770e', 'grandes_llanuras', 1, 0, 1890]
    ],
    // Colonizaciones si la Fase 3 empieza antes de la llegada europea: [año, clave, nombre, color, región, tropas, corona]
    colonize: [
      [1493, 'cuba_esp', 'Cuba española', '#f5b041', 'la_espanola', 3, 'es'], [1519, 'nueva_espana', 'Nueva España', '#f4d03f', 'golfo', 5, 'es'],
      [1524, 'guatemala', 'Capitanía de Guatemala', '#f0b27a', 'guatemala', 3, 'es'], [1607, 'trece_colonias', 'Colonias británicas', '#c0392b', 'apalaches', 4, 'en'],
      [1608, 'nueva_francia', 'Nueva Francia', '#5dade2', 'quebec', 3, 'fr'], [1741, 'alaska_rusa', 'América rusa', '#922b21', 'alaska', 2, 'ru']
    ]
  };
})(globalThis.PC = globalThis.PC || {});

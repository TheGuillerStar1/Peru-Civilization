// Líderes históricos de cada país a lo largo del tiempo (como en Civilization, cada rival tiene un rostro,
// pero aquí se suceden con los años) y los nombres que toma cada país según la época.
(function (PC) {
  'use strict';

  // [desde el año, nombre, título, agenda, modelo 3D]
  PC.LEADER_HISTORY = {
    // --- Fase 1: Perú
    inca: [[1200, 'Manco Cápac', 'Fundador del Cusco', 'expansionista', 'curaca'], [1410, 'Viracocha Inca', 'Sapa Inca', 'conquistador', 'pachacutec'],
      [1438, 'Pachacútec', 'Sapa Inca, 1438–1471', 'conquistador', 'pachacutec'], [1471, 'Túpac Yupanqui', 'Sapa Inca, 1471–1493', 'explorador', 'tupac_yupanqui'],
      [1493, 'Huayna Cápac', 'Sapa Inca, 1493–1525', 'expansionista', 'huayna_capac'], [1527, 'Huáscar', 'Sapa Inca en el Cusco', 'pacifico', 'pachacutec'],
      [1532, 'Atahualpa', 'Sapa Inca, vencedor de la guerra civil', 'conquistador', 'pachacutec'], [1533, 'Manco Inca', 'Inca de Vilcabamba', 'conquistador', 'manco_inca'],
      [1545, 'Sayri Túpac', 'Inca de Vilcabamba', 'pacifico', 'manco_inca'], [1560, 'Titu Cusi Yupanqui', 'Inca de Vilcabamba', 'devoto', 'manco_inca'],
      [1571, 'Túpac Amaru I', 'Último inca de Vilcabamba', 'conquistador', 'manco_inca'], [1600, 'Linaje de los incas', 'Descendientes de los Sapa Inca', 'devoto', 'pachacutec']],
    chimu: [[900, 'Taycanamo', 'Fundador de Chimor', 'mercader', 'taycanamo'], [1200, 'Ñancempinco', 'Rey conquistador de Chimor', 'conquistador', 'senor_costa'],
      [1400, 'Minchançaman', 'Último rey de Chimor', 'mercader', 'senor_costa']],
    sican: [[750, 'Naylamp', 'Fundador mítico de Lambayeque', 'mercader', 'senor_costa'], [1050, 'Fempellec', 'Último señor de la dinastía de Naylamp', 'devoto', 'senor_costa']],
    moche: [[100, 'Señor de Sipán', 'Gobernante moche', 'mercader', 'senor_sipan'], [450, 'Señora de Cao', 'Gobernante moche del Chicama', 'devoto', 'senor_costa']],
    chanka: [[1350, 'Uscovilca', 'Fundador mítico de los chancas', 'conquistador', 'curaca'], [1430, 'Anccu Hualloc', 'Caudillo chanka', 'conquistador', 'curaca']],
    espana: [[1530, 'Francisco Pizarro', 'Gobernador de Nueva Castilla', 'conquistador', 'conquistador'], [1544, 'Blasco Núñez Vela', 'Primer virrey del Perú', 'expansionista', 'virrey'],
      [1569, 'Francisco de Toledo', 'Virrey del Perú', 'conquistador', 'virrey'], [1640, 'Pedro de Toledo y Leiva', 'Virrey del Perú', 'mercader', 'virrey'],
      [1761, 'Manuel de Amat y Junyent', 'Virrey del Perú', 'mercader', 'virrey'], [1806, 'José Fernando de Abascal', 'Virrey del Perú', 'conquistador', 'virrey'],
      [1816, 'Joaquín de la Pezuela', 'Virrey del Perú', 'conquistador', 'virrey'], [1821, 'José de la Serna', 'Último virrey del Perú', 'conquistador', 'virrey']],

    // --- Fase 2: Sudamérica
    muisca: [[600, 'Zipa de Bacatá', 'Confederación muisca', 'mercader', 'curaca'], [1470, 'Saguamanchica', 'Zipa de Bacatá', 'conquistador', 'curaca'],
      [1514, 'Nemequene', 'Zipa legislador', 'expansionista', 'curaca'], [1537, 'Tisquesusa', 'Último zipa', 'conquistador', 'curaca']],
    tairona: [[200, 'Naoma tairona', 'Sacerdotes de la Sierra Nevada', 'devoto', 'sacerdote']],
    quitu: [[800, 'Shyri de Quito', 'Reino de Quito', 'expansionista', 'curaca'], [1480, 'Pintag', 'Caudillo cara contra los incas', 'conquistador', 'curaca'],
      [1530, 'Rumiñahui', 'General de Quito', 'conquistador', 'curaca']],
    caribe: [[800, 'Cacique caribe', 'Navegantes del Caribe', 'conquistador', 'amazonico'], [1560, 'Guaicaipuro', 'Cacique de los teques', 'conquistador', 'amazonico']],
    arawak: [[800, 'Consejo arawak', 'Pueblos del Orinoco', 'mercader', 'amazonico']],
    yanomami: [[800, 'Pata yanomami', 'Sabios de la sierra Parima', 'pacifico', 'amazonico']],
    omagua: [[900, 'Gran cacique omagua', 'Señorío del Amazonas', 'expansionista', 'amazonico']],
    marajoara: [[400, 'Señores de Marajó', 'Cacicazgo de los montículos', 'devoto', 'amazonico']],
    tupinamba: [[1000, 'Cunhambebe', 'Morubixaba tupinambá', 'conquistador', 'amazonico']],
    tupi: [[1000, 'Tibiriçá', 'Cacique de Piratininga', 'mercader', 'amazonico']],
    guarani: [[1000, 'Mburuvichá guaraní', 'Jefes de los guaraníes', 'expansionista', 'amazonico'], [1628, 'Nicolás Ñeenguirú', 'Corregidor de Concepción', 'conquistador', 'amazonico']],
    mojos: [[500, 'Señores de los Llanos de Mojos', 'Constructores de lomas y canales', 'pacifico', 'amazonico']],
    aymara: [[1100, 'Mallku de los Charcas', 'Señoríos aymaras', 'expansionista', 'curaca'], [1440, 'Cari', 'Señor de Chucuito', 'devoto', 'curaca'],
      [1781, 'Túpac Katari', 'Caudillo del cerco de La Paz', 'conquistador', 'curaca']],
    diaguita: [[900, 'Curaca diaguita', 'Señores de los valles calchaquíes', 'conquistador', 'curaca'], [1630, 'Juan Chelemín', 'Cacique de la gran rebelión calchaquí', 'conquistador', 'curaca']],
    charrua: [[1000, 'Zapicán', 'Cacique charrúa', 'conquistador', 'amazonico'], [1800, 'Vaimaca Perú', 'Cacique charrúa', 'conquistador', 'amazonico']],
    mapuche: [[1000, 'Lonko mapuche', 'Consejo de los lonkos', 'conquistador', 'lonko'], [1550, 'Lautaro', 'Toqui mapuche', 'conquistador', 'lonko'],
      [1558, 'Caupolicán', 'Toqui mapuche', 'conquistador', 'lonko'], [1598, 'Pelantaro', 'Toqui de Curalaba', 'conquistador', 'lonko'],
      [1641, 'Lientur', 'Toqui del parlamento de Quilín', 'pacifico', 'lonko'], [1860, 'Kilapán', 'Toqui de la Araucanía', 'conquistador', 'lonko']],
    tehuelche: [[1000, 'Cacique tehuelche', 'Cazadores de la Patagonia', 'explorador', 'amazonico'], [1860, 'Casimiro Biguá', 'Cacique tehuelche', 'mercader', 'amazonico']],
    querandi: [[1000, 'Cacique querandí', 'Cazadores de la pampa', 'conquistador', 'amazonico']],
    nueva_granada: [[1538, 'Gonzalo Jiménez de Quesada', 'Fundador de Santafé', 'conquistador', 'conquistador'], [1740, 'Sebastián de Eslava', 'Virrey de Nueva Granada', 'conquistador', 'virrey'],
      [1782, 'Antonio Caballero y Góngora', 'Arzobispo virrey', 'devoto', 'virrey'], [1819, 'Simón Bolívar', 'Presidente de la Gran Colombia', 'conquistador', 'militar'],
      [1832, 'Francisco de Paula Santander', 'Presidente de Nueva Granada', 'expansionista', 'militar'], [1886, 'Rafael Núñez', 'Presidente de Colombia', 'devoto', 'republicano'],
      [1904, 'Rafael Reyes', 'Presidente de Colombia', 'mercader', 'republicano'], [1934, 'Alfonso López Pumarejo', 'Presidente de Colombia', 'pacifico', 'moderno'],
      [1958, 'Alberto Lleras Camargo', 'Presidente de Colombia', 'pacifico', 'moderno'], [2002, 'Álvaro Uribe', 'Presidente de Colombia', 'conquistador', 'moderno']],
    colombia: [[1819, 'Simón Bolívar', 'Presidente de la Gran Colombia', 'conquistador', 'militar'], [1832, 'Francisco de Paula Santander', 'Presidente de Nueva Granada', 'expansionista', 'militar'],
      [1886, 'Rafael Núñez', 'Presidente de Colombia', 'devoto', 'republicano'], [1934, 'Alfonso López Pumarejo', 'Presidente de Colombia', 'pacifico', 'moderno'],
      [1958, 'Alberto Lleras Camargo', 'Presidente de Colombia', 'pacifico', 'moderno'], [2002, 'Álvaro Uribe', 'Presidente de Colombia', 'conquistador', 'moderno']],
    venezuela: [[1527, 'Juan de Ampíes', 'Fundador de Coro', 'mercader', 'conquistador'], [1777, 'Luis de Unzaga', 'Capitán general de Venezuela', 'expansionista', 'virrey'],
      [1811, 'Francisco de Miranda', 'Generalísimo de Venezuela', 'conquistador', 'militar'], [1830, 'José Antonio Páez', 'Presidente de Venezuela', 'conquistador', 'militar'],
      [1870, 'Antonio Guzmán Blanco', 'Presidente de Venezuela', 'expansionista', 'republicano'], [1908, 'Juan Vicente Gómez', 'Presidente de Venezuela', 'mercader', 'militar'],
      [1959, 'Rómulo Betancourt', 'Presidente de Venezuela', 'pacifico', 'moderno'], [1999, 'Hugo Chávez', 'Presidente de Venezuela', 'conquistador', 'militar']],
    quito: [[1534, 'Sebastián de Belalcázar', 'Fundador de San Francisco de Quito', 'conquistador', 'conquistador'], [1563, 'Hernando de Santillán', 'Presidente de la Real Audiencia', 'expansionista', 'virrey']],
    ecuador: [[1830, 'Juan José Flores', 'Presidente del Ecuador', 'conquistador', 'militar'], [1861, 'Gabriel García Moreno', 'Presidente del Ecuador', 'devoto', 'republicano'],
      [1895, 'Eloy Alfaro', 'Presidente del Ecuador', 'expansionista', 'militar'], [1934, 'José María Velasco Ibarra', 'Presidente del Ecuador', 'pacifico', 'moderno'],
      [2007, 'Rafael Correa', 'Presidente del Ecuador', 'expansionista', 'moderno']],
    charcas: [[1538, 'Pedro Anzúrez', 'Fundador de La Plata', 'conquistador', 'conquistador'], [1561, 'Pedro Ramírez de Quiñones', 'Presidente de la Audiencia de Charcas', 'mercader', 'virrey']],
    bolivia: [[1825, 'Antonio José de Sucre', 'Presidente de Bolivia', 'pacifico', 'militar'], [1829, 'Andrés de Santa Cruz', 'Protector de la Confederación Perú-Boliviana', 'expansionista', 'militar'],
      [1876, 'Hilarión Daza', 'Presidente de Bolivia', 'conquistador', 'militar'], [1952, 'Víctor Paz Estenssoro', 'Presidente de Bolivia', 'expansionista', 'moderno'],
      [2006, 'Evo Morales', 'Presidente de Bolivia', 'devoto', 'moderno']],
    rio_plata: [[1536, 'Pedro de Mendoza', 'Adelantado del Río de la Plata', 'conquistador', 'conquistador'], [1580, 'Juan de Garay', 'Fundador de Buenos Aires', 'expansionista', 'conquistador'],
      [1776, 'Pedro de Cevallos', 'Primer virrey del Río de la Plata', 'conquistador', 'virrey'], [1810, 'Cornelio Saavedra', 'Presidente de la Primera Junta', 'expansionista', 'militar'],
      [1816, 'Juan Martín de Pueyrredón', 'Director supremo', 'expansionista', 'militar'], [1829, 'Juan Manuel de Rosas', 'Gobernador de Buenos Aires', 'conquistador', 'militar'],
      [1862, 'Bartolomé Mitre', 'Presidente de Argentina', 'expansionista', 'republicano'], [1868, 'Domingo F. Sarmiento', 'Presidente de Argentina', 'devoto', 'republicano'],
      [1880, 'Julio A. Roca', 'Presidente de Argentina', 'conquistador', 'militar'], [1916, 'Hipólito Yrigoyen', 'Presidente de Argentina', 'pacifico', 'republicano'],
      [1946, 'Juan Domingo Perón', 'Presidente de Argentina', 'expansionista', 'militar'], [1983, 'Raúl Alfonsín', 'Presidente de Argentina', 'pacifico', 'moderno']],
    argentina: [[1816, 'Juan Martín de Pueyrredón', 'Director supremo', 'expansionista', 'militar'], [1829, 'Juan Manuel de Rosas', 'Gobernador de Buenos Aires', 'conquistador', 'militar'],
      [1862, 'Bartolomé Mitre', 'Presidente de Argentina', 'expansionista', 'republicano'], [1868, 'Domingo F. Sarmiento', 'Presidente de Argentina', 'devoto', 'republicano'],
      [1880, 'Julio A. Roca', 'Presidente de Argentina', 'conquistador', 'militar'], [1916, 'Hipólito Yrigoyen', 'Presidente de Argentina', 'pacifico', 'republicano'],
      [1946, 'Juan Domingo Perón', 'Presidente de Argentina', 'expansionista', 'militar'], [1983, 'Raúl Alfonsín', 'Presidente de Argentina', 'pacifico', 'moderno']],
    chile: [[1541, 'Pedro de Valdivia', 'Gobernador de Chile', 'conquistador', 'conquistador'], [1557, 'García Hurtado de Mendoza', 'Gobernador de Chile', 'conquistador', 'conquistador'],
      [1788, "Ambrosio O'Higgins", 'Gobernador de Chile', 'expansionista', 'virrey'], [1817, "Bernardo O'Higgins", 'Director supremo de Chile', 'conquistador', 'militar'],
      [1831, 'Joaquín Prieto', 'Presidente de Chile', 'conquistador', 'militar'], [1841, 'Manuel Bulnes', 'Presidente de Chile', 'conquistador', 'militar'],
      [1876, 'Aníbal Pinto', 'Presidente de Chile', 'conquistador', 'republicano'], [1886, 'José Manuel Balmaceda', 'Presidente de Chile', 'expansionista', 'republicano'],
      [1920, 'Arturo Alessandri', 'Presidente de Chile', 'mercader', 'republicano'], [1938, 'Pedro Aguirre Cerda', 'Presidente de Chile', 'pacifico', 'moderno'],
      [1970, 'Salvador Allende', 'Presidente de Chile', 'pacifico', 'moderno'], [1973, 'Augusto Pinochet', 'Jefe de la junta militar', 'conquistador', 'militar'],
      [1990, 'Patricio Aylwin', 'Presidente de Chile', 'pacifico', 'moderno'], [2006, 'Michelle Bachelet', 'Presidenta de Chile', 'pacifico', 'presidenta']],
    brasil: [[1500, 'Pedro Álvares Cabral', 'Capitán de la armada portuguesa', 'explorador', 'conquistador'], [1549, 'Tomé de Sousa', 'Primer gobernador general del Brasil', 'expansionista', 'virrey'],
      [1763, 'Marqués de Lavradio', 'Virrey del Brasil', 'mercader', 'virrey'], [1808, 'Juan VI', 'Rey de Portugal en Río de Janeiro', 'mercader', 'monarca'],
      [1822, 'Pedro I', 'Emperador del Brasil', 'conquistador', 'monarca'], [1840, 'Pedro II', 'Emperador del Brasil', 'devoto', 'monarca'],
      [1889, 'Deodoro da Fonseca', 'Presidente del Brasil', 'conquistador', 'militar'], [1930, 'Getúlio Vargas', 'Presidente del Brasil', 'expansionista', 'republicano'],
      [1956, 'Juscelino Kubitschek', 'Presidente del Brasil', 'expansionista', 'moderno'], [2003, 'Luiz Inácio Lula da Silva', 'Presidente del Brasil', 'mercader', 'moderno']],
    paraguay: [[1814, 'José Gaspar Rodríguez de Francia', 'Dictador supremo del Paraguay', 'pacifico', 'republicano'], [1844, 'Carlos Antonio López', 'Presidente del Paraguay', 'expansionista', 'republicano'],
      [1862, 'Francisco Solano López', 'Mariscal presidente del Paraguay', 'conquistador', 'militar'], [1932, 'Eusebio Ayala', 'Presidente de la guerra del Chaco', 'conquistador', 'republicano'],
      [1954, 'Alfredo Stroessner', 'Presidente del Paraguay', 'conquistador', 'militar']],
    uruguay: [[1811, 'José Gervasio Artigas', 'Protector de los Pueblos Libres', 'conquistador', 'militar'], [1830, 'Fructuoso Rivera', 'Presidente del Uruguay', 'expansionista', 'militar'],
      [1903, 'José Batlle y Ordóñez', 'Presidente del Uruguay', 'pacifico', 'republicano'], [2010, 'José Mujica', 'Presidente del Uruguay', 'pacifico', 'moderno']],
    guayana: [[1600, 'Compañía de las Indias Occidentales', 'Colonos neerlandeses, franceses e ingleses', 'mercader', 'virrey']],
    guyana: [[1966, 'Forbes Burnham', 'Presidente de Guyana', 'expansionista', 'moderno']],

    // --- Fase 3: América
    mexica: [[1325, 'Tenoch', 'Fundador de México-Tenochtitlan', 'expansionista', 'tlatoani'], [1376, 'Acamapichtli', 'Primer huey tlatoani', 'expansionista', 'tlatoani'],
      [1428, 'Itzcóatl', 'Huey tlatoani de la Triple Alianza', 'conquistador', 'tlatoani'], [1440, 'Moctezuma I', 'Huey tlatoani', 'conquistador', 'tlatoani'],
      [1486, 'Ahuízotl', 'Huey tlatoani', 'conquistador', 'tlatoani'], [1502, 'Moctezuma II', 'Huey tlatoani', 'devoto', 'tlatoani'],
      [1520, 'Cuitláhuac', 'Huey tlatoani', 'conquistador', 'tlatoani'], [1521, 'Cuauhtémoc', 'Último huey tlatoani', 'conquistador', 'tlatoani'],
      [1600, 'Descendientes de Moctezuma', 'Señores de Tenochtitlan', 'devoto', 'tlatoani']],
    tolteca: [[900, 'Ce Ácatl Topiltzin', 'Quetzalcóatl, señor de Tula', 'devoto', 'tlatoani'], [1100, 'Huémac', 'Último señor de Tula', 'conquistador', 'tlatoani']],
    maya: [[250, 'Yax Ehb Xook', 'Fundador de la dinastía de Tikal', 'expansionista', 'maya'], [615, 'Pakal el Grande', 'Ajaw de Palenque', 'devoto', 'maya'],
      [682, 'Jasaw Chan Kʼawiil', 'Ajaw de Tikal', 'conquistador', 'maya'], [987, 'Kʼukʼulkan', 'Señor de Chichén Itzá', 'mercader', 'maya'],
      [1220, 'Hunac Ceel', 'Señor de Mayapán', 'conquistador', 'maya'], [1450, 'Tutul Xiu', 'Halach uinic de Maní', 'mercader', 'maya'],
      [1530, 'Nachi Cocom', 'Señor de Sotuta', 'conquistador', 'maya'], [1618, 'Kan Ek', 'Rey de Tayasal, último reino maya', 'devoto', 'maya']],
    purepecha: [[1300, 'Tariácuri', 'Fundador del reino purépecha', 'expansionista', 'tlatoani'], [1454, 'Tzitzipandácuare', 'Cazonci purépecha', 'conquistador', 'tlatoani'],
      [1520, 'Tangáxuan II', 'Último cazonci', 'pacifico', 'tlatoani']],
    zapoteca: [[500, 'Señor de Monte Albán', 'Gobernantes zapotecas', 'devoto', 'sacerdote'], [1063, 'Ocho Venado', 'Señor mixteco de Tilantongo', 'conquistador', 'tlatoani'],
      [1487, 'Cocijoeza', 'Rey zapoteca de Zaachila', 'mercader', 'tlatoani']],
    taino: [[900, 'Cacique taíno', 'Cacicazgos de las Antillas', 'pacifico', 'amazonico'], [1492, 'Anacaona', 'Cacica de Jaragua', 'pacifico', 'amazonico'],
      [1511, 'Hatuey', 'Cacique de la resistencia en Cuba', 'conquistador', 'amazonico'], [1519, 'Enriquillo', 'Cacique del Bahoruco', 'conquistador', 'amazonico']],
    misisipiana: [[1050, 'Gran Sol de Cahokia', 'Señores de los montículos', 'devoto', 'jefe_plumas'], [1540, 'Tascalusa', 'Jefe de Mabila', 'conquistador', 'jefe_plumas']],
    pueblo: [[900, 'Consejo de Chaco', 'Pueblos ancestrales', 'pacifico', 'jefe_plumas'], [1680, 'Popé', 'Líder de la revuelta de los indios pueblo', 'conquistador', 'jefe_plumas']],
    haudenosaunee: [[1142, 'Deganawida', 'El Gran Pacificador', 'pacifico', 'jefe_plumas'], [1450, 'Hiawatha', 'Fundador de la Confederación', 'pacifico', 'jefe_plumas'],
      [1770, 'Joseph Brant', 'Jefe mohawk', 'conquistador', 'jefe_plumas'], [1800, 'Red Jacket', 'Orador seneca', 'mercader', 'jefe_plumas']],
    lakota: [[1700, 'Consejo de los Siete Fuegos', 'Oceti Sakowin', 'explorador', 'jefe_plumas'], [1866, 'Nube Roja', 'Jefe oglala', 'conquistador', 'jefe_plumas'],
      [1876, 'Toro Sentado', 'Jefe hunkpapa', 'conquistador', 'jefe_plumas'], [1877, 'Caballo Loco', 'Jefe guerrero oglala', 'conquistador', 'jefe_plumas'],
      [1890, 'Alce Negro', 'Hombre sagrado oglala', 'devoto', 'jefe_plumas'], [1973, 'Russell Means', 'Activista del Movimiento Indio Americano', 'conquistador', 'jefe_plumas']],
    comanche: [[1700, 'Cuerno Verde', 'Jefe comanche', 'conquistador', 'jefe_plumas'], [1870, 'Quanah Parker', 'Último jefe comanche libre', 'conquistador', 'jefe_plumas']],
    cheroqui: [[1700, 'Attakullakulla', 'Jefe cheroqui', 'mercader', 'jefe_plumas'], [1828, 'John Ross', 'Jefe principal de la nación cheroqui', 'pacifico', 'jefe_plumas']],
    inuit: [[1000, 'Ancianos inuit', 'Pueblos del Ártico', 'explorador', 'amazonico']],
    tlingit: [[1000, 'Jefe tlingit', 'Clanes de la costa noroeste', 'mercader', 'amazonico'], [1802, 'Katlian', 'Guerrero tlingit de Sitka', 'conquistador', 'amazonico']],
    nueva_espana: [[1519, 'Hernán Cortés', 'Capitán general de Nueva España', 'conquistador', 'conquistador'], [1535, 'Antonio de Mendoza', 'Primer virrey de Nueva España', 'expansionista', 'virrey'],
      [1766, 'Carlos Francisco de Croix', 'Virrey de Nueva España', 'conquistador', 'virrey'], [1789, 'Segundo conde de Revillagigedo', 'Virrey de Nueva España', 'mercader', 'virrey'],
      [1810, 'Francisco Javier Venegas', 'Virrey de Nueva España', 'conquistador', 'virrey']],
    mexico: [[1810, 'Miguel Hidalgo', 'Padre de la Patria', 'devoto', 'republicano'], [1821, 'Agustín de Iturbide', 'Emperador de México', 'expansionista', 'monarca'],
      [1824, 'Guadalupe Victoria', 'Presidente de México', 'pacifico', 'militar'], [1833, 'Antonio López de Santa Anna', 'Presidente de México', 'conquistador', 'militar'],
      [1858, 'Benito Juárez', 'Presidente de México', 'devoto', 'republicano'], [1876, 'Porfirio Díaz', 'Presidente de México', 'mercader', 'militar'],
      [1911, 'Francisco I. Madero', 'Presidente de México', 'pacifico', 'republicano'], [1934, 'Lázaro Cárdenas', 'Presidente de México', 'expansionista', 'moderno'],
      [2018, 'Andrés Manuel López Obrador', 'Presidente de México', 'pacifico', 'moderno'], [2024, 'Claudia Sheinbaum', 'Presidenta de México', 'pacifico', 'presidenta']],
    guatemala: [[1524, 'Pedro de Alvarado', 'Conquistador de Guatemala', 'conquistador', 'conquistador'], [1549, 'Alonso López de Cerrato', 'Presidente de la Audiencia de Guatemala', 'pacifico', 'virrey'],
      [1823, 'Manuel José Arce', 'Presidente de las Provincias Unidas del Centro de América', 'expansionista', 'militar'], [1830, 'Francisco Morazán', 'Presidente de la República Federal', 'conquistador', 'militar'],
      [1844, 'Rafael Carrera', 'Presidente de Guatemala', 'conquistador', 'militar'], [1873, 'Justo Rufino Barrios', 'Presidente de Guatemala', 'expansionista', 'militar'],
      [1945, 'Juan José Arévalo', 'Presidente de Guatemala', 'pacifico', 'moderno'], [1951, 'Jacobo Árbenz', 'Presidente de Guatemala', 'pacifico', 'moderno']],
    cuba_esp: [[1511, 'Diego Velázquez de Cuéllar', 'Gobernador de Cuba', 'conquistador', 'conquistador'], [1600, 'Capitanes generales de Cuba', 'Gobierno de la isla', 'mercader', 'virrey'],
      [1868, 'Carlos Manuel de Céspedes', 'Padre de la Patria cubana', 'conquistador', 'militar'], [1895, 'José Martí', 'Apóstol de la independencia', 'devoto', 'republicano'],
      [1902, 'Tomás Estrada Palma', 'Presidente de Cuba', 'mercader', 'republicano'], [1940, 'Fulgencio Batista', 'Presidente de Cuba', 'mercader', 'militar'],
      [1959, 'Fidel Castro', 'Comandante en jefe de Cuba', 'conquistador', 'militar'], [2008, 'Raúl Castro', 'Presidente de Cuba', 'conquistador', 'militar']],
    haiti: [[1791, 'Toussaint Louverture', 'Líder de la revolución haitiana', 'conquistador', 'militar'], [1804, 'Jean-Jacques Dessalines', 'Emperador de Haití', 'conquistador', 'monarca'],
      [1807, 'Alexandre Pétion', 'Presidente de Haití', 'pacifico', 'republicano'], [1915, 'Charlemagne Péralte', 'Líder de la resistencia contra la ocupación', 'conquistador', 'militar'],
      [1957, 'François Duvalier', 'Presidente de Haití', 'conquistador', 'moderno'], [1991, 'Jean-Bertrand Aristide', 'Presidente de Haití', 'pacifico', 'moderno']],
    nueva_francia: [[1608, 'Samuel de Champlain', 'Fundador de Quebec', 'explorador', 'conquistador'], [1665, 'Jean Talon', 'Intendente de Nueva Francia', 'expansionista', 'virrey'],
      [1672, 'Conde de Frontenac', 'Gobernador de Nueva Francia', 'conquistador', 'virrey'], [1755, 'Marqués de Vaudreuil', 'Último gobernador de Nueva Francia', 'conquistador', 'virrey'],
      [1763, 'Guy Carleton', 'Gobernador de la Norteamérica británica', 'expansionista', 'virrey'], [1867, 'John A. Macdonald', 'Primer ministro de Canadá', 'expansionista', 'republicano'],
      [1896, 'Wilfrid Laurier', 'Primer ministro de Canadá', 'mercader', 'republicano'], [1921, 'William L. Mackenzie King', 'Primer ministro de Canadá', 'pacifico', 'moderno'],
      [1968, 'Pierre Trudeau', 'Primer ministro de Canadá', 'pacifico', 'moderno']],
    trece_colonias: [[1607, 'John Smith', 'Capitán de Jamestown', 'explorador', 'conquistador'], [1630, 'John Winthrop', 'Gobernador de la bahía de Massachusetts', 'devoto', 'virrey'],
      [1754, 'Benjamin Franklin', 'Delegado de las colonias', 'mercader', 'republicano'], [1776, 'George Washington', 'Presidente de los Estados Unidos', 'expansionista', 'militar'],
      [1801, 'Thomas Jefferson', 'Presidente de los Estados Unidos', 'explorador', 'republicano'], [1829, 'Andrew Jackson', 'Presidente de los Estados Unidos', 'conquistador', 'militar'],
      [1845, 'James K. Polk', 'Presidente de los Estados Unidos', 'conquistador', 'republicano'], [1861, 'Abraham Lincoln', 'Presidente de los Estados Unidos', 'pacifico', 'republicano'],
      [1901, 'Theodore Roosevelt', 'Presidente de los Estados Unidos', 'conquistador', 'republicano'], [1933, 'Franklin D. Roosevelt', 'Presidente de los Estados Unidos', 'expansionista', 'moderno'],
      [1961, 'John F. Kennedy', 'Presidente de los Estados Unidos', 'explorador', 'moderno'], [1981, 'Ronald Reagan', 'Presidente de los Estados Unidos', 'conquistador', 'moderno'],
      [2009, 'Barack Obama', 'Presidente de los Estados Unidos', 'pacifico', 'moderno']],
    alaska_rusa: [[1741, 'Vitus Bering', 'Explorador al servicio del zar', 'explorador', 'conquistador'], [1799, 'Aleksandr Baránov', 'Director de la Compañía Ruso-Americana', 'mercader', 'virrey']]
  };

  // Nombre de cada país según la época: [desde el año, nombre]. Solo se aplica a los rivales.
  PC.FACTION_NAMES = {
    nueva_granada: [[1538, 'Nuevo Reino de Granada'], [1739, 'Virreinato de Nueva Granada'], [1819, 'Gran Colombia'], [1831, 'Nueva Granada'], [1886, 'Colombia']],
    venezuela: [[1527, 'Provincia de Venezuela'], [1777, 'Capitanía de Venezuela'], [1811, 'Venezuela']],
    quito: [[1534, 'Real Audiencia de Quito'], [1830, 'Ecuador']],
    charcas: [[1538, 'Audiencia de Charcas'], [1825, 'Bolivia']],
    rio_plata: [[1536, 'Gobernación del Río de la Plata'], [1776, 'Virreinato del Río de la Plata'], [1816, 'Provincias Unidas del Río de la Plata'], [1861, 'Argentina']],
    chile: [[1541, 'Capitanía de Chile'], [1818, 'Chile']],
    brasil: [[1500, 'Brasil portugués'], [1815, 'Reino del Brasil'], [1822, 'Imperio del Brasil'], [1889, 'Brasil']],
    guayana: [[1600, 'Guayanas europeas'], [1966, 'Guayanas']],
    nueva_espana: [[1519, 'Nueva España'], [1821, 'Imperio Mexicano'], [1824, 'México']],
    guatemala: [[1524, 'Capitanía de Guatemala'], [1823, 'Provincias Unidas del Centro de América'], [1841, 'Guatemala']],
    cuba_esp: [[1511, 'Cuba española'], [1902, 'Cuba']],
    nueva_francia: [[1608, 'Nueva Francia'], [1763, 'Norteamérica británica'], [1867, 'Canadá']],
    trece_colonias: [[1607, 'Colonias británicas'], [1776, 'Estados Unidos']],
    mexica: [[1325, 'Mexicas'], [1428, 'Triple Alianza mexica']]
  };
  // Al independizarse, las colonias cambian de clave de líderes (Nueva España → México, Quito → Ecuador…).
  PC.LEADER_KEY_AFTER = { nueva_espana: [1810, 'mexico'], quito: [1830, 'ecuador'], charcas: [1825, 'bolivia'] };

  // Historia alternativa: si la conquista española no triunfó, los Sapa Inca siguen gobernando desde el Cusco.
  PC.LEADER_HISTORY_ALT = {
    inca: { from: 1533, when: (g) => !g.flags.virreinatoAI && !g.flags.virreinato, list: [
      [1533, 'Atahualpa', 'Sapa Inca, vencedor de Cajamarca', 'conquistador', 'pachacutec'], [1560, 'Titu Cusi Yupanqui', 'Sapa Inca', 'devoto', 'manco_inca'],
      [1600, 'Sapa Inca del Tahuantinsuyo', 'Dinastía inca soberana', 'expansionista', 'huayna_capac'], [1850, 'Consejo del Tahuantinsuyo', 'Monarquía andina constitucional', 'mercader', 'huayna_capac']] }
  };

  PC.historicalLeader = function (key, year, civName) {
    const k = PC.LEADER_KEY_AFTER[key] && year >= PC.LEADER_KEY_AFTER[key][0] ? PC.LEADER_KEY_AFTER[key][1] : key;
    let list = PC.LEADER_HISTORY[k];
    const alt = PC.LEADER_HISTORY_ALT[k];
    if (list && alt && year >= alt.from && PC.G && alt.when(PC.G)) list = list.filter((x) => x[0] < alt.from).concat(alt.list);
    if (!list) return null;
    let e = list[0];
    list.forEach((x) => { if (x[0] <= year) e = x; });
    // Pueblos que sobreviven más allá de su último líder conocido: gobiernos propios de la historia alternativa.
    if (year - e[0] > 150 && civName) {
      const modern = year >= 1850;
      return { name: modern ? 'Gobierno republicano' : 'Consejo de ancianos', title: modern ? 'Estado soberano en la historia alternativa' : 'Herederos de ' + e[1],
        agenda: e[3], model: year >= 1900 ? 'moderno' : e[4], since: e[0] + 150 };
    }
    return { name: e[1], title: e[2], agenda: e[3], model: e[4], since: e[0] };
  };
  PC.historicalName = function (key, year) {
    const list = PC.FACTION_NAMES[key];
    if (!list) return null;
    let n = null;
    list.forEach((x) => { if (x[0] <= year) n = x[1]; });
    return n;
  };
})(globalThis.PC = globalThis.PC || {});

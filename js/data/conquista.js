// Datos de la Conquista (v0.1.3): los frentes por los que la Corona de Castilla y la de Portugal entran en América.
// Cada frente tiene su fecha, su fuerza invasora (la clave de la civilización de la Corona en ese frente), las regiones
// donde se combate, los pueblos que históricamente se aliaron con los invasores y los comandantes que se suceden.
(function (PC) {
  'use strict';

  // crown: clave de la civilización invasora (js/core/world.js las crea en su fecha; 'espana' la crea el evento de la llegada).
  // regions: regiones de los mapas continentales donde se combate (en el mapa del Perú, el frente 'peru' abarca todo el mapa).
  // aliados: claves de pueblos con motivos históricos para pactar con la Corona (rivalidad con el imperio dominante, etc.).
  // tenacity: ventaja histórica de la Corona en el frente (+) o de la resistencia (−); escala su fuerza (ver TUNE en js/core/conquista.js).
  // hist: frente que en la historia cayó sin remedio; en dificultad Realista (histAI) la Corona se afianza en él con más fuerza.
  PC.CONQUISTA_FRONTS = [
    { id: 'antillas', tenacity: 0.15, name: 'Antillas y el Caribe', year: 1493, crown: 'cuba_esp', crownName: 'Corona de Castilla', phases: ['america'],
      regions: ['la_espanola', 'cuba', 'antillas_menores'], aliados: [],
      commanders: ['Cristóbal Colón', 'Nicolás de Ovando', 'Diego Velázquez'],
      text: 'Desde La Española, los castellanos buscan oro y esclavos entre los taínos.' },
    { id: 'brasil', tenacity: -0.2, name: 'Costa del Brasil', year: 1500, crown: 'brasil', crownName: 'Corona de Portugal', phases: ['sudamerica', 'america'],
      regions: ['bahia', 'nordeste', 'sudeste', 'sur_brasil', 'centro_oeste'], aliados: ['tupi'],
      commanders: ['Pedro Álvares Cabral', 'Martim Afonso de Sousa', 'Tomé de Sousa'],
      text: 'Los portugueses se asientan en la costa y se alían con unos tupíes contra otros.' },
    { id: 'nueva_espana', tenacity: 0.25, hist: true, name: 'México y Mesoamérica', year: 1519, crown: 'nueva_espana', crownName: 'Corona de Castilla', phases: ['america'],
      regions: ['valle_mexico', 'golfo', 'oaxaca', 'yucatan', 'occidente_mx', 'noreste_mx', 'chihuahua', 'sonora'], aliados: ['zapoteca', 'purepecha'],
      commanders: ['Hernán Cortés', 'Pedro de Alvarado', 'Nuño de Guzmán'],
      text: 'Cortés desembarca en la costa del Golfo y encuentra pueblos sometidos que odian el tributo mexica.' },
    { id: 'guatemala', tenacity: 0, name: 'Guatemala y Centroamérica', year: 1524, crown: 'guatemala', crownName: 'Corona de Castilla', phases: ['america'],
      regions: ['guatemala', 'centroamerica', 'istmo'], aliados: [],
      commanders: ['Pedro de Alvarado', 'Jorge de Alvarado'],
      text: 'Alvarado baja desde México hacia los reinos mayas divididos.' },
    { id: 'nueva_granada', tenacity: 0.15, hist: true, name: 'Nueva Granada', year: 1525, crown: 'nueva_granada', crownName: 'Corona de Castilla', phases: ['sudamerica', 'america'],
      regions: ['caribe', 'colombia'], aliados: [],
      commanders: ['Rodrigo de Bastidas', 'Gonzalo Jiménez de Quesada'],
      text: 'Los castellanos suben por el Magdalena hacia el altiplano muisca.' },
    { id: 'venezuela', tenacity: -0.25, name: 'Venezuela y los Llanos', year: 1527, crown: 'venezuela', crownName: 'Corona de Castilla', phases: ['sudamerica', 'america'],
      regions: ['venezuela', 'llanos'], aliados: [],
      commanders: ['Juan de Ampíes', 'Ambrosio Alfinger'],
      text: 'Los banqueros alemanes de la Corona exploran la costa y los Llanos.' },
    { id: 'peru', tenacity: 0.2, hist: true, name: 'Los Andes del Perú', year: 1532, crown: 'espana', crownName: 'Corona de Castilla', phases: ['peru', 'sudamerica', 'america'],
      regions: ['peru_norte', 'peru_centro', 'peru_sur', 'amazonia_peruana'], aliados: ['chanka', 'huanca', 'chachapoyas', 'cajamarca', 'huaylas', 'quitu'],
      commanders: ['Francisco Pizarro', 'Diego de Almagro', 'Sebastián de Belalcázar', 'Hernando Pizarro'],
      text: 'Pizarro desembarca en Tumbes: un imperio dividido y pueblos que quieren cobrarse viejas deudas.' },
    { id: 'quito', tenacity: 0.1, name: 'Quito y los Andes ecuatoriales', year: 1534, crown: 'quito', crownName: 'Corona de Castilla', phases: ['sudamerica', 'america'],
      regions: ['ecuador'], aliados: [],
      commanders: ['Sebastián de Belalcázar', 'Hernando de Santillán'],
      text: 'Belalcázar avanza sobre Quito mientras Rumiñahui incendia la ciudad.' },
    { id: 'rio_plata', tenacity: -0.05, hist: true, name: 'Río de la Plata y el Paraguay', year: 1536, crown: 'rio_plata', crownName: 'Corona de Castilla', phases: ['sudamerica', 'america'],
      regions: ['pampa', 'uruguay', 'paraguay', 'noroeste', 'chaco'], aliados: ['guarani'],
      commanders: ['Pedro de Mendoza', 'Domingo Martínez de Irala', 'Juan de Garay'],
      text: 'Mendoza funda Buenos Aires y los guaraníes ofrecen a sus hijas a los españoles de Asunción.' },
    { id: 'charcas', tenacity: 0.25, hist: true, name: 'Charcas y el Altiplano', year: 1538, crown: 'charcas', crownName: 'Corona de Castilla', phases: ['sudamerica', 'america'],
      regions: ['altiplano', 'oriente'], aliados: [],
      commanders: ['Gonzalo Pizarro', 'Pedro Anzúrez'],
      text: 'La plata del Cerro Rico atrae a los conquistadores hacia el altiplano.' },
    { id: 'chile', tenacity: -0.25, name: 'Chile y la Araucanía', year: 1541, crown: 'chile', crownName: 'Corona de Castilla', phases: ['sudamerica', 'america'],
      regions: ['chile_central', 'araucania', 'atacama', 'cuyo'], aliados: ['diaguita'],
      commanders: ['Pedro de Valdivia', 'Francisco de Villagra', 'García Hurtado de Mendoza'],
      text: 'Valdivia funda Santiago; al sur, los mapuches se preparan para una guerra de siglos.' }
  ];
  PC.CONQUISTA_FRONT = {};
  PC.CONQUISTA_FRONTS.forEach((f) => { PC.CONQUISTA_FRONT[f.id] = f; });
  // Los pueblos y los años en que la Conquista está «viva»: pasados unos años, el frente se da por asentado.
  PC.CONQUISTA_SETTLE = 60;
  // Nombre de cada estado de un frente.
  PC.CONQUISTA_STATE = { pendiente: 'En camino', activo: 'En guerra', resistida: 'La Corona fue expulsada', conquistada: 'Conquistado' };
  PC.CONQUISTA_STANCE = { neutral: 'Neutral', resiste: 'Resiste', liga: 'En la liga', corona: 'Aliado de la Corona', vasallo: 'Vasallo de la Corona', caido: 'Caído' };
})(globalThis.PC = globalThis.PC || {});

# Perú Civilization

Juego de estrategia por turnos (estilo *Civilization*) sobre la historia del Perú, **no lineal**: tus decisiones, los recursos que controlas y los eventos que enfrentas producen un Perú distinto en cada partida. Va de Caral (3000 a.C.) al siglo XXI y se expande por fases: **Perú → Sudamérica → América → el Mundo**.

La base histórica y demográfica está en [`docs/INVESTIGACION_HISTORICA.md`](docs/INVESTIGACION_HISTORICA.md).

## Cómo jugar

No requiere instalación: three.js va incluido en `js/vendor/`. Abre `index.html` en un navegador moderno con WebGL, con doble clic, o sírvelo localmente:

```bash
python3 -m http.server 8000   # y abre http://localhost:8000
```

**Controles:** clic para seleccionar y mover · anillo rojo = atacar · arrastrar para desplazar · botón derecho o `Q`/`E` para girar · rueda = zoom · `Enter` terminar turno · `N` siguiente unidad · `F` fortificar · `B` fundar ciudad · `Espacio` esperar · `T` tecnologías · `D` diplomacia · `P` provincias · `C` crónica. En tablet: un dedo desplaza, dos dedos acercan y giran.

### Menú
Como en Civilization, el menú va por pantallas: **pantalla principal** (Continuar, Nueva partida, Cargar partida, Opciones), luego **Líder** (lista con retratos y el modelo 3D girando, con su habilidad y personalidad), **Civilización y escenario**, y **Configuración de la partida** (dificultad, punto de partida y opciones avanzadas). `Esc` vuelve a la pantalla anterior.

### Líderes, inicio y diplomacia (inspirado en Civilization VII)
- **Líder histórico** con modelo 3D low-poly propio (mascapaicha y orejeras de los incas, el tocado de oro del Señor de Sipán, la máscara de jaguar de Chavín, la montera de Micaela Bastidas, el bicornio de Grau…) y ventaja única, independiente de la cultura: Pachacútec, Túpac Yupanqui, Huayna Cápac, Mama Ocllo, Señor de Sipán, Taycanamo, el sumo sacerdote de Chavín, Manco Inca, Micaela Bastidas y Túpac Amaru II; y de la Colonia y la República, Juan Santos Atahualpa, María Parado de Bellido, José Olaya, Ramón Castilla, Miguel Grau, Francisco Bolognesi y Andrés A. Cáceres.
- **Punto de partida**: cualquier provincia del Perú, elegida en una lista o con un clic sobre la maqueta del menú.
- **Acciones por unidad** según su tipo y su situación: fundar, abrir ruta comercial (caravana de llamas), arengar (comandantes históricos como Rumiñahui o Quisquis, que dan +20% a las tropas cercanas), fortificar, curar hasta sanar, saquear, centinela, modernizar, esperar y disolver.
- **Diplomacia con los líderes rivales**, cada uno con su agenda: regalos, paso libre, **embajadas**, alianzas (los aliados entran en tus guerras y te llaman a las suyas), pedir ayuda en una guerra, denuncias, tributo, vasallaje y anexión por reciprocidad. Las acciones cuestan **influencia**.
- **Líderes históricos para cada país, que se suceden con los años**: los Sapa Inca de Manco Cápac a Túpac Amaru I (o, si la conquista fracasa, una dinastía inca soberana), los virreyes del Perú, los tlatoanis mexicas de Tenoch a Cuauhtémoc, los ajaw mayas, los toquis mapuches, y los gobernantes de cada república: de Bolívar y Santander a Uribe en Colombia, de O'Higgins a Bachelet en Chile, de Washington a Obama, de Juárez a Sheinbaum… Cada sucesión aparece en la crónica y suaviza las viejas rencillas. Los rivales también cambian de nombre al independizarse (Virreinato del Río de la Plata → Provincias Unidas → Argentina).
- **La IA toma la iniciativa**: te propone embajadas, paso libre, alianzas y guerras conjuntas contra un enemigo común; te exige tributo o te lanza **ultimátums** (paga, cede una ciudad o te invade); se denuncian y se alían entre ellos, y quien declara una guerra lanza una invasión real contra tus ciudades.
- **Congreso de los pueblos** (Asamblea del oráculo de Pachacámac, Junta de los pueblos, Congreso Anfictiónico, Conferencia Panamericana, OEA según la época): cada 20 turnos se vota una resolución (condena del agresor, embargo, tregua general, fomento del comercio, patrimonio de los pueblos, limitación de armamentos o sede permanente). Cada miembro vota según su agenda y sus relaciones; puedes gastar influencia para sumar votos, y los demás recuerdan cómo votaste.
- **Guerras**: formales (tras denunciar) o sorpresa (con penalización). La paz se negocia según el **puntaje de guerra**: paz blanca, reparaciones en oro o cesión de una ciudad.
- **Embarcaciones según la época**: caballito de totora, balsa con vela, galeón, vapor y buque moderno.

### Gráficos
Maqueta 3D low-poly hecha con three.js sobre un manto tejido. La interfaz usa iconos **tocapu** (pictogramas tejidos en una rejilla de 9×9) y no emojis; el sistema visual está documentado en [`DESIGN.md`](DESIGN.md).
- **Unidades**: escuadrones con el equipo de su época (porra, honda, macana, lanza de cobre, hierro, arcabuz, fusil, casco moderno, caballería, cañón, blindado). Cada una lleva el estandarte con el emblema de su civilización y un anillo de bando: amarillo si es tuya, rojo pulsante si es enemiga en guerra.
- **Grandes proyectos** de ciudad: *Inti Raymi* (cohesión y cultura), *Obras públicas* (producción y alimento) y *Misión científica* (investigación) convierten el oro en progreso; su coste y su efecto suben con la era.
- **Mantenimiento proporcional**: las tropas excedentes cuestan más en cada era y los edificios nunca se llevan más del 60% del oro de las ciudades; en los mapas continentales saturados la IA licencia sus unidades obsoletas o sobrantes.
- **Modernización**: una unidad antigua se moderniza pagando oro cuando descubres su sucesora, y cambia de modelo.
- **Ciudades**: cambian con la era (chozas, kanchas de piedra, casas coloniales, ladrillo industrial y torres), la población y los edificios. Las maravillas (Caral, Chavín, Nasca, Chan Chan, Kuélap, Machu Picchu…) tienen modelo propio, igual que los recursos, las mejoras y la fauna.

La partida se guarda automáticamente en el navegador cada turno y también se puede exportar o importar como `.json`. El guardado (formato v2) es compacto (≈290 KB tras 150 turnos en América, antes ≈530 KB) y las partidas guardadas con versiones anteriores se migran solas al cargarlas.

## Diseño

### Mapa (Fase 1: Perú)
- **~250 hexágonos** en **42 provincias histórico-geográficas** (valles de Chira-Piura, Moche, Rímac, Ica-Nasca; Cajamarca, Callejón de Huaylas, Mantaro, Cusco, Titicaca; Chachapoyas, Ucayali, Madre de Dios…).
- **Proporciones reales**: ≈12% costa, 28% sierra y 60% selva. Cada macrozona tiene su propia escala para que los valles costeros, que son estrechos, no desaparezcan.
- **Costa**: valles-oasis fértiles separados por **desierto**, que cuesta 2 de movimiento y causa desgaste.
- **Sierra**: las **cordilleras** son barreras: consumen todo el movimiento, dan +50% de defensa y causan desgaste. Se cruzan por las **abras** históricas (Porculla, Conococha, Ticlio, La Raya…).
- **Selva**: **niebla de guerra densa**: solo se ven las casillas adyacentes y lo explorado se olvida si no hay presencia. También hay **desgaste** y **fauna peligrosa** (otorongos 🐆, shushupes 🐍, caimanes 🐊, pirañas 🐟, mosquitos de la malaria 🦟). Los ríos son las únicas vías seguras. Los pueblos amazónicos son inmunes, y las tecnologías *Conocimiento amazónico* y *Medicina* reducen el peligro.

### Historia no lineal
- **Recursos que cambian la historia**: el bronce exige cobre o estaño, el hierro exige hierro (Marcona, Apurímac), el acero carbón y la pólvora salitre o guano. Asentarte junto a los minerales permite tener armas de hierro o de fuego antes de 1532. Sin el recurso propio, la tecnología se puede comerciar con un vecino en paz, pero cuesta más.
- **Culturas históricas** (Chavín, Paracas, Moche, Nasca, Wari, Tiwanaku, Lambayeque, Chimú, Chachapoyas, Chanka, Colla, Incas…) aparecen en su fecha. Si la tierra es de una IA, la nueva cultura le sucede (Huaca Prieta → Moche → Chimú). Si es tuya, florece dentro de tu civilización.
- **Eventos con decisiones**: El Niño, terremotos, contacto con Mesoamérica, el viaje de Túpac Yupanqui, la guerra de sucesión, la epidemia de 1525, la **llegada de los españoles** (recibirlos en Cajamarca, emboscarlos, aliarse o fortificarse), la caída de la capital (resistencia en Vilcabamba o vasallaje), Túpac Amaru II, la Independencia, la era del guano, la Guerra del Pacífico, la fiebre del caucho y la reforma agraria.
- **Eventos continentales** (Fases 2 y 3): la Doctrina Monroe, la Guerra de la Triple Alianza, el Canal de Panamá, la Revolución mexicana, la Guerra del Chaco, la Guerra Fría y la crisis del petróleo, cada uno con al menos una opción que se desvía de la historia.
- **Escenarios**: Orígenes (3000 a.C.), Tahuantinsuyo (1438), Cajamarca (1532, Atahualpa ante Pizarro), Independencia (1820, contra el ejército realista), Guerra del Pacífico (1879) y Sudamérica (1810), que empieza directamente en la Fase 2.
- **Divergencias**: la crónica registra cada vez que tu historia se aparta de la real.

### Niveles de IA
| Nivel | Qué cambia |
|---|---|
| Fácil | IA lenta y pacífica, invasiones pequeñas y epidemias más suaves. |
| Medio | Equilibrado. |
| Difícil | IA más productiva y agresiva; la conquista llega con más fuerza. |
| **Realista** | Lo más apegado a la historia: la IA recibe las tecnologías en su fecha real; Wari, Tiwanaku, Chimú y los Incas se expanden en su ventana histórica; la viruela y la guerra civil de 1529 golpean también a la IA; hay hasta 8 oleadas españolas con más aliados indígenas; en los mapas continentales las colonias europeas reciben más refuerzos y durante más años. **Desviarse es muy difícil pero no imposible**: las tecnologías alternativas cuestan 1,6× y exigen el recurso en territorio propio, sin comercio. |

### Fases
1. **Perú** — completa.
2. **Sudamérica** — jugable. Se desbloquea al controlar el 60% de las provincias (desde 1600 basta el 40%). Conservas tecnologías, ciudades (reubicadas por coordenadas reales) y ejército. El continente se puebla según el año: pueblos originarios (muiscas, mapuches, guaraníes, tupíes…), virreinatos o repúblicas. Si llegas antes de 1500, los europeos desembarcan en su fecha (Brasil portugués en 1500, Nueva Granada en 1525, el Río de la Plata en 1536, Chile en 1541…), con epidemias por delante y refuerzos de ultramar; las colonias pueden afianzarse e independizarse o ser expulsadas.
3. **América** — jugable. Se desbloquea al controlar el 60% de las regiones de Sudamérica (40% desde 1600). Un mapa de todo el continente, del Ártico a la Tierra del Fuego (≈880 hexágonos de tierra y 68 regiones, con la longitud comprimida según la latitud para que Canadá no ocupe más que Sudamérica), con tundra, bosque boreal, praderas, las Rocosas, la Sierra Madre, los Apalaches, los Grandes Lagos, el Misisipi y las Antillas. Aparecen mexicas (o toltecas antes de 1325), mayas, purépechas, zapotecas, taínos, la cultura del Misisipi, los haudenosaunee, lakotas o cheroquis; luego Nueva España, Nueva Francia y las colonias británicas, y finalmente México, Estados Unidos, Canadá, Centroamérica, Cuba o Haití.
- **Maravillas continentales**: Puerta del Sol de Tiwanaku y Cerro Rico de Potosí (altiplano), Teotihuacan y Tenochtitlan (valle de México), Chichén Itzá (Yucatán), Tikal (Guatemala), Cahokia (Misisipi), Canal de Panamá (istmo, era industrial) y Cristo Redentor (sudeste de Brasil, era moderna); solo se construyen en su fase y en una ciudad de su región.

4. **El Mundo** — en desarrollo. Se anunciará al controlar el 60% de las regiones de América (40% desde 1600).

## Estructura

```
index.html, css/style.css
js/core/util.js        azar con semilla, ruido, hexágonos
js/data/geo.js         geografía del Perú (contorno, Andes, ríos, abras, provincias, yacimientos)
js/data/geo_sa.js      geografía de Sudamérica (Fase 2) y sus colonizaciones
js/data/geo_am.js      geografía de América (Fase 3): contorno, islas, cordilleras, ríos, regiones y facciones por época
js/data/leaders_hist.js líderes históricos de cada país por año y nombres de los países según la época
js/data/rules.js       terrenos, fauna, recursos, mejoras, tecnologías, unidades, edificios, maravillas, dificultad
js/data/civs.js        culturas jugables, facciones, apariciones históricas, escenarios
js/data/continent.js   maravillas continentales, la República del Perú y los escenarios de 1532, 1810, 1820 y 1879
js/core/mapgen.js      generador del mapa del Perú (proyección por macrozonas)
js/core/game.js        motor: ciudades, unidades, movimiento, combate, desgaste, cohesión, turnos
js/core/ai.js          IA de las facciones
js/core/setup.js       creación, guardado y carga de partidas
js/core/save.js        formato de guardado compacto (v2) y migración de partidas antiguas (PC.migrateSave)
js/core/events.js      historia dinámica, llegada europea, eventos y divergencias
js/core/diplomacy.js   guerra, paz y anexión por reciprocidad
js/core/phases.js      fases de expansión: mapas continentales y traslado de tu civilización
js/core/world.js       historia viva: sucesión de líderes, independencias, colonizaciones, iniciativas de la IA y congreso
js/core/economy.js     mantenimiento proporcional de tropas y edificios, y licenciamiento de tropas sobrantes
js/core/projects.js    grandes proyectos de ciudad (Inti Raymi, Obras públicas, Misión científica)
js/core/continent.js   maravillas por fase y región, y preparación de los escenarios nuevos
js/core/events_continent.js eventos continentales de las Fases 2 y 3
js/ui/icons.js         iconos y emblemas tocapu
js/ui/render3d.js      maqueta 3D (three.js)
js/ui/ui.js            interfaz
js/vendor/three.min.js three.js r158 (licencia MIT)
.claude/skills/impeccable  skill de diseño de interfaces (Apache 2.0)
tests/smoke.js         prueba que juega partidas completas en piloto automático
tests/determinism.js   misma semilla → misma partida, también guardando y cargando a mitad
tests/save.js          guardar y cargar en cada fase, migración desde v1 y tamaño del guardado
.github/workflows/test.yml  integración continua: npm test con Node 20 en cada push y pull request
```

## Pruebas

```bash
npm test          # humo + determinismo + guardado
node tests/smoke.js [semilla] [escenario] [cultura]
node tests/determinism.js [semilla]
node tests/save.js [semilla]
```

Juega 12 partidas completas y 4 partidas cortas de los escenarios nuevos, con todos los escenarios, varias culturas, las 4 dificultades y las transiciones a las Fases 2 y 3, y falla si hay algún error. Además se comprueba que la misma semilla produce la misma partida turno a turno (también tras guardar y cargar) y que el guardado funciona en las tres fases y con partidas antiguas.

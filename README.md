# Perú Civilization

Juego de estrategia por turnos (estilo *Civilization*) sobre la historia del Perú, **no lineal**: tus decisiones, los recursos que controlas y los eventos que enfrentas producen un Perú distinto en cada partida. Va de Caral (3000 a.C.) al siglo XXI y se expande por fases: **Perú → Sudamérica → América → el Mundo**.

La base histórica y demográfica está en [`docs/INVESTIGACION_HISTORICA.md`](docs/INVESTIGACION_HISTORICA.md).

## Cómo jugar

No requiere instalación ni dependencias. Abre `index.html` en un navegador moderno (doble clic), o sírvelo localmente:

```bash
python3 -m http.server 8000   # y abre http://localhost:8000
```

**Controles:** clic para seleccionar y mover · borde rojo = atacar · arrastrar para desplazar · rueda = zoom · `Enter` terminar turno · `N` siguiente unidad · `F` fortificar · `B` fundar ciudad · `Espacio` saltar · `T` tecnologías · `D` diplomacia · `P` provincias · `C` crónica.

La partida se guarda automáticamente en el navegador cada turno y también se puede exportar o importar como `.json`.

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
- **Divergencias**: la crónica registra cada vez que tu historia se aparta de la real.

### Niveles de IA
| Nivel | Qué cambia |
|---|---|
| Fácil | IA lenta y pacífica, invasiones pequeñas y epidemias más suaves. |
| Medio | Equilibrado. |
| Difícil | IA más productiva y agresiva; la conquista llega con más fuerza. |
| **Realista** | Lo más apegado a la historia: la IA recibe las tecnologías en su fecha real; Wari, Tiwanaku, Chimú y los Incas se expanden en su ventana histórica; la viruela y la guerra civil de 1529 golpean también a la IA; hay hasta 8 oleadas españolas con más aliados indígenas. **Desviarse es muy difícil pero no imposible**: las tecnologías alternativas cuestan 1,6× y exigen el recurso en territorio propio, sin comercio. |

### Fases
1. **Perú** — completa.
2. **Sudamérica** — jugable. Se desbloquea al controlar el 80% de las provincias. Conservas tecnologías, ciudades (reubicadas por coordenadas reales) y ejército. El continente se puebla según el año: pueblos originarios (muiscas, mapuches, guaraníes, tupíes…), virreinatos o repúblicas.
3. **América** y 4. **El Mundo** — en desarrollo. La arquitectura de fases (`js/core/phases.js`) ya está preparada.

## Estructura

```
index.html, css/style.css
js/core/util.js        azar con semilla, ruido, hexágonos
js/data/geo.js         geografía del Perú (contorno, Andes, ríos, abras, provincias, yacimientos)
js/data/geo_sa.js      geografía de Sudamérica (Fase 2)
js/data/rules.js       terrenos, fauna, recursos, mejoras, tecnologías, unidades, edificios, maravillas, dificultad
js/data/civs.js        culturas jugables, facciones, apariciones históricas, escenarios
js/core/mapgen.js      generador del mapa del Perú (proyección por macrozonas)
js/core/game.js        motor: ciudades, unidades, movimiento, combate, desgaste, cohesión, turnos
js/core/ai.js          IA de las facciones
js/core/setup.js       creación, guardado y carga de partidas
js/core/events.js      historia dinámica, llegada europea, eventos y divergencias
js/core/diplomacy.js   guerra, paz y anexión por reciprocidad
js/core/phases.js      fases de expansión (Sudamérica)
js/ui/render.js        render del mapa en canvas
js/ui/ui.js            interfaz
tests/smoke.js         prueba que juega partidas completas en piloto automático
```

## Pruebas

```bash
npm test          # o: node tests/smoke.js [semilla] [escenario] [cultura]
```

Juega 10 partidas completas, con todos los escenarios, varias culturas, las 4 dificultades y la transición a la Fase 2, y falla si hay algún error.

# Design

Sistema visual de **Perú Civilization**, dirección "Tocapu textil". La interfaz está tejida como un unku inca: los iconos son tocapus y los paneles son bandas de tela alrededor de una maqueta 3D low-poly.

## Color

| Token | Valor | Uso |
|---|---|---|
| `--lana` | `#151c35` | Fondo de lana añil (pantalla, manto bajo el mapa) |
| `--lana-2` | `#1d2646` | Paneles y diálogos |
| `--lana-3` | `#28335c` | Controles elevados |
| `--hilo` | `#0b1022` | Juntas, sombras, fondos de barras |
| `--grana` / `--grana-2` | `#a3243b` / `#c23a50` | Grana cochinilla: cenefas y segundo hilo de los iconos |
| `--qolli` / `--qolli-2` | `#e2a72e` / `#f3c85e` | Selección, turno, botón principal y todo lo que es del jugador |
| `--algodon` / `--algodon-2` | `#efe4cc` / `#c0b8cf` | Texto y texto secundario |
| `--verde` | `#86ba6f` | Estado favorable |
| `--cinabrio` | `#f07257` | Estado crítico y enemigos en guerra |

Una sola apariencia oscura, deliberada (`color-scheme: dark`). Los colores de cada civilización vienen de los datos del juego y solo se usan en emblemas, estandartes, fronteras y túnicas.

## Tipografía

- Titulares: **Alegreya SC** (500/700/800), con letras de cronista colonial.
- Texto y cifras: **Alegreya Sans**, con `font-variant-numeric: tabular-nums` en estadísticas y tablas.
- Escala: 0.75 / 0.875 / 1 / 1.25 / 1.75 / 3 rem.

## Iconos tocapu

`js/ui/icons.js`: pictogramas en una rejilla de 9×9, con `a` como hilo principal (`currentColor`) y `b` como hilo de contraste (`--ico-b`). Se dibujan en SVG con `shape-rendering: crispEdges`. Cada civilización tiene un emblema tocapu simétrico generado a partir de su clave. El emblema aparece en el menú, la barra superior, los paneles y los estandartes 3D de sus unidades. No se usan emojis.

## Componentes

- **Cenefa**: banda escalonada en SVG (`--cenefa`) que remata la barra superior, el menú y los diálogos.
- **Botones**: `.btn` (lana elevada), `.btn.primary` (qolli), `.btn.danger`, `.btn.ghost`; radio de 3 px; foco visible en qolli.
- **Controles segmentados**: `.seg` para el escenario y la dificultad; las tarjetas `.cul` muestran cada cultura con su emblema.
- **Paneles**: cabecera `.ph` (icono sobre el color de la civilización), fila de datos `.trio`, barras `.bar` y `.cen-bar`, pestañas `.tabs` y lista de producción `.bopt`.
- **Etiquetas de ciudad**: `.citylabel`, en HTML proyectado sobre el 3D, con borde qolli si la ciudad es tuya y cinabrio si su dueño está en guerra contigo.
- **Vitrina 3D** (`.model-stage`): panel oscuro con el modelo manipulable y, debajo, la ficha de lo elegido (`.people`, `.land-info`); la rejilla de las pantallas de civilización y partida es `.pick-grid` (formulario a la izquierda, vitrina a la derecha, apiladas en pantallas estrechas).

- **Capitán general** (v0.1.3): unidad única de cada Corona en la Conquista. Sin emojis: se distingue por el estandarte de su Corona y por el nombre del comandante histórico en su etiqueta; los frentes usan `--grana` y `--cinabrio` para el bando invasor y `--qolli` para la resistencia.

## Mapa 3D

`js/ui/render3d.js` (three.js r158):
- **Terreno**: hexágonos con alturas por terreno. Encima van árboles, nevados, colinas, ichu, dunas y surcos (instanciados), y nubes sobre lo inexplorado.
- **Ciudades**: cambian según la era (chozas, kanchas de piedra, casas coloniales, ladrillo industrial y torres modernas), la población, los edificios (murallas, puerto, chimeneas) y las maravillas. Cada maravilla tiene su propio modelo.
- **Unidades**: escuadrones de tres figuras con el equipo de su tipo (porra, honda, macana, lanza de cobre, estrella de cobre, hierro, arcabuz, fusil, casco moderno, caballería, cañón, blindado). Cada una lleva un estandarte con el emblema de su civilización y un anillo de bando: qolli si es tuya, cinabrio pulsante si es enemiga en guerra, el color de su civilización en los demás casos.
- **Líderes**: modelos low-poly sobre un pedestal tejido. Además de los líderes jugables hay arquetipos por época y región: curaca, sacerdote, señor costeño, amazónico, lonko mapuche, tlatoani (corona de turquesa y penacho de quetzal), ajaw maya, jefe de las praderas (tocado de plumas), conquistador, virrey, monarca, militar de la independencia, republicano, y presidente o presidenta modernos.
- **Vitrinas del menú**: un mismo escenario WebGL sirve a las tres pantallas. Arrastrar gira, la rueda acerca (de cerca la mirada sube al rostro) y el doble clic reencuadra; el modelo se mece despacio mientras nadie lo toca. En **Elige a tu líder** muestra al líder de cuerpo entero; en **Escenario y civilización**, el escuadrón de la cultura elegida con su estandarte sobre una estera tejida (las fichas cambian de personaje); y en **Configura la partida**, el pedazo de tierra de la provincia inicial —siete casillas con su relieve, sus ríos, su decoración y el estandarte dorado del sitio de la primera ciudad— sobre un plinto de lana.
- **Recursos, mejoras y fauna**: modelos propios. Los minerales aparecen como cúmulos de su color.

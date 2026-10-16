# Jugabilidad de Civilization VI aplicada a *Perú Civilization*
### Cómo consigue Civ VI que el jugador sepa qué hacer en cada turno — y qué debería copiar (y no copiar) este juego

> **Para qué sirve este documento.** El problema detectado es de **legibilidad del turno**, no de cantidad de mecánicas: en *Perú Civilization* hay un turno con decisiones claras (investigar, producir, mover, fortificar), pero el juego no las presenta como una lista de cosas por hacer. Este informe analiza cómo lo resuelve *Civilization VI* (Firaxis, 2016), qué errores cometió ese mismo juego en el camino, y traduce todo a cambios concretos sobre `js/ui/*.js` y `js/core/*.js`.
>
> **Método.** Civ VI se analiza por documentación pública, manual oficial, declaraciones de sus diseñadores y análisis de prensa y de jugadores (fuentes al final). *Perú Civilization* se analiza leyendo su código en este repositorio. Las referencias a líneas de código corresponden a la versión 0.1.3.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Cómo es un turno en Civilization VI](#2-cómo-es-un-turno-en-civilization-vi)
3. [Los ocho sistemas con los que Civ VI dice qué hacer](#3-los-ocho-sistemas-con-los-que-civ-vi-dice-qué-hacer)
4. [Lo que Civ VI hace mal (y no hay que copiar)](#4-lo-que-civ-vi-hace-mal-y-no-hay-que-copiar)
5. [Radiografía del turno en Perú Civilization](#5-radiografía-del-turno-en-perú-civilization)
6. [Diagnóstico: ocho causas de que no se entienda qué hacer](#6-diagnóstico-ocho-causas-de-que-no-se-entienda-qué-hacer)
7. [Recomendaciones priorizadas](#7-recomendaciones-priorizadas)
8. [Plan por fases y cómo saber si funcionó](#8-plan-por-fases-y-cómo-saber-si-funcionó)
9. [Fuentes](#9-fuentes)
10. [Apéndice · Cómo se vería el turno con las mejoras puestas](#apéndice--cómo-se-vería-el-turno-con-las-mejoras-puestas)

---

## 1. Resumen ejecutivo

**Lo esencial en cinco frases.**

1. Civ VI **se entiende** no porque sea simple (no lo es: distritos, vivienda, comodidades, lealtad, era, congreso…), sino porque **nunca deja al jugador sin un siguiente paso visible**: el botón de fin de turno, el ciclo de unidades, los avisos y la asesora forman un sistema que responde "¿y ahora qué?" en cada turno. Aun así, su propio director creativo admitió en 2024 que los jugadores **odiaban su ritmo** y que **menos de la mitad terminaba una partida**: guiar bien no basta si el turno está lleno de trabajo repetitivo.
2. *Perú Civilization* ya tiene el motor de un juego por turnos completo (producción, tecnología, cohesión, diplomacia, fases, Conquista), pero **esa guía vive en tres sitios frágiles**: una línea de texto (`#end-status`), un resumen que se autodestruye a los 14 s y un consejero que **se apaga en el turno 30**.
3. La causa raíz no es la complejidad: es que **lo pendiente no tiene forma de lista persistente y accionable**. El juego sabe perfectamente qué te falta (lo calcula en `renderTop`), pero solo lo dice en una frase y no te lleva allí.
4. La mejor noticia: casi todo lo que propone este informe **reutiliza piezas que ya existen** (el badge con contador de La Conquista, el panel de provincias, la ventana de victorias, los avisos del motor `PC.log`, las razones de las acciones deshabilitadas).
5. Prioridad absoluta (P0): **lista de pendientes del turno**, **consejero permanente con acciones**, **recomendación de producción e investigación** y **registro de avisos**. Con eso, el juego pasa de "no sé qué hacer" a "tengo cuatro cosas en la lista y las resuelvo".

---

## 2. Cómo es un turno en Civilization VI

Civ VI organiza la partida en turnos simultáneos: el jugador actúa, pulsa **Next Turn**, y el juego resuelve lo de todas las civilizaciones y devuelve el control con un turno nuevo. La producción de cada ciudad **se aporta al final de cada turno** ("*at the end of each turn, the city contributes its Production power to the project until it is finished*", wiki de la comunidad). El orden interno exacto de la resolución entre turnos (producción, crecimiento, investigación, IA, combate) **no está documentado públicamente**, así que este informe no lo afirma. Tres decisiones estructurales definen la experiencia:

| Pieza | Qué hace | Efecto en el jugador |
|---|---|---|
| **Botón de fin de turno** | Es el único sitio donde se concentra "¿me falta algo?": **un solo botón grande sirve a la vez para elegir producción y para elegir investigación**, y las unidades sin órdenes lo retienen —de ahí que la queja típica sea "ese botón simplemente no funciona; tengo que abrir el árbol de tecnologías y elegir a mano"—. Existe un atajo, `Mayús+Entrar`, para saltarse "la mayoría de las cosas que bloquean el botón de fin de turno". | El jugador nunca se queda sin saber si puede continuar. |
| **Ciclo de unidades** | Las unidades con órdenes pendientes se recorren una a una. El vocabulario es explícito y persistente: *Dormir* (sale del ciclo "hasta que el jugador le dé nuevas órdenes" y "debe seleccionarse a mano"), *Fortificar* y *Fortificar hasta sanar* (inactiva hasta que se la despierte), *Automatizar exploración* (se mueve sola cada turno), además de *Saltar turno*, *Cancelar orden*, *Despertar*, *Alerta*, *Modernizar* y *Disolver*. | Cada unidad tiene un destino explícito: no hay "unidades olvidadas". |
| **Resolución entre turnos** | Producción, crecimiento, investigación, ingresos, IA y combate ocurren fuera de tu control, y vuelven como **avisos** al empezar el turno. | El turno del jugador es corto y siempre empieza con información nueva. |

**El principio de diseño que importa aquí**, en palabras de Ed Beach, director creativo de la saga, explicando en 2024 por qué cambiaron de rumbo con Civ VII: los jugadores **odiaban el ritmo de Civ VI** y **menos de la mitad terminaba una partida** (15-20 h de media). La lección que sacaron fue distinguir las *"important, strategic decisions you don't have to make more than every five to 10 minutes"* de las *"tiresome 'click here, click here, click, here' decisions that just aren't very interesting"*.

Es exactamente el problema de este informe, dicho por sus autores: **una decisión estratégica cada 5-10 minutos es emocionante; veinte clics triviales por turno son agotadores**. La guía del turno debe servir para **separar lo segundo de lo primero** — resolver de un golpe lo rutinario (una cola de producción, una recomendación, una lista) y reservar la atención del jugador para lo que de verdad decide la partida.

> **Corrección de un lugar común:** no hay ninguna fuente de Firaxis que formule el principio "una decisión por vez" ni "turnos cortos". Lo verificado es lo anterior: el objetivo declarado es **proteger al jugador del trabajo repetitivo**, no reducir el número de decisiones de estrategia.

**El detalle que casi nadie copia y es el más útil:** Civ VI **no confía en la memoria del jugador**. Cuando una ciudad se queda sin producción, el juego no escribe un texto pequeño: interrumpe, te lleva a la ciudad y te obliga a elegir. Cuando una unidad queda sin órdenes, el juego te la pone delante. La insistencia es la característica, no el defecto.

---

## 3. Los ocho sistemas con los que Civ VI dice qué hacer

Estos son los sistemas que, combinados, producen la sensación de "siempre sé qué hacer". Están ordenados de más a menos aplicable a *Perú Civilization*; el último apartado (3.9) sale de Civ VI y recoge lo que hacen mejor otros juegos del género.

### 3.1 La asesora (Advisor)

Civ VI **no tiene los cuatro asesores especializados de Civ V** (economía, militar, exterior, ciencia), que según Ars Technica eran los que decían "qué paso dar después y por qué": tiene **una sola asesora general**, y esa pérdida de especialización es una de las críticas más repetidas. Una guía para principiantes de la época señala que insiste en levantar un distrito religioso temprano y que se puede desactivar, y el manual oficial documenta que su **frecuencia de consejo se configura en las opciones de juego**. No es una ayuda de los primeros minutos: acompaña toda la partida.

- **Qué resuelve:** el jugador no tiene que evaluar 30 construcciones por sí mismo.
- **Cómo se ve:** un aviso con texto y una recomendación; el jugador puede aceptarla o ignorarla.
- **Clave de diseño:** recomienda **en el contexto**, no en abstracto ("te conviene un distrito religioso ahora", no "existen distritos religiosos").
- **Su gran defecto, según la crítica:** sugiere **sin explicar por qué**. Ese es el error que *Perú Civilization* no debe repetir (ver P0.3).
- **Nota de fiabilidad:** el nombre y el personaje de la asesora no se han podido verificar en una fuente primaria (la wiki y el PDF del manual no son accesibles desde este entorno); su existencia se sostiene en las dos fuentes citadas.

### 3.2 Avisos y registro de notificaciones

Lo que ocurre entre turnos vuelve como avisos en el borde de la pantalla, y existe una pantalla de **cotilleos** (*gossip*) con lo que averiguas del resto del mundo. El diseñador jefe, Ed Beach, lo describió como una decisión consciente: *"todos esos avisos que en Civilization V simplemente aparecían como notificaciones automáticas en el borde derecho de la pantalla hay que desenterrarlos mediante el cotilleo"*.

Ejemplos documentados de avisos: uno con icono propio cuando **aparece un campamento bárbaro en niebla parcialmente cubierta**, y otro al **ganar puntos de victoria diplomática**. Y un dato revelador: el **informe de cotilleo se añadió al menú de informes en el parche de junio de 2019**, es decir, la memoria consultable de los avisos **no estaba al lanzamiento**.

- **Qué resuelve:** separa lo importante de lo accesorio... en teoría (ver §4).
- **Clave de diseño:** hay una **memoria consultable** de lo ocurrido; el aviso efímero no es la única vía.

### 3.3 Impulsos (*eurekas* e *inspiraciones*)

Cada tecnología y cada principio cívico tiene una condición concreta que **acelera** su investigación: tener cierto recurso, fundar ciudades, construir algo, combatir. La interfaz te dice *cómo* conseguirlo. El árbol deja de ser una lista de precios y se convierte en **una lista de objetivos a corto plazo**.

- **Qué resuelve:** convierte el progreso a largo plazo en tareas concretas de este turno.
- **Clave de diseño:** el objetivo es **verificable y visible** ("construye una cantera", "controla hierro").
- **Advertencia de la crítica:** Ars Technica señaló que en Civ VI los impulsos *"tampoco están muy bien explicados"* y que el juego **no indicaba cuál convenía perseguir**. La lección no es quitarlos, sino que el impulso debe decir **cuál merece la pena ahora** y por qué.

### 3.4 Puntuación de era y momentos históricos

Con *Rise and Fall*, Civ VI añadió los **momentos históricos**: acciones concretas (fundar una ciudad, descubrir una maravilla natural, ganar una batalla decisiva…) que dan puntos de era y desembocan en edades Doradas, Oscuras o Heroicas. El juego **enumera explícitamente qué da puntos**.

- **Qué resuelve:** da objetivos de medio plazo que no dependen de la victoria final.
- **Clave de diseño:** una lista corta de logros posibles, visible desde el HUD, no enterrada en un menú.
- **Cómo lo mejoraron:** la actualización de primavera de 2019 añadió **12 momentos históricos nuevos con su puntuación de era explícita** (por ejemplo, "primer naufragio explorado: +2") y **tres gráficos nuevos en la pantalla de resumen de partida** (puntuación de era, total de gobernadores y títulos de gobernador), además de rediseñar las pantallas de Dedicación y de cambio de época. Es decir: hicieron **más explícito** qué da puntos y **más legible** el progreso acumulado.

### 3.5 Informes y pantallas de estado del imperio

Pantallas de resumen (ciudades, unidades, recursos, ciencia, cultura, religión) para responder "¿cómo voy?" sin recorrer el mapa. Civ VI las redujo respecto a Civ V y los jugadores lo notaron y lo reclamaron; los parches fueron rellenando el hueco: en **junio de 2019** se añadió el **informe de cotilleo** al menú de informes y se reformó la interfaz de estado de combate y de cotilleos (columna propia, textos más pequeños), y en **primavera de 2019** llegaron tres gráficos nuevos al resumen de partida y el dato de **alimentos necesarios para crecer** en el panel de ciudad.

- **Qué resuelve:** comparar tu imperio contigo mismo y con los rivales.
- **Clave de diseño:** la información vive en **un sitio**, no repartida por cinco menús.

### 3.6 Lentes y capas de mapa

Capas que repintan el mapa según un criterio. La Civilopedia del juego documenta, al menos: **atractivo, continente, colocación de distritos, gobierno, política, religión, colonos, turismo, imperio y lealtad**, más la **lente de energía** que añadió el parche de junio de 2019. Algunas **se activan solas** en el momento de la decisión: al seleccionar una unidad religiosa aparece la de religión; al construir un distrito o una maravilla, la de colocación.

- **Qué resuelve:** leer el territorio sin abrir paneles, y sobre todo **responder a la pregunta que el jugador acaba de hacerse**.
- **Aplicable aquí:** ya existe algo parecido (`R.showRegions`, provincias resaltadas, y el resaltado de regiones de un frente en La Conquista, `conquista_ui.js:105`). Falta la parte importante: que **se abra sola** cuando toca decidir (ver P1.6).

### 3.7 Civilopedia y descripciones emergentes

Enciclopedia interna con pestañas superiores y barra de navegación lateral, más descripciones al pasar el puntero sobre cualquier icono, unidad o concepto. En 2019 se le añadieron las misiones de espionaje y los modificadores de defensa del terreno, y se documentó que los valores de las casillas "se pueden consultar en la Civilopedia"; ese mismo año se añadió una **ventana de capacidades de las unidades** que mostraba habilidades antes ocultas y descripciones emergentes en los campos de atajos de teclado. Todavía en **abril de 2021** hubo que arreglar "decenas de fallos" de interfaz y de la **búsqueda** de la Civilopedia.

- **Qué resuelve:** el jugador curioso aprende sin salir del juego; el que no quiere leer, no lee.
- **Clave de diseño:** el texto está **donde surge la duda**, no en un manual aparte. Y la lección del parche de 2021: si la enciclopedia no encuentra lo que buscas, no existe.

### 3.8 Colocación recomendada y ayudas a la decisión

Es, con diferencia, lo mejor que hace Civ VI para decir "haz esto aquí":

- Con un **colono** seleccionado, el mapa marca con un icono las **ubicaciones ideales**; a partir del segundo colono se activa una **lente de colonos** que indica disponibilidad de agua y casillas no válidas.
- Al elegir un **distrito**, el juego **abre automáticamente la lente de colocación** y muestra los rendimientos resultantes en las casillas vecinas; con las **maravillas**, resalta qué casillas cumplen los requisitos.
- Tras el parche de **junio de 2019**, la recomendación de asentamiento incluye un **tooltip con iconos de ventajas e inconvenientes que explica POR QUÉ** se recomienda ese sitio (potencial de crecimiento, recursos nuevos, distancia a ciudades aliadas), y **aumentó el número de recomendaciones**.

- **Qué resuelve:** el miedo a equivocarse, que es la principal causa de parálisis en un juego por turnos, y una decisión espacial opaca convertida en **comparación visual**.
- **Lección central:** *la comparación visual gana a los números*. Enseñar el antes/después en el mapa evita párrafos de ayuda.

### 3.9 Fuera de Civ VI: lo que hacen mejor otros juegos del género

Cuatro ideas que Civ VI no tiene y que encajan directamente en las recomendaciones de la sección 7:

- **Old World · un recurso compartido de "órdenes".** En vez de mover cada unidad por separado, cada turno reparte unas pocas órdenes entre todas tus unidades. El coste de decisión por turno baja de golpe y el jugador piensa en el conjunto, no en cada pieza. *Aplicable a:* P1.2, para turnos largos con muchas unidades.
- **Humankind · "Era Stars".** Objetivos cortos y opcionales en siete ámbitos (influencia, población, distritos, territorio, dinero, victorias, tecnologías); con siete estrellas avanzas de era. Cada uno dice **qué mide** y da recompensa inmediata. *Aplicable a:* P1.3 y P1.4 (una versión peruana: controlar dos macrozonas, tres maravillas, una ruta a la selva…).
- **Total War: Rome II · panel de objetivos de campaña.** Objetivos por capítulo con bonificaciones, recompensas y **plazo visible**, misiones que **se cancelan solas si son imposibles** y elección de tipo de victoria. *Aplicable a:* P1.3, y como criterio: nunca mostrar un objetivo que la partida ya ha hecho inalcanzable.
- **Civilization V · asesores especializados.** Civ V tenía cuatro (economía, militar, exterior, ciencia) que explicaban **qué paso dar después y por qué**; Ars Technica señala que Civ VI los redujo a uno que sugiere sin justificar. *Aplicable a:* P0.2 y P0.3: el consejero debe dar el **porqué**, no solo el qué.

---

## 4. Lo que Civ VI hace mal (y no hay que copiar)

Civ VI es también el ejemplo de cómo una guía mal diseñada produce el problema contrario. Nueve fallos documentados, con su lección:

| Fallo de Civ VI | Evidencia | Lección para *Perú Civilization* |
|---|---|---|
| **Ocultar información para hacerla "valiosa"** | Beach: los avisos de Civ V "hay que desenterrarlos mediante el cotilleo". | En un juego cuya misión es **enseñar historia**, esconder información empeora el producto. Todo lo que el jugador necesita saber debe estar visible o a un clic. |
| **Una interfaz que no señala nada** | Rock Paper Shotgun: *"the UI's kind of a hot mess"*; la información de los líderes está "escondida en submenús y pop-ups diminutos"; su editora habla de "un horrible amasijo de variables y pantallas y subpantallas" y pide saber cómo cumplir los criterios del juego "en lugar de pasar el ratón y entrecerrar los ojos ante iconos diminutos". | La información clave **no puede vivir en pop-ups diminutos**: va en filas grandes, nombradas y accionables. Si hay que pasar el ratón para entender algo importante, está mal puesto. |
| **Perder el "porqué" de los consejos** | Ars Technica: Civ V tenía cuatro asesores especializados que decían "qué paso dar después y por qué"; Civ VI deja uno que sugiere **sin explicar por qué**. Los impulsos "tampoco están muy bien explicados" ni indican cuál conviene perseguir. | Cada recomendación debe llevar **su motivo en una línea**. Un consejo sin razón no enseña y no se puede discutir. |
| **Avisos que tapan el mapa y avisos triviales** | Hilo clásico de CivFanatics: las bandas de notificación "cubren una gran parte de la pantalla"; otro jugador pide "un registro con todos los avisos en lugar del spam en pantalla" y **filtros**. | Avisar menos y mejor: por relevancia, agrupado, y con **registro persistente y filtrable**. Nada de avisos de cosas que no puedes cambiar. |
| **Demasiados sistemas abiertos a la vez** | Kotaku (2023): "hay demasiado pasando", el Congreso Mundial es "una tarea absoluta" y con la puntuación de era y la diplomacia "simplemente hago clic y paso". En español, un análisis para principiantes reconoce que "al principio abruma bastante" y que hay "una gran cantidad de subsistemas". | **No añadir mecánicas nuevas hasta que el turno se entienda.** Un juego con la mitad de sistemas y buen guiado se percibe más profundo que uno con el doble y mal guiado. |
| **Enterrar la información en un panel lateral** | Eurogamer elogia el tutorial y los asesores, pero critica que la pantalla de ciudad se sustituyera por un panel que "entiierra" información, y ve "bruma" en las condiciones de victoria. | Los paneles laterales son buenos para lo frecuente y malos para lo importante: lo importante merece una ventana propia y una barra de progreso. |
| **Nombrar los sistemas con palabras que no comunican** | RPS pone el ejemplo canónico: la palabra *"Amenities"* no ayuda a entender para qué sirve. | Revisar los nombres propios del juego (**cohesión, influencia, capacidad, desgaste**) y asegurarse de que cada uno se explica solo, en su ficha y en su primera aparición. |
| **Un tutorial que no se puede guardar** | Hilo de Steam de 2024: "I don't understand how to play. Tutorial cannot be saved?"; el mismo jugador: *"hice una ciudad y luego no entendí qué hacer"* y *"no sé qué determina lo que puedo y no puedo construir"*. | El tutorial debe poder **pausarse, guardarse y retomarse**, y convivir con una partida normal. |
| **Creer que el tutorial arregla el diseño** | Cinco años y decenas de parches de interfaz después, la crítica de "demasiado pasando" seguía viva en 2023; y **Civ VII (2025) repitió el patrón**: interfaz "muy criticada" porque "muy poca información se explica al jugador", con Eurogamer diciendo que *"la interfaz se avergüenza de ser un juego de estrategia"*. | La claridad **no se parchea al final**: se diseña con el sistema. Es la advertencia más cara de este informe. |

**El contrapunto, para ser justos:** Eurogamer consideró que Civ VI introduce sus sistemas "sin esfuerzo y eficientemente mediante un tutorial dedicado y el sistema de asesores", e IGN España elogió una interfaz "mucho más minimalista" con datos por pestañas. La crítica no es unánime; lo que sí es unánime es que **la falta de señalización** fue el problema recurrente.

### 4.1 Lo que Firaxis arregló después (la mejor lista de la compra)

Esto es oro para este informe: son **mejoras de claridad que Firaxis añadió en parches, durante años**, es decir, necesidades que la propia empresa reconoció. Cada una valida una recomendación de la sección 7.

| Parche | Qué añadió | Valida |
|---|---|---|
| Julio 2017 | Aviso que **bloquea el turno** cuando una ciudad puede bombardear; mejor previsualización de combate; rutas de varios turnos visibles; informes con obras, adyacencia y distritos; descripciones que explican **por qué** puedes o no declarar cada tipo de guerra; confirmación al denunciar; botón de reiniciar partida. | P0.1, P0.2, P1.3 |
| Abril 2018 | Pantalla de cambio de era rediseñada para destacar el tipo de edad; aviso de gobernador que **no bloquea** el turno; "comida necesaria para crecer" en el panel de ciudad; textos que explican qué le disgusta a cada líder. | P0.1, P0.4, P1.3 |
| Abril 2019 | Etiquetas de mapa con iconos y **lista agrupada**; **búsqueda de texto en el mapa** ("escribe hierro y se resalta"). | P2.6 |
| Junio 2019 (el parche más "de experiencia") | Recomendador de asentamientos reescrito con **pulgar arriba/abajo que explica el motivo** (crecimiento, recursos, distancia); **opciones de cola de producción**; el selector de panteón deja de tapar el mapa; menos cotilleos; "resultados previos" del congreso; descripciones de habilidades de unidades. | P0.3, P1.2, P0.4 |
| Agosto 2020 | Comodidades reequilibradas con umbrales nuevos; más modos de juego. | §8, principio de no añadir sistemas |
| Abril 2021 | Los **gobernadores sin asignar bloquean el turno**; decenas de arreglos de interfaz y de la búsqueda en la Civilopedia. | P0.1, P2.1 |

> Lectura de esta tabla: **casi todo lo que se propone en la sección 7 ya se inventó en Firaxis… entre dos y cinco años tarde.** Hacerlo desde el principio es la ventaja competitiva más barata que tiene un juego indie.

> Conclusión de la sección 4: la comparación correcta no es "Civ VI es más simple". Es **"Civ VI te dice qué hacer aunque sea complicado; nuestro juego no lo dice aunque sea más pequeño"**.

---

## 5. Radiografía del turno en Perú Civilization

### 5.1 Qué ocurre hoy, paso a paso

Todo el turno vive en `js/ui/ui.js`:

1. **El jugador actúa**: selecciona unidad o ciudad (`clickMap`, `UI.select`), mueve, ataca, construye mejoras, decide producción.
2. **Pulsa `Enter` o "Terminar turno"** → `endTurn()` (`js/ui/ui.js:699-720`).
3. **Tres comprobaciones bloquean el turno**, en este orden:
   - eventos pendientes → abre el evento (`ui.js:701`);
   - investigación sin elegir → abre Tecnologías y avisa "Elige qué investigar antes de terminar el turno" (`ui.js:703`);
   - alguna ciudad sin producción → centra el mapa, selecciona esa ciudad y avisa "«X» necesita producción" (`ui.js:704-705`).
4. **Se resuelve el turno** (`PC.endTurn`, `js/core/game.js:877-890`): tu civilización, todas las IA, `worldTick` (año, turno, niebla densa).
5. **Se autoguarda, se limpia la selección y se emite `turn`** (`ui.js:713-716`).
6. **Reacción a `turn`**: `js/ui/summary.js` muestra el resumen (producción terminada, unidades sin órdenes, amenazas) y `js/ui/advisor.js` busca qué aconsejar.

### 5.2 Los cuatro sistemas de guía que existen

| Sistema | Archivo | Qué hace | Vida útil |
|---|---|---|---|
| **Estado del turno** | `js/ui/ui.js:329-338` (`renderTop`) | Una línea (`#end-status`): "Falta elegir qué investigar." / "N ciudades necesitan producción." / "N unidades esperan órdenes (N)." / "Todo listo." | Siempre visible, pero **no clicable y sin lista** |
| **Resumen de turno** | `js/ui/summary.js` | Hasta 5 "terminado en la ciudad", unidades sin órdenes y amenazas, con enlaces que centran la cámara | **14 s** (5 s al salir el ratón), luego se oculta (`summary.js:35`) |
| **Consejero** | `js/ui/advisor.js` | 10 consejos genéricos + 3 de la Conquista + avisos de amenaza; botones "Ver" y "Entendido" | Los 10 genéricos, **solo hasta el turno 30** (`TIP_TURNS`, `advisor.js:6,94`); los de la Conquista y las amenazas no tienen límite |
| **Guía de inicio** | `js/ui/intro_ui.js`, `showIntro` (`ui.js:277-297`) | Tarjetas con capturas y atajos | Solo al empezar y desde Menú → Cómo se juega |

### 5.3 Lo que el juego ya calcula pero no muestra bien

Este es el hallazgo más rentable del análisis: **la información existe**, solo está mal presentada.

- `renderTop` (`ui.js:329-338`) **ya cuenta** unidades sin órdenes y ciudades sin producción… y lo resume en una frase sin nombres, sin botones y sin acceso directo.
- `PC.log` (`js/core/game.js:22-28`) **ya produce** un flujo de avisos tipados (`city`, `war`, `tech`, `history`, `event`) que terminan como *toasts* que se desvanecen en 5,5 s (`ui.js:730-740`), limitados a 5 a la vez.
- `PC.victoryProgress` y `PC.LEGACIES` (`js/core/victory.js:20-56`) **ya definen objetivos** con porcentaje y partes… y solo se ven en Menú → Victorias (`js/ui/victory_ui.js:23-32`).
- `PC.buildOptions` y `PC.unitActions` **ya calculan** qué está disponible y, en el caso de las unidades, **por qué no lo está** (`ui.js:431` muestra `x.reason` deshabilitado; el árbol de tecnologías muestra "Falta: cobre", `ui.js:795`).
- La Conquista **ya tiene** un badge con contador en el botón (`js/ui/conquista_ui.js:140-152`): el único "tracker" del juego, y el mejor modelo a generalizar.

### 5.4 Tabla comparativa

| Dimensión | Civilization VI | Perú Civilization hoy | Diferencia |
|---|---|---|---|
| Saber si puedes terminar el turno | Botón de fin de turno con estado y bloqueo | Igual: bloqueo + `#end-status` | **Empate**; falta que la lista sea accionable |
| Unidades sin órdenes | Ciclo obligatorio, ciclo con `N`, esperar/centinela/auto | Ciclo con `N` y `Espacio`, auto y centinela | **Empate**; falta marca visual en el mapa |
| Ciudades sin producción | Te lleva a la ciudad y te obliga a elegir | Te lleva a la ciudad y te obliga a elegir | **Empate**; falta recomendación y cola |
| Registrar lo ocurrido | Avisos + cotilleos (opacos) | Avisos efímeros + Crónica larga y sin filtros | **Civ VI mejor** |
| Decir qué construir | Asesora que recomienda en contexto, toda la partida | Lista completa con coste en turnos, sin recomendación | **Civ VI mejor** |
| Objetivos a corto plazo | Impulsos + momentos históricos enumerados | Legados y victorias, solo en un menú | **Civ VI mejor** |
| Guía durante toda la partida | Asesora permanente y configurable | Consejero que se apaga en el turno 30 | **Civ VI mejor** |
| Ayuda contextual | Civilopedia + descripciones emergentes | Fichas en paneles y descripciones al pasar el puntero | **Empate**; falta buscador |
| Explicar por qué algo no se puede | Descripciones emergentes | Ya se explica (razón en acciones, "Falta: cobre") | **Empate** (fortaleza propia) |

---

## 6. Diagnóstico: ocho causas de que no se entienda qué hacer

1. **Lo pendiente no tiene lista.** `#end-status` cuenta ciudades y unidades, pero no las nombra ni permite ir a ellas con un clic. El jugador tiene que *buscar* el problema en un mapa de 250 a 880 hexágonos.
2. **El resumen del turno se autodestruye.** 14 s (`summary.js:35`) y **consume** los avisos de ciudad (`summary.js:13-17`): lo que no leíste no vuelve como aviso; solo queda en la Crónica.
3. **Los consejos generales se apagan en el turno 30** (`if (g.turn > TIP_TURNS) return;`, `advisor.js:94`). A partir de ahí solo quedan los avisos de amenaza y los tres consejos de la Conquista: entre el turno 30 y la llegada de las Coronas (1493) el juego puede pasar **cientos de turnos sin decir nada**, justo cuando se abren las fases, el congreso y las independencias.
4. **Los consejos se pierden para siempre.** Un consejo mostrado y no respondido se da por visto a los 3 turnos (`advisor.js:97`). No hay "recuérdamelo" ni repetición por condición.
5. **Los consejos no hacen nada.** Sus botones son "Ver" (centrar cámara) y "Entendido" (`advisor.js:60-68`). No abren el panel necesario ni resuelven la tarea; el jugador sigue teniendo que encontrar el sitio.
6. **Cero recomendaciones.** Ni producción, ni investigación, ni mejoras, ni colocación. Los datos definen 22 unidades, 26 edificios y 12 maravillas (`js/data/rules.js`), y `PC.buildOptions` (`js/core/game.js:315-322`) devuelve todas las legales: a mitad de partida una ciudad puede ofrecer 20-40 opciones, y la interfaz las lista sin ordenar ni sugerir (`ui.js:465-481`). Con 6-10 ciudades, eso es la misma evaluación repetida cada turno.
7. **Nada marca en el mapa lo que falta.** No hay ninguna referencia a `UI.needsOrders` fuera de `ui.js` y `summary.js`: el 3D y el minimapa no señalan unidades sin órdenes ni ciudades sin producción (`js/ui/minimap.js:56-69` solo pinta ciudades y enemigos en guerra).
8. **Los objetivos están repartidos en tres menús.** Provincias en `P`, victorias y legados en Menú → Victorias, frentes de la Conquista en `G`. No existe la vista única de "qué persigo ahora".

> **El diagnóstico en una frase:** el juego sabe qué te falta, pero no te lo deja *ver, tocar y resolver*; te lo dice en voz baja, una sola vez, y luego se calla.

---

## 7. Recomendaciones priorizadas

Cada propuesta indica: **qué problema resuelve**, **de dónde viene en Civ VI**, **dónde se toca en el código** y **cómo se comprueba**. Nada de esta sección exige rediseñar el motor.

### P0 — Imprescindible: que el turno tenga una lista

#### P0.1 · Lista de pendientes del turno ("Lo que falta")
- **Problema:** causas 1, 2 y 7.
- **Modelo:** el botón de fin de turno de Civ VI, que no se limita a informar: te lleva al pendiente y no te deja cerrar el turno con unidades y ciudades sin resolver.
- **Propuesta:** convertir `#end-status` (`index.html:136`, texto en `ui.js:329-338`) en un bloque de **filas accionables** sobre el botón de fin de turno:
  - _Elegir investigación_ → abre Tecnologías (`openTechs`).
  - _«Cusco» necesita producción_ → una fila por ciudad, abre el panel de esa ciudad (`UI.selectCity`).
  - _N unidades esperan órdenes_ → botón que cicla (`UI.nextUnit`).
  - _Amenaza cerca de «Chavín»_ → centra la cámara (`R.centerOn`).
  - _Consejo del ayllu: …_ → la sugerencia del turno (ver P0.2).
  Cada fila debe desaparecer sola cuando se resuelve, y el botón de fin de turno conserva el estado `waiting` mientras queden filas.

  Aspecto propuesto (sobre el botón "Terminar turno", dentro de `#side`):

  ```
  ┌ Lo que falta este turno ─────────────────────────┐
  │ ⌛ Elegir investigación            [ Elegir ]     │
  │ ⚒ «Cusco» necesita producción      [ Abrir  ]     │
  │ ⚒ «Chavín» necesita producción     [ Abrir  ]     │
  │ ⚔ 3 unidades esperan órdenes       [ Siguiente N ]│
  │ ⚠ Amenaza: 2 unidades chimú cerca  [ Ver    ]     │
  │ ✦ Consejo: deja guarnición en la   [ Ir     ]     │
  │   costa antes de 1450                             │
  └───────────────────────────────────────────────────┘
     [ Terminar turno  ⏎ ]   (en espera mientras haya filas)
  ```

- **Dónde:** nuevo módulo `js/ui/tasks.js` (siguiendo el patrón de `advisor.js`/`summary.js`: `UI.on('turn'/'refresh')`, `UI.addOption`), montado dentro de `#side` en `index.html:133-139`, y `css/experiencia.css` para el estilo.
- **Cómo se comprueba:** con 6 ciudades y 10 unidades, todas las filas se pueden resolver sin tocar el mapa; `npm test` sigue pasando (no se toca el motor).
- **Esfuerzo:** medio (un módulo nuevo de ~120-180 líneas, sin cambios en el motor).

#### P0.2 · Consejero permanente, contextual y con acciones
- **Problema:** causas 3, 4 y 5.
- **Modelo:** la asesora de Civ VI, que recomienda durante toda la partida y cuya frecuencia se configura en Opciones.
- **Propuesta:**
  - Quitar el techo de `TIP_TURNS = 30` (`advisor.js:6,94`): el consejero debe durar toda la partida, pero **por condición**, no por turno.
  - Añadir consejos por estado del imperio, no solo por turno: sin guarnición, cohesión baja, oro en negativo, sin rutas comerciales, sin mejora en una casilla trabajada, provincia a medio controlar, frente de la Conquista sin decisión, congreso a 3 turnos.
  - Cambiar la regla "visto a los 3 turnos" (`advisor.js:97`) por "**se recuerda hasta que la condición se cumpla**", con un botón _Recuérdamelo más tarde_.
  - Sustituir "Entendido" por **acciones reales**: _Ir allí_ (centrar + seleccionar), _Abrir la pantalla_ (tecnologías, producción, diplomacia), y —opcional, desactivable— _Hazlo por mí_ para casos triviales (fortificar la guarnición, elegir la producción recomendada).
- **Dónde:** `js/ui/advisor.js` (estructura de `TIPS`, `show()`, `check()`), `js/ui/icons.js` si hacen falta iconos tocapu nuevos.
- **Cómo se comprueba:** en el turno 60 debe seguir apareciendo al menos un consejo pertinente; ninguno se pierde sin haberse cumplido o descartado explícitamente.

#### P0.3 · Recomendación de producción e investigación
- **Problema:** causa 6.
- **Modelo:** la asesora recomienda construcciones concretas; el árbol de Civ VI muestra cómo conseguir cada impulso.
- **Propuesta:**
  - Etiquetar **una** opción como _Recomendado_ en cada lista de producción, con una razón de una línea ("+2 de alimento y sube la cohesión", "desbloquea el bronce y controlas cobre", "no tienes guarnición en esta ciudad").
  - Heurística sencilla y auditable en `js/core/`: prioridad si hay amenaza visible → unidad militar; si la ciudad no tiene edificio de crecimiento → edificio; si estás a 3 provincias del objetivo de fase → colono; si no, la mejora de rendimiento más alta. Nunca ocultar el resto de opciones.
  - Lo mismo en Tecnologías: una marca de _Recomendado_ con la razón y, si aplica, el recurso que falta.
- **Dónde:** `js/core/game.js` (`buildOptions`, `availableTechs`) o un nuevo `js/core/advice.js`; UI en `ui.js:465-481` y `openTechs` (`ui.js:778-800`).
- **Cómo se comprueba:** prueba automática que, con una partida de `tests/smoke.js`, la recomendación siempre sea una opción legal y financiable.

#### P0.4 · Registro de avisos con filtros (Crónica del turno)
- **Problema:** causa 2.
- **Modelo:** la memoria consultable de avisos de Civ VI y, sobre todo, la petición explícita de sus jugadores: *"¿hay algún registro con todos los avisos en lugar del spam en pantalla?"* y filtros por tipo.
- **Propuesta:**
  - Que `summary.js` **no borre** los avisos que muestra (`summary.js:13-17`): que los marque como leídos.
  - Guardar en la partida los últimos ~40 avisos por tipo y mostrarlos en una pestaña nueva de la Crónica, con **filtros** (guerra, ciudad, tecnología, historia, diplomacia) y un botón _Ir_ cuando el aviso tenga casilla asociada.
  - Preferencias por tipo de aviso en Opciones (guerra siempre; comercio, solo si me afecta…).
- **Dónde:** `js/core/game.js:22-28` (`PC.log`), `js/ui/ui.js:905-912` (`openChronicle`), `js/ui/summary.js`.
- **Cómo se comprueba:** tras 20 turnos, todo lo ocurrido es recuperable desde el registro; desactivar un tipo no silencia los avisos de guerra.

### P1 — Muy recomendable: que el pendiente se vea sin abrir nada

#### P1.1 · Marcas de pendiente en el mapa y el minimapa
- **Modelo:** el ciclo de unidades de Civ VI, que hace imposible "perder" una unidad.
- **Propuesta:** aro qolli pulsante sobre ciudades sin producción y sobre unidades sin órdenes en el 3D (`js/ui/render3d.js`), punto equivalente en el minimapa (`js/ui/minimap.js:56-69`), y un atajo para ciclar ciudades sin producción (por ejemplo `Mayús+N`). Debe respetar la preferencia de accesibilidad ya existente (`js/ui/a11y.js`).
- **Comprobación:** con el juego en pausa, se cuentan a simple vista las unidades y ciudades pendientes.

#### P1.2 · Cola de producción y "producir riqueza" automática
- **Propuesta:** permitir encolar 3-5 elementos por ciudad y, si una ciudad termina sin nada encolado, que pase a riqueza (que ya existe: `b.kind === 'riqueza'`, `ui.js:455-462`) en lugar de bloquear el turno.
- **Por qué:** el bloqueo duro de `endTurn` (`ui.js:704-705`) es correcto al principio y molesto a partir del turno 100 con 8 ciudades. Es el diagnóstico de Firaxis en su propia voz: las decisiones repetitivas del tipo *"click here, click here, click here"* son las que hacen que la gente abandone partidas largas. En Civ VI los jugadores pidieron exactamente esto —*"¿hay alguna forma de pasar el turno sin elegir qué producir en una ciudad?"*— cuando no había nada útil que construir; la respuesta que recibieron fue usar proyectos de distrito. **Este juego ya tiene las dos cosas** (`PC.buildOptions` incluye "Producir riqueza" y `js/core/projects.js` ofrece grandes proyectos): solo falta que la ciudad no quede nunca en punto muerto.
- **Modelo:** la cola de producción y el aviso de "ciudad sin producción" de Civ VI; y la producción de riqueza de Civ V, que aquí ya está resuelta.

#### P1.3 · Panel único de objetivos ("Qué persigo")
- **Modelo:** momentos históricos y puntuación de era (objetivos enumerados y visibles) + pantalla de victorias de Civ VI.
- **Propuesta:** fusionar en una sola ventana (pestañas) lo que hoy está en Provincias (`P`), Victorias y La Conquista (`G`): objetivo de fase con barra, legados cumplidos y pendientes con su año, progreso de las cuatro victorias, próxima sesión del congreso y frentes activos. Reutilizar `victory_ui.js` y `conquista_ui.js`.
- **Comprobación:** el jugador puede responder "¿qué persigo?" sin abrir más de una ventana.

#### P1.4 · Impulsos a la peruana en el árbol de tecnologías
- **Modelo:** *eurekas* e *inspiraciones*.
- **Propuesta:** cada tecnología muestra una condición opcional que **abarata** su coste, con el estado actual ("Cumplido" / "Falta: controlar hierro"). Encaja perfectamente con las tecnologías que ya exigen recursos (`PC.techMissing`, `PC.techAccess`) y con la historia del juego (bronce, hierro, pólvora).
- **Comprobación:** toda tecnología de la era actual ofrece al menos un impulso alcanzable.

#### P1.5 · Tutorial guiado de los primeros 15 turnos, guardable
- **Modelo:** el tutorial de Civ VI… **corregido**: pasos concretos y comprobables, y que se pueda pausar, guardar y retomar (error documentado de Civ VI).
- **Propuesta:** una secuencia de misiones ("Funda tu primera ciudad", "Elige investigación", "Explora 5 casillas nuevas", "Deja una guarnición fortificada en tu capital", "Controla una segunda provincia") que avance **solo cuando la acción se cumple**, con recompensa pequeña y visible. Reutilizar `g.consejero.seen` y el sistema de eventos.

#### P1.6 · Comparación visual antes de decidir (lente de colocación)
- **Problema:** fundar una ciudad, elegir el emplazamiento de una mejora o comprar una casilla son decisiones irreversibles que hoy se toman "a ojo" mirando fichas de texto.
- **Modelo:** lo mejor que hace Civ VI — con un colono seleccionado, el mapa marca los emplazamientos ideales; al elegir un distrito, se **abre sola** una lente que muestra los rendimientos resultantes en las casillas vecinas; y desde junio de 2019, la recomendación lleva un tooltip con **ventajas e inconvenientes y el motivo**.
- **Propuesta:** al seleccionar un colono, resaltar en el 3D las 3 mejores casillas de la provincia con su puntuación y un porqué de una línea ("agua, +3 de alimento, controla cobre"); al seleccionar un trabajador, mostrar **antes/después** de los rendimientos de la casilla al mejorarla. El motor **ya calcula** lo necesario: `PC.siteScore` y `PC.bestSiteInRegion` (`js/core/game.js:202`), `PC.validCitySite` (`game.js:196`) y `PC.improvementOptions` (`game.js:621`).
- **Cómo se comprueba:** con un colono seleccionado, el jugador puede decidir sin abrir ninguna ficha; la casilla recomendada siempre es legal y la puntuación coincide con la que el motor usa internamente.

### P2 — Después: comodidad y escala

- **P2.1 · Ficha "¿Qué es esto?" con buscador:** enciclopedia interna breve (cohesión, influencia, desgaste, niebla densa, frente, legado), accesible desde cualquier etiqueta del HUD; modelo: Civilopedia y descripciones emergentes.
- **P2.2 · Retomar la partida con contexto:** al cargar, un resumen de "dónde estabas" y "qué quedó pendiente" (aviso de reanudación).
- **P2.3 · Auto-gobierno de ciudades:** extender el `u.auto` que ya existe para unidades (`PC.autoUnit`) a la producción de ciudades, como red de seguridad en turnos largos.
- **P2.4 · Accesibilidad de la lista de pendientes:** navegación completa con teclado (Tab entre filas), lector de pantalla (`aria-live` ya se usa en `advisor.js:108`) y tamaño de HUD configurable.
- **P2.5 · Ritmo y duración:** hacer visible el coste temporal de las decisiones ("te quedan ~18 turnos de era") para que el jugador perciba el avance, como la puntuación de era hace en Civ VI.
- **P2.6 · Anotaciones y búsqueda en el mapa:** que el jugador pueda clavar notas en casillas ("futuro puerto", "aquí hay hierro") y buscar texto en el mapa, que se resalte lo encontrado. Modelo directo: las *Map Tacks* con iconos y la búsqueda de texto que Civ VI añadió en abril de 2019. En un mapa de 250 a 880 hexágonos con niebla densa, es la diferencia entre planificar y olvidar.

---

### Resumen de esfuerzo y riesgo

| # | Propuesta | Esfuerzo | Riesgo | Toca el motor |
|---|---|---|---|---|
| P0.1 | Lista de pendientes | Medio | Bajo | No (solo consulta) |
| P0.2 | Consejero permanente y con acciones | Medio | Bajo | No |
| P0.3 | Recomendaciones de producción e investigación | Medio | Medio (heurística discutible → siempre desactivable) | Sí, en lectura |
| P0.4 | Registro de avisos con filtros | Medio | Bajo (cambia el formato del guardado si se persiste) | Sí, en `PC.log` |
| P1.1 | Marcas en mapa y minimapa | Bajo | Bajo (debe respetar accesibilidad) | No |
| P1.2 | Cola de producción | Medio | Bajo | Sí (`city.queue`) |
| P1.3 | Panel único de objetivos | Bajo-medio | Bajo | No |
| P1.4 | Impulsos en el árbol | Medio | Medio (equilibrio de costes) | Sí |
| P1.5 | Tutorial guardable | Alto | Medio | No |
| P1.6 | Lente de colocación y antes/después | Bajo-medio | Bajo | No (usa lo que ya calcula) |
| P2 | Comodidades y escala | Variable | Bajo | Poco |

**Orden recomendado de ejecución:** P0.1 → P0.2 → P0.4 → P1.1 → P1.6 → P0.3 → P1.2 → P1.3 → P1.4 → P1.5.

---

## 8. Plan por fases y cómo saber si funcionó

### Fase 1 — El turno se entiende (P0.1 + P0.2 + P0.4)
Objetivo: que un jugador nuevo nunca se pregunte qué hacer.
Entregable: lista de pendientes accionable, consejero permanente con acciones, registro de avisos con filtros.

### Fase 2 — El turno se decide rápido (P0.3 + P1.1 + P1.2 + P1.6)
Objetivo: reducir el tiempo por turno y el miedo a equivocarse.
Entregable: recomendaciones con motivo, marcas en el mapa, cola de producción.

### Fase 3 — El turno tiene horizonte (P1.3 + P1.4 + P1.5 + P2)
Objetivo: que el jugador sepa qué persigue a corto, medio y largo plazo.
Entregable: panel único de objetivos, impulsos, tutorial guardable, enciclopedia.

### Pruebas de éxito (medibles, no opiniones)

1. **Prueba del principiante:** una persona que no conoce el juego funda su primera ciudad, elige investigación y termina 20 turnos **sin preguntar qué hacer** y sin abrir el README.
2. **Prueba de las cinco ciudades:** con 5 ciudades sin producción, resolver las cinco cuesta menos de 2 minutos y ningún clic "a ciegas" (todas las filas llevan al sitio correcto).
3. **Prueba del turno 60:** sigue habiendo al menos un consejo pertinente y ninguno se ha perdido sin cumplirse o descartarse.
4. **Prueba de la memoria:** todo lo ocurrido en los últimos 20 turnos es recuperable desde el registro de avisos.
5. **No regresión:** `npm test` (humo, determinismo, guardado, Conquista) sigue pasando en cada fase; ninguna de las propuestas P0/P1 toca el motor de simulación, solo lo consulta.

### Principios para no equivocarse por el camino

1. **Una decisión por vez:** si dos cosas necesitan al jugador, se muestran en orden, no a la vez.
2. **Bloquear solo lo obligatorio:** el turno se detiene únicamente por decisiones que hay que tomar sí o sí (producción, investigación); todo lo demás es informativo y se puede cerrar. Civ VI tardó años en encontrar ese criterio: en abril de 2021 hizo que los gobernadores sin asignar **bloquearan** el turno, mientras que en abril de 2018 había quitado el bloqueo de los avisos de título de gobernador.
3. **Nada de avisos que no puedas resolver:** cada aviso tiene una acción o no se muestra.
4. **Lo que se dice una vez, se puede recuperar:** ningún texto importante desaparece para siempre.
5. **Cada recomendación lleva su porqué:** el error más citado de Civ VI es una asesora que sugiere sin explicar (Ars Technica). Una línea de motivo basta.
6. **La comparación visual gana a los números:** antes/después en el mapa vale más que un párrafo (ver P1.6).
7. **Nombrar con palabras del jugador:** *"Amenities"* es el ejemplo canónico de etiqueta que no comunica; revisar cómo se llaman aquí la cohesión, la influencia, la capacidad y el desgaste.
8. **Nunca mostrar un objetivo imposible:** los objetivos se cancelan solos cuando la partida los ha hecho inalcanzables (lección de Total War).
9. **Enseñar sin interrumpir** (principio 4 de `PRODUCT.md`): la guía vive en la interfaz, no en muros de texto.
10. **Legible primero** (principio 3 de `PRODUCT.md`): antes de añadir sistemas nuevos, que se entienda el que ya existe.

---

## Apéndice · Cómo se vería el turno con las mejoras puestas

Ejemplo del mismo juego, con P0 y P1 aplicadas. Sirve como guion de referencia para comprobar que cada pieza aparece en el momento adecuado.

| Momento | Lo que ve el jugador | Sistema que lo produce |
|---|---|---|
| Turno 1 | Guía de inicio con tarjetas, y la lista de pendientes marcando *Funda tu primera ciudad* con el atajo `B`. | `intro_ui.js` + P0.1 |
| Turno 2 | El consejero dice "Elige qué investigar: controlas cobre, así que el bronce te adelanta" y el botón *Elegir* abre el árbol con la tecnología recomendada marcada. | P0.2 + P0.3 |
| Turno 5 | La lista marca las dos ciudades sin producción y ofrece *Abrir*; en cada lista de producción hay una opción etiquetada *Recomendado* con su motivo. | P0.1 + P0.3 |
| Turno 12 | Un aro sobre la unidad sin órdenes y un punto en el minimapa; `N` la cicla. | P1.1 |
| Turno 30 | El consejero ya no se apaga: avisa de que la cohesión tiende a bajar y ofrece *Ir* a la capital y *Recuérdamelo en 5 turnos*. | P0.2 |
| Turno 60 | El jugador abre *Qué persigo* y ve el objetivo de fase, los legados pendientes con su año y el progreso de las cuatro victorias, todo en una ventana. | P1.3 |
| Turno 95 | Una ciudad termina su producción y arranca sola el siguiente elemento de la cola; si la cola está vacía, produce riqueza y el turno nunca se bloquea. | P1.2 |
| Turno 150 | El jugador vuelve tras unos días: al cargar, un resumen dice dónde estaba y qué quedó pendiente; el registro de avisos tiene todo lo de los últimos 20 turnos, filtrable por tipo. | P2.2 + P0.4 |
| Turno 300 | La Crónica y la pantalla de victorias siguen siendo el cierre; el camino hasta allí ha estado siempre guiado. | Ya existe |

---

## 9. Fuentes

**Documentación oficial y del propio juego**
- **Civilopedia** (el texto real del juego, navegable con selector de reglamento): [colocación de distritos y ciudades](https://www.civilopedia.net/en-US/gathering-storm/concepts/cities_10/), [colonos y lente de asentamiento](https://www.civilopedia.net/en-US/gathering-storm/concepts/cities_3/), [maravillas y su lente](https://www.civilopedia.net/en-US/gathering-storm/concepts/cities_6/), [las lentes](https://www.civilopedia.net/en-US/gathering-storm/concepts/world_7/), [introducción y uso de la enciclopedia](https://www.civilopedia.net/en-US/gathering-storm/concepts/intro/) y [listado de conceptos](https://www.civilopedia.net/en-US/gathering-storm/concepts/) (incluye *Eureka Moments*, *Inspiration Moments* e *Historic Moments*).
- **Notas de parche oficiales** (2K/Firaxis), que son la mejor prueba de qué hubo que arreglar: [18 de junio de 2019](https://support.civilization.com/hc/es/articles/37662399287443-Notas-del-parche-18-de-junio-de-2019) (recomendador de asentamientos con motivos, cola de producción, informe de cotilleo, lente de energía, panteón que no tapa el mapa) · [Actualización de primavera](https://support.civilization.com/hc/es/articles/37687176307731-Notas-del-parche-Actualizaci%C3%B3n-de-primavera) (12 momentos históricos nuevos, gráficos de resumen, "alimentos para crecer") · [2 de abril de 2019](https://support.civilization.com/hc/en-us/articles/37662702532499-Patch-Notes-April-2-2019) (*Map Tacks* y búsqueda de texto en el mapa) · [27 de julio de 2017](https://support.civilization.com/hc/en-us/articles/37688052914579-Patch-Notes-July-27-2017) (primer bloqueo de turno, previsualización de combate, descripciones de casus belli) · [27 de agosto de 2020](https://support.civilization.com/hc/en-us/articles/37661296703507-Patch-Notes-August-27-2020) · [22 de abril de 2021](https://support.civilization.com/hc/en-us/articles/37658471845523-Patch-Notes-April-22-2021) (gobernadores que bloquean el turno, arreglos de Civilopedia).
- **Manual oficial** de *Civilization VI* — [PDF en inglés](<http://cdn.akamai.steamstatic.com/steam/apps/289070/manuals/CIV_VI_25TH_ONLINE_MANUAL_ENG.pdf>) y [versión japonesa](<https://cdn.akamai.steamstatic.com/steam/apps/289070/manuals/Sid_Meier's_Civilization_VI_(Japanese)_for_Japan.pdf>). Citado como puntero: **no fue posible extraer su texto** en este entorno.
- **Wiki de la comunidad**, leída a través de copias en Wayback porque Fandom bloquea el acceso directo: [Production (Civ6)](<https://web.archive.org/web/20231127232731/https://civilization.fandom.com/wiki/Production_(Civ6)>) (la producción se aporta al final de cada turno) · [List of unit actions in Civ6](https://web.archive.org/web/20231126215019/https://civilization.fandom.com/wiki/List_of_unit_actions_in_Civ6) (*Dormir*, *Fortificar*, *Automatizar exploración*…) · [Boost (Civ6)](<https://civilization.fandom.com/wiki/Boost_(Civ6)>) · [Advisor (Civ5)](<https://civilization.fandom.com/wiki/Advisor_(Civ5)>), los cuatro asesores especializados que Civ VI no tiene.

**Diseño, según sus autores**
- Ed Beach (diseñador jefe) sobre los avisos y el cotilleo: *"all those notices that used to just come up as automatic notifications on the right edge of your screen of a Civilization V game have to be unearthed through gossip"* — [Diplomacy Gets a Major Upgrade in Civilization VI (2016)](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/252585986936675038).
- Ed Beach (Gamescom 2024) sobre el ritmo: los jugadores "odiaban" el ritmo de Civ VI, **menos de la mitad terminaba una partida**, y la distinción entre decisiones estratégicas "cada cinco o diez minutos" y las repetitivas *"click here, click here, click here"* — [Game Developer](https://www.gamedeveloper.com/design/firaxis-big-swing-with-civilization-vii-convincing-players-to-actually-finish-their-games) (texto confirmado en [copia espejo](https://www.jikguard.com/news/firaxis-big-swing-with-civilization-vii-convincing-players-to-actually-finish-their-games/)).

**Prensa especializada**
- Rock Paper Shotgun: *"the UI's kind of a hot mess"*, información "escondida en submenús y pop-ups diminutos", la palabra *Amenities* como etiqueta que no comunica — [Civilization 6 verdict](https://www.rockpapershotgun.com/civilization-6-verdict).
- Ars Technica: los asesores especializados de Civ V decían qué hacer **y por qué**; los impulsos de Civ VI "no están muy bien explicados"; comodidades incomprensibles — [Civilization VI is a beautiful prance through history](https://arstechnica.com/gaming/2016/10/civilization-vi-is-a-beautiful-prance-through-history/).
- Kotaku (2023): "hay demasiado pasando", el Congreso Mundial es "una tarea absoluta" — [retrospectiva](https://kotaku.com/civilization-civ-6-review-2023-retrospective-pc-sid-1850242218) · y sobre *Rise and Fall*: los gobernadores quitan la "sensación de impotencia", pero "siguen faltando arreglos en UI e IA" — [reseña](https://kotaku.com/civilization-vi-rise-and-fall-the-kotaku-review-1822751643).
- Eurogamer: elogia el tutorial y los asesores, critica el panel lateral que "entiierra" información y la "bruma" de las condiciones de victoria — [reseña](https://www.eurogamer.net/civilization-6-review) · y explica la puntuación de era y los momentos históricos — [Civilization 6 Era Score](https://www.eurogamer.net/civilization-6-rise-and-fall-era-score-historic-moments-golden-ages-heroic-ages-dark-ages-dedications-explained-5003).
- En español: análisis para principiantes ("al principio abruma bastante", "una gran cantidad de subsistemas") — [MuyComputer](https://www.muycomputer.com/2016/11/29/civilization-vi-analisis-principiantes/) · interfaz "mucho más minimalista" con datos por pestañas — [IGN España](https://es.ign.com/civilization-vi/108698/civilization-vi-impresiones-finales).
- Otros: [TheGamer, guía de la puntuación de era](https://www.thegamer.com/civilization-6-complete-guide-to-era-score-golden-dark-heroic-age/) · [Gamereactor, guía para principiantes](https://www.gamereactor.eu/a-beginners-guide-to-civilization-vi/) (la asesora recomienda construcciones y se puede desactivar) · [IGN, Sean Bean narra el árbol tecnológico](https://me.ign.com/en/pc/122245/sean-bean-to-voice-civilization-6-tech-tree).
- La advertencia para el futuro: **Civ VII (2025) repitió el patrón de interfaz criticada** — [Wikipedia](https://en.wikipedia.org/wiki/Civilization_VII) y [RPS](https://www.rockpapershotgun.com/civilization-7-launches-to-mixed-early-player-verdicts-alongside-patches-for-the-ui-ai-and-camera), que cita a Eurogamer: *"la interfaz se avergüenza de ser un juego de estrategia"*. Notas de recepción de Civ VI (IGN 9,4 / PC Gamer 93 / Polygon 8,5) — [Wikipedia](https://en.wikipedia.org/wiki/Civilization_VI).

**Voces de jugadores (problemas reales, útiles como advertencia)**
- Steam, 2024: *"I don't understand how to play. Tutorial cannot be saved?"*, con testimonios del tipo "hice una ciudad y luego no entendí qué hacer" — [hilo de discusión](https://steamcommunity.com/app/289070/discussions/0/4762081699104010556/).
- CivFanatics, 2016: avisos que tapan el mapa, avisos triviales y petición de un registro filtrable — [Notification Banners Covering the Screen](https://forums.civfanatics.com/threads/notification-banners-covering-the-screen.602603/).
- Steam: jugadores echando en falta pantallas de información de Civ V — [Demographic Screen?](https://steamcommunity.com/app/289070/discussions/0/135512625256036168).
- Steam, 2019: *"¿hay alguna forma de pasar el turno sin elegir qué producir en una ciudad?"*; la respuesta menciona que `Mayús+Entrar` salta "la mayoría de las cosas que bloquean el botón de fin de turno" — [Pass turn without producing in a city](https://steamcommunity.com/app/289070/discussions/0/1777136225023548402/).
- Steam: "ese botón grande que usas para elegir la siguiente producción/investigación simplemente no funciona; tengo que abrir el árbol de tecnologías y elegir a mano" — [hilo de soporte](https://steamcommunity.com/app/289070/discussions/3/1471967615875770475).

**Otros juegos del género**
- Old World: reserva de órdenes repartible entre unidades y ambiciones del gobernante — [RPS](https://www.rockpapershotgun.com/preview-shape-nations-and-annoy-kings-in-old-world-the-new-4x-from-civ-4s-soren-johnson).
- Humankind: las "Era Stars" como objetivos a corto y medio plazo — [enciclopedia oficial](https://humankind-encyclopedia.games2gether.com/es-es/fame-cultures/game-concept/goals).
- Total War: Rome II: panel de objetivos de campaña con recompensas, plazo y misiones autocancelables — [manual](http://r2enc.totalwar.com/en/manual/single-player/0013_enc_page_campaign_play_objectives/).
- Civilization Revolution, el recorte deliberado: *"ha concentrado en vez de diluir la experiencia Civ"* (Edge) — [Wikipedia](https://en.wikipedia.org/wiki/Civilization_Revolution) · y los caminos de legado por era de Civ VII — [Polygon](https://www.polygon.com/civilization-7-guides/512563/legacy-paths-points-ages-requirements-civ-7/) y [guía oficial para principiantes](https://civilization.2k.com/civ-vii/news/civilization-vii-beginners-guide/).

**Nota de fiabilidad de las fuentes**
- La wiki de Fandom y el manual en PDF **no son accesibles** desde este entorno (bloqueo 403 y PDF no extraíble); todo lo citado de la wiki se leyó en copias de Wayback Machine, y del manual solo se usa como referencia, sin atribuirle contenido concreto.
- Las reseñas de IGN, PC Gamer y Polygon **no se pudieron leer íntegras**; sus notas provienen del resumen de recepción de Wikipedia.
- **No verificado** (por eso no se afirma en el informe): el nombre y el personaje de la asesora de Civ VI; la existencia de una pantalla llamada *"Notification Log"*; los avisos concretos "ciudad sin producción" y "unidad sin órdenes"; la mecánica exacta del narrador "historiador"; las chinchetas de mapa como función de lanzamiento; el orden interno de resolución entre turnos; si el *Leader Pass* cambió algo de claridad; y el telegrafiado de ataques de *Into the Breach* (fuentes bloqueadas), que por eso se ha omitido.

**Código de este repositorio (base del análisis)**
- `js/ui/ui.js` (turno, HUD, paneles, avisos), `js/ui/advisor.js`, `js/ui/summary.js`, `js/ui/minimap.js`, `js/ui/victory_ui.js`, `js/ui/conquista_ui.js`, `js/ui/intro_ui.js`, `js/ui/a11y.js`, `css/experiencia.css`, `index.html`.
- `js/core/game.js` (avisos, fin de turno, producción, colocación), `js/core/victory.js` (legados y victorias), `js/core/actions.js`, `js/core/projects.js`, `js/data/rules.js` (22 unidades, 26 edificios, 12 maravillas, 49 tecnologías).
- `README.md`, `PRODUCT.md`, `DESIGN.md` (principios de producto y sistema visual).

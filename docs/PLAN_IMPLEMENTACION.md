# Plan de implementación · mejoras de jugabilidad (Fase 1 del informe)

> Objetivo: que el jugador sepa siempre **qué hacer en el turno**. Base: [`docs/INVESTIGACION_CIV6_JUGABILIDAD.md`](INVESTIGACION_CIV6_JUGABILIDAD.md), propuestas P0.1, P0.2 y P0.4.
>
> **Restricción de concurrencia:** hay otra sesión trabajando en el repositorio (`js/ui/render3d.js`, `css/style.css`, `js/ui/ui.js`, `index.html`, `DESIGN.md`). Por eso todo el trabajo se hace en **archivos nuevos** o en archivos que esa sesión no toca (`js/ui/advisor.js`, `js/ui/summary.js`). No se modifica `ui.js` ni `render3d.js`.

## Contrato de integración (lo fija la Etapa 0)

| Pieza | Archivo | Responsable |
|---|---|---|
| Contenedor `#tasks` dentro de `.endbar` y carga de los guiones | `index.html` | coordinación |
| Estilos de la lista de pendientes y del registro | `css/experiencia.css` (solo se añade) | coordinación |
| Lista de pendientes del turno (P0.1) | `js/ui/tasks.js` **nuevo** | agente A |
| Consejero permanente y con acciones (P0.2) | `js/ui/advisor.js` | agente B |
| Registro de la crónica con filtros (P0.4) | `js/ui/chronicle_ui.js` **nuevo** | agente C |
| Enlace "Ver en la Crónica" del resumen | `js/ui/summary.js` | agente C |

**API que se publica (y que otros módulos consumen):**
- `UI.tasks.render()` → escribe `#tasks` y `#end-status`, ajusta `#btn-end.waiting` y devuelve el número de pendientes.
- `UI.advisor.peek()` → `{ id, html, tile }` o `null`: el consejo que el consejero tiene en pantalla.
- `UI.chronicle.open()` → abre el registro de la crónica.

**Compatibilidad:** si `#tasks` no existe en el HTML, `tasks.js` lo crea dentro de `.endbar`; si `UI.advisor` no está cargado, la fila del consejo simplemente no aparece. Ninguna pieza debe romperse si falta otra.

## Etapas

| Etapa | Qué | Quién | Estado |
|---|---|---|---|
| 0 | Contrato: `#tasks`, guiones en `index.html`, estilos, este plan | coordinación | hecho |
| 1 | Tres módulos en paralelo, archivos disjuntos (A, B, C) | 3 agentes | **cerrada por la coordinación**: los tres agentes fallaron a mitad; `tasks.js` y `chronicle_ui.js` quedaron escritos (con dos fallos corregidos a mano) y `advisor.js` lo escribió la coordinación |
| 2 | Verificación: arnés sin navegador (`tests/ui_smoke.js`) | coordinación | hecho: 13 comprobaciones en verde; detectó y permitió corregir el índice de `data-chr-go` y el aviso duplicado de amenazas |
| 3 | Integración: `node --check`, `npm test`, criterios de aceptación | coordinación | en curso (`npm test` incluye ya `tests/ui_smoke.js`) |
| 4 | Limpieza: mover la intercepción de la tecla `C` y del botón Crónica dentro de `ui.js`, anotar los módulos nuevos en el README | coordinación | pendiente: la otra sesión está reescribiendo `ui.js`, `index.html`, `README.md` y `DESIGN.md` ahora mismo |

## Qué quedó implementado

**P0.1 · Lista de pendientes** (`js/ui/tasks.js`, estilos en `css/experiencia.css`, contenedor `#tasks` en `index.html`): filas accionables para investigación, ciudades sin producción, unidades sin órdenes, amenazas y el consejo vigente; escribe `#end-status` y el estado de espera del botón de fin de turno. Si `#tasks` no existe, lo crea.

**P0.2 · Consejero permanente** (`js/ui/advisor.js`): 15 consejos por condición (los 10 antiguos, sin el techo del turno 30, más oro negativo, rutas libres, congreso, salto de fase y decisión pendiente en la Conquista); ciclo de vida con `seen` (descartado), `next` (pospuesto o repetición programada) y `peek()` para la lista; acciones «Ver», «Abrir», «Entendido» y «Recuérdamelo luego».

**P0.4 · Registro de la crónica** (`js/ui/chronicle_ui.js` y el enlace en `js/ui/summary.js`): filtros por tipo, búsqueda sin acentos, filtro de últimos 20 turnos, contador y salto a la ciudad mencionada; el resumen solo muestra el enlace cuando hay algo más que contar.

**Verificación** (`tests/ui_smoke.js`, añadido a `npm test` y a `npm run test:ui`): monta un DOM mínimo y el motor real en Node, y comprueba el pintado, las acciones de cada fila, los estados límite (menú, vista previa, diálogo, partida terminada), el ciclo de vida del consejero y el registro.

## Criterios de aceptación (Fase 1)

1. **P0.1** Con investigación pendiente, 2 ciudades sin producción, 3 unidades sin órdenes y una amenaza, la lista muestra las cuatro cosas, cada una lleva al sitio correcto y desaparece al resolverse. Con todo resuelto: "Todo listo." y el botón de fin de turno sin estado de espera.
2. **P0.2** Pasado el turno 30 sigue habiendo consejos pertinentes; un consejo se repite mientras su condición siga siendo cierta; "Recuérdamelo más tarde" lo pospone; "No más consejos" desactiva el consejero y la opción de Opciones sigue funcionando.
3. **P0.4** La ventana de la crónica permite filtrar por tipo, buscar texto y saltar a la ciudad mencionada; todo lo ocurrido en los últimos turnos es recuperable ahí.
4. **Robustez:** ninguna pieza lanza errores con `PC.G` nulo, en la vista previa del menú, con el HUD oculto, con un diálogo abierto o con la partida terminada.
5. **No regresión:** `npm test` (humo, determinismo, guardado y Conquista) en verde; el motor de simulación (`js/core`) intacto.

## Comandos de verificación

```bash
node --check js/ui/tasks.js && node --check js/ui/advisor.js && node --check js/ui/chronicle_ui.js
node tests/ui_smoke.js      # arnés sin navegador (Etapa 2)
npm test                    # motor completo
```

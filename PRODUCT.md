# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Hispanohablantes que juegan estrategia por turnos (conocen *Civilization*) y, por igual, estudiantes y público general interesados en la historia del Perú. Juegan sesiones largas en PC y también en tablet, con ratón y teclado o con toques.

## Product Purpose
Un juego de estrategia histórica no lineal sobre el Perú: el jugador guía una cultura andina desde Caral (3000 a.C.) hasta el siglo XXI y, según sus decisiones y los recursos que controla, produce un Perú distinto al real. El éxito es que el jugador entienda la historia real mientras juega a cambiarla.

## Positioning
La historia y la geografía andinas son la mecánica: la verticalidad costa–sierra–selva, las abras, la fauna amazónica, los recursos minerales que habilitan tecnologías, las culturas que surgen en su fecha real y los puntos de divergencia documentados (la llegada española, la epidemia de 1525, el guano, el salitre).

## Operating Context
- Partidas de cientos de turnos; el jugador vuelve a la misma partida (guardado automático en el navegador).
- Pantallas de trabajo: mapa (seleccionar, mover, atacar), ciudad (producción), tecnologías, diplomacia (con el congreso), provincias, crónica, eventos con decisiones, menú inicial (escenario, cultura, dificultad).
- Fases: Perú (completa), Sudamérica y América (jugables), el Mundo (pendiente).
- Rivales con líderes históricos que se suceden con los años, iniciativas diplomáticas propias y un congreso que vota resoluciones.

## Capabilities and Constraints
- Sitio estático sin compilación (HTML/CSS/JS); motor del juego en `js/core` independiente de la interfaz y probado en Node (`npm test`).
- Render 3D con three.js (decisión del usuario); estilo de maqueta low-poly.
- Sin emojis como iconografía (decisión del usuario).
- Las unidades, edificios, maravillas y recursos deben tener modelos propios que cambien con la era; aliados y enemigos deben distinguirse a simple vista.
- Prioridad PC y tablet; en teléfono funcional pero no optimizado.
- Debe poder publicarse como página autocontenida (sin diálogos nativos ni descargas).

## Brand Commitments
Nombre: **Perú Civilization**. Idioma: español. Cuatro niveles de dificultad (Fácil, Medio, Difícil, Realista).

## Evidence on Hand
- Investigación histórica y demográfica: `docs/INVESTIGACION_HISTORICA.md`.
- No hay arte, logotipos ni capturas oficiales; todo el arte se genera en código.

## Product Principles
1. La historia real es el punto de partida y la divergencia se gana jugando.
2. La geografía decide: costa, sierra y selva se juegan distinto.
3. Legible primero: el jugador debe saber de un vistazo qué es suyo, qué es enemigo y qué puede hacer.
4. Enseñar sin interrumpir: el contexto histórico aparece en eventos y fichas, no en muros de texto.

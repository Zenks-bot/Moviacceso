# Investigación: problemática, fuentes y supuestos

## 1. Problemática

Las personas con discapacidad motriz, los adultos mayores y otras personas con movilidad reducida necesitan información fiable **antes** de desplazarse sobre:

- la existencia y el estado de las rampas;
- los obstáculos en veredas y cruces;
- los desniveles y las discontinuidades del recorrido;
- el acceso a los puntos de parada del transporte público;
- las conexiones utilizables entre lugares de interés y el transporte.

Los mapas convencionales suelen representar la geometría de las calles, pero no si un tramo es utilizable con silla de ruedas, andador o bastón.

**Pregunta central:** ¿cómo facilitar la identificación de trayectos peatonales y conexiones con el transporte público mediante una plataforma accesible que centralice información sobre barreras de movilidad en Huánuco?

## 2. Fuentes de referencia (leídas el 18/11/2026)

### Contraloría General de la República — 8 de mayo de 2023
[«Contraloría advierte deficiencias en construcción de pistas y veredas en calles de Huánuco»](https://www.gob.pe/institucion/contraloria/noticias/753890-contraloria-advierte-deficiencias-en-construccion-de-pistas-y-veredas-en-calles-de-huanuco)

- Obra: rehabilitación de las **cuadras 16 y 17 del jirón San Martín** (ciudad de Huánuco), a cargo de la Municipalidad Provincial de Huánuco, valorizada en S/ 421 238 y paralizada desde enero de 2023.
- **Desniveles** entre veredas y pavimento de **45, 50 y 60 cm** (el expediente técnico fija un máximo de 30 cm entre vereda y fondo de cuneta).
- **Rampas para personas con discapacidad que no cumplen la normativa**: desniveles mayores de 4 cm con respecto al pavimento. La nota recuerda que el Reglamento Nacional de Edificaciones exige una pendiente no mayor del 12 % y un ancho mínimo de 0,90 m.
- Otras deficiencias: fisuras en el pavimento, desniveles de 1 a 4,5 cm con las calles vecinas Pedro Barroso y Alameda de la República, veredas con discontinuidad en las aristas, cunetas angostas y buzones sin tapa.
- Cita: «las rampas para discapacitados no cumplen con la normativa […] lo que dificultaría el desplazamiento de las personas con discapacidad».

### Conadis — 8 de enero de 2025
[«En 2024, más de la mitad de gobiernos regionales fueron sancionados por el Conadis por graves infracciones en materia de discapacidad»](https://www.gob.pe/institucion/conadis/noticias/1087810-en-2024-mas-de-la-mitad-de-gobiernos-regionales-fueron-sancionados-por-el-conadis-por-graves-infracciones-en-materia-de-discapacidad)

- 14 gobiernos regionales fueron sancionados por infringir la Ley 29973.
- El **Gobierno Regional de Huánuco** fue multado con **11 UIT** por **no contar con las condiciones mínimas de accesibilidad en sus sedes administrativas**: rampas con pendientes inadecuadas, falta de baños accesibles, de espacios para sillas de ruedas, de estacionamientos reservados, de señalética en braille y de pisos podotáctiles, entre otros.
- Fiscalización realizada en 2023; las multas fueron confirmadas en segunda instancia.
- **Matiz importante:** esta sanción se refiere a **edificios administrativos**, no a veredas ni calles. Sirve como contexto institucional de incumplimiento en accesibilidad en Huánuco, no como evidencia sobre la vía pública.

No se han usado otras fuentes oficiales.

## 3. Clasificación de la evidencia

| Tipo | Contenido actual del proyecto |
|---|---|
| **Antecedentes documentados** | Jr. San Martín, cuadras 16–17: desniveles de 45–60 cm y rampas fuera de norma (Contraloría, 2023). Gobierno Regional de Huánuco sancionado por falta de accesibilidad en sus sedes (Conadis, 2025) |
| **Observaciones verificadas** | Ninguna todavía: no se ha hecho inspección de campo |
| **Situaciones hipotéticas / simuladas** | Todo el grafo, los lugares y los reportes de demostración |

No afirmamos que todas las zonas de Huánuco presenten deficiencias.

## 4. Sector piloto y datos

- **Sector:** centro urbano, alrededor de la Plaza de Armas de Huánuco.
- **Coordenada de referencia** usada: −9.92975, −76.23985 (aproximada; **pendiente de contrastar** con OpenStreetMap, porque el entorno de desarrollo no tenía acceso a OSM).
- **Grafo de demostración:** cuadrícula esquemática de 4 × 4 nodos (unos 110 m por cuadra), 25 segmentos más un componente aislado. No pretende coincidir con las calles reales.
- **Lugares:** solo la Plaza de Armas como referencia real (con ubicación aproximada); el resto son destinos explícitamente ficticios («Destino demo A — centro de salud (ficticio)»). Los «paraderos demo» no son oficiales.
- **Camino hacia datos reales:** `scripts/osm-to-dataset.ts` importa geometría de OSM como «información insuficiente»; la accesibilidad solo cambia tras una inspección registrada con fecha, fuente y metodología.

## 5. Supuestos pendientes de validar

1. Que la falta de información previa sea una barrera relevante para planificar desplazamientos en Huánuco (validar con entrevistas voluntarias).
2. Que el centro urbano sea el sector piloto más útil (validar con destinos esenciales: salud, mercados, servicios públicos, paraderos).
3. Que los ciudadanos estén dispuestos a reportar barreras y que la moderación sea sostenible para el equipo.
4. Que los perfiles de ruta (general, adaptado y estricto) respondan a necesidades reales; pueden requerirse perfiles por tipo de ayuda técnica.
5. Que los factores de penalización del perfil adaptado (×1,5 y ×2,5) sean razonables (validar con usuarios).

## 6. Metodología de validación propuesta

1. **Revisión de antecedentes:** hecha para las dos fuentes de la sección 2; falta consultar el informe completo de la Contraloría, la normativa vigente y los informes municipales.
2. **Selección del sector:** confirmar los límites del piloto con un mapa base real.
3. **Destinos y conexiones:** identificar 8–12 destinos esenciales y los puntos de parada utilizados, sin presentarlos como oficiales si no lo son.
4. **Inspección:** ficha por tramo (fecha, responsable, rampas, ancho libre, obstáculos, superficie, pendiente aproximada, fotografía de archivo interno sin personas identificables).
5. **Pruebas voluntarias:** con consentimiento informado, de forma respetuosa y sin recopilar datos innecesarios. Las personas con discapacidad participan como expertas en su experiencia, no como sujetos pasivos; sus aportes no se sustituyen por suposiciones del equipo.
6. **Comparación antes/después:** tiempo y éxito al obtener información de un trayecto con y sin el prototipo.

No se atribuyen declaraciones a usuarios reales.

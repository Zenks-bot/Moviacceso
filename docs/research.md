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

## 2. Fuentes de referencia

| Fuente | Qué indica el título | Estado de verificación |
|---|---|---|
| Contraloría General de la República — [«Contraloría advierte deficiencias en construcción de pistas y veredas en calles de Huánuco»](https://www.gob.pe/institucion/contraloria/noticias/753890-contraloria-advierte-deficiencias-en-construccion-de-pistas-y-veredas-en-calles-de-huanuco) | Antecedente oficial de deficiencias constructivas en pistas y veredas de calles de Huánuco | ⚠️ El entorno de desarrollo no pudo abrir gob.pe (sin resolución DNS). **El equipo debe leer la nota y anotar aquí la fecha, las calles y los hallazgos concretos** antes de citarla en la exposición. |
| Conadis — [«En 2024 más de la mitad de gobiernos regionales fueron sancionados por el Conadis por graves infracciones en materia de discapacidad»](https://www.gob.pe/institucion/conadis/noticias/1087810-en-2024-mas-de-la-mitad-de-gobiernos-regionales-fueron-sancionados-por-el-conadis-por-graves-infracciones-en-materia-de-discapacidad) | Contexto nacional de incumplimientos en materia de discapacidad por gobiernos regionales | ⚠️ No verificado por la misma razón. **Comprobar si menciona expresamente a Huánuco**; si no lo hace, presentarla solo como contexto nacional. |

No se han usado otras fuentes oficiales. No se citan cifras que no se hayan leído en las fuentes.

## 3. Clasificación de la evidencia

| Tipo | Contenido actual del proyecto |
|---|---|
| **Antecedentes documentados** | Las dos notas oficiales anteriores (pendiente de leerlas y resumirlas) |
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

1. **Revisión de antecedentes:** leer y resumir las fuentes de la sección 2 y buscar normativa e informes municipales.
2. **Selección del sector:** confirmar los límites del piloto con un mapa base real.
3. **Destinos y conexiones:** identificar 8–12 destinos esenciales y los puntos de parada utilizados, sin presentarlos como oficiales si no lo son.
4. **Inspección:** ficha por tramo (fecha, responsable, rampas, ancho libre, obstáculos, superficie, pendiente aproximada, fotografía de archivo interno sin personas identificables).
5. **Pruebas voluntarias:** con consentimiento informado, de forma respetuosa y sin recopilar datos innecesarios. Las personas con discapacidad participan como expertas en su experiencia, no como sujetos pasivos; sus aportes no se sustituyen por suposiciones del equipo.
6. **Comparación antes/después:** tiempo y éxito al obtener información de un trayecto con y sin el prototipo.

No se atribuyen declaraciones a usuarios reales.

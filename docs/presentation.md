# Presentación de MoviAcceso

> Antes de exponer: lean y resuman las dos fuentes oficiales (ver `docs/research.md` §2) y ajusten la diapositiva 2 con lo que **realmente** dicen. No citen cifras que no hayan leído.

## 1. Propuesta de 8 diapositivas

| # | Título | Contenido | Elemento visual |
|---|---|---|---|
| 1 | **MoviAcceso** | «Información de accesibilidad para planificar desplazamientos en Huánuco». Equipo, curso, World Engineering Day Hackathon 2027. Etiqueta «Prototipo funcional» | Logotipo negro y dorado |
| 2 | Problemática de accesibilidad en Huánuco | Antecedentes oficiales (Contraloría: deficiencias en pistas y veredas; Conadis: contexto de infracciones en materia de discapacidad). Lo que falta: información previa sobre rampas, obstáculos, desniveles y acceso a paraderos | Las dos fuentes citadas con su enlace |
| 3 | Población afectada y necesidades | Personas con discapacidad motriz, adultos mayores, personas con movilidad reducida temporal, cuidadores. Necesidad: saber *antes de salir* si un trayecto es utilizable. Advertencia: necesidades por validar con participación voluntaria | Lista de necesidades → funcionalidad |
| 4 | Solución propuesta | Mapa con estados de evidencia, buscador con 3 perfiles, reportes ciudadanos moderados, estadísticas. Principio: **no garantizar accesibilidad sin evidencia** | Captura del detalle de trayecto |
| 5 | Arquitectura tecnológica | React + TypeScript + Leaflet/OSM → Supabase (PostgreSQL, RLS, funciones). Dijkstra con reglas de evidencia. Seguridad en la base de datos | Diagrama de `docs/architecture.md` |
| 6 | Demostración funcional | Demostración en vivo (guion de la sección 3) o vídeo de respaldo | Aplicación |
| 7 | Impacto, inclusión y escalabilidad | Indicadores medibles (% de tramos verificados, barreras documentadas, tiempo para obtener información, tasa de éxito en tareas). ODS 3, 9 y 11. Replicable en otras ciudades: el grafo se importa desde OSM y solo cambia la zona | Tabla observado / simulado / esperado |
| 8 | Conclusiones y próximos pasos | Implementado y probado (37 + 8 + 17 pruebas). Limitaciones: datos simulados, sin inspección de campo. Próximos pasos: importar OSM, inspeccionar 1 sector, pruebas voluntarias, alianza con la municipalidad | Hoja de ruta |

## 2. Guion oral (unos 5 minutos)

**[0:00 – 0:30] Portada.** «Imaginen que necesitan llegar a un centro de salud y no saben si encontrarán una rampa, una vereda rota o un escalón que no podrán superar. Somos el equipo de MoviAcceso y les presentamos un prototipo que busca responder a esa pregunta antes de salir de casa.»

**[0:30 – 1:15] Problema y evidencia.** «Hay antecedentes oficiales: la Contraloría advirtió deficiencias en la construcción de pistas y veredas en calles de Huánuco, y el Conadis informó sanciones a gobiernos regionales por infracciones en materia de discapacidad. No afirmamos que toda la ciudad tenga estos problemas; justamente el problema es que **no hay información centralizada para saber dónde sí y dónde no**.»

**[1:15 – 1:45] A quién afecta.** «Personas con discapacidad motriz, adultos mayores y cualquiera con movilidad reducida, incluso temporal. Los mapas convencionales muestran calles, pero no si son utilizables con silla de ruedas o andador.»

**[1:45 – 2:30] Solución y cómo funciona.** «MoviAcceso modela el sector piloto como un grafo de tramos peatonales. Cada tramo tiene un estado: verificado, barrera, información insuficiente o pendiente de verificación, además de su fuente y fecha. El buscador aplica Dijkstra con tres perfiles. Su diferencia clave es la honestidad: si no hay evidencia suficiente, el sistema lo dice en lugar de inventar una ruta accesible.»

**[2:30 – 4:00] Demostración.** (Ver sección 3.)

**[4:00 – 4:30] Qué está implementado realmente.** «Lo que vieron funciona: mapa, motor de rutas, reportes que se guardan en PostgreSQL con seguridad a nivel de fila, moderación y estadísticas, con 62 pruebas automatizadas. Lo que todavía no tenemos son datos de campo: todos los tramos actuales son de demostración y están marcados así.»

**[4:30 – 5:00] Impacto y cierre.** «Mediremos el impacto con indicadores concretos: porcentaje de tramos verificados, barreras documentadas y tiempo para obtener información sobre un trayecto. No prometemos reducir accidentes ni emisiones sin medirlo. Como el grafo se importa desde OpenStreetMap, el modelo se puede replicar en otras ciudades. Gracias.»

## 3. Demostración guiada (unos 90 segundos)

Preparación: aplicación desplegada con Supabase, sesión de administración abierta en otra pestaña y un vídeo de respaldo grabado.

1. **Abrir la aplicación**: página de inicio, mostrar el aviso de prototipo y pulsar «Explorar mapa». Señalar la leyenda (color, patrón y texto) y la vista en lista.
2. **Seleccionar origen y destino**: «Buscar trayecto» → Plaza de Armas → Comisaría PNP Huánuco (lugares reales de OSM).
3. **Consultar el trayecto**: «Trayecto general» muestra «Incluye barreras» (452 m). Cambiar a «Adaptado a movilidad reducida»: unos 455 m, evita la barrera y advierte que hay tramos sin datos.
4. **Observar una barrera**: en el mapa, abrir el tramo del Jr. San Martín con fuente oficial (Contraloría, 2023), que muestra enlace y fecha; compararlo con una barrera simulada, marcada como demo. Activar «Estricto» y desmarcar los datos de demostración: aparece el mensaje «No encontramos un trayecto con accesibilidad verificada…».
5. **Registrar un reporte**: «Reportar barrera» → elegir un tramo de la lista → «Rampa obstruida» → descripción → dificultad 4 → aceptar las condiciones → «Enviar reporte». Mostrar el código de seguimiento.
6. **Comprobar la persistencia**: recargar la página y abrir «Consultar el estado de este reporte»: «Pendiente de moderación», leído desde la base de datos.
7. **Panel de administración**: en la pestaña de administración, filtrar «Pendiente», abrir «Revisar» → «Aprobar publicación». Mostrar el historial y explicar que moderar no es verificar. Volver a Estadísticas: el reporte aparece en las cifras **reales**, separadas de las de demostración.

## 4. Argumentos técnicos clave

- **Evidencia antes que optimismo:** el estado efectivo de un dato simulado es «insuficiente» cuando se desactiva el modo demo; el perfil estricto nunca devuelve rutas no verificadas.
- **Sin conexiones inventadas:** Dijkstra solo recorre aristas registradas; los segmentos con nodos inexistentes se descartan.
- **Distancias reales:** suma geodésica de la geometría de cada tramo.
- **Seguridad donde no se puede eludir:** RLS y funciones `SECURITY DEFINER` con validación, límites y autorización; `reporter_id` no expuesto; claves privadas bloqueadas en el cliente.
- **Accesibilidad digital:** listas equivalentes al mapa, teclado completo, contraste ≥ 4,5:1, axe-core sin violaciones (sin declarar conformidad total).
- **Escalable:** importador OSM, datos sustituibles sin reescribir la aplicación, despliegue estático en Vercel o Netlify.

## 5. Posibles preguntas del jurado

| Pregunta | Respuesta sugerida |
|---|---|
| ¿Los datos son reales? | No. Son de demostración y así se muestran en toda la interfaz. La plataforma está preparada para cargar inspecciones reales; el siguiente paso es inspeccionar un sector. |
| ¿Por qué no usar Google Maps? | Porque no informa de forma sistemática sobre rampas, obstáculos ni el nivel de verificación de esos datos. MoviAcceso añade estado de evidencia, fuente y fecha por tramo, y reportes moderados. |
| ¿Qué pasa si alguien envía reportes falsos? | Se moderan antes de publicarse; hay límites por sesión, detección de duplicados y un campo trampa. Además, un reporte aprobado no cambia el estado del tramo: eso requiere verificación técnica. |
| ¿Cómo protegen la privacidad? | No pedimos datos personales ni GPS, se rechazan DNI y teléfonos en la descripción, no hay fotos y el identificador de sesión no es público. |
| ¿Cómo medirán el impacto? | Con los indicadores de `requirements.md` §5 y pruebas antes/después con participantes voluntarios. Hoy no tenemos resultados observados de impacto y no los inventamos. |
| ¿Es escalable? | El grafo se genera desde OpenStreetMap; cambiar de ciudad implica importar otra zona y organizar inspecciones. Supabase escala sin cambiar la arquitectura. |
| ¿Por qué no hay IA? | No aporta valor demostrable en esta etapa; la prioridad es tener datos verificados. |
| ¿Cumple WCAG? | Seguimos WCAG 2.2 AA y pasamos las comprobaciones automáticas y de teclado, pero falta una auditoría completa con usuarios y lectores de pantalla, así que no declaramos conformidad. |
| ¿Relación con el transporte sostenible? | Caminar y el transporte público solo son opciones reales si la infraestructura peatonal es utilizable por todos. No atribuimos reducciones de CO₂ sin medirlas. |

## 6. Executive summary (English, supplementary material)

**MoviAcceso — Inclusive urban mobility information for Huánuco, Peru (functional prototype).**

*Problem.* People with motor disabilities, older adults and others with reduced mobility lack reliable information about ramps, sidewalk obstacles, level changes and access to transit stops before they travel. Official Peruvian sources report deficiencies in the construction of streets and sidewalks in Huánuco and disability-related infractions by regional governments (to be summarized by the team from the cited sources).

*Solution.* A web platform that models a pilot area of downtown Huánuco as a pedestrian graph. Each segment records its accessibility status (verified accessible, verified barrier, insufficient information, community report pending verification), its source and verification date. A Dijkstra-based router offers three profiles (general, reduced mobility, strict verified accessibility) and **never presents a route as accessible without sufficient evidence**: simulated data never counts as real evidence. Citizens can submit barrier reports, which are stored in PostgreSQL, moderated by administrators and kept separate from technical field verification. A statistics dashboard queries the database and separates real figures from demonstration figures.

*Technology.* React, TypeScript, Leaflet with OpenStreetMap, Supabase (PostgreSQL with row-level security and validated server functions). 62 automated tests: 37 unit tests, 8 database security blocks and 17 end-to-end browser tests including automated WCAG 2.2 A/AA checks.

*Status and limitations.* All accessibility data is currently **demonstration data** on a schematic grid; no field inspection has been done yet. Accessibility conformance has not been fully audited.

*Impact (expected, not yet measured).* Share of pilot segments with verified information, number of documented barriers, time to obtain trip accessibility information and task success rate in voluntary user tests. Related SDGs: 3, 9 and 11. The model can be replicated in other cities by importing OpenStreetMap geometry and running local inspections.

*This summary is complementary material and does not by itself satisfy the full WFEO submission requirements.*

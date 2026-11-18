# Requisitos, alcance y criterios de aceptación

## 1. Alcance del MVP

**Incluido:** página de inicio, mapa de movilidad, buscador de trayectos con detalle, evaluación de accesibilidad, formulario de reportes, seguimiento por identificador, panel estadístico, moderación para administradores, base de datos persistente con RLS, páginas «Acerca y metodología» y «Privacidad».

**Zona piloto:** centro urbano de Huánuco, alrededor de la Plaza de Armas (caja de unos 0,8 × 0,9 km, dividida en cuatro cuadrantes para estadísticas).

**Fuera del alcance** (posibles mejoras futuras): seguimiento GPS de vehículos, predicción con IA, reservas, pagos, navegación asistida en tiempo real, garantías de seguridad física y modelos de emisiones de CO₂.

**Restricciones:** no garantizar accesibilidad sin evidencia; identificar siempre los datos simulados; no inventar paraderos oficiales, empresas ni rutas autorizadas; no usar Nominatim como buscador (la búsqueda usa solo los lugares almacenados).

## 2. Requisitos funcionales

| ID | Requisito | Implementación | Estado |
|---|---|---|---|
| RF-01 | Inicio con nombre, logotipo, problema, funcionamiento, botones «Explorar mapa» y «Reportar obstáculo», relación con la movilidad inclusiva y aviso de prototipo | `HomePage`, banner global de prototipo | ✅ |
| RF-02 | Mapa: sector piloto, zoom, desplazamiento, selección de marcadores y tramos, distinción verificado / no verificado / simulado, leyenda textual, atribución OSM | `MapPage`, `MapView`, `Legend`, filtros por estado, vista en lista con pestañas | ✅ |
| RF-03 | Origen, destino, lista de lugares, 3 preferencias, botón «Buscar trayecto», ruta en el mapa, descripción textual, distancia desde la geometría, estado y confianza, mensaje obligatorio si no hay ruta verificada | `RoutePage` | ✅ |
| RF-04 | Grafo con todos los atributos de segmento; Dijkstra; reglas de exclusión y evidencia; criterios documentados | `features/routing`, `docs/architecture.md §4` | ✅ |
| RF-05 | Detalle con nombre, tipo, rampas, obstáculos, estado, fuente, fecha y advertencias; las 5 clasificaciones | `DetailPanel`, `StatusBadge`, `DemoBadge` | ✅ |
| RF-06 | Formulario con ubicación, tipo (6 categorías), descripción, dificultad, fecha automática, condiciones y «Enviar reporte»; validación; confirmación con identificador; persistencia en PostgreSQL; sin localStorage; error explícito sin backend | `ReportPage`, `schema.ts`, `submit_report()` | ✅ (persistencia comprobada en PostgreSQL local; falta comprobarla con Supabase alojado) |
| RF-07 | Sección protegida: pendientes, revisión, aprobar, rechazar con justificación, resolver, historial; moderación distinta de la verificación técnica | `AdminPage`, `moderate_report()`, `set_report_verification()`, `report_status_history` | ✅ |
| RF-08 | Total, pendientes, aprobados, resueltos, categorías, zonas y evolución temporal desde la base de datos; demo identificado | `StatsPage`, `get_report_stats()` (ámbitos `real` y `demo` separados) | ✅ |
| RF-09 | Mensajes para conexión, guardado, campos incompletos, origen = destino, sin rutas, información insuficiente, permisos y teselas no disponibles | `lib/errors.ts`, alertas por pantalla, aviso de teselas en `MapView` | ✅ |

## 3. Requisitos no funcionales

| ID | Requisito | Cómo se cumple |
|---|---|---|
| RNF-01 | Adaptable | Diseño de Tailwind por breakpoints; prueba e2e de desbordamiento en Pixel 7 y escritorio |
| RNF-02 | Chrome, Edge, Firefox | Solo APIs web estándar; probado en Chromium (Firefox/Edge: ver guía manual) |
| RNF-03 | Sin recargas completas | React Router (SPA) y carga diferida por pantalla |
| RNF-04 | Tiempos de espera y estados de carga | `run()` con `AbortController` (12 s); componentes `Loading`, `EmptyState` y `Alert` |
| RNF-05 | Confirmación real del servidor | `requireData: true`; éxito solo con el `id` devuelto por `submit_report` |
| RNF-06 | TypeScript estricto sin `any` | `strict`, `noUncheckedIndexedAccess`; no hay `any` en el código |
| RNF-07 | Datos sustituibles | Tipos de dominio independientes de la fuente; importador OSM; fuente única para el seed |
| RNF-08 | Modular y documentado | Estructura por funcionalidades; carpeta `docs/` |
| RNF-09 | Sin secretos | `.env.local` ignorado; solo la clave pública |
| RNF-10 | Recursos optimizados | Pantallas con mapa cargadas bajo demanda; fragmentos separados para mapa y Supabase; gráficos en HTML/CSS sin librería |

## 4. Criterios de aceptación (sección 15 del enunciado)

| # | Escenario | Verificación | Resultado |
|---|---|---|---|
| 1 | Mapa del área piloto | e2e «Prueba 1» | ✅ automatizada |
| 2 | Búsqueda válida | unitaria + e2e | ✅ automatizada |
| 3 | Trayecto no disponible sin conexiones ficticias | unitaria (Dijkstra devuelve `null`) + e2e (no se dibuja mapa) | ✅ automatizada |
| 4 | Barrera excluida del perfil estricto | unitaria | ✅ automatizada |
| 5 | Segmento desconocido no aparece como verificado | unitaria + e2e | ✅ automatizada |
| 6 | Reporte persistente tras recargar | SQL (`OK 2`, `OK 3` y `OK 8`: transacciones separadas) + manual con Supabase | ⚠️ BD verificada; navegador ↔ Supabase alojado pendiente (guía manual) |
| 7 | Reporte incompleto rechazado con explicación | unitaria (Zod) + e2e | ✅ automatizada |
| 8 | Moderación por administrador | SQL (`OK 7`) + manual | ⚠️ BD verificada; interfaz con Supabase pendiente |
| 9 | Usuario sin permisos no ejecuta acciones admin | SQL (`OK 1`, `OK 6`) + e2e (interfaz) | ✅ en BD; manual recomendado |
| 10 | Uso con teclado y controles textuales | e2e «Prueba 10» | ✅ automatizada |
| 11 | Móvil y escritorio | e2e «Prueba 11» en 2 proyectos | ✅ automatizada |
| 12 | Supabase no disponible: no afirma guardar | e2e «Prueba 7 y 12» + unitaria de errores | ✅ automatizada |

## 5. Métricas de impacto propuestas (sin resultados inventados)

| Indicador | Cómo se mide | Tipo actual |
|---|---|---|
| % de segmentos del piloto con información verificada | `graph_edges` no simulados con estado verificado / total | Hoy 0% (todo simulado) |
| Barreras documentadas | Segmentos `barrera_verificada` + reportes `verificado_en_campo` | Solo demostración |
| Proporción de reportes moderados | (aprobados + rechazados + resueltos) / total | Se calcula en el panel |
| Tiempo para encontrar información de un trayecto | Prueba de usuario cronometrada, antes y después | Esperado (sin medir) |
| Conexiones con paraderos analizadas | Puntos de parada conectados al grafo | Solo demostración |
| Tasa de éxito en tareas | Pruebas de usabilidad voluntarias | Esperado (sin medir) |
| Problemas de accesibilidad digital detectados y corregidos | axe-core + auditoría manual | Observado: ver `testing.md` |

Separación obligatoria: **observado** (medido en pruebas) · **simulado** (datos de demostración) · **esperado** (hipótesis pendiente). No se atribuyen reducciones de emisiones ni de accidentes.

# Pruebas

## 1. Pruebas ejecutadas y resultados (18/11/2026)

Entorno: Linux, Node 22, Chromium (Playwright 1.63), PostgreSQL 16 local. No había acceso a Supabase alojado, Docker, teselas de OSM ni gob.pe.

| Conjunto | Comando | Resultado |
|---|---|---|
| Compilación TypeScript estricta | `npm run typecheck` | ✅ sin errores |
| Compilación de producción | `npm run build` | ✅ |
| Unitarias (Vitest) | `npm test` | ✅ **37/37** (motor de rutas 17, escenarios demo incluidos; validación del formulario 10; errores 5; geometría 2; importador OSM 3) |
| Base de datos (PostgreSQL + stub de `auth`) | `npm run db:test` | ✅ **8/8 bloques** |
| E2E escritorio + móvil (Pixel 7) | `npm run test:e2e` | ✅ **17 superadas**, 1 omitida (teclado solo en escritorio) |
| Accesibilidad automática (axe-core, WCAG 2.0/2.1/2.2 A y AA) | incluida en e2e | ✅ 0 violaciones en 9 pantallas × 2 dispositivos |
| Contraste de la paleta | cálculo de luminancia WCAG | ✅ todas las combinaciones de texto ≥ 4,66:1 |

### Bloques de base de datos (`supabase/tests/01_rls_and_functions.sql`)
1. Visitante anónimo: lee el grafo y solo los 4 reportes públicos; no puede leer `reporter_id`, insertar, modificar segmentos, usar `submit_report` ni `moderate_report`.
2. Un ciudadano con sesión registra un reporte válido y obtiene su identificador.
3. Otro ciudadano no ve ni modifica ese reporte pendiente (en una transacción separada: el dato persiste).
4. El servidor rechaza una descripción corta, una ubicación fuera del piloto, una severidad de 9 o un segmento inexistente.
5. Límite de 5 reportes por hora y detección de duplicados.
6. Un ciudadano no puede aprobar, verificar, crear nodos ni leer el historial.
7. El administrador modera con reglas de transición; aprobar no implica verificación; la verificación exige fuente; el historial registra 3 eventos.
8. Tras la aprobación el reporte es público; `get_report_status`, la zona asignada y las estadísticas son correctas.

## 2. Defectos encontrados y corregidos durante las pruebas

| Defecto | Detectado por | Corrección |
|---|---|---|
| `anon` conservaba EXECUTE sobre las funciones nuevas (privilegio por defecto de PUBLIC) | `db:test` bloque 1 | Revocación explícita después de crear las funciones |
| El nivel de dificultad nunca validaba (los radios devuelven texto; `valueAsNumber` no se aplica a radios) | e2e Prueba 7 | `z.coerce.number()` en el esquema + prueba unitaria |
| El foco inicial en el `h1` impedía que «Saltar al contenido» fuera el primer elemento al tabular | e2e Prueba 10 | El foco se mueve solo al navegar entre pantallas |
| En móvil, un marcador quedaba bajo los controles de zoom (axe `target-size`) | axe móvil | Encuadre inicial con margen |

## 3. Problemas pendientes

- **Flujo completo con Supabase alojado (Pruebas 6, 8 y 9 desde el navegador):** no se pudo ejecutar aquí. Siga la guía manual de la sección 4.
- **Teselas:** solo se verificó el aviso «mapa base no disponible». Compruebe la carga real en un navegador con internet.
- **Firefox y Edge:** no se probaron automáticamente (solo Chromium). Use la guía manual.
- **Lectores de pantalla:** no se probaron NVDA, JAWS, VoiceOver ni TalkBack. Los marcadores de Leaflet son operables con teclado, pero la experiencia equivalente recomendada son las listas.
- **Auditoría WCAG 2.2 completa:** pendiente. No se declara conformidad.

## 4. Guía de pruebas manuales (con Supabase configurado)

Requisitos: migraciones y seed aplicados, inicio anónimo habilitado, un administrador en `admin_roles`, y `.env.local` configurado.

| # | Pasos | Resultado esperado |
|---|---|---|
| M1 Mapa | Abrir `/mapa` | Teselas de OSM visibles con su atribución; 26 tramos; el aviso de datos de demostración procede de la base de datos |
| M2 Trayecto | `/trayecto`: Plaza → Destino A, «Trayecto general» | «Incluye barreras», 381 m, tramo diagonal con barrera |
| M3 Adaptado | Mismo origen y destino, «Adaptado» | «Ruta demostrativa (no auditada)», 446 m aproximadamente, sin barreras |
| M4 Estricto sin demo | «Estricto», desmarcar datos de demostración | Mensaje «No encontramos un trayecto con accesibilidad verificada…» |
| M5 Reporte (Prueba 6) | `/reportar`: elegir «Tramo demo F2-3», completar y enviar | Confirmación con código e identificador. **Recargar** y abrir `/seguimiento?id=…` → «Pendiente de moderación». En Supabase → Table Editor → `reports` aparece la fila |
| M6 Nueva sesión | Abrir el enlace de seguimiento en otra ventana o navegador | El estado se sigue consultando (persistencia en PostgreSQL, no en el navegador) |
| M7 Incompleto | Enviar el formulario vacío | Resumen de errores con instrucciones; no se crea ninguna fila |
| M8 Moderación (Prueba 8) | `/admin`, iniciar sesión, «Revisar» → «Aprobar publicación» | Aviso «nuevo estado Aprobado y publicado (confirmado por el servidor)»; historial con 2 entradas; el reporte aparece en `/mapa` → «Reportes publicados» y en `/estadisticas` |
| M9 Seguridad (Prueba 9) | Crear un usuario sin rol e iniciar sesión en `/admin` | «Permiso denegado». Opcional: en la consola del navegador, `rpc('moderate_report', …)` → error 42501 |
| M10 Sin conexión (Prueba 12) | DevTools → Network → Offline y enviar un reporte | «El reporte NO se guardó: No pudimos conectarnos con el servidor…» |
| M11 Límite | Enviar 6 reportes en una hora desde la misma sesión | El sexto muestra «Límite alcanzado…» |
| M12 Teclado | Recorrer Inicio → Trayecto → Reporte solo con Tab, Enter, Espacio y flechas | Foco siempre visible; todo es operable sin ratón (ubicación mediante la lista de tramos) |
| M13 Zoom | Zoom del navegador al 200% y al 400% | Sin pérdida de contenido ni desplazamiento horizontal en la página |
| M14 Navegadores | Repetir M2, M5 y M8 en Firefox y Edge | Mismo comportamiento |

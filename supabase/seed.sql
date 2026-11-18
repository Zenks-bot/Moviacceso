-- =============================================================================
-- MoviAcceso — DATOS DE DEMOSTRACIÓN (generado por scripts/generate-seed.ts; no editar a mano)
-- Todo el grafo y los lugares tienen source_type = 'simulado'. Los reportes tienen is_demo = true.
-- La geometría es una cuadrícula esquemática; NO describe el estado real de la infraestructura.
-- =============================================================================
begin;

insert into public.pilot_zones (id, name, min_lat, max_lat, min_lng, max_lng) values
  ('z-no', 'Sector piloto noroeste', -9.92975, -9.92575, -76.24385, -76.23985),
  ('z-ne', 'Sector piloto noreste', -9.92975, -9.92575, -76.23985, -76.23585),
  ('z-so', 'Sector piloto suroeste', -9.93375, -9.92975, -76.24385, -76.23985),
  ('z-se', 'Sector piloto sureste', -9.93375, -9.92975, -76.23985, -76.23585)
on conflict (id) do nothing;

insert into public.graph_nodes (id, latitude, longitude) values
  ('n-r0c0', -9.92825, -76.24138),
  ('n-r0c1', -9.92825, -76.24036),
  ('n-r0c2', -9.92825, -76.23934),
  ('n-r0c3', -9.92825, -76.23832),
  ('n-r1c0', -9.92925, -76.24138),
  ('n-r1c1', -9.92925, -76.24036),
  ('n-r1c2', -9.92925, -76.23934),
  ('n-r1c3', -9.92925, -76.23832),
  ('n-r2c0', -9.93025, -76.24138),
  ('n-r2c1', -9.93025, -76.24036),
  ('n-r2c2', -9.93025, -76.23934),
  ('n-r2c3', -9.93025, -76.23832),
  ('n-r3c0', -9.93125, -76.24138),
  ('n-r3c1', -9.93125, -76.24036),
  ('n-r3c2', -9.93125, -76.23934),
  ('n-r3c3', -9.93125, -76.23832),
  ('n-iso1', -9.93215, -76.23745),
  ('n-iso2', -9.93285, -76.23675)
on conflict (id) do nothing;

insert into public.graph_edges (id, name, source_node_id, target_node_id, geometry, length_m, accessibility_status, surface_type, barrier_type, ramp_status, source_type, source_url, verified_at, notes) values
  ('e-h-r0c0', 'Tramo demo F0-1', 'n-r0c0', 'n-r0c1', '{"type":"LineString","coordinates":[[-76.24138,-9.92825],[-76.24036,-9.92825]]}'::jsonb, 111.7, 'accesible_verificado', 'concreto', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-h-r0c1', 'Tramo demo F0-2', 'n-r0c1', 'n-r0c2', '{"type":"LineString","coordinates":[[-76.24036,-9.92825],[-76.23934,-9.92825]]}'::jsonb, 111.7, 'informacion_insuficiente', 'desconocida', 'desconocida', 'desconocida', 'simulado', null, null, null),
  ('e-h-r0c2', 'Tramo demo F0-3', 'n-r0c2', 'n-r0c3', '{"type":"LineString","coordinates":[[-76.23934,-9.92825],[-76.23832,-9.92825]]}'::jsonb, 111.7, 'accesible_verificado', 'concreto', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-h-r1c0', 'Tramo demo F1-1', 'n-r1c0', 'n-r1c1', '{"type":"LineString","coordinates":[[-76.24138,-9.92925],[-76.24036,-9.92925]]}'::jsonb, 111.7, 'comunitario_pendiente', 'desconocida', 'vereda_deteriorada', 'desconocida', 'simulado', null, null, 'Reporte comunitario simulado de vereda deteriorada, sin verificación técnica.'),
  ('e-h-r1c1', 'Tramo demo F1-2 (borde norte de la plaza)', 'n-r1c1', 'n-r1c2', '{"type":"LineString","coordinates":[[-76.24036,-9.92925],[-76.23934,-9.92925]]}'::jsonb, 111.7, 'accesible_verificado', 'adoquin', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-h-r1c2', 'Tramo demo F1-3', 'n-r1c2', 'n-r1c3', '{"type":"LineString","coordinates":[[-76.23934,-9.92925],[-76.23832,-9.92925]]}'::jsonb, 111.7, 'accesible_verificado', 'concreto', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-h-r2c0', 'Tramo demo F2-1', 'n-r2c0', 'n-r2c1', '{"type":"LineString","coordinates":[[-76.24138,-9.93025],[-76.24036,-9.93025]]}'::jsonb, 111.7, 'informacion_insuficiente', 'desconocida', 'desconocida', 'desconocida', 'simulado', null, null, null),
  ('e-h-r2c1', 'Tramo demo F2-2 (borde sur de la plaza)', 'n-r2c1', 'n-r2c2', '{"type":"LineString","coordinates":[[-76.24036,-9.93025],[-76.23934,-9.93025]]}'::jsonb, 111.7, 'accesible_verificado', 'adoquin', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-h-r2c2', 'Tramo demo F2-3', 'n-r2c2', 'n-r2c3', '{"type":"LineString","coordinates":[[-76.23934,-9.93025],[-76.23832,-9.93025]]}'::jsonb, 111.7, 'barrera_verificada', 'concreto', 'rampa_obstruida', 'obstruida', 'simulado', null, '2026-11-01T00:00:00Z', 'Barrera simulada: rampa obstruida en la esquina este.'),
  ('e-h-r3c0', 'Tramo demo F3-1', 'n-r3c0', 'n-r3c1', '{"type":"LineString","coordinates":[[-76.24138,-9.93125],[-76.24036,-9.93125]]}'::jsonb, 111.7, 'accesible_verificado', 'asfalto', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-h-r3c1', 'Tramo demo F3-2', 'n-r3c1', 'n-r3c2', '{"type":"LineString","coordinates":[[-76.24036,-9.93125],[-76.23934,-9.93125]]}'::jsonb, 111.7, 'informacion_insuficiente', 'desconocida', 'desconocida', 'desconocida', 'simulado', null, null, null),
  ('e-h-r3c2', 'Tramo demo F3-3', 'n-r3c2', 'n-r3c3', '{"type":"LineString","coordinates":[[-76.23934,-9.93125],[-76.23832,-9.93125]]}'::jsonb, 111.7, 'comunitario_pendiente', 'desconocida', 'escalon', 'desconocida', 'simulado', null, null, 'Reporte comunitario simulado de un escalón sin rampa, pendiente de verificación.'),
  ('e-v-r0c0', 'Tramo demo C0-1', 'n-r0c0', 'n-r1c0', '{"type":"LineString","coordinates":[[-76.24138,-9.92825],[-76.24138,-9.92925]]}'::jsonb, 111.2, 'accesible_verificado', 'concreto', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-v-r1c0', 'Tramo demo C0-2', 'n-r1c0', 'n-r2c0', '{"type":"LineString","coordinates":[[-76.24138,-9.92925],[-76.24138,-9.93025]]}'::jsonb, 111.2, 'informacion_insuficiente', 'desconocida', 'desconocida', 'desconocida', 'simulado', null, null, null),
  ('e-v-r2c0', 'Tramo demo C0-3', 'n-r2c0', 'n-r3c0', '{"type":"LineString","coordinates":[[-76.24138,-9.93025],[-76.24138,-9.93125]]}'::jsonb, 111.2, 'accesible_verificado', 'concreto', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-v-r0c1', 'Tramo demo C1-1', 'n-r0c1', 'n-r1c1', '{"type":"LineString","coordinates":[[-76.24036,-9.92825],[-76.24036,-9.92925]]}'::jsonb, 111.2, 'accesible_verificado', 'concreto', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-v-r1c1', 'Tramo demo C1-2 (borde oeste de la plaza)', 'n-r1c1', 'n-r2c1', '{"type":"LineString","coordinates":[[-76.24036,-9.92925],[-76.24036,-9.93025]]}'::jsonb, 111.2, 'accesible_verificado', 'adoquin', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-v-r2c1', 'Tramo demo C1-3', 'n-r2c1', 'n-r3c1', '{"type":"LineString","coordinates":[[-76.24036,-9.93025],[-76.24036,-9.93125]]}'::jsonb, 111.2, 'comunitario_pendiente', 'desconocida', 'obstaculo_temporal', 'desconocida', 'simulado', null, null, 'Reporte comunitario simulado de obstáculo temporal en la vereda.'),
  ('e-v-r0c2', 'Tramo demo C2-1', 'n-r0c2', 'n-r1c2', '{"type":"LineString","coordinates":[[-76.23934,-9.92825],[-76.23934,-9.92925]]}'::jsonb, 111.2, 'informacion_insuficiente', 'desconocida', 'desconocida', 'desconocida', 'simulado', null, null, null),
  ('e-v-r1c2', 'Tramo demo C2-2 (borde este de la plaza)', 'n-r1c2', 'n-r2c2', '{"type":"LineString","coordinates":[[-76.23934,-9.92925],[-76.23934,-9.93025]]}'::jsonb, 111.2, 'accesible_verificado', 'adoquin', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-v-r2c2', 'Tramo demo C2-3', 'n-r2c2', 'n-r3c2', '{"type":"LineString","coordinates":[[-76.23934,-9.93025],[-76.23934,-9.93125]]}'::jsonb, 111.2, 'informacion_insuficiente', 'desconocida', 'desconocida', 'desconocida', 'simulado', null, null, null),
  ('e-v-r0c3', 'Tramo demo C3-1', 'n-r0c3', 'n-r1c3', '{"type":"LineString","coordinates":[[-76.23832,-9.92825],[-76.23832,-9.92925]]}'::jsonb, 111.2, 'accesible_verificado', 'concreto', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-v-r1c3', 'Tramo demo C3-2', 'n-r1c3', 'n-r2c3', '{"type":"LineString","coordinates":[[-76.23832,-9.92925],[-76.23832,-9.93025]]}'::jsonb, 111.2, 'accesible_verificado', 'concreto', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-v-r2c3', 'Tramo demo C3-3', 'n-r2c3', 'n-r3c3', '{"type":"LineString","coordinates":[[-76.23832,-9.93025],[-76.23832,-9.93125]]}'::jsonb, 111.2, 'accesible_verificado', 'concreto', 'ninguna', 'presente', 'simulado', null, '2026-11-01T00:00:00Z', null),
  ('e-d-plaza', 'Tramo demo diagonal (interior de la plaza)', 'n-r1c1', 'n-r2c2', '{"type":"LineString","coordinates":[[-76.24036,-9.92925],[-76.23934,-9.93025]]}'::jsonb, 157.6, 'barrera_verificada', 'adoquin', 'escalon', 'ausente', 'simulado', null, '2026-11-01T00:00:00Z', 'Barrera simulada: escalones sin rampa en el recorrido diagonal.'),
  ('e-iso', 'Tramo demo aislado', 'n-iso1', 'n-iso2', '{"type":"LineString","coordinates":[[-76.23745,-9.93215],[-76.23675,-9.93285]]}'::jsonb, 109.3, 'informacion_insuficiente', 'desconocida', 'desconocida', 'desconocida', 'simulado', null, null, null)
on conflict (id) do nothing;

insert into public.places (id, name, category, latitude, longitude, node_id, description, accessibility_status, ramp_status, source_type, source_url, verified_at) values
  ('p-plaza', 'Plaza de Armas de Huánuco (referencia)', 'espacio_publico', -9.92975, -76.23985, 'n-r1c1', 'Punto de referencia del sector piloto. Ubicación aproximada; el acceso al grafo se modela en la esquina noroeste de la plaza. Las condiciones de accesibilidad mostradas son simuladas.', 'informacion_insuficiente', 'desconocida', 'simulado', null, null),
  ('p-salud', 'Destino demo A — centro de salud (ficticio)', 'salud', -9.93125, -76.23832, 'n-r3c3', 'Destino ficticio para la demostración. No representa un establecimiento real.', 'accesible_verificado', 'presente', 'simulado', null, '2026-11-01T00:00:00Z'),
  ('p-educacion', 'Destino demo B — institución educativa (ficticia)', 'educacion', -9.92825, -76.23832, 'n-r0c3', 'Destino ficticio para la demostración.', 'informacion_insuficiente', 'desconocida', 'simulado', null, null),
  ('p-mercado', 'Destino demo C — mercado (ficticio)', 'comercio', -9.93125, -76.24138, 'n-r3c0', 'Destino ficticio para la demostración.', 'comunitario_pendiente', 'desconocida', 'simulado', null, null),
  ('p-paradero-1', 'Paradero demo 1 (no oficial)', 'paradero', -9.92825, -76.24138, 'n-r0c0', 'Punto de parada ilustrativo. NO es un paradero oficial ni corresponde a ninguna ruta de transporte autorizada.', 'accesible_verificado', 'presente', 'simulado', null, '2026-11-01T00:00:00Z'),
  ('p-paradero-2', 'Paradero demo 2 (no oficial)', 'paradero', -9.93025, -76.23832, 'n-r2c3', 'Punto de parada ilustrativo. NO es un paradero oficial ni corresponde a ninguna ruta de transporte autorizada.', 'barrera_verificada', 'obstruida', 'simulado', null, '2026-11-01T00:00:00Z'),
  ('p-biblioteca', 'Destino demo D — biblioteca (ficticia)', 'servicio_publico', -9.92825, -76.24036, 'n-r0c1', 'Destino ficticio para la demostración.', 'accesible_verificado', 'presente', 'simulado', null, '2026-11-01T00:00:00Z'),
  ('p-aislado', 'Destino demo E — sin conexión registrada', 'otro', -9.93285, -76.23675, 'n-iso2', 'Destino ficticio deliberadamente desconectado del resto del grafo, para demostrar que el sistema no inventa conexiones.', 'informacion_insuficiente', 'desconocida', 'simulado', null, null)
on conflict (id) do nothing;

-- Reportes de demostración (is_demo = true): ilustran el panel; no son reportes de ciudadanos reales.
insert into public.reports (graph_edge_id, latitude, longitude, category, description, severity, moderation_status, verification_status, rejection_reason, is_demo, created_at) values
  ('e-h-r1c0', -9.92925, -76.24087, 'vereda_deteriorada', '[DEMO] Vereda con losetas levantadas a mitad de cuadra.', 3, 'aprobado', 'sin_verificar', null, true, now() - interval '40 days'),
  ('e-h-r3c2', -9.93125, -76.23883, 'desnivel_escalon', '[DEMO] Escalón de aproximadamente 20 cm sin rampa en la esquina.', 4, 'aprobado', 'sin_verificar', null, true, now() - interval '26 days'),
  ('e-v-r2c1', -9.93075, -76.24036, 'otro', '[DEMO] Materiales de construcción ocupan la vereda.', 3, 'resuelto', 'verificado_en_campo', null, true, now() - interval '19 days'),
  ('e-h-r2c2', -9.93025, -76.23883, 'rampa_obstruida', '[DEMO] Vehículo estacionado frente a la rampa de la esquina.', 5, 'aprobado', 'verificado_en_campo', null, true, now() - interval '12 days'),
  ('e-v-r1c3', -9.92975, -76.23832, 'acceso_paradero', '[DEMO] Poste ubicado en el acceso al punto de parada demostrativo.', 2, 'pendiente', 'sin_verificar', null, true, now() - interval '5 days'),
  ('e-h-r0c1', -9.92825, -76.23985, 'cruce_problematico', '[DEMO] Cruce sin marcas visibles y con tiempo de semáforo corto.', 3, 'rechazado', 'sin_verificar', 'Duplicado de otro reporte de demostración.', true, now() - interval '3 days');

commit;

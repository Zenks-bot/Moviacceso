-- Pruebas de RLS, permisos y funciones de MoviAcceso (PostgreSQL local + stub de Supabase).
-- Cada bloque falla con "FALLO: ..." si una expectativa no se cumple.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', null, true),   -- ciudadano anónimo 1
  ('22222222-2222-2222-2222-222222222222', null, true),   -- ciudadano anónimo 2
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@example.org', false);
insert into public.admin_roles (user_id, role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin');

-- ---------------------------------------------------------------- 1. Visitante anónimo (rol anon)
begin;
set local role anon;
select set_config('request.jwt.claim.sub', '', true) \gset ignored_
do $$
declare v int;
begin
  select count(*) into v from public.graph_edges;
  if v < 50 then raise exception 'FALLO: anon debería leer los segmentos del piloto, leyó %', v; end if;
  select count(*) into v from public.places;
  if v < 3 then raise exception 'FALLO: anon debería leer los lugares del piloto, leyó %', v; end if;

  select count(*) into v from public.reports;
  if v <> 4 then raise exception 'FALLO: anon debería ver solo 4 reportes públicos (aprobados/resueltos), vio %', v; end if;
  if exists (select 1 from public.reports where moderation_status in ('pendiente', 'rechazado')) then
    raise exception 'FALLO: anon ve reportes no aprobados';
  end if;

  begin
    perform reporter_id from public.reports limit 1;
    raise exception 'FALLO: anon puede leer reporter_id';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.reports (latitude, longitude, category, description, severity)
    values (-9.929, -76.240, 'otro', 'Inserción directa no permitida', 2);
    raise exception 'FALLO: anon insertó un reporte directamente';
  exception when insufficient_privilege then null; end;

  begin
    update public.graph_edges set accessibility_status = 'accesible_verificado';
    raise exception 'FALLO: anon modificó segmentos';
  exception when insufficient_privilege then null; end;

  begin
    perform public.submit_report('otro', 'Reporte sin sesión de usuario', 2::smallint, -9.929, -76.240, null);
    raise exception 'FALLO: anon sin sesión pudo usar submit_report';
  exception when insufficient_privilege then null; end;

  begin
    perform public.moderate_report(gen_random_uuid(), 'aprobar', null);
    raise exception 'FALLO: anon pudo invocar moderate_report';
  exception when insufficient_privilege then null; end;

  if (public.get_report_stats() -> 'demo' ->> 'total')::int <> 6 then
    raise exception 'FALLO: estadísticas demo deberían sumar 6';
  end if;
  raise notice 'OK 1: visitante anónimo — lectura pública y escrituras bloqueadas';
end $$;
commit;

-- ---------------------------------------------------------------- 2. Ciudadano 1 registra un reporte válido
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true) \gset ignored_
do $$
declare r record; v_edge text; v_lat double precision; v_lng double precision;
begin
  -- Tramo real del grafo, al sureste del centro, para comprobar también la asignación de zona.
  select e.id, (e.geometry->'coordinates'->0->>1)::float8, (e.geometry->'coordinates'->0->>0)::float8
    into v_edge, v_lat, v_lng
    from public.graph_edges e, public.pilot_zones z
   where z.id = 'z-se'
     and (e.geometry->'coordinates'->0->>1)::float8 between z.min_lat and z.max_lat - 0.0003
     and (e.geometry->'coordinates'->0->>0)::float8 between z.min_lng + 0.0003 and z.max_lng
   order by e.id limit 1;
  select * into r from public.submit_report('rampa_obstruida', 'Rampa bloqueada por un puesto ambulante en la esquina.', 4::smallint, v_lat, v_lng, v_edge);
  if r.id is null then raise exception 'FALLO: submit_report no devolvió identificador'; end if;
  if not exists (select 1 from public.reports where id = r.id and moderation_status = 'pendiente') then
    raise exception 'FALLO: el autor no ve su propio reporte pendiente';
  end if;
  raise notice 'OK 2: reporte válido registrado (id %)', r.id;
end $$;
commit;

-- ---------------------------------------------------------------- 3. Persistencia y aislamiento entre usuarios
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true) \gset ignored_
do $$
begin
  if exists (select 1 from public.reports where description like 'Rampa bloqueada por un puesto%') then
    raise exception 'FALLO: otro ciudadano ve un reporte pendiente ajeno';
  end if;
  begin
    update public.reports set description = 'Modificado por otro usuario';
    raise exception 'FALLO: un ciudadano pudo modificar reportes';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 3: un ciudadano no ve ni modifica reportes pendientes de otro';
end $$;
commit;

-- ---------------------------------------------------------------- 4. Validación en servidor
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true) \gset ignored_
do $$
begin
  begin
    perform public.submit_report('otro', 'corto', 2::smallint, -9.929, -76.240, null);
    raise exception 'FALLO: aceptó una descripción demasiado corta';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_report('otro', 'Ubicación fuera del sector piloto', 2::smallint, -12.04, -77.03, null);
    raise exception 'FALLO: aceptó una ubicación fuera del piloto';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_report('otro', 'Dificultad fuera de rango permitido', 9::smallint, -9.929, -76.240, null);
    raise exception 'FALLO: aceptó severidad 9';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_report('otro', 'Segmento que no existe en el grafo', 2::smallint, -9.929, -76.240, 'e-inexistente');
    raise exception 'FALLO: aceptó un segmento inexistente';
  exception when invalid_parameter_value then null; end;
  raise notice 'OK 4: validaciones del servidor';
end $$;
rollback;

-- ---------------------------------------------------------------- 5. Límites contra envíos masivos
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true) \gset ignored_
do $$
begin
  perform public.submit_report('otro', 'Reporte de prueba número 1', 1::smallint, -9.929, -76.240, null);
  begin
    perform public.submit_report('otro', 'reporte de prueba número 1 ', 1::smallint, -9.929, -76.240, null);
    raise exception 'FALLO: aceptó un duplicado';
  exception when sqlstate 'P0409' then null; end;
  for i in 2..5 loop
    perform public.submit_report('otro', 'Reporte de prueba número ' || i, 1::smallint, -9.929, -76.240, null);
  end loop;
  begin
    perform public.submit_report('otro', 'Reporte de prueba número 6', 1::smallint, -9.929, -76.240, null);
    raise exception 'FALLO: no aplicó el límite de 5 reportes por hora';
  exception when sqlstate 'P0429' then null; end;
  raise notice 'OK 5: límites por sesión y detección de duplicados';
end $$;
rollback;

-- ---------------------------------------------------------------- 6. Un ciudadano no puede ejecutar acciones administrativas
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true) \gset ignored_
do $$
declare v_id uuid;
begin
  select id into v_id from public.reports where description like 'Rampa bloqueada por un puesto%';
  begin
    perform public.moderate_report(v_id, 'aprobar', null);
    raise exception 'FALLO: un ciudadano aprobó su propio reporte';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_report_verification(v_id, 'verificado_en_campo', 'yo mismo');
    raise exception 'FALLO: un ciudadano verificó un reporte';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.graph_nodes (id, latitude, longitude) values ('n-hack', -9.93, -76.24);
    raise exception 'FALLO: un ciudadano creó nodos del grafo';
  exception when insufficient_privilege then null; end;
  if public.is_admin() then raise exception 'FALLO: is_admin() verdadero para un ciudadano'; end if;
  if exists (select 1 from public.report_status_history) then raise exception 'FALLO: un ciudadano lee el historial'; end if;
  raise notice 'OK 6: acciones administrativas denegadas a ciudadanos';
end $$;
rollback;

-- ---------------------------------------------------------------- 7. Moderación por administrador
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) \gset ignored_
do $$
declare v_id uuid; v_status public.moderation_status; v int;
begin
  if not public.is_admin() then raise exception 'FALLO: is_admin() falso para el administrador'; end if;
  select id into v_id from public.reports where description like 'Rampa bloqueada por un puesto%';
  if v_id is null then raise exception 'FALLO: el administrador no ve reportes pendientes'; end if;

  begin
    perform public.moderate_report(v_id, 'rechazar', '  ');
    raise exception 'FALLO: permitió rechazar sin justificación';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.moderate_report(v_id, 'resolver', null);
    raise exception 'FALLO: permitió resolver un reporte pendiente';
  exception when invalid_parameter_value then null; end;

  v_status := public.moderate_report(v_id, 'aprobar', 'Contenido apropiado');
  if v_status <> 'aprobado' then raise exception 'FALLO: estado tras aprobar = %', v_status; end if;
  if (select verification_status from public.reports where id = v_id) <> 'sin_verificar' then
    raise exception 'FALLO: aprobar no debe implicar verificación técnica';
  end if;

  begin
    perform public.set_report_verification(v_id, 'verificado_en_campo', null);
    raise exception 'FALLO: permitió verificar sin indicar fuente';
  exception when invalid_parameter_value then null; end;
  perform public.set_report_verification(v_id, 'verificado_en_campo', 'Inspección de prueba');

  select count(*) into v from public.report_status_history where report_id = v_id;
  if v <> 3 then raise exception 'FALLO: historial debería tener 3 entradas, tiene %', v; end if;
  raise notice 'OK 7: moderación, verificación separada e historial';
end $$;
commit;

-- ---------------------------------------------------------------- 8. El reporte aprobado ahora es público
begin;
set local role anon;
select set_config('request.jwt.claim.sub', '', true) \gset ignored_
do $$
declare r record;
begin
  if not exists (select 1 from public.reports where description like 'Rampa bloqueada por un puesto%' and moderation_status = 'aprobado') then
    raise exception 'FALLO: el reporte aprobado no es visible públicamente';
  end if;
  select s.* into r from public.reports p, lateral public.get_report_status(p.id) s
   where p.description like 'Rampa bloqueada por un puesto%';
  if r.moderation_status <> 'aprobado' or r.verification_status <> 'verificado_en_campo' then
    raise exception 'FALLO: get_report_status devolvió %/%', r.moderation_status, r.verification_status;
  end if;
  if (public.get_report_stats() -> 'real' ->> 'aprobado')::int <> 1 then
    raise exception 'FALLO: estadísticas reales deberían contar 1 aprobado';
  end if;
  if (select zone_id from public.reports where description like 'Rampa bloqueada por un puesto%') <> 'z-se' then
    raise exception 'FALLO: zona asignada incorrecta';
  end if;
  raise notice 'OK 8: publicación tras aprobación, consulta de seguimiento, zona y estadísticas';
end $$;
commit;

\echo 'TODAS LAS PRUEBAS DE BASE DE DATOS PASARON'

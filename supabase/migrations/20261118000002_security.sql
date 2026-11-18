-- =============================================================================
-- MoviAcceso — Migración 2: seguridad, RLS, funciones y permisos mínimos
--
-- Principios:
-- * Los ciudadanos NO escriben directamente en tablas: usan submit_report(),
--   que valida en el servidor y aplica límites contra envíos masivos.
-- * Solo los reportes aprobados/resueltos son públicos.
-- * Las acciones administrativas exigen una fila en admin_roles (autorización real).
-- * Funciones SECURITY DEFINER con search_path vacío.
-- =============================================================================

-- ---------- Utilidades ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger graph_edges_touch before update on public.graph_edges
  for each row execute function public.touch_updated_at();
create trigger reports_touch before update on public.reports
  for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_roles where user_id = auth.uid());
$$;

-- Asigna la zona del piloto a partir de las coordenadas del reporte.
create or replace function public.assign_report_zone()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select z.id into new.zone_id
  from public.pilot_zones z
  where new.latitude between z.min_lat and z.max_lat
    and new.longitude between z.min_lng and z.max_lng
  order by z.id
  limit 1;
  return new;
end;
$$;
create trigger reports_assign_zone before insert or update of latitude, longitude on public.reports
  for each row execute function public.assign_report_zone();

-- Registra el estado inicial de cada reporte en el historial.
create or replace function public.log_report_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.report_status_history (report_id, from_moderation, to_moderation, from_verification, to_verification, reason, changed_by)
  values (new.id, null, new.moderation_status, null, new.verification_status, 'Reporte registrado', new.reporter_id);
  return new;
end;
$$;
create trigger reports_log_created after insert on public.reports
  for each row execute function public.log_report_created();

-- ---------- Row Level Security ----------
alter table public.pilot_zones enable row level security;
alter table public.graph_nodes enable row level security;
alter table public.graph_edges enable row level security;
alter table public.places enable row level security;
alter table public.reports enable row level security;
alter table public.report_status_history enable row level security;
alter table public.admin_roles enable row level security;

-- Datos cartográficos: lectura pública; escritura solo administradores.
create policy "lectura publica zonas" on public.pilot_zones for select to anon, authenticated using (true);
create policy "lectura publica nodos" on public.graph_nodes for select to anon, authenticated using (true);
create policy "lectura publica segmentos" on public.graph_edges for select to anon, authenticated using (true);
create policy "lectura publica lugares" on public.places for select to anon, authenticated using (true);

create policy "admin escribe zonas" on public.pilot_zones for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin escribe nodos" on public.graph_nodes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin escribe segmentos" on public.graph_edges for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin escribe lugares" on public.places for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Reportes: públicos solo si están aprobados o resueltos; el autor ve los suyos; el admin ve todos.
create policy "lectura reportes" on public.reports for select to anon, authenticated
  using (
    moderation_status in ('aprobado', 'resuelto')
    or (auth.uid() is not null and reporter_id = auth.uid())
    or public.is_admin()
  );
-- No hay políticas INSERT/UPDATE/DELETE en reports: las escrituras pasan por funciones validadas.

create policy "admin lee historial" on public.report_status_history for select to authenticated using (public.is_admin());

create policy "usuario lee su rol" on public.admin_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------- Permisos mínimos (Supabase concede ALL por defecto en public) ----------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.pilot_zones, public.graph_nodes, public.graph_edges, public.places to anon, authenticated;
grant insert, update, delete on public.pilot_zones, public.graph_nodes, public.graph_edges, public.places to authenticated; -- limitado por RLS a administradores
-- reporter_id NO se expone (evita vincular reportes de un mismo usuario anónimo).
grant select (id, graph_edge_id, latitude, longitude, category, description, severity, moderation_status,
              verification_status, rejection_reason, zone_id, is_demo, created_at, updated_at)
  on public.reports to anon, authenticated;
grant select on public.report_status_history to authenticated;
grant select on public.admin_roles to authenticated;

-- Evita que futuras tablas/funciones queden expuestas por defecto.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

-- ---------- Registro de reportes (validación en servidor + límites) ----------
create or replace function public.submit_report(
  p_category      public.report_category,
  p_description   text,
  p_severity      smallint,
  p_latitude      double precision,
  p_longitude     double precision,
  p_graph_edge_id text default null
)
returns table (id uuid, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := auth.uid();
  v_desc  text := btrim(coalesce(p_description, ''));
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Se requiere una sesión (anónima o autenticada) para enviar reportes.' using errcode = '28000';
  end if;
  if p_category is null then
    raise exception 'La categoría es obligatoria.' using errcode = '22023';
  end if;
  if char_length(v_desc) < 10 or char_length(v_desc) > 1000 then
    raise exception 'La descripción debe tener entre 10 y 1000 caracteres.' using errcode = '22023';
  end if;
  if p_severity is null or p_severity not between 1 and 5 then
    raise exception 'El nivel de dificultad debe estar entre 1 y 5.' using errcode = '22023';
  end if;
  if p_latitude is null or p_longitude is null or not exists (
    select 1 from public.pilot_zones z
    where p_latitude between z.min_lat and z.max_lat and p_longitude between z.min_lng and z.max_lng
  ) then
    raise exception 'La ubicación está fuera del sector piloto.' using errcode = '22023';
  end if;
  if p_graph_edge_id is not null and not exists (select 1 from public.graph_edges e where e.id = p_graph_edge_id) then
    raise exception 'El segmento indicado no existe.' using errcode = '22023';
  end if;

  -- Controles contra envíos masivos o automatizados.
  select count(*) into v_count from public.reports r
   where r.reporter_id = v_uid and r.created_at > now() - interval '1 hour';
  if v_count >= 5 then
    raise exception 'Límite alcanzado: máximo 5 reportes por hora por sesión.' using errcode = 'P0429';
  end if;
  select count(*) into v_count from public.reports r
   where r.reporter_id = v_uid and r.created_at > now() - interval '1 day';
  if v_count >= 20 then
    raise exception 'Límite alcanzado: máximo 20 reportes por día por sesión.' using errcode = 'P0429';
  end if;
  if exists (
    select 1 from public.reports r
     where r.reporter_id = v_uid and lower(btrim(r.description)) = lower(v_desc)
       and r.created_at > now() - interval '1 day'
  ) then
    raise exception 'Ya registró un reporte idéntico en las últimas 24 horas.' using errcode = 'P0409';
  end if;
  select count(*) into v_count from public.reports r where r.created_at > now() - interval '10 minutes' and not r.is_demo;
  if v_count >= 100 then
    raise exception 'El servicio recibe demasiados reportes en este momento. Intente más tarde.' using errcode = 'P0429';
  end if;

  return query
    insert into public.reports as r (graph_edge_id, latitude, longitude, category, description, severity, reporter_id)
    values (p_graph_edge_id, p_latitude, p_longitude, p_category, v_desc, p_severity, v_uid)
    returning r.id, r.created_at;
end;
$$;

-- Consulta pública del estado de un reporte a partir de su identificador de seguimiento.
create or replace function public.get_report_status(p_report_id uuid)
returns table (id uuid, moderation_status public.moderation_status, verification_status public.verification_status,
               created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.moderation_status, r.verification_status, r.created_at, r.updated_at
  from public.reports r where r.id = p_report_id;
$$;

-- ---------- Moderación (solo administradores) ----------
create or replace function public.moderate_report(p_report_id uuid, p_action text, p_reason text default null)
returns public.moderation_status
language plpgsql security definer set search_path = '' as $$
declare
  v_old    public.reports%rowtype;
  v_new    public.moderation_status;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Permiso denegado: se requiere rol de administración.' using errcode = '42501';
  end if;

  select * into v_old from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Reporte no encontrado.' using errcode = 'P0002';
  end if;

  case p_action
    when 'aprobar' then
      if v_old.moderation_status not in ('pendiente', 'rechazado') then
        raise exception 'Solo se pueden aprobar reportes pendientes o rechazados.' using errcode = '22023';
      end if;
      v_new := 'aprobado';
    when 'rechazar' then
      if v_old.moderation_status not in ('pendiente', 'aprobado') then
        raise exception 'Solo se pueden rechazar reportes pendientes o aprobados.' using errcode = '22023';
      end if;
      if v_reason is null or char_length(v_reason) < 5 then
        raise exception 'El rechazo requiere una justificación (mínimo 5 caracteres).' using errcode = '22023';
      end if;
      v_new := 'rechazado';
    when 'resolver' then
      if v_old.moderation_status <> 'aprobado' then
        raise exception 'Solo se pueden marcar como resueltos los reportes aprobados.' using errcode = '22023';
      end if;
      v_new := 'resuelto';
    else
      raise exception 'Acción no válida: %', p_action using errcode = '22023';
  end case;

  update public.reports
     set moderation_status = v_new,
         rejection_reason = case when v_new = 'rechazado' then v_reason else null end
   where id = p_report_id;

  insert into public.report_status_history (report_id, from_moderation, to_moderation, from_verification, to_verification, reason, changed_by)
  values (p_report_id, v_old.moderation_status, v_new, v_old.verification_status, v_old.verification_status, v_reason, auth.uid());

  return v_new;
end;
$$;

-- Verificación técnica en campo: proceso distinto de la moderación.
create or replace function public.set_report_verification(p_report_id uuid, p_status public.verification_status, p_reason text default null)
returns public.verification_status
language plpgsql security definer set search_path = '' as $$
declare
  v_old public.reports%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Permiso denegado: se requiere rol de administración.' using errcode = '42501';
  end if;
  select * into v_old from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Reporte no encontrado.' using errcode = 'P0002';
  end if;
  if p_status <> 'sin_verificar' and v_reason is null then
    raise exception 'Indique la fuente o metodología de la verificación.' using errcode = '22023';
  end if;

  update public.reports set verification_status = p_status where id = p_report_id;
  insert into public.report_status_history (report_id, from_moderation, to_moderation, from_verification, to_verification, reason, changed_by)
  values (p_report_id, v_old.moderation_status, v_old.moderation_status, v_old.verification_status, p_status, v_reason, auth.uid());
  return p_status;
end;
$$;

-- ---------- Estadísticas agregadas (sin datos personales) ----------
create or replace function public.report_stats_scope(p_demo boolean)
returns jsonb language sql stable security definer set search_path = '' as $$
  with base as (
    select r.*, z.name as zone_name from public.reports r
    left join public.pilot_zones z on z.id = r.zone_id
    where r.is_demo = p_demo
  )
  select jsonb_build_object(
    'total',      (select count(*) from base),
    'pendiente',  (select count(*) from base where moderation_status = 'pendiente'),
    'aprobado',   (select count(*) from base where moderation_status = 'aprobado'),
    'rechazado',  (select count(*) from base where moderation_status = 'rechazado'),
    'resuelto',   (select count(*) from base where moderation_status = 'resuelto'),
    'verificado_en_campo', (select count(*) from base where verification_status = 'verificado_en_campo'),
    'by_category', coalesce((select jsonb_agg(jsonb_build_object('key', category, 'count', n) order by n desc, category)
                             from (select category, count(*) n from base group by category) c), '[]'::jsonb),
    'by_zone',     coalesce((select jsonb_agg(jsonb_build_object('key', coalesce(zone_name, 'Sin zona'), 'count', n) order by n desc)
                             from (select zone_name, count(*) n from base group by zone_name) z), '[]'::jsonb),
    'by_week',     coalesce((select jsonb_agg(jsonb_build_object('key', to_char(wk, 'YYYY-MM-DD'), 'count', n) order by wk)
                             from (select date_trunc('week', created_at) wk, count(*) n from base
                                   where created_at > now() - interval '26 weeks' group by 1) w), '[]'::jsonb)
  );
$$;

create or replace function public.get_report_stats()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'real', public.report_stats_scope(false),
    'demo', public.report_stats_scope(true),
    'generated_at', now()
  );
$$;

-- ---------- Permisos de ejecución ----------
-- PostgreSQL concede EXECUTE a PUBLIC sobre funciones nuevas: se revoca explícitamente tras crearlas.
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.submit_report(public.report_category, text, smallint, double precision, double precision, text) to authenticated;
grant execute on function public.get_report_status(uuid) to anon, authenticated;
grant execute on function public.get_report_stats() to anon, authenticated;
grant execute on function public.moderate_report(uuid, text, text) to authenticated;          -- verifica is_admin() internamente
grant execute on function public.set_report_verification(uuid, public.verification_status, text) to authenticated;
-- report_stats_scope, triggers y utilidades no se exponen.

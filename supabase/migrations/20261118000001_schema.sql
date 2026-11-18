-- =============================================================================
-- MoviAcceso — Migración 1: esquema relacional
-- Tipos explícitos (ENUM) para todos los estados importantes, restricciones de
-- coordenadas y valores, llaves foráneas, índices y marcas temporales.
-- =============================================================================


-- ---------- Tipos enumerados (coinciden con src/types/domain.ts) ----------
create type public.accessibility_status as enum (
  'accesible_verificado', 'barrera_verificada', 'informacion_insuficiente', 'comunitario_pendiente'
);
create type public.source_type as enum ('osm', 'inspeccion', 'oficial', 'comunitario', 'simulado');
create type public.surface_type as enum ('asfalto', 'concreto', 'adoquin', 'tierra', 'mixta', 'desconocida');
create type public.barrier_type as enum (
  'ninguna', 'escalon', 'rampa_obstruida', 'vereda_deteriorada', 'cruce_peligroso', 'obstaculo_temporal', 'desconocida'
);
create type public.ramp_status as enum ('presente', 'ausente', 'obstruida', 'desconocida');
create type public.place_category as enum (
  'espacio_publico', 'salud', 'educacion', 'comercio', 'paradero', 'servicio_publico', 'otro'
);
create type public.report_category as enum (
  'rampa_obstruida', 'vereda_deteriorada', 'desnivel_escalon', 'cruce_problematico', 'acceso_paradero', 'otro'
);
create type public.moderation_status as enum ('pendiente', 'aprobado', 'rechazado', 'resuelto');
create type public.verification_status as enum ('sin_verificar', 'verificado_en_campo', 'no_confirmado');
create type public.admin_role as enum ('admin', 'moderador');

-- ---------- Zonas del piloto (para estadísticas) ----------
create table public.pilot_zones (
  id         text primary key check (id ~ '^[a-z0-9_-]{1,64}$'),
  name       text not null check (char_length(name) between 1 and 120),
  min_lat    double precision not null check (min_lat between -90 and 90),
  max_lat    double precision not null check (max_lat between -90 and 90),
  min_lng    double precision not null check (min_lng between -180 and 180),
  max_lng    double precision not null check (max_lng between -180 and 180),
  created_at timestamptz not null default now(),
  check (min_lat < max_lat and min_lng < max_lng)
);

-- ---------- Grafo de movilidad ----------
create table public.graph_nodes (
  id         text primary key check (id ~ '^[a-z0-9_-]{1,64}$'),
  latitude   double precision not null check (latitude between -90 and 90),
  longitude  double precision not null check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);

create table public.graph_edges (
  id                   text primary key check (id ~ '^[a-z0-9_-]{1,64}$'),
  name                 text not null check (char_length(name) between 1 and 200),
  source_node_id       text not null references public.graph_nodes (id) on delete cascade,
  target_node_id       text not null references public.graph_nodes (id) on delete cascade,
  -- GeoJSON LineString, coordenadas [lng, lat]
  geometry             jsonb not null check (
                         geometry ->> 'type' = 'LineString'
                         and jsonb_typeof(geometry -> 'coordinates') = 'array'
                         and jsonb_array_length(geometry -> 'coordinates') >= 2
                       ),
  length_m             numeric(10, 1) not null check (length_m > 0),
  accessibility_status public.accessibility_status not null default 'informacion_insuficiente',
  surface_type         public.surface_type not null default 'desconocida',
  barrier_type         public.barrier_type not null default 'desconocida',
  ramp_status          public.ramp_status not null default 'desconocida',
  source_type          public.source_type not null,
  source_url           text check (source_url is null or source_url ~ '^https?://'),
  verified_at          timestamptz,
  is_simulated         boolean generated always as (source_type = 'simulado') stored,
  notes                text check (notes is null or char_length(notes) <= 1000),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (source_node_id <> target_node_id),
  -- Un estado "verificado" exige fecha de verificación.
  check (accessibility_status not in ('accesible_verificado', 'barrera_verificada') or verified_at is not null)
);
create index graph_edges_source_idx on public.graph_edges (source_node_id);
create index graph_edges_target_idx on public.graph_edges (target_node_id);
create index graph_edges_status_idx on public.graph_edges (accessibility_status);

-- ---------- Lugares ----------
create table public.places (
  id                   text primary key check (id ~ '^[a-z0-9_-]{1,64}$'),
  name                 text not null check (char_length(name) between 1 and 200),
  category             public.place_category not null,
  latitude             double precision not null check (latitude between -90 and 90),
  longitude            double precision not null check (longitude between -180 and 180),
  node_id              text references public.graph_nodes (id) on delete set null,
  description          text not null default '' check (char_length(description) <= 2000),
  accessibility_status public.accessibility_status not null default 'informacion_insuficiente',
  ramp_status          public.ramp_status not null default 'desconocida',
  source_type          public.source_type not null,
  source_url           text check (source_url is null or source_url ~ '^https?://'),
  verified_at          timestamptz,
  is_simulated         boolean generated always as (source_type = 'simulado') stored,
  created_at           timestamptz not null default now(),
  check (accessibility_status not in ('accesible_verificado', 'barrera_verificada') or verified_at is not null)
);
create index places_category_idx on public.places (category);
create index places_name_idx on public.places (lower(name));

-- ---------- Reportes ciudadanos ----------
create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  graph_edge_id       text references public.graph_edges (id) on delete set null,
  latitude            double precision not null check (latitude between -90 and 90),
  longitude           double precision not null check (longitude between -180 and 180),
  category            public.report_category not null,
  description         text not null check (char_length(btrim(description)) between 10 and 1000),
  severity            smallint not null check (severity between 1 and 5),
  moderation_status   public.moderation_status not null default 'pendiente',
  verification_status public.verification_status not null default 'sin_verificar',
  rejection_reason    text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  reporter_id         uuid references auth.users (id) on delete set null,
  zone_id             text references public.pilot_zones (id) on delete set null,
  is_demo             boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (moderation_status <> 'rechazado' or char_length(btrim(coalesce(rejection_reason, ''))) >= 5)
);
create index reports_moderation_idx on public.reports (moderation_status, created_at desc);
create index reports_reporter_idx on public.reports (reporter_id, created_at desc);
create index reports_zone_idx on public.reports (zone_id);
create index reports_category_idx on public.reports (category);
create index reports_edge_idx on public.reports (graph_edge_id);

-- Historial de estados (auditoría de moderación y verificación)
create table public.report_status_history (
  id                bigint generated always as identity primary key,
  report_id         uuid not null references public.reports (id) on delete cascade,
  from_moderation   public.moderation_status,
  to_moderation     public.moderation_status not null,
  from_verification public.verification_status,
  to_verification   public.verification_status not null,
  reason            text check (reason is null or char_length(reason) <= 500),
  changed_by        uuid references auth.users (id) on delete set null,
  changed_at        timestamptz not null default now()
);
create index report_status_history_report_idx on public.report_status_history (report_id, changed_at);

-- ---------- Roles administrativos ----------
create table public.admin_roles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       public.admin_role not null default 'moderador',
  created_at timestamptz not null default now()
);

comment on table public.graph_edges is 'Segmentos peatonales del grafo piloto. is_simulated=true indica datos de demostración.';
comment on table public.reports is 'Reportes ciudadanos. Aprobar un reporte (moderación) NO equivale a verificarlo técnicamente en campo.';

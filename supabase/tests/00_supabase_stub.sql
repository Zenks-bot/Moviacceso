-- SOLO PARA PRUEBAS LOCALES con PostgreSQL puro (no ejecutar en Supabase).
-- Reproduce lo mínimo de Supabase: roles, esquema auth, auth.uid() y privilegios por defecto.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, is_anonymous boolean not null default false);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- Supabase concede por defecto ALL sobre objetos nuevos de public a estos roles:
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
grant usage, create on schema public to anon, authenticated, service_role;

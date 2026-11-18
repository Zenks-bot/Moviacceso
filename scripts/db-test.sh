#!/usr/bin/env bash
# Aplica migraciones + seed en un PostgreSQL local efímero y ejecuta pruebas de RLS y funciones.
# Requiere binarios de PostgreSQL (initdb, pg_ctl, psql). Uso: npm run db:test
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DATA="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
RUNAS=()
if [ "$(id -u)" = "0" ]; then chown postgres "$DATA"; RUNAS=(sudo -u postgres); command -v sudo >/dev/null || RUNAS=(runuser -u postgres --); fi
cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT
"${RUNAS[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=''" -w start >/dev/null
PSQL=(psql -h /tmp -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "→ migración $(basename "$f")"; "${PSQL[@]}" -f "$f"; done
echo "→ seed.sql"; "${PSQL[@]}" -f "$ROOT/supabase/seed.sql"
echo "→ pruebas"; "${PSQL[@]}" -f "$ROOT/supabase/tests/01_rls_and_functions.sql"

# MoviAcceso

**Plataforma web de movilidad urbana inclusiva para Huánuco, Perú. Prototipo funcional (MVP académico).**

MoviAcceso centraliza información sobre barreras de movilidad en un sector piloto del centro de Huánuco. Ayuda a personas con discapacidad motriz, adultos mayores y otras personas con movilidad reducida a evaluar trayectos peatonales y conexiones con puntos de parada, **distinguiendo siempre lo verificado de lo desconocido o simulado**.

Proyecto preparado en el marco del World Engineering Day Hackathon 2027 («Engineering Sustainable Transport Solutions for People, Planet and Prosperity»). No afirmamos que cumpla un desafío oficial específico sin haber contrastado antes su enunciado.

> ⚠️ **Datos de demostración.** El grafo y los lugares incluidos son **simulados** y se muestran así en toda la interfaz. La geometría es una cuadrícula esquemática alrededor de una coordenada aproximada de la Plaza de Armas; no describe el estado real de ninguna vereda, rampa o paradero. Consulte [docs/research.md](docs/research.md).

## Funcionalidades implementadas

| Requisito | Estado | Dónde |
|---|---|---|
| RF-01 Inicio | ✅ | `src/pages/HomePage.tsx` |
| RF-02 Mapa interactivo (Leaflet + OSM), leyenda, filtros, vista en lista | ✅ | `src/pages/MapPage.tsx`, `src/features/map/` |
| RF-03 Búsqueda de trayectos, 3 perfiles, detalle textual, distancia por geometría | ✅ | `src/pages/RoutePage.tsx` |
| RF-04 Motor de rutas (Dijkstra) con reglas de evidencia | ✅ | `src/features/routing/` |
| RF-05 Información de accesibilidad por lugar/tramo | ✅ | `src/features/map/DetailPanel.tsx` |
| RF-06 Reporte ciudadano persistente (PostgreSQL) con identificador de seguimiento | ✅ (verificado a nivel de base de datos; ver «Limitaciones») | `src/pages/ReportPage.tsx`, `submit_report()` |
| RF-07 Moderación protegida + verificación técnica separada + historial | ✅ | `src/pages/AdminPage.tsx`, `moderate_report()` |
| RF-08 Panel estadístico desde la base de datos (real vs. demo separados) | ✅ | `src/pages/StatsPage.tsx`, `get_report_stats()` |
| RF-09 Gestión de errores comprensible | ✅ | `src/lib/errors.ts` |
| Seguimiento público de un reporte por identificador | ✅ (adicional) | `src/pages/TrackPage.tsx` |
| Importador de geometría real de OpenStreetMap | ✅ (adicional) | `scripts/osm-to-dataset.ts` |

## Tecnologías

React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 4 · React Router 7 · Leaflet 1.9 + React Leaflet 5 · Supabase (PostgreSQL, Auth, RLS) · React Hook Form + Zod 4 · Vitest + Testing Library · Playwright + axe-core.

## Requisitos previos

- Node.js 20 o superior (probado con Node 22) y npm.
- Una cuenta gratuita de [Supabase](https://supabase.com) para la persistencia.
- Opcional, para las pruebas de base de datos locales: binarios de PostgreSQL 14+ (`initdb`, `pg_ctl`, `psql`).

## Instalación y ejecución local

```bash
npm install
```

```bash
cp .env.example .env.local
```

Edite `.env.local` con la URL y la clave **anon** de su proyecto Supabase (ver abajo) y ejecute:

```bash
npm run dev
```

Abra http://localhost:5173.

**Sin Supabase** la aplicación también arranca: el mapa y el buscador usan el paquete local de demostración (identificado como tal), y el formulario de reportes muestra un error explícito en lugar de simular un guardado.

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_SUPABASE_URL` | Sí (para persistencia) | URL del proyecto, p. ej. `https://abcd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Sí (para persistencia) | Clave pública **anon/publishable**. La aplicación se niega a funcionar si detecta una clave `service_role`. |
| `VITE_TILE_URL` | No | Servidor de teselas alternativo (por defecto, OpenStreetMap estándar, apto solo para uso ligero). |
| `VITE_TILE_ATTRIBUTION` | No | Atribución del servidor de teselas. Mantenga siempre la atribución a OpenStreetMap. |

Nunca suba `.env.local` al repositorio (ya está en `.gitignore`).

## Configuración de Supabase (pasos externos)

1. Cree un proyecto en Supabase.
2. En **SQL Editor**, ejecute en orden:
   1. `supabase/migrations/20261118000001_schema.sql`
   2. `supabase/migrations/20261118000002_security.sql`
   3. `supabase/seed.sql` (datos de demostración)

   Con la CLI de Supabase vinculada al proyecto, también puede usar `supabase db push` y luego ejecutar `seed.sql`.
3. En **Authentication → Sign In / Providers**, habilite **Anonymous sign-ins**. Los reportes se envían con una sesión anónima para aplicar límites por usuario sin pedir datos personales.
4. Cree el usuario administrador en **Authentication → Users → Add user** (correo y contraseña) y autorícelo en el SQL Editor:
   ```sql
   insert into public.admin_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'correo-del-admin@ejemplo.org';
   ```
5. Copie **Project URL** y la clave **anon public** (Settings → API) en `.env.local`.
6. Recomendado: en **Authentication → Attack Protection**, active CAPTCHA si va a exponer el prototipo públicamente.

Para regenerar `seed.sql` después de modificar `src/data/demo-dataset.ts`:

```bash
npm run seed:generate
```

## Pruebas

```bash
npm test
```

Pruebas unitarias del motor de rutas, validaciones, errores e importador OSM (37 pruebas).

```bash
npm run db:test
```

Levanta un PostgreSQL efímero, aplica migraciones y seed, y verifica RLS, permisos, validaciones del servidor, límites antienvío masivo, moderación e historial (8 bloques). Requiere binarios de PostgreSQL.

```bash
npm run test:e2e
```

Playwright en escritorio y móvil, más axe-core (WCAG 2.2 A/AA) sobre las 9 pantallas. Compila la app **sin** Supabase para verificar los mensajes de error.

Resultados y guía de pruebas manuales en [docs/testing.md](docs/testing.md).

## Despliegue

**Vercel**: importe el repositorio, use el preajuste Vite y defina `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en *Environment Variables*. `vercel.json` ya incluye la reescritura SPA y cabeceras de seguridad.

**Netlify**: `netlify.toml` define `npm run build` → `dist`; `public/_redirects` resuelve las rutas SPA. Defina las mismas variables en *Site configuration → Environment variables*.

Antes de un uso público con tráfico real, sustituya el servidor de teselas de OpenStreetMap por un proveedor con un plan adecuado (su [política de uso](https://operations.osmfoundation.org/policies/tiles/) no admite uso intensivo).

## Estructura

```
src/
  app/                 Enrutador y layout
  components/          Componentes reutilizables (alertas, insignias de estado, carga)
  pages/               Pantallas
  features/map/        Mapa, leyenda, panel de detalle, carga de datos
  features/routing/    Motor de rutas (grafo, Dijkstra, perfiles, evaluación de evidencia)
  features/reports/    Formulario, validación Zod y API de reportes
  features/admin/      API de moderación
  features/stats/      API y gráficos del panel
  lib/                 Cliente Supabase, errores, etiquetas
  data/                Conjunto de demostración (fuente única del seed)
  types/               Tipos de dominio
  styles/              Estilos y paleta
supabase/migrations/   Migraciones SQL
supabase/seed.sql      Datos de demostración (generado)
supabase/tests/        Pruebas SQL de RLS y funciones
scripts/               Generador de seed, importador OSM, pruebas de BD
e2e/                   Pruebas Playwright + axe
docs/                  Documentación
```

## Limitaciones conocidas

- **Datos simulados.** Ningún tramo ha sido inspeccionado en campo. La cuadrícula es esquemática y puede no coincidir con las calles del mapa base. Use `npm run osm:import` para incorporar geometría real.
- **Verificación de extremo a extremo con Supabase alojado.** El entorno de desarrollo no tenía acceso a un proyecto Supabase ni a Docker. La lógica SQL (RLS, funciones, persistencia entre transacciones) se verificó en PostgreSQL 16 con un stub del esquema `auth`. El flujo navegador → Supabase alojado debe comprobarse con la guía manual de `docs/testing.md` (pruebas 6, 8 y 9).
- **Mapa base.** Desde el entorno de desarrollo no se pudieron descargar teselas, así que solo se comprobó el mensaje de error de teselas no disponibles. En un navegador con internet se cargan las teselas de OSM.
- **Accesibilidad digital.** Se comprobó con axe-core (sin violaciones en 9 pantallas, escritorio y móvil) y con pruebas de teclado. **No** se ha hecho una auditoría WCAG 2.2 completa ni pruebas con lectores de pantalla y usuarios reales; no se declara conformidad.
- **Puntos de parada.** Los «paraderos demo» no son oficiales. No se incluyen empresas ni rutas de transporte.
- **Fuera del alcance:** GPS de vehículos, navegación en tiempo real, IA, pagos, reservas y estimaciones de CO₂.

## Licencia y atribución

Cartografía © [colaboradores de OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL). Código del prototipo: defina la licencia del equipo antes de publicarlo.

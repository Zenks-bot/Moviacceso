import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../components/Alert';
import { EmptyState, Loading } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { DemoBadge, STATUS_STYLE } from '../components/StatusBadge';
import { DatasetGate } from '../features/map/DatasetGate';
import { BarList } from '../features/stats/BarList';
import { getReportStats, type ReportStats, type ScopeStats } from '../features/stats/api';
import { formatDistance } from '../features/routing/geo';
import { toAppError, type AppError } from '../lib/errors';
import { ACCESSIBILITY_LABELS, REPORT_CATEGORY_LABELS, formatDateTime } from '../lib/labels';
import { isSupabaseConfigured } from '../lib/supabase';
import { ACCESSIBILITY_STATUSES, type MobilityDataset, type ReportCategory } from '../types/domain';

const catLabel = (k: string) => REPORT_CATEGORY_LABELS[k as ReportCategory] ?? k;
const weekLabel = (k: string) => `Semana del ${new Date(`${k}T00:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card">
      <dt className="text-sm font-semibold text-slate">{label}</dt>
      <dd className="text-3xl font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

function ScopeSection({ id, title, stats, demo }: { id: string; title: string; stats: ScopeStats; demo: boolean }) {
  return (
    <section aria-labelledby={id} className={`space-y-4 rounded-2xl p-4 ${demo ? 'border-2 border-dashed border-demo bg-demo-soft/40' : ''}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={id} className="text-2xl font-bold">{title}</h2>
        {demo ? <DemoBadge /> : null}
      </div>
      {demo ? <p className="text-demo">Estos reportes fueron cargados como datos de demostración. No son resultados de un despliegue real.</p> : null}
      {stats.total === 0 && !demo ? (
        <EmptyState title="Aún no hay reportes ciudadanos reales registrados">Las cifras aparecerán aquí cuando se registren reportes desde el formulario.</EmptyState>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Kpi label="Total registrados" value={stats.total} />
            <Kpi label="Pendientes de moderación" value={stats.pendiente} />
            <Kpi label="Aprobados y publicados" value={stats.aprobado} />
            <Kpi label="Resueltos" value={stats.resuelto} />
            <Kpi label="Verificados en campo" value={stats.verificado_en_campo} />
          </dl>
          <div className="grid gap-4 lg:grid-cols-3">
            <BarList title="Categorías de barreras más frecuentes" data={stats.by_category} labelFor={catLabel} emptyText="Sin datos." />
            <BarList title="Distribución por zonas del piloto" data={stats.by_zone} emptyText="Sin datos." />
            <BarList title="Evolución temporal (por semana, últimos 6 meses)" data={stats.by_week} labelFor={weekLabel} emptyText="Sin datos en los últimos 6 meses." />
          </div>
        </>
      )}
    </section>
  );
}

function ReportStatsBlock() {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error'; error: AppError } | { status: 'ready'; stats: ReportStats }>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    getReportStats()
      .then((stats) => active && setState({ status: 'ready', stats }))
      .catch((err: unknown) => active && setState({ status: 'error', error: toAppError(err) }));
    return () => { active = false; };
  }, [attempt]);

  if (state.status === 'loading') return <Loading label="Consultando estadísticas en la base de datos…" />;
  if (state.status === 'error')
    return (
      <Alert variant="error" title="No se pudieron cargar las estadísticas" live>
        <p>{state.error.message}</p>
        <button type="button" className="btn-primary" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button>
      </Alert>
    );
  return (
    <div className="space-y-8">
      <p className="text-sm text-slate">Datos consultados en la base de datos el {formatDateTime(state.stats.generated_at)}.</p>
      <ScopeSection id="reales" title="Reportes ciudadanos" stats={state.stats.real} demo={false} />
      <ScopeSection id="demo" title="Reportes de demostración" stats={state.stats.demo} demo />
    </div>
  );
}

function NetworkCoverage({ dataset }: { dataset: MobilityDataset }) {
  const m = useMemo(() => {
    const total = dataset.edges.length;
    const real = dataset.edges.filter((e) => e.sourceType !== 'simulado');
    const byStatus = ACCESSIBILITY_STATUSES.map((s) => ({ s, n: dataset.edges.filter((e) => e.accessibilityStatus === s).length }));
    const stops = dataset.places.filter((p) => p.category === 'paradero');
    return {
      total, realCount: real.length,
      realVerifiedPct: total ? (real.filter((e) => e.accessibilityStatus === 'accesible_verificado' || e.accessibilityStatus === 'barrera_verificada').length / total) * 100 : 0,
      byStatus, stops: stops.length, stopsConnected: stops.filter((p) => p.nodeId).length,
      length: dataset.edges.reduce((sum, e) => sum + e.lengthM, 0),
      barriersReal: real.filter((e) => e.accessibilityStatus === 'barrera_verificada').length,
      barriersDemo: dataset.edges.filter((e) => e.sourceType === 'simulado' && e.accessibilityStatus === 'barrera_verificada').length,
    };
  }, [dataset]);
  const allDemo = m.realCount === 0;
  const mostlyDemo = m.realCount < m.total;
  return (
    <section aria-labelledby="cobertura" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="cobertura" className="text-2xl font-bold">Cobertura de información del grafo piloto</h2>
        {mostlyDemo ? <DemoBadge /> : null}
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Segmentos con verificación real" value={`${m.realVerifiedPct.toLocaleString('es-PE', { maximumFractionDigits: 1 })} %`} />
        <Kpi label="Segmentos registrados" value={`${m.total} (${formatDistance(m.length)})`} />
        <Kpi label="Barreras con fuente real / simuladas" value={`${m.barriersReal} / ${m.barriersDemo}`} />
        <Kpi label="Puntos de parada conectados al grafo" value={`${m.stopsConnected} de ${m.stops}`} />
      </dl>
      <BarList title={`Segmentos por estado registrado${mostlyDemo ? ' (incluye estados simulados)' : ''}`} data={m.byStatus.map(({ s, n }) => ({ key: s, count: n }))} labelFor={(k) => `${STATUS_STYLE[k as keyof typeof STATUS_STYLE].symbol} ${ACCESSIBILITY_LABELS[k as keyof typeof ACCESSIBILITY_LABELS]}`} emptyText="Sin segmentos." />
      {allDemo ? <p className="text-demo">Todos los segmentos son simulados: el porcentaje de verificación real es 0% hasta que se incorporen inspecciones de campo.</p> : null}
      {!allDemo && mostlyDemo ? (
        <p className="text-demo">
          Solo {m.realCount} de {m.total} tramos tienen una fuente real; el resto de estados son simulados. La geometría de todos los tramos proviene de OpenStreetMap.
        </p>
      ) : null}
    </section>
  );
}

export default function StatsPage() {
  return (
    <>
      <PageHeader title="Estadísticas">Indicadores consultados en la base de datos. Las cifras de demostración se identifican por separado.</PageHeader>
      <div className="space-y-10">
        {isSupabaseConfigured ? (
          <ReportStatsBlock />
        ) : (
          <Alert variant="error" title="Estadísticas de reportes no disponibles">
            <p>La base de datos no está configurada. No se muestran cifras de reportes para no presentar métricas ficticias.</p>
          </Alert>
        )}
        <DatasetGate>{(dataset) => <NetworkCoverage dataset={dataset} />}</DatasetGate>
      </div>
    </>
  );
}

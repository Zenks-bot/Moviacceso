import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../components/Alert';
import { EmptyState, Loading } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { DemoBadge, StatusBadge, STATUS_STYLE } from '../components/StatusBadge';
import { DatasetGate, DatasetOriginNotice } from '../features/map/DatasetGate';
import { DetailPanel } from '../features/map/DetailPanel';
import { Legend } from '../features/map/Legend';
import { MapView, type MapSelection } from '../features/map/MapView';
import { formatDistance } from '../features/routing/geo';
import { usePublicReports } from '../features/reports/usePublicReports';
import { ACCESSIBILITY_LABELS, formatDate, MODERATION_LABELS, PLACE_CATEGORY_LABELS, REPORT_CATEGORY_LABELS, VERIFICATION_LABELS } from '../lib/labels';
import { ACCESSIBILITY_STATUSES, type AccessibilityStatus, type MobilityDataset, type PublicReport } from '../types/domain';

type Tab = 'lugares' | 'tramos' | 'reportes';

function MapExplorer({ dataset }: { dataset: MobilityDataset }) {
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [visible, setVisible] = useState<Set<AccessibilityStatus>>(() => new Set(ACCESSIBILITY_STATUSES));
  const [tab, setTab] = useState<Tab>('lugares');
  const reportsState = usePublicReports();
  const reports: PublicReport[] = reportsState.status === 'ready' ? reportsState.reports : [];
  const edges = useMemo(() => dataset.edges.filter((e) => visible.has(e.accessibilityStatus)), [dataset.edges, visible]);

  const toggle = (s: AccessibilityStatus) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const selectBtn = (sel: MapSelection, label: string) => (
    <button
      type="button"
      className="text-left font-semibold text-green underline underline-offset-2 hover:text-ink"
      aria-pressed={selection?.kind === sel.kind && selection.id === sel.id}
      onClick={() => setSelection(sel)}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <DatasetOriginNotice dataset={dataset} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <MapView dataset={dataset} label="Mapa del sector piloto de Huánuco" selected={selection} onSelect={setSelection} reports={reports} visibleStatuses={visible} className="h-[440px] lg:h-[560px]" />
        </div>
        <div className="space-y-4">
          <DetailPanel selection={selection} places={dataset.places} edges={dataset.edges} reports={reports} />
          <fieldset className="card">
            <legend className="px-1 text-lg font-bold">Filtrar tramos por estado</legend>
            <div className="space-y-2">
              {ACCESSIBILITY_STATUSES.map((s) => (
                <label key={s} className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input type="checkbox" className="h-5 w-5 accent-ink" checked={visible.has(s)} onChange={() => toggle(s)} />
                  <span><span aria-hidden="true" className="font-bold" style={{ color: STATUS_STYLE[s].color }}>{STATUS_STYLE[s].symbol} </span>{ACCESSIBILITY_LABELS[s]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Legend />
        </div>
      </div>

      <section aria-labelledby="listas-titulo">
        <h2 id="listas-titulo" className="mb-3 text-2xl font-bold">Vista en lista (equivalente textual del mapa)</h2>
        <div role="tablist" aria-label="Listas del sector piloto" className="mb-3 flex flex-wrap gap-2">
          {(['lugares', 'tramos', 'reportes'] as const).map((t) => (
            <button
              key={t}
              id={`tab-${t}`}
              role="tab"
              type="button"
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              className={tab === t ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setTab(t)}
              onKeyDown={(e) => {
                const order: Tab[] = ['lugares', 'tramos', 'reportes'];
                const i = order.indexOf(t);
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  const next = order[(i + (e.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length]!;
                  setTab(next);
                  document.getElementById(`tab-${next}`)?.focus();
                }
              }}
              tabIndex={tab === t ? 0 : -1}
            >
              {t === 'lugares' ? `Lugares (${dataset.places.length})` : t === 'tramos' ? `Tramos (${edges.length})` : `Reportes publicados (${reports.length})`}
            </button>
          ))}
        </div>

        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="card">
          {tab === 'lugares' ? (
            <ul className="divide-y divide-line">
              {dataset.places.map((p) => (
                <li key={p.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {selectBtn({ kind: 'place', id: p.id }, p.name)}
                    <p className="text-sm text-slate">{PLACE_CATEGORY_LABELS[p.category]}</p>
                  </div>
                  <div className="flex flex-wrap gap-2"><StatusBadge status={p.accessibilityStatus} compact />{p.sourceType === 'simulado' ? <DemoBadge /> : null}</div>
                </li>
              ))}
            </ul>
          ) : null}

          {tab === 'tramos' ? (
            edges.length === 0 ? (
              <EmptyState title="No hay tramos con los filtros seleccionados">Active al menos un estado en «Filtrar tramos por estado».</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <caption className="sr-only">Tramos peatonales del sector piloto</caption>
                  <thead>
                    <tr className="border-b-2 border-ink"><th className="p-2">Tramo</th><th className="p-2">Estado</th><th className="p-2">Longitud</th><th className="p-2">Verificación</th></tr>
                  </thead>
                  <tbody>
                    {edges.map((e) => (
                      <tr key={e.id} className="border-b border-line">
                        <td className="p-2">{selectBtn({ kind: 'edge', id: e.id }, e.name)}</td>
                        <td className="p-2"><StatusBadge status={e.accessibilityStatus} compact /></td>
                        <td className="p-2">{formatDistance(e.lengthM)}</td>
                        <td className="p-2 text-sm">{formatDate(e.verifiedAt)}{e.sourceType === 'simulado' ? ' · demo' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {tab === 'reportes' ? (
            reportsState.status === 'loading' ? <Loading label="Cargando reportes publicados…" /> :
            reportsState.status === 'unavailable' ? (
              <Alert variant="warning" title="Reportes no disponibles">
                <p>La base de datos no está configurada, por lo que no se pueden consultar los reportes ciudadanos.</p>
              </Alert>
            ) : reportsState.status === 'error' ? (
              <Alert variant="error" title="No se pudieron cargar los reportes" live><p>{reportsState.error.message}</p></Alert>
            ) : reports.length === 0 ? (
              <EmptyState title="Aún no hay reportes publicados"><Link to="/reportar">Reporte una barrera</Link></EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {reports.map((r) => (
                  <li key={r.id} className="py-3">
                    <p className="font-semibold">{REPORT_CATEGORY_LABELS[r.category]} {r.isDemo ? <DemoBadge /> : null}</p>
                    <p>{r.description}</p>
                    <p className="text-sm text-slate">
                      {MODERATION_LABELS[r.moderationStatus]} · {VERIFICATION_LABELS[r.verificationStatus]} · {formatDate(r.createdAt)} · Dificultad {r.severity}/5
                    </p>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default function MapPage() {
  return (
    <>
      <PageHeader title="Explorar mapa">
        Sector piloto alrededor de la Plaza de Armas de Huánuco. Consulte lugares, tramos peatonales y reportes con su nivel de verificación.
      </PageHeader>
      <DatasetGate>{(dataset) => <MapExplorer dataset={dataset} />}</DatasetGate>
    </>
  );
}

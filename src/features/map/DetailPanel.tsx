import { DemoBadge, StatusBadge } from '../../components/StatusBadge';
import { BARRIER_LABELS, formatDate, PLACE_CATEGORY_LABELS, RAMP_LABELS, SOURCE_LABELS, SURFACE_LABELS } from '../../lib/labels';
import { formatDistance } from '../routing/geo';
import type { GraphEdge, Place, PublicReport } from '../../types/domain';
import type { MapSelection } from './MapView';

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,40%)_1fr] gap-2 border-b border-line py-1.5 last:border-0">
      <dt className="font-semibold">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function warningsFor(status: GraphEdge['accessibilityStatus'], simulated: boolean): string[] {
  const w: string[] = [];
  if (simulated) w.push('Dato simulado con fines de demostración: no describe la condición real del lugar.');
  if (status === 'informacion_insuficiente') w.push('No hay información suficiente para afirmar que es accesible.');
  if (status === 'comunitario_pendiente') w.push('Existe información ciudadana pendiente de verificación técnica.');
  if (status === 'barrera_verificada') w.push('Se registró una barrera: no recomendado para movilidad reducida.');
  w.push('Las condiciones físicas pueden cambiar. Verifique el entorno antes de desplazarse.');
  return w;
}

export function EdgeDetails({ edge, reports }: { edge: GraphEdge; reports: PublicReport[] }) {
  const simulated = edge.sourceType === 'simulado';
  const related = reports.filter((r) => r.graphEdgeId === edge.id);
  return (
    <>
      <h3 className="text-lg font-bold">{edge.name}</h3>
      <div className="my-2 flex flex-wrap gap-2"><StatusBadge status={edge.accessibilityStatus} />{simulated ? <DemoBadge /> : null}</div>
      <dl>
        <Row term="Tipo de infraestructura">Tramo peatonal (vereda / cruce)</Row>
        <Row term="Longitud">{formatDistance(edge.lengthM)}</Row>
        <Row term="Rampas">{RAMP_LABELS[edge.rampStatus]}</Row>
        <Row term="Obstáculos">{BARRIER_LABELS[edge.barrierType]}</Row>
        <Row term="Superficie">{SURFACE_LABELS[edge.surfaceType]}</Row>
        <Row term="Fuente del estado">
          {edge.sourceUrl && !edge.sourceUrl.includes('openstreetmap.org') ? (
            <a href={edge.sourceUrl} target="_blank" rel="noreferrer">{SOURCE_LABELS[edge.sourceType]} (se abre en una pestaña nueva)</a>
          ) : (
            SOURCE_LABELS[edge.sourceType]
          )}
        </Row>
        {edge.sourceUrl?.includes('openstreetmap.org') ? (
          <Row term="Geometría"><a href={edge.sourceUrl} target="_blank" rel="noreferrer">OpenStreetMap (se abre en una pestaña nueva)</a></Row>
        ) : null}
        <Row term="Fecha de verificación">{formatDate(edge.verifiedAt)}{simulated && edge.verifiedAt ? ' (fecha ficticia)' : ''}</Row>
        {edge.notes ? <Row term="Notas">{edge.notes}</Row> : null}
        <Row term="Reportes publicados">{related.length === 0 ? 'Ninguno' : `${related.length} (ver lista de reportes)`}</Row>
      </dl>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber">
        {warningsFor(edge.accessibilityStatus, simulated).map((w) => <li key={w}>{w}</li>)}
      </ul>
    </>
  );
}

export function PlaceDetails({ place }: { place: Place }) {
  const simulated = place.sourceType === 'simulado';
  return (
    <>
      <h3 className="text-lg font-bold">{place.name}</h3>
      <div className="my-2 flex flex-wrap gap-2"><StatusBadge status={place.accessibilityStatus} />{simulated ? <DemoBadge /> : null}</div>
      <p className="mb-2">{place.description}</p>
      <dl>
        <Row term="Tipo">{PLACE_CATEGORY_LABELS[place.category]}</Row>
        <Row term="Rampas">{RAMP_LABELS[place.rampStatus]}</Row>
        <Row term="Fuente">{place.sourceUrl ? <a href={place.sourceUrl} target="_blank" rel="noreferrer">{SOURCE_LABELS[place.sourceType]} (se abre en una pestaña nueva)</a> : SOURCE_LABELS[place.sourceType]}</Row>
        <Row term="Fecha de verificación">{formatDate(place.verifiedAt)}{simulated && place.verifiedAt ? ' (fecha ficticia)' : ''}</Row>
        <Row term="Conexión al grafo">{place.nodeId ? 'Sí' : 'No registrada: no se pueden calcular trayectos'}</Row>
      </dl>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber">
        {warningsFor(place.accessibilityStatus, simulated).map((w) => <li key={w}>{w}</li>)}
      </ul>
    </>
  );
}

export function DetailPanel({ selection, places, edges, reports }: { selection: MapSelection | null; places: Place[]; edges: GraphEdge[]; reports: PublicReport[] }) {
  let content: React.ReactNode = <p className="text-slate">Seleccione un lugar o tramo en el mapa o en las listas para ver su información de accesibilidad.</p>;
  if (selection?.kind === 'place') {
    const p = places.find((x) => x.id === selection.id);
    if (p) content = <PlaceDetails place={p} />;
  } else if (selection?.kind === 'edge') {
    const e = edges.find((x) => x.id === selection.id);
    if (e) content = <EdgeDetails edge={e} reports={reports} />;
  }
  return (
    <section aria-labelledby="detalle-titulo" aria-live="polite" className="card">
      <h2 id="detalle-titulo" className="mb-2 text-sm font-bold uppercase tracking-wide text-slate">Información de accesibilidad</h2>
      {content}
    </section>
  );
}

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Alert } from '../components/Alert';
import { PageHeader } from '../components/PageHeader';
import { DemoBadge, StatusBadge } from '../components/StatusBadge';
import { DatasetGate, DatasetOriginNotice } from '../features/map/DatasetGate';
import { MapView } from '../features/map/MapView';
import { formatDistance } from '../features/routing/geo';
import { NO_VERIFIED_ROUTE_MESSAGE, ROUTE_DISCLAIMER, RoutePlanner, type RouteResult } from '../features/routing/planner';
import { ROUTE_PROFILES, type RouteProfile } from '../features/routing/profiles';
import { BARRIER_LABELS, PROFILE_LABELS, RAMP_LABELS, SOURCE_LABELS, VERDICT_LABELS, formatDate } from '../lib/labels';
import type { MobilityDataset } from '../types/domain';

const isProfile = (v: string | null): v is RouteProfile => !!v && (ROUTE_PROFILES as readonly string[]).includes(v);

interface FormErrors { origin?: string; destination?: string }

function verdictStyle(verdict: string): string {
  switch (verdict) {
    case 'verificada': return 'border-green bg-green-soft';
    case 'demostrativa': return 'border-demo bg-demo-soft';
    case 'con_barreras': return 'border-red bg-red-soft';
    default: return 'border-amber bg-amber-soft';
  }
}

function RouteSearch({ dataset }: { dataset: MobilityDataset }) {
  const [params, setParams] = useSearchParams();
  const planner = useMemo(() => new RoutePlanner(dataset), [dataset]);
  const hasSimulated = dataset.edges.some((e) => e.sourceType === 'simulado');

  const [origin, setOrigin] = useState(params.get('o') ?? '');
  const [destination, setDestination] = useState(params.get('d') ?? '');
  const [profile, setProfile] = useState<RouteProfile>(isProfile(params.get('p')) ? (params.get('p') as RouteProfile) : 'movilidad_reducida');
  const [includeDemo, setIncludeDemo] = useState(params.has('demo') ? params.get('demo') === '1' : hasSimulated);
  const [errors, setErrors] = useState<FormErrors>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const ids = { origin: useId(), destination: useId(), demo: useId() };

  // El resultado se deriva de la URL: el detalle del trayecto puede enlazarse y recargarse.
  const result: RouteResult | null = useMemo(() => {
    const o = params.get('o');
    const d = params.get('d');
    const p = params.get('p');
    if (!o || !d || !isProfile(p)) return null;
    return planner.plan(o, d, { profile: p, includeDemoData: params.get('demo') === '1' });
  }, [params, planner]);

  useEffect(() => {
    if (result) resultHeading.current?.focus();
  }, [result]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: FormErrors = {};
    if (!origin) next.origin = 'Elija el lugar de origen.';
    if (!destination) next.destination = 'Elija el lugar de destino.';
    if (origin && destination && origin === destination) next.destination = 'El origen y el destino son iguales. Elija un destino diferente.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      document.getElementById(next.origin ? ids.origin : ids.destination)?.focus();
      return;
    }
    setParams({ o: origin, d: destination, p: profile, demo: includeDemo ? '1' : '0' });
  };

  const sortedPlaces = [...dataset.places].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const placeName = (id: string) => dataset.places.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <DatasetOriginNotice dataset={dataset} />
      <form onSubmit={submit} noValidate className="card space-y-5" aria-labelledby="buscar-titulo">
        <h2 id="buscar-titulo" className="text-xl font-bold">Criterios de búsqueda</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {([['origin', 'Origen', origin, setOrigin], ['destination', 'Destino', destination, setDestination]] as const).map(([key, label, value, setter]) => (
            <div key={key}>
              <label htmlFor={ids[key]} className="field-label">{label}</label>
              <select
                id={ids[key]}
                className="field-input"
                value={value}
                onChange={(e) => setter(e.target.value)}
                aria-invalid={errors[key] ? true : undefined}
                aria-describedby={errors[key] ? `${ids[key]}-err` : undefined}
              >
                <option value="">— Seleccione un lugar —</option>
                {sortedPlaces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors[key] ? <p id={`${ids[key]}-err`} className="field-error">{errors[key]}</p> : null}
            </div>
          ))}
        </div>

        <fieldset>
          <legend className="field-label">Preferencia de movilidad</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {ROUTE_PROFILES.map((p) => (
              <label key={p} className={`flex cursor-pointer gap-3 rounded-lg border-2 p-3 ${profile === p ? 'border-ink bg-paper' : 'border-line'}`}>
                <input type="radio" name="perfil" value={p} checked={profile === p} onChange={() => setProfile(p)} className="mt-1 h-5 w-5 accent-ink" />
                <span><span className="block font-semibold">{PROFILE_LABELS[p].title}</span><span className="text-sm text-slate">{PROFILE_LABELS[p].description}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-start gap-3">
          <input id={ids.demo} type="checkbox" className="mt-1 h-5 w-5 accent-ink" checked={includeDemo} onChange={(e) => setIncludeDemo(e.target.checked)} aria-describedby={`${ids.demo}-hint`} />
          <div>
            <label htmlFor={ids.demo} className="font-semibold">Usar datos de demostración para ilustrar el algoritmo</label>
            <p id={`${ids.demo}-hint`} className="field-hint">
              Si lo desactiva, los datos simulados se tratan como «información insuficiente», tal como ocurriría con datos reales sin verificar.
            </p>
          </div>
        </div>

        <button type="submit" className="btn-primary">Buscar trayecto</button>
      </form>

      <section aria-labelledby="resultado-titulo" aria-live="polite">
        <h2 id="resultado-titulo" ref={resultHeading} tabIndex={-1} className="mb-3 text-2xl font-bold outline-none">
          {result ? 'Detalle del trayecto' : <span className="sr-only">Resultado</span>}
        </h2>
        {result ? <RouteResultView result={result} dataset={dataset} placeName={placeName} onSwitchProfile={(p) => { setProfile(p); setParams({ o: params.get('o') ?? '', d: params.get('d') ?? '', p, demo: params.get('demo') ?? '0' }); }} /> : null}
      </section>
    </div>
  );
}

function RouteResultView({ result, dataset, placeName, onSwitchProfile }: { result: RouteResult; dataset: MobilityDataset; placeName: (id: string) => string; onSwitchProfile: (p: RouteProfile) => void }) {
  if (result.kind === 'invalid') {
    const msg = result.reason === 'same_place' ? 'El origen y el destino son iguales.' : result.reason === 'unknown_place' ? 'Alguno de los lugares seleccionados no existe en los datos cargados.' : 'Uno de los lugares no está conectado al grafo de movilidad.';
    return <Alert variant="error" title="No se puede calcular el trayecto">{<p>{msg}</p>}</Alert>;
  }
  if (result.kind === 'not_found') {
    const strict = result.options.profile === 'estricto';
    return (
      <Alert variant="warning" title={strict ? 'Sin trayecto verificado' : 'Sin trayecto registrado'}>
        <p>{strict ? NO_VERIFIED_ROUTE_MESSAGE : 'No existe una conexión registrada en el grafo entre estos puntos con la preferencia elegida. No se dibujan conexiones que no estén en los datos. Esto no significa necesariamente que no exista un camino, sino que faltan datos suficientes.'}</p>
        {strict ? (
          <button type="button" className="btn-secondary" onClick={() => onSwitchProfile('movilidad_reducida')}>
            Ver trayecto adaptado (sin accesibilidad confirmada)
          </button>
        ) : null}
      </Alert>
    );
  }

  const v = VERDICT_LABELS[result.verdict];
  const pct = (m: number) => (result.totalLengthM > 0 ? Math.round((m / result.totalLengthM) * 100) : 0);
  return (
    <div className="space-y-4">
      <div className={`rounded-xl border-l-8 p-5 ${verdictStyle(result.verdict)}`}>
        <p className="text-sm font-semibold uppercase tracking-wide">{PROFILE_LABELS[result.options.profile].title}</p>
        <p className="text-2xl font-extrabold">{v.title}</p>
        <p>{v.description}</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div><dt className="text-sm font-semibold">Recorrido</dt><dd>{result.origin.name} → {result.destination.name}</dd></div>
          <div><dt className="text-sm font-semibold">Distancia total (suma de tramos)</dt><dd className="text-xl font-bold">{formatDistance(result.totalLengthM)}</dd></div>
          <div><dt className="text-sm font-semibold">Confianza de los datos</dt><dd>{Math.round(result.verifiedSharePct)}% del recorrido verificado con datos reales</dd></div>
        </dl>
        <p className="mt-3 text-sm">
          Desglose por longitud: verificado real {pct(result.evidence.verifiedRealM)}% · verificado en demostración {pct(result.evidence.verifiedDemoM)}% · sin confirmar {pct(result.evidence.unconfirmedM)}% · con barreras {pct(result.evidence.barrierM)}%.
        </p>
      </div>

      <Alert variant="warning" title="Antes de desplazarse"><p>{ROUTE_DISCLAIMER}</p></Alert>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <MapView dataset={dataset} label={`Mapa del trayecto de ${result.origin.name} a ${result.destination.name}`} route={result.segments} className="h-[380px] lg:h-[520px]" />
        <section aria-labelledby="tramos-titulo" className="card">
          <h3 id="tramos-titulo" className="mb-2 text-lg font-bold">Descripción de los tramos ({result.segments.length})</h3>
          <ol className="space-y-3">
            {result.segments.map((s) => (
              <li key={s.index} className="border-b border-line pb-3 last:border-0">
                <p className="font-semibold">Tramo {s.index + 1}: {s.edge.name}</p>
                <div className="my-1 flex flex-wrap gap-2"><StatusBadge status={s.effectiveStatus} />{s.simulated ? <DemoBadge /> : null}</div>
                <p className="text-sm">
                  {formatDistance(s.edge.lengthM)} · {RAMP_LABELS[s.edge.rampStatus]} · Obstáculos: {BARRIER_LABELS[s.edge.barrierType]}
                </p>
                <p className="text-sm text-slate">Fuente: {SOURCE_LABELS[s.edge.sourceType]} · {formatDate(s.edge.verifiedAt)}</p>
                {s.effectiveStatus !== s.edge.accessibilityStatus ? (
                  <p className="text-sm text-amber">Estado registrado como dato simulado; al desactivar los datos de demostración se trata como información insuficiente.</p>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-sm text-slate">Destino: {placeName(result.destination.id)}.</p>
        </section>
      </div>
    </div>
  );
}

export default function RoutePage() {
  return (
    <>
      <PageHeader title="Buscar trayecto">
        Calcule un trayecto peatonal entre dos lugares del sector piloto y revise qué evidencia de accesibilidad lo respalda.
      </PageHeader>
      <DatasetGate>{(dataset) => <RouteSearch dataset={dataset} />}</DatasetGate>
    </>
  );
}

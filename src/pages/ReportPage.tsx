import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { Alert } from '../components/Alert';
import { PageHeader } from '../components/PageHeader';
import { DatasetGate } from '../features/map/DatasetGate';
import { MapView } from '../features/map/MapView';
import { submitReport, type SubmittedReport } from '../features/reports/api';
import { reportFormSchema, type ReportFormInput, type ReportFormValues } from '../features/reports/schema';
import { lineMidpoint, nearestEdge } from '../features/routing/geo';
import { toAppError, type AppError } from '../lib/errors';
import { REPORT_CATEGORY_LABELS, SEVERITY_LABELS, formatDateTime, trackingCode } from '../lib/labels';
import { isSupabaseConfigured } from '../lib/supabase';
import { REPORT_CATEGORIES, type MobilityDataset } from '../types/domain';

const MIN_FILL_MS = 3000;

function ReportForm({ dataset }: { dataset: MobilityDataset }) {
  const mountedAt = useRef(Date.now());
  const [serverError, setServerError] = useState<AppError | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedReport | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const f = (name: string) => `${id}-${name}`;

  const {
    register, handleSubmit, setValue, watch, reset, setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormInput, unknown, ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: { graphEdgeId: null, description: '', website: '' },
    shouldFocusError: true,
  });

  const lat = watch('latitude');
  const lng = watch('longitude');
  const edgeId = watch('graphEdgeId');
  const description = watch('description') ?? '';
  const picked = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
  const selectedEdge = dataset.edges.find((e) => e.id === edgeId) ?? null;

  const pickPoint = (p: { lat: number; lng: number }) => {
    const near = nearestEdge(p.lat, p.lng, dataset.edges);
    setValue('latitude', p.lat, { shouldValidate: true });
    setValue('longitude', p.lng, { shouldValidate: true });
    setValue('graphEdgeId', near?.id ?? null);
  };

  const pickEdge = (edgeIdValue: string) => {
    const edge = dataset.edges.find((e) => e.id === edgeIdValue);
    if (!edge) {
      setValue('graphEdgeId', null);
      return;
    }
    const mid = lineMidpoint(edge.geometry);
    setValue('latitude', mid.lat, { shouldValidate: true });
    setValue('longitude', mid.lng, { shouldValidate: true });
    setValue('graphEdgeId', edge.id);
  };

  const onSubmit = async (values: ReportFormValues) => {
    setServerError(null);
    setSubmitted(null);
    if (Date.now() - mountedAt.current < MIN_FILL_MS) {
      setServerError(toAppError({ code: '22023', message: 'El formulario se envió demasiado rápido. Revise los datos y vuelva a intentarlo.' }));
      return;
    }
    try {
      const result = await submitReport(values);
      setSubmitted(result);
      reset();
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (err) {
      setServerError(toAppError(err));
    }
  };

  const errorList = Object.entries(errors).filter(([, v]) => v?.message);

  return (
    <div className="space-y-6">
      {!isSupabaseConfigured ? (
        <Alert variant="error" title="Los reportes no se pueden guardar en este momento">
          <p>El servicio de base de datos no está configurado. El formulario no simulará un envío exitoso: cualquier intento mostrará un error.</p>
        </Alert>
      ) : null}

      {submitted ? (
        <div ref={successRef} tabIndex={-1} className="outline-none">
          <Alert variant="success" title="Reporte registrado correctamente" live>
            <p>El servidor confirmó el registro el {formatDateTime(submitted.createdAt)}. El reporte quedará pendiente de moderación antes de publicarse.</p>
            <p>
              Código de seguimiento: <strong className="text-xl tracking-wider">{trackingCode(submitted.id)}</strong>
              <br />
              <span className="text-sm">Identificador completo: <code className="break-all">{submitted.id}</code></span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Link className="btn-primary" to={`/seguimiento?id=${submitted.id}`}>Consultar el estado de este reporte</Link>
              <button type="button" className="btn-secondary" onClick={() => { setSubmitted(null); mountedAt.current = Date.now(); setFocus('category'); }}>Registrar otro reporte</button>
            </div>
          </Alert>
        </div>
      ) : null}

      {serverError ? (
        <Alert variant="error" title="El reporte NO se guardó" live>
          <p>{serverError.message}</p>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6" aria-describedby={errorList.length ? f('errores') : undefined}>
        {errorList.length > 0 ? (
          <div id={f('errores')} role="alert" className="rounded-lg border-2 border-red bg-red-soft p-4">
            <p className="font-bold text-red">Revise {errorList.length === 1 ? 'el siguiente campo' : `los siguientes ${errorList.length} campos`}:</p>
            <ul className="list-disc pl-5">
              {errorList.map(([k, v]) => <li key={k}>{v?.message}</li>)}
            </ul>
          </div>
        ) : null}

        <fieldset className="card space-y-4">
          <legend className="px-1 text-xl font-bold">1. Ubicación del incidente</legend>
          <p className="text-slate">
            Marque el punto en el mapa o elija un tramo de la lista. No solicitamos su ubicación GPS: solo se guarda el punto que usted indique.
          </p>
          <div>
            <label htmlFor={f('edge')} className="field-label">Elegir un tramo de la lista (alternativa accesible al mapa)</label>
            <select id={f('edge')} className="field-input" value={edgeId ?? ''} onChange={(e) => pickEdge(e.target.value)}>
              <option value="">— Sin tramo asociado / marcar en el mapa —</option>
              {dataset.edges.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <MapView dataset={dataset} label="Mapa para marcar la ubicación del obstáculo" pickedPoint={picked} onPick={pickPoint} className="h-[340px]" />
          <p id={f('loc')} aria-live="polite" className={`font-semibold ${errors.latitude ? 'text-red' : ''}`}>
            {picked
              ? `Ubicación seleccionada: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}${selectedEdge ? ` — asociada a «${selectedEdge.name}»` : ' — sin tramo asociado'}.`
              : 'Todavía no se ha seleccionado una ubicación.'}
          </p>
          {errors.latitude ? <p className="field-error">{errors.latitude.message}</p> : null}
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="px-1 text-xl font-bold">2. Descripción del problema</legend>
          <div>
            <label htmlFor={f('category')} className="field-label">Tipo de problema</label>
            <select id={f('category')} className="field-input" aria-invalid={errors.category ? true : undefined} aria-describedby={errors.category ? f('category-err') : undefined} defaultValue="" {...register('category')}>
              <option value="" disabled>— Seleccione —</option>
              {REPORT_CATEGORIES.map((c) => <option key={c} value={c}>{REPORT_CATEGORY_LABELS[c]}</option>)}
            </select>
            {errors.category ? <p id={f('category-err')} className="field-error">{errors.category.message}</p> : null}
          </div>

          <div>
            <label htmlFor={f('description')} className="field-label">Descripción</label>
            <textarea
              id={f('description')}
              rows={4}
              maxLength={1000}
              className="field-input"
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={`${f('description-hint')}${errors.description ? ` ${f('description-err')}` : ''}`}
              {...register('description')}
            />
            <p id={f('description-hint')} className="field-hint">Entre 10 y 1000 caracteres ({description.length}/1000). Describa la barrera, no a personas. No incluya datos personales.</p>
            {errors.description ? <p id={f('description-err')} className="field-error">{errors.description.message}</p> : null}
          </div>

          <fieldset aria-describedby={errors.severity ? f('severity-err') : undefined}>
            <legend className="field-label">Nivel de dificultad percibida</legend>
            <div className="grid gap-2 sm:grid-cols-5">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-2 border-line p-2 has-[:checked]:border-ink has-[:checked]:bg-paper">
                  <input type="radio" value={n} className="h-5 w-5 accent-ink" {...register('severity')} />
                  <span>{SEVERITY_LABELS[n]}</span>
                </label>
              ))}
            </div>
            {errors.severity ? <p id={f('severity-err')} className="field-error">{errors.severity.message}</p> : null}
          </fieldset>

          <p className="text-sm text-slate">La fecha y hora del reporte se registran automáticamente en el servidor al enviarlo.</p>

          {/* Campo trampa para bots: oculto para personas y tecnologías de apoyo. */}
          <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
            <label htmlFor={f('website')}>No completar este campo</label>
            <input id={f('website')} type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
          </div>
        </fieldset>

        <div className="card space-y-4">
          <div className="flex items-start gap-3">
            <input id={f('terms')} type="checkbox" className="mt-1 h-5 w-5 accent-ink" aria-invalid={errors.acceptTerms ? true : undefined} aria-describedby={errors.acceptTerms ? f('terms-err') : undefined} {...register('acceptTerms')} />
            <div>
              <label htmlFor={f('terms')} className="font-semibold">Acepto las condiciones de uso y la política de privacidad</label>
              <p className="field-hint"><Link to="/privacidad" target="_blank">Leer las condiciones (se abre en una pestaña nueva)</Link></p>
              {errors.acceptTerms ? <p id={f('terms-err')} className="field-error">{errors.acceptTerms.message}</p> : null}
            </div>
          </div>
          <button type="submit" className="btn-green" disabled={isSubmitting} aria-describedby={isSubmitting ? f('sending') : undefined}>
            {isSubmitting ? 'Enviando…' : 'Enviar reporte'}
          </button>
          {isSubmitting ? <p id={f('sending')} role="status">Enviando el reporte y esperando la confirmación del servidor…</p> : null}
        </div>
      </form>
    </div>
  );
}

export default function ReportPage() {
  return (
    <>
      <PageHeader title="Reportar barrera">
        Informe sobre rampas obstruidas, veredas deterioradas, desniveles u otras barreras en el sector piloto. Los reportes se revisan antes de publicarse.
      </PageHeader>
      <DatasetGate>{(dataset) => <ReportForm dataset={dataset} />}</DatasetGate>
    </>
  );
}

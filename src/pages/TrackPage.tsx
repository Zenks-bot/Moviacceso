import { useEffect, useId, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Alert } from '../components/Alert';
import { Loading } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { getReportStatus, type ReportStatus } from '../features/reports/api';
import { toAppError, type AppError } from '../lib/errors';
import { MODERATION_LABELS, VERIFICATION_LABELS, formatDateTime, trackingCode } from '../lib/labels';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type State = { status: 'idle' } | { status: 'loading' } | { status: 'error'; error: AppError } | { status: 'not_found' } | { status: 'found'; report: ReportStatus };

export default function TrackPage() {
  const [params, setParams] = useSearchParams();
  const [value, setValue] = useState(params.get('id') ?? '');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ status: 'idle' });
  const inputId = useId();

  const currentId = params.get('id');
  useEffect(() => {
    if (!currentId || !UUID_RE.test(currentId)) return;
    let active = true;
    setState({ status: 'loading' });
    getReportStatus(currentId)
      .then((report) => active && setState(report ? { status: 'found', report } : { status: 'not_found' }))
      .catch((err: unknown) => active && setState({ status: 'error', error: toAppError(err) }));
    return () => { active = false; };
  }, [currentId]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!UUID_RE.test(v)) {
      setFieldError('Ingrese el identificador completo que recibió al enviar el reporte (formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).');
      document.getElementById(inputId)?.focus();
      return;
    }
    setFieldError(null);
    setParams({ id: v.toLowerCase() });
  };

  return (
    <>
      <PageHeader title="Seguimiento de reportes">Consulte el estado de un reporte con el identificador que recibió al enviarlo. Así también puede comprobar que quedó guardado.</PageHeader>
      <form onSubmit={submit} noValidate className="card mb-6 max-w-2xl space-y-3">
        <label htmlFor={inputId} className="field-label">Identificador del reporte</label>
        <input id={inputId} className="field-input font-mono" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={fieldError ? true : undefined} aria-describedby={fieldError ? `${inputId}-err` : undefined} autoComplete="off" spellCheck={false} />
        {fieldError ? <p id={`${inputId}-err`} className="field-error">{fieldError}</p> : null}
        <button type="submit" className="btn-primary">Consultar estado</button>
      </form>
      <div aria-live="polite" className="max-w-2xl">
        {state.status === 'loading' ? <Loading label="Consultando en la base de datos…" /> : null}
        {state.status === 'error' ? <Alert variant="error" title="No se pudo consultar el reporte"><p>{state.error.message}</p></Alert> : null}
        {state.status === 'not_found' ? <Alert variant="warning" title="No encontramos ese reporte"><p>Revise que el identificador esté completo y sin errores.</p></Alert> : null}
        {state.status === 'found' ? (
          <div className="card">
            <h2 className="text-xl font-bold">Reporte {trackingCode(state.report.id)}</h2>
            <dl className="mt-3 space-y-2">
              <div><dt className="font-semibold">Moderación</dt><dd>{MODERATION_LABELS[state.report.moderationStatus]}</dd></div>
              <div><dt className="font-semibold">Verificación técnica</dt><dd>{VERIFICATION_LABELS[state.report.verificationStatus]}</dd></div>
              <div><dt className="font-semibold">Registrado</dt><dd>{formatDateTime(state.report.createdAt)}</dd></div>
              <div><dt className="font-semibold">Última actualización</dt><dd>{formatDateTime(state.report.updatedAt)}</dd></div>
            </dl>
            <p className="mt-3 text-sm text-slate">La aprobación de un reporte indica que su contenido es apropiado para publicarse; no equivale a una verificación técnica en campo.</p>
          </div>
        ) : null}
      </div>
    </>
  );
}

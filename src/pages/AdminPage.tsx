import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { Alert } from '../components/Alert';
import { EmptyState, Loading } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { DemoBadge } from '../components/StatusBadge';
import { currentUserIsAdmin, getHistory, listReports, moderateReport, setVerification, signInAdmin, signOut, type ModerationAction } from '../features/admin/api';
import { toAppError, type AppError } from '../lib/errors';
import { MODERATION_LABELS, REPORT_CATEGORY_LABELS, VERIFICATION_LABELS, formatDateTime, trackingCode } from '../lib/labels';
import { isSupabaseConfigured } from '../lib/supabase';
import { MODERATION_STATUSES, VERIFICATION_STATUSES, type AdminReport, type ModerationStatus, type ReportStatusHistoryEntry, type VerificationStatus } from '../types/domain';

type Session = { status: 'loading' } | { status: 'signed_out' } | { status: 'not_admin'; email: string | null } | { status: 'admin'; email: string | null } | { status: 'error'; error: AppError };

function LoginForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Ingrese su correo y contraseña.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInAdmin(email.trim(), password);
      onDone();
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="card max-w-md space-y-4" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="text-xl font-bold">Iniciar sesión como administrador</h2>
      {error ? <Alert variant="error" title="No se pudo iniciar sesión" live><p>{error}</p></Alert> : null}
      <div>
        <label htmlFor={`${id}-e`} className="field-label">Correo electrónico</label>
        <input id={`${id}-e`} type="email" autoComplete="username" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor={`${id}-p`} className="field-label">Contraseña</label>
        <input id={`${id}-p`} type="password" autoComplete="current-password" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
      <p className="text-sm text-slate">Las cuentas de administración se crean en Supabase y se autorizan agregando el usuario a la tabla admin_roles.</p>
    </form>
  );
}

function ReportReview({ report, onChanged }: { report: AdminReport; onChanged: (msg: string) => void }) {
  const [history, setHistory] = useState<ReportStatusHistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [verStatus, setVerStatus] = useState<VerificationStatus>(report.verificationStatus);
  const [verNote, setVerNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  useEffect(() => {
    let active = true;
    getHistory(report.id)
      .then((h) => active && setHistory(h))
      .catch((err: unknown) => active && setHistoryError(toAppError(err).message));
    return () => { active = false; };
  }, [report.id, report.updatedAt]);

  const act = async (action: ModerationAction) => {
    if (action === 'rechazar' && reason.trim().length < 5) {
      setError('Para rechazar, escriba una justificación de al menos 5 caracteres.');
      document.getElementById(`${id}-reason`)?.focus();
      return;
    }
    const confirmText = { aprobar: '¿Aprobar y publicar este reporte?', rechazar: '¿Rechazar este reporte con la justificación indicada?', resolver: '¿Marcar este reporte como resuelto?' }[action];
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      const status = await moderateReport(report.id, action, reason.trim() || null);
      setReason('');
      onChanged(`Reporte ${trackingCode(report.id)}: nuevo estado «${MODERATION_LABELS[status]}» (confirmado por el servidor).`);
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const saveVerification = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const status = await setVerification(report.id, verStatus, verNote.trim() || null);
      setVerNote('');
      onChanged(`Reporte ${trackingCode(report.id)}: verificación técnica «${VERIFICATION_LABELS[status]}» (confirmado por el servidor).`);
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const s = report.moderationStatus;
  return (
    <div className="mt-4 space-y-4 border-t border-line pt-4">
      {error ? <Alert variant="error" title="La acción no se completó" live><p>{error}</p></Alert> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby={`${id}-mod`} className="rounded-lg border-2 border-ink p-4">
          <h4 id={`${id}-mod`} className="font-bold">Moderación de contenido</h4>
          <p className="mb-3 text-sm text-slate">Decide si el reporte se publica. No confirma el estado físico de la infraestructura.</p>
          <label htmlFor={`${id}-reason`} className="field-label">Justificación (obligatoria para rechazar)</label>
          <textarea id={`${id}-reason`} rows={2} maxLength={500} className="field-input" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            {s === 'pendiente' || s === 'rechazado' ? <button type="button" className="btn-green" disabled={busy} onClick={() => act('aprobar')}>Aprobar publicación</button> : null}
            {s === 'pendiente' || s === 'aprobado' ? <button type="button" className="btn-danger" disabled={busy} onClick={() => act('rechazar')}>Rechazar</button> : null}
            {s === 'aprobado' ? <button type="button" className="btn-secondary" disabled={busy} onClick={() => act('resolver')}>Marcar como resuelto</button> : null}
          </div>
        </section>
        <form onSubmit={saveVerification} aria-labelledby={`${id}-ver`} className="rounded-lg border-2 border-dashed border-green p-4">
          <h4 id={`${id}-ver`} className="font-bold">Verificación técnica en campo</h4>
          <p className="mb-3 text-sm text-slate">Proceso independiente: registre solo verificaciones hechas mediante inspección u otra fuente comprobable.</p>
          <label htmlFor={`${id}-vs`} className="field-label">Estado de verificación</label>
          <select id={`${id}-vs`} className="field-input" value={verStatus} onChange={(e) => setVerStatus(e.target.value as VerificationStatus)}>
            {VERIFICATION_STATUSES.map((v) => <option key={v} value={v}>{VERIFICATION_LABELS[v]}</option>)}
          </select>
          <label htmlFor={`${id}-vn`} className="field-label mt-3">Fuente o metodología</label>
          <input id={`${id}-vn`} className="field-input" maxLength={500} value={verNote} onChange={(e) => setVerNote(e.target.value)} placeholder="Ej.: inspección visual, fecha, responsable del equipo" />
          <button type="submit" className="btn-primary mt-3" disabled={busy}>Guardar verificación</button>
        </form>
      </div>
      <section aria-labelledby={`${id}-hist`}>
        <h4 id={`${id}-hist`} className="mb-2 font-bold">Historial de estados</h4>
        {historyError ? <p className="field-error">{historyError}</p> : history === null ? <Loading label="Cargando historial…" /> : (
          <ol className="space-y-1 text-sm">
            {history.map((h) => (
              <li key={h.id} className="rounded bg-paper p-2">
                <strong>{formatDateTime(h.changedAt)}</strong> — Moderación: {h.fromModeration ? `${MODERATION_LABELS[h.fromModeration]} → ` : ''}{MODERATION_LABELS[h.toModeration]} · Verificación:{' '}
                {h.fromVerification && h.fromVerification !== h.toVerification ? `${VERIFICATION_LABELS[h.fromVerification]} → ` : ''}{VERIFICATION_LABELS[h.toVerification]}
                {h.reason ? <> · <em>{h.reason}</em></> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Dashboard({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  const [filter, setFilter] = useState<ModerationStatus | 'todos'>('pendiente');
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error'; error: AppError } | { status: 'ready'; reports: AdminReport[] }>({ status: 'loading' });
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const filterId = useId();

  const load = useCallback(() => {
    setState({ status: 'loading' });
    listReports(filter)
      .then((reports) => setState({ status: 'ready', reports }))
      .catch((err: unknown) => setState({ status: 'error', error: toAppError(err) }));
  }, [filter]);
  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>Sesión iniciada como <strong>{email ?? 'administrador'}</strong>.</p>
        <button type="button" className="btn-secondary" onClick={onSignOut}>Cerrar sesión</button>
      </div>
      <Alert variant="info" title="Moderación no es verificación">
        <p>Aprobar un reporte solo autoriza su publicación. Para afirmar el estado físico de un tramo se necesita una verificación técnica independiente, que se registra por separado.</p>
      </Alert>
      {notice ? <Alert variant="success" title="Cambio guardado" live><p>{notice}</p></Alert> : null}
      <div className="max-w-xs">
        <label htmlFor={filterId} className="field-label">Mostrar reportes</label>
        <select id={filterId} className="field-input" value={filter} onChange={(e) => setFilter(e.target.value as ModerationStatus | 'todos')}>
          {MODERATION_STATUSES.map((m) => <option key={m} value={m}>{MODERATION_LABELS[m]}</option>)}
          <option value="todos">Todos</option>
        </select>
      </div>
      {state.status === 'loading' ? <Loading label="Cargando reportes…" /> : null}
      {state.status === 'error' ? <Alert variant="error" title="No se pudieron cargar los reportes" live><p>{state.error.message}</p><button type="button" className="btn-primary" onClick={load}>Reintentar</button></Alert> : null}
      {state.status === 'ready' && state.reports.length === 0 ? <EmptyState title="No hay reportes con este estado." /> : null}
      {state.status === 'ready' && state.reports.length > 0 ? (
        <ul className="space-y-3">
          {state.reports.map((r) => (
            <li key={r.id} className="card">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold">{REPORT_CATEGORY_LABELS[r.category]} · <span className="font-mono">{trackingCode(r.id)}</span> {r.isDemo ? <DemoBadge /> : null}</h3>
                  <p className="text-sm text-slate">{formatDateTime(r.createdAt)} · {r.zoneName ?? 'Sin zona'} · Dificultad {r.severity}/5 · {MODERATION_LABELS[r.moderationStatus]} · {VERIFICATION_LABELS[r.verificationStatus]}</p>
                  <p className="mt-1 whitespace-pre-line">{r.description}</p>
                  {r.rejectionReason ? <p className="mt-1 text-sm text-red">Motivo del rechazo: {r.rejectionReason}</p> : null}
                </div>
                <button type="button" className="btn-secondary shrink-0" aria-expanded={openId === r.id} onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                  {openId === r.id ? 'Cerrar revisión' : 'Revisar'}
                </button>
              </div>
              {openId === r.id ? <ReportReview report={r} onChanged={(msg) => { setNotice(msg); load(); }} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState<Session>(isSupabaseConfigured ? { status: 'loading' } : { status: 'signed_out' });
  const refresh = useCallback(() => {
    if (!isSupabaseConfigured) return;
    setSession({ status: 'loading' });
    currentUserIsAdmin()
      .then(({ email, isAdmin }) => {
        if (isAdmin) setSession({ status: 'admin', email });
        else if (email) setSession({ status: 'not_admin', email });
        else setSession({ status: 'signed_out' });
      })
      .catch((err: unknown) => setSession({ status: 'error', error: toAppError(err) }));
  }, []);
  useEffect(refresh, [refresh]);

  const doSignOut = async () => {
    await signOut().catch(() => undefined);
    setSession({ status: 'signed_out' });
  };

  return (
    <>
      <PageHeader title="Administración">Moderación de reportes ciudadanos. Acceso restringido a cuentas autorizadas.</PageHeader>
      {!isSupabaseConfigured ? (
        <Alert variant="error" title="Administración no disponible"><p>La base de datos no está configurada; no es posible autenticar administradores.</p></Alert>
      ) : session.status === 'loading' ? (
        <Loading label="Comprobando la sesión…" />
      ) : session.status === 'error' ? (
        <Alert variant="error" title="No se pudo comprobar la sesión" live><p>{session.error.message}</p><button type="button" className="btn-primary" onClick={refresh}>Reintentar</button></Alert>
      ) : session.status === 'signed_out' ? (
        <LoginForm onDone={refresh} />
      ) : session.status === 'not_admin' ? (
        <Alert variant="error" title="Permiso denegado" live>
          <p>La cuenta {session.email} no tiene permisos de administración.</p>
          <button type="button" className="btn-secondary" onClick={doSignOut}>Cerrar sesión</button>
        </Alert>
      ) : (
        <Dashboard email={session.email} onSignOut={doSignOut} />
      )}
    </>
  );
}

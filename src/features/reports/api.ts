import { AppError, DEFAULT_MESSAGES, toAppError } from '../../lib/errors';
import { getSupabase, run } from '../../lib/supabase';
import type { ModerationStatus, PublicReport, ReportCategory, Severity, VerificationStatus } from '../../types/domain';
import type { ReportFormValues } from './schema';

export const PUBLIC_REPORT_COLUMNS =
  'id, graph_edge_id, latitude, longitude, category, description, severity, moderation_status, verification_status, is_demo, created_at';

export interface ReportRow {
  id: string; graph_edge_id: string | null; latitude: number; longitude: number; category: ReportCategory;
  description: string; severity: number; moderation_status: ModerationStatus; verification_status: VerificationStatus;
  is_demo: boolean; created_at: string;
}

export const mapReport = (r: ReportRow): PublicReport => ({
  id: r.id, graphEdgeId: r.graph_edge_id, lat: r.latitude, lng: r.longitude, category: r.category,
  description: r.description, severity: Math.min(5, Math.max(1, r.severity)) as Severity,
  moderationStatus: r.moderation_status, verificationStatus: r.verification_status, isDemo: r.is_demo, createdAt: r.created_at,
});

/** Garantiza una sesión (anónima si no hay otra) para que el servidor pueda aplicar límites por usuario. */
async function ensureSession(): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return;
  try {
    const { error } = await sb.auth.signInAnonymously();
    if (error) throw error;
  } catch (err) {
    const e = toAppError(err);
    if (e.kind === 'network' || e.kind === 'timeout') throw e;
    throw new AppError('auth_disabled', DEFAULT_MESSAGES.auth_disabled);
  }
}

export interface SubmittedReport {
  id: string;
  createdAt: string;
}

/** Envía un reporte. Solo resuelve si el servidor confirma el registro con un identificador. */
export async function submitReport(values: ReportFormValues): Promise<SubmittedReport> {
  const sb = getSupabase();
  await ensureSession();
  const rows = await run<{ id: string; created_at: string }[]>(
    (s) =>
      sb
        .rpc('submit_report', {
          p_category: values.category,
          p_description: values.description,
          p_severity: values.severity,
          p_latitude: values.latitude,
          p_longitude: values.longitude,
          p_graph_edge_id: values.graphEdgeId,
        })
        .abortSignal(s),
    { requireData: true },
  );
  const row = rows[0];
  if (!row?.id) throw new AppError('unknown', 'El servidor no confirmó el registro. El reporte NO se guardó.');
  return { id: row.id, createdAt: row.created_at };
}

export async function fetchPublicReports(): Promise<PublicReport[]> {
  const sb = getSupabase();
  const rows = await run<ReportRow[]>((s) =>
    sb.from('reports').select(PUBLIC_REPORT_COLUMNS).in('moderation_status', ['aprobado', 'resuelto']).order('created_at', { ascending: false }).limit(200).abortSignal(s),
  );
  return (rows ?? []).map(mapReport);
}

export interface ReportStatus {
  id: string; moderationStatus: ModerationStatus; verificationStatus: VerificationStatus; createdAt: string; updatedAt: string;
}

export async function getReportStatus(id: string): Promise<ReportStatus | null> {
  const sb = getSupabase();
  const rows = await run<{ id: string; moderation_status: ModerationStatus; verification_status: VerificationStatus; created_at: string; updated_at: string }[]>(
    (s) => sb.rpc('get_report_status', { p_report_id: id }).abortSignal(s),
  );
  const r = rows?.[0];
  return r ? { id: r.id, moderationStatus: r.moderation_status, verificationStatus: r.verification_status, createdAt: r.created_at, updatedAt: r.updated_at } : null;
}

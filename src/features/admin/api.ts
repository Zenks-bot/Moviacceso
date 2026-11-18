import { AppError, toAppError } from '../../lib/errors';
import { getSupabase, run } from '../../lib/supabase';
import type { AdminReport, ModerationStatus, ReportStatusHistoryEntry, VerificationStatus } from '../../types/domain';
import { mapReport, PUBLIC_REPORT_COLUMNS, type ReportRow } from '../reports/api';

export type ModerationAction = 'aprobar' | 'rechazar' | 'resolver';

export async function signInAdmin(email: string, password: string): Promise<void> {
  const sb = getSupabase();
  try {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (err) {
    const e = toAppError(err);
    throw e.kind === 'unknown' ? new AppError('auth', 'Correo o contraseña incorrectos.') : e;
  }
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}

/** Devuelve true solo si el usuario autenticado (no anónimo) tiene un rol en admin_roles. */
export async function currentUserIsAdmin(): Promise<{ email: string | null; isAdmin: boolean }> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) return { email: null, isAdmin: false };
  const isAdmin = await run<boolean>((s) => sb.rpc('is_admin').abortSignal(s));
  return { email: user.email ?? null, isAdmin: isAdmin === true };
}

interface AdminRow extends ReportRow { rejection_reason: string | null; updated_at: string; pilot_zones: { name: string } | null }

export async function listReports(status: ModerationStatus | 'todos'): Promise<AdminReport[]> {
  const sb = getSupabase();
  const rows = await run<AdminRow[]>((s) => {
    let q = sb.from('reports').select(`${PUBLIC_REPORT_COLUMNS}, rejection_reason, updated_at, pilot_zones(name)`).order('created_at', { ascending: false }).limit(200);
    if (status !== 'todos') q = q.eq('moderation_status', status);
    return q.abortSignal(s).overrideTypes<AdminRow[], { merge: false }>();
  });
  return (rows ?? []).map((r) => ({ ...mapReport(r), rejectionReason: r.rejection_reason, updatedAt: r.updated_at, zoneName: r.pilot_zones?.name ?? null }));
}

export async function moderateReport(id: string, action: ModerationAction, reason: string | null): Promise<ModerationStatus> {
  const sb = getSupabase();
  return run<ModerationStatus>((s) => sb.rpc('moderate_report', { p_report_id: id, p_action: action, p_reason: reason }).abortSignal(s), { requireData: true });
}

export async function setVerification(id: string, status: VerificationStatus, reason: string | null): Promise<VerificationStatus> {
  const sb = getSupabase();
  return run<VerificationStatus>((s) => sb.rpc('set_report_verification', { p_report_id: id, p_status: status, p_reason: reason }).abortSignal(s), { requireData: true });
}

interface HistoryRow {
  id: number; report_id: string; from_moderation: ModerationStatus | null; to_moderation: ModerationStatus;
  from_verification: VerificationStatus | null; to_verification: VerificationStatus; reason: string | null; changed_at: string;
}

export async function getHistory(reportId: string): Promise<ReportStatusHistoryEntry[]> {
  const sb = getSupabase();
  const rows = await run<HistoryRow[]>((s) =>
    sb.from('report_status_history').select('id, report_id, from_moderation, to_moderation, from_verification, to_verification, reason, changed_at').eq('report_id', reportId).order('changed_at').order('id').abortSignal(s),
  );
  return (rows ?? []).map((r) => ({
    id: r.id, reportId: r.report_id, fromModeration: r.from_moderation, toModeration: r.to_moderation,
    fromVerification: r.from_verification, toVerification: r.to_verification, reason: r.reason, changedAt: r.changed_at,
  }));
}

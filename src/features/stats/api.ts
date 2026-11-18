import { getSupabase, run } from '../../lib/supabase';

export interface Bucket { key: string; count: number }
export interface ScopeStats {
  total: number; pendiente: number; aprobado: number; rechazado: number; resuelto: number; verificado_en_campo: number;
  by_category: Bucket[]; by_zone: Bucket[]; by_week: Bucket[];
}
export interface ReportStats { real: ScopeStats; demo: ScopeStats; generated_at: string }

export async function getReportStats(): Promise<ReportStats> {
  const sb = getSupabase();
  return run<ReportStats>((s) => sb.rpc('get_report_stats').abortSignal(s), { requireData: true });
}

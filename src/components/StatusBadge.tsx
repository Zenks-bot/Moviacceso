import { ACCESSIBILITY_LABELS } from '../lib/labels';
import type { AccessibilityStatus } from '../types/domain';

/** Estilo de cada estado: color + símbolo + texto (nunca solo color). */
export const STATUS_STYLE: Record<AccessibilityStatus, { symbol: string; color: string; badge: string; dash: string | undefined; weight: number }> = {
  accesible_verificado: { symbol: '✓', color: '#1e7b45', badge: 'bg-green-soft text-green border-green', dash: undefined, weight: 6 },
  barrera_verificada: { symbol: '✕', color: '#b42318', badge: 'bg-red-soft text-red border-red', dash: '2 10', weight: 7 },
  informacion_insuficiente: { symbol: '?', color: '#4a5160', badge: 'bg-paper text-slate border-slate', dash: '10 8', weight: 5 },
  comunitario_pendiente: { symbol: '!', color: '#8a5a00', badge: 'bg-amber-soft text-amber border-amber', dash: '14 6 2 6', weight: 6 },
};

export function StatusBadge({ status, compact = false }: { status: AccessibilityStatus; compact?: boolean }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm font-semibold ${s.badge}`}>
      <span aria-hidden="true">{s.symbol}</span>
      {compact ? <span>{ACCESSIBILITY_LABELS[status].split(' ').slice(0, 2).join(' ')}</span> : <span>{ACCESSIBILITY_LABELS[status]}</span>}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-demo bg-demo-soft px-2 py-0.5 text-sm font-semibold text-demo">
      <span aria-hidden="true">◆</span> Datos de demostración
    </span>
  );
}

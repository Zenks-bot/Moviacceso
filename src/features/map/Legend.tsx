import { STATUS_STYLE } from '../../components/StatusBadge';
import { ACCESSIBILITY_LABELS } from '../../lib/labels';
import { ACCESSIBILITY_STATUSES } from '../../types/domain';

export function Legend() {
  return (
    <section aria-labelledby="leyenda-titulo" className="card">
      <h2 id="leyenda-titulo" className="mb-3 text-lg font-bold">Leyenda</h2>
      <ul className="space-y-2">
        {ACCESSIBILITY_STATUSES.map((s) => {
          const st = STATUS_STYLE[s];
          return (
            <li key={s} className="flex items-center gap-3">
              <svg width="48" height="14" aria-hidden="true" className="shrink-0">
                <line x1="4" y1="7" x2="44" y2="7" stroke={st.color} strokeWidth={Math.min(st.weight, 6)} strokeDasharray={st.dash} strokeLinecap="round" />
              </svg>
              <span><span aria-hidden="true" className="font-bold">{st.symbol} </span>{ACCESSIBILITY_LABELS[s]}</span>
            </li>
          );
        })}
        <li className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-6 w-12 items-center justify-center"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber text-sm font-bold text-white">!</span></span>
          <span>Reporte ciudadano aprobado (no implica verificación técnica)</span>
        </li>
        <li className="flex items-center gap-3">
          <span aria-hidden="true" className="w-12 text-center font-bold text-demo">◆</span>
          <span>Datos de demostración: información simulada, no evidencia real</span>
        </li>
      </ul>
      <p className="mt-3 text-sm text-slate">Letras de los marcadores: S salud, E educación, C comercio, P punto de parada (no oficial), B biblioteca/servicio, ★ referencia.</p>
    </section>
  );
}

import type { ReactNode } from 'react';

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 p-4 text-slate">
      <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-4 border-line border-t-ink" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-line bg-white p-6 text-center">
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-2 text-slate">{children}</div> : null}
    </div>
  );
}

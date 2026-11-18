import type { ReactNode } from 'react';

type Variant = 'info' | 'success' | 'warning' | 'error' | 'demo';

const STYLES: Record<Variant, { box: string; icon: string; label: string }> = {
  info: { box: 'border-ink/40 bg-white', icon: 'ℹ', label: 'Información' },
  success: { box: 'border-green bg-green-soft', icon: '✓', label: 'Éxito' },
  warning: { box: 'border-amber bg-amber-soft', icon: '⚠', label: 'Advertencia' },
  error: { box: 'border-red bg-red-soft', icon: '✕', label: 'Error' },
  demo: { box: 'border-demo bg-demo-soft', icon: '◆', label: 'Datos de demostración' },
};

interface AlertProps {
  variant?: Variant;
  title?: string;
  children?: ReactNode;
  /** Anunciar el contenido a lectores de pantalla cuando aparece. */
  live?: boolean;
  className?: string;
}

export function Alert({ variant = 'info', title, children, live = false, className = '' }: AlertProps) {
  const s = STYLES[variant];
  const role = live ? (variant === 'error' ? 'alert' : 'status') : undefined;
  return (
    <div role={role} className={`flex gap-3 rounded-lg border-l-4 p-4 ${s.box} ${className}`}>
      <span aria-hidden="true" className="text-xl font-bold leading-6">{s.icon}</span>
      <div className="min-w-0">
        <p className="font-bold">
          <span className="sr-only">{s.label}: </span>
          {title ?? s.label}
        </p>
        {children ? <div className="mt-1 space-y-2">{children}</div> : null}
      </div>
    </div>
  );
}

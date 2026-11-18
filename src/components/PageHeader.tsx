import { useEffect, useRef, type ReactNode } from 'react';

// En la carga inicial no se mueve el foco (el enlace "Saltar al contenido" debe ser lo primero al tabular).
let initialLoad = true;

/** Encabezado de página; recibe el foco al navegar entre pantallas para orientar a lectores de pantalla. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} · MoviAcceso (prototipo)`;
    if (initialLoad) {
      initialLoad = false;
      return;
    }
    ref.current?.focus();
  }, [title]);
  return (
    <header className="mb-6">
      <h1 ref={ref} tabIndex={-1} className="text-3xl font-extrabold tracking-tight outline-none sm:text-4xl">
        {title}
      </h1>
      {children ? <div className="mt-2 max-w-3xl text-lg text-slate">{children}</div> : null}
    </header>
  );
}

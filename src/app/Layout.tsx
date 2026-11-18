import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router';
import { isSupabaseConfigured } from '../lib/supabase';

const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/mapa', label: 'Explorar mapa' },
  { to: '/trayecto', label: 'Buscar trayecto' },
  { to: '/reportar', label: 'Reportar barrera' },
  { to: '/estadisticas', label: 'Estadísticas' },
  { to: '/acerca', label: 'Acerca del proyecto' },
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-3 py-2 font-semibold no-underline ${isActive ? 'bg-gold text-ink' : 'text-white hover:bg-ink-soft hover:text-gold'}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="sr-only z-[2000] rounded bg-gold px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:left-2 focus:top-2">
        Saltar al contenido principal
      </a>
      <div className="bg-demo px-4 py-1.5 text-center text-sm font-semibold text-white">
        <span aria-hidden="true">◆ </span>Prototipo académico (MVP). Los datos de accesibilidad mostrados son de demostración salvo indicación expresa.
      </div>
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold text-white no-underline hover:text-gold">
            <img src="/logo.svg" alt="" width={36} height={36} />
            <span>Movi<span className="text-gold">Acceso</span></span>
          </Link>
          <button
            type="button"
            className="btn min-h-11 border border-white/40 text-white lg:hidden"
            aria-expanded={open}
            aria-controls="nav-principal"
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true">☰</span> Menú
          </button>
          <nav id="nav-principal" aria-label="Navegación principal" className={`${open ? 'block' : 'hidden'} w-full lg:block lg:w-auto`}>
            <ul className="flex flex-col gap-1 pb-2 lg:flex-row lg:pb-0">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={linkClass} onClick={() => setOpen(false)}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {!isSupabaseConfigured ? (
          <p className="mb-4 rounded-lg border border-red bg-red-soft px-4 py-2 text-sm font-semibold text-red">
            Base de datos no configurada: el mapa usa datos locales de demostración y los reportes no podrán guardarse.
          </p>
        ) : null}
        <Outlet />
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate sm:flex-row sm:justify-between">
          <p>MoviAcceso · Prototipo de movilidad inclusiva para Huánuco, Perú · World Engineering Day Hackathon 2027.</p>
          <ul className="flex flex-wrap gap-4">
            <li><Link to="/privacidad">Privacidad y uso responsable</Link></li>
            <li><Link to="/seguimiento">Seguimiento de reportes</Link></li>
            <li><Link to="/admin">Administración</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

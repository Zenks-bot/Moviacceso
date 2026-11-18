import { Link } from 'react-router';
import { PageHeader } from '../components/PageHeader';

const STEPS = [
  { n: '1', title: 'Explore el sector piloto', text: 'Consulte lugares, puntos de parada y tramos peatonales con su estado de accesibilidad y la fuente de cada dato.' },
  { n: '2', title: 'Busque un trayecto', text: 'Elija origen, destino y su preferencia de movilidad. El sistema calcula la ruta sobre el grafo registrado y explica qué evidencia la respalda.' },
  { n: '3', title: 'Reporte una barrera', text: 'Registre rampas obstruidas, veredas deterioradas o desniveles. Los reportes se guardan en la base de datos y pasan por moderación.' },
];

export function HomePage() {
  return (
    <>
      <section className="mb-10 overflow-hidden rounded-2xl bg-ink text-white">
        <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="mb-3 inline-block rounded-full border border-gold px-3 py-1 text-sm font-semibold text-gold">Prototipo funcional · Huánuco, Perú</p>
            <div className="text-white [&_h1]:text-white [&_div]:text-white/85">
              <PageHeader title="MoviAcceso: información de accesibilidad para planificar sus desplazamientos">
                Una plataforma que centraliza información sobre barreras de movilidad en un sector piloto de Huánuco, para que personas con
                discapacidad motriz, adultos mayores y otras personas con movilidad reducida puedan evaluar sus trayectos peatonales.
              </PageHeader>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/mapa" className="btn bg-gold text-ink hover:bg-white">Explorar mapa</Link>
              <Link to="/reportar" className="btn border-2 border-white text-white hover:bg-white hover:text-ink">Reportar obstáculo</Link>
            </div>
          </div>
          <img src="/logo.svg" alt="" className="mx-auto hidden w-48 lg:block" />
        </div>
      </section>

      <section aria-labelledby="problema" className="mb-10 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 id="problema" className="mb-2 text-2xl font-bold">El problema</h2>
          <p>
            Existen antecedentes documentados por organismos oficiales sobre deficiencias en la construcción de pistas y veredas en calles de
            Huánuco. Quienes tienen movilidad reducida necesitan saber, antes de salir, si hay rampas, obstáculos, desniveles o accesos
            utilizables a los paraderos. Los mapas convencionales no siempre ofrecen esa información.
          </p>
          <p className="mt-2 text-slate">
            No afirmamos que todas las zonas presenten estas deficiencias: el objetivo es distinguir lo verificado de lo desconocido.{' '}
            <Link to="/acerca">Ver fuentes y metodología</Link>.
          </p>
        </div>
        <div className="card">
          <h2 className="mb-2 text-2xl font-bold">Nuestro compromiso de transparencia</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>No garantizamos que un recorrido sea seguro o accesible sin evidencia suficiente.</li>
            <li>Cada dato muestra su fuente y su fecha de verificación.</li>
            <li>Los datos simulados están identificados permanentemente como <strong>datos de demostración</strong>.</li>
            <li>Un reporte ciudadano aprobado no equivale a una verificación técnica en campo.</li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="como" className="mb-10">
        <h2 id="como" className="mb-4 text-2xl font-bold">¿Cómo funciona?</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card">
              <span aria-hidden="true" className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-lg font-bold text-gold">{s.n}</span>
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-slate">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="inclusion" className="card">
        <h2 id="inclusion" className="mb-2 text-2xl font-bold">Movilidad inclusiva y sostenible</h2>
        <p>
          Caminar y usar el transporte público son formas de movilidad de bajo impacto ambiental, pero solo son opciones reales si la
          infraestructura peatonal es utilizable por todas las personas. MoviAcceso se relaciona con los Objetivos de Desarrollo Sostenible
          3 (salud y bienestar), 9 (industria, innovación e infraestructura) y 11 (ciudades y comunidades sostenibles), en el marco del tema
          «Engineering Sustainable Transport Solutions for People, Planet and Prosperity».
        </p>
      </section>
    </>
  );
}

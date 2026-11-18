import { Link } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { STATUS_STYLE } from '../components/StatusBadge';
import { ACCESSIBILITY_LABELS, PROFILE_LABELS } from '../lib/labels';
import { REDUCED_MOBILITY_FACTORS, ROUTE_PROFILES } from '../features/routing/profiles';
import { ACCESSIBILITY_STATUSES } from '../types/domain';

const CRITERIA: Record<string, string> = {
  accesible_verificado: 'Existe una verificación con fecha y fuente (inspección, fuente oficial) que indica que el tramo es transitable sin barreras para movilidad reducida.',
  barrera_verificada: 'Una verificación con fecha y fuente confirma una barrera (escalón, rampa obstruida, vereda deteriorada, etc.).',
  informacion_insuficiente: 'No hay datos suficientes. La geometría de OpenStreetMap por sí sola NO implica accesibilidad comprobada.',
  comunitario_pendiente: 'Hay aportes ciudadanos que todavía no han sido verificados técnicamente.',
};

export function AboutPage() {
  return (
    <>
      <PageHeader title="Acerca del proyecto y metodología">
        Qué es MoviAcceso, cómo clasifica la información y qué limitaciones tiene.
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card" aria-labelledby="pregunta">
          <h2 id="pregunta" className="mb-2 text-xl font-bold">Pregunta central</h2>
          <p>
            ¿Cómo facilitar la identificación de trayectos peatonales y conexiones con el transporte público mediante una plataforma accesible que
            centralice información sobre barreras de movilidad en Huánuco?
          </p>
        </section>
        <section className="card" aria-labelledby="fuentes">
          <h2 id="fuentes" className="mb-2 text-xl font-bold">Antecedentes documentados</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <a href="https://www.gob.pe/institucion/contraloria/noticias/753890-contraloria-advierte-deficiencias-en-construccion-de-pistas-y-veredas-en-calles-de-huanuco" rel="noreferrer" target="_blank">
                Contraloría General de la República: deficiencias en la construcción de pistas y veredas en calles de Huánuco
              </a>{' '}
              (se abre en una pestaña nueva).
            </li>
            <li>
              <a href="https://www.gob.pe/institucion/conadis/noticias/1087810-en-2024-mas-de-la-mitad-de-gobiernos-regionales-fueron-sancionados-por-el-conadis-por-graves-infracciones-en-materia-de-discapacidad" rel="noreferrer" target="_blank">
                Conadis: sanciones a gobiernos regionales por infracciones en materia de discapacidad (2024)
              </a>{' '}
              (se abre en una pestaña nueva).
            </li>
          </ul>
          <p className="mt-2 text-sm text-slate">Estas fuentes son antecedentes generales; no describen el estado de cada tramo del piloto.</p>
        </section>

        <section className="card lg:col-span-2" aria-labelledby="criterios">
          <h2 id="criterios" className="mb-3 text-xl font-bold">Criterios de clasificación de segmentos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Estados de accesibilidad y su criterio</caption>
              <thead><tr className="border-b-2 border-ink"><th className="p-2">Estado</th><th className="p-2">Criterio</th></tr></thead>
              <tbody>
                {ACCESSIBILITY_STATUSES.map((s) => (
                  <tr key={s} className="border-b border-line align-top">
                    <th scope="row" className="p-2 font-semibold"><span aria-hidden="true">{STATUS_STYLE[s].symbol} </span>{ACCESSIBILITY_LABELS[s]}</th>
                    <td className="p-2">{CRITERIA[s]}</td>
                  </tr>
                ))}
                <tr className="align-top">
                  <th scope="row" className="p-2 font-semibold"><span aria-hidden="true">◆ </span>Datos de demostración</th>
                  <td className="p-2">Cualquier dato con fuente «simulado». Nunca se considera evidencia real: si se desactivan los datos de demostración, el motor los trata como «información insuficiente».</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="card lg:col-span-2" aria-labelledby="motor">
          <h2 id="motor" className="mb-3 text-xl font-bold">Motor de rutas</h2>
          <p>
            Se aplica el algoritmo de Dijkstra sobre el grafo registrado (nodos y segmentos). Las distancias se calculan sumando la longitud
            geodésica de la geometría de cada segmento, nunca en línea recta. El sistema no crea conexiones entre puntos que no estén unidos en el grafo.
          </p>
          <ul className="mt-3 space-y-2">
            {ROUTE_PROFILES.map((p) => (
              <li key={p}><strong>{PROFILE_LABELS[p].title}:</strong> {PROFILE_LABELS[p].description}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate">
            Factores de costo del perfil adaptado: verificado ×{REDUCED_MOBILITY_FACTORS.accesible_verificado}, información insuficiente ×
            {REDUCED_MOBILITY_FACTORS.informacion_insuficiente}, comunitario pendiente ×{REDUCED_MOBILITY_FACTORS.comunitario_pendiente}, barrera verificada: excluido.
          </p>
        </section>

        <section className="card" aria-labelledby="limites">
          <h2 id="limites" className="mb-2 text-xl font-bold">Limitaciones conocidas</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>El grafo del piloto es una cuadrícula esquemática de demostración; no coincide necesariamente con las calles reales.</li>
            <li>Ningún tramo ha sido inspeccionado en campo todavía.</li>
            <li>Los puntos de parada mostrados no son paraderos oficiales.</li>
            <li>No hay seguimiento de vehículos, navegación en tiempo real ni garantías de seguridad física.</li>
            <li>La accesibilidad digital se ha comprobado con herramientas automáticas y teclado, no con una auditoría WCAG completa.</li>
          </ul>
        </section>
        <section className="card" aria-labelledby="validacion">
          <h2 id="validacion" className="mb-2 text-xl font-bold">Validación propuesta</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Revisión de antecedentes oficiales.</li>
            <li>Selección del sector piloto (centro urbano).</li>
            <li>Identificación de destinos esenciales y conexiones de transporte.</li>
            <li>Inspección de accesibilidad de los tramos seleccionados.</li>
            <li>Pruebas voluntarias y respetuosas con personas que experimentan barreras de movilidad.</li>
            <li>Comparación de resultados antes y después del uso del prototipo.</li>
          </ol>
          <p className="mt-2"><Link to="/privacidad">Política de privacidad y uso responsable</Link></p>
        </section>
      </div>
    </>
  );
}

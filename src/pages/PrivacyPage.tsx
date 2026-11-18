import { PageHeader } from '../components/PageHeader';

export function PrivacyPage() {
  return (
    <>
      <PageHeader title="Privacidad y uso responsable" />
      <div className="card max-w-3xl space-y-4">
        <section aria-labelledby="datos">
          <h2 id="datos" className="text-xl font-bold">Qué datos tratamos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>De cada reporte guardamos: ubicación del obstáculo (elegida por usted en el mapa), tipo, descripción, nivel de dificultad y fecha.</li>
            <li>No pedimos nombre, teléfono, correo ni documento de identidad para reportar. No se admiten fotografías en esta versión.</li>
            <li>Para limitar envíos masivos se crea una sesión anónima en su navegador; su identificador interno no se publica.</li>
            <li>No solicitamos su ubicación GPS. La ubicación del reporte es la que usted marca de forma explícita.</li>
          </ul>
        </section>
        <section aria-labelledby="publicacion">
          <h2 id="publicacion" className="text-xl font-bold">Publicación y moderación</h2>
          <p>Solo se publican los reportes aprobados por un moderador. Aprobar un reporte no significa que su contenido haya sido verificado técnicamente en campo.</p>
        </section>
        <section aria-labelledby="condiciones">
          <h2 id="condiciones" className="text-xl font-bold">Condiciones de uso</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Describa barreras de la infraestructura, no a personas. No incluya datos personales de terceros.</li>
            <li>Los reportes falsos, ofensivos o publicitarios serán rechazados.</li>
            <li>La información es referencial: las condiciones físicas pueden cambiar. Verifique el entorno antes de desplazarse.</li>
            <li>MoviAcceso es un prototipo académico y no garantiza la seguridad ni la accesibilidad de ningún recorrido.</li>
          </ul>
        </section>
      </div>
    </>
  );
}

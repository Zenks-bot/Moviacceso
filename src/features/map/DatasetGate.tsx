import type { ReactNode } from 'react';
import { Alert } from '../../components/Alert';
import { Loading } from '../../components/Feedback';
import type { MobilityDataset } from '../../types/domain';
import { useDataset } from './DatasetContext';

/** Muestra carga/errores del conjunto de datos y, cuando está listo, renderiza el contenido. */
export function DatasetGate({ children }: { children: (dataset: MobilityDataset) => ReactNode }) {
  const { state, reload, useLocalDemo } = useDataset();
  if (state.status === 'loading') return <Loading label="Cargando lugares y segmentos del sector piloto…" />;
  if (state.status === 'error') {
    return (
      <Alert variant="error" title="No se pudieron cargar los datos de movilidad" live>
        <p>{state.error.message}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={reload}>Reintentar</button>
          <button type="button" className="btn-secondary" onClick={useLocalDemo}>Ver datos locales de demostración</button>
        </div>
      </Alert>
    );
  }
  return <>{children(state.dataset)}</>;
}

export function DatasetOriginNotice({ dataset }: { dataset: MobilityDataset }) {
  const allSimulated = dataset.edges.length > 0 && dataset.edges.every((e) => e.sourceType === 'simulado');
  if (dataset.origin === 'local-demo') {
    return (
      <Alert variant="demo" title="Datos de demostración locales (sin conexión a la base de datos)">
        <p>Se muestran datos simulados incluidos en la aplicación. No describen el estado real de la infraestructura de Huánuco.</p>
      </Alert>
    );
  }
  if (allSimulated) {
    return (
      <Alert variant="demo" title="Datos de demostración">
        <p>Los segmentos y lugares cargados desde la base de datos están marcados como simulados. No describen el estado real de la infraestructura.</p>
      </Alert>
    );
  }
  return null;
}

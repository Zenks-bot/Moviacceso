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
  const simulated = dataset.edges.filter((e) => e.sourceType === 'simulado').length;
  const real = dataset.edges.length - simulated;
  if (dataset.origin === 'local-demo') {
    return (
      <Alert variant="demo" title="Datos de demostración locales (sin conexión a la base de datos)">
        <p>
          Se muestra el conjunto incluido en la aplicación: calles y lugares reales de OpenStreetMap con estados de accesibilidad simulados
          ({simulated} de {dataset.edges.length} tramos). No describen la condición real de las veredas.
        </p>
      </Alert>
    );
  }
  if (simulated > 0) {
    return (
      <Alert variant="demo" title="Estados de accesibilidad de demostración">
        <p>
          Calles y lugares provienen de OpenStreetMap, pero el estado de accesibilidad de {simulated} de {dataset.edges.length} tramos es
          simulado y no describe la condición real de la vía.
          {real > 0 ? ` ${real} tramo${real === 1 ? '' : 's'} cuenta${real === 1 ? '' : 'n'} con una fuente real (por ejemplo, un informe oficial).` : ''}
        </p>
      </Alert>
    );
  }
  return null;
}

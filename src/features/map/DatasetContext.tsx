import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildDemoDataset } from '../../data/demo-dataset';
import { toAppError, type AppError } from '../../lib/errors';
import type { MobilityDataset } from '../../types/domain';
import { loadMobilityDataset } from './dataset-api';

type State =
  | { status: 'loading' }
  | { status: 'ready'; dataset: MobilityDataset }
  | { status: 'error'; error: AppError };

interface DatasetContextValue {
  state: State;
  reload: () => void;
  /** Usa explícitamente el paquete local de demostración (solo lectura), p. ej. si el servidor no responde. */
  useLocalDemo: () => void;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    loadMobilityDataset()
      .then((dataset) => active && setState({ status: 'ready', dataset }))
      .catch((err: unknown) => active && setState({ status: 'error', error: toAppError(err) }));
    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const useLocalDemo = useCallback(() => setState({ status: 'ready', dataset: buildDemoDataset() }), []);
  const value = useMemo(() => ({ state, reload, useLocalDemo }), [state, reload, useLocalDemo]);
  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset(): DatasetContextValue {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error('useDataset debe usarse dentro de DatasetProvider');
  return ctx;
}

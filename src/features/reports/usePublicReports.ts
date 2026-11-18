import { useEffect, useState } from 'react';
import { toAppError, type AppError } from '../../lib/errors';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { PublicReport } from '../../types/domain';
import { fetchPublicReports } from './api';

export type PublicReportsState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; reports: PublicReport[] };

export function usePublicReports(): PublicReportsState {
  const [state, setState] = useState<PublicReportsState>(isSupabaseConfigured ? { status: 'loading' } : { status: 'unavailable' });
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    fetchPublicReports()
      .then((reports) => active && setState({ status: 'ready', reports }))
      .catch((err: unknown) => active && setState({ status: 'error', error: toAppError(err) }));
    return () => {
      active = false;
    };
  }, []);
  return state;
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppError, DEFAULT_MESSAGES, toAppError } from './errors';

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** Decodifica el "role" de una clave JWT sin validarla (solo para detectar errores de configuración). */
function jwtRole(key: string): string | null {
  const part = key.split('.')[1];
  if (!part) return null;
  try {
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown };
    return typeof json.role === 'string' ? json.role : null;
  } catch {
    return null;
  }
}

export type SupabaseConfigState = 'ok' | 'missing' | 'forbidden_key';

export const supabaseConfigState: SupabaseConfigState = (() => {
  if (!url || !anonKey || !/^https?:\/\//.test(url)) return 'missing';
  // Medida de seguridad: nunca usar la clave service_role en el navegador.
  if (jwtRole(anonKey) === 'service_role' || anonKey.startsWith('sb_secret_')) return 'forbidden_key';
  return 'ok';
})();

export const isSupabaseConfigured = supabaseConfigState === 'ok';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseConfigState === 'forbidden_key') {
    throw new AppError(
      'not_configured',
      'Configuración insegura: se detectó una clave privada (service_role) en el frontend. Use únicamente la clave pública "anon".',
    );
  }
  if (!isSupabaseConfigured) throw new AppError('not_configured', DEFAULT_MESSAGES.not_configured);
  client ??= createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

export const REQUEST_TIMEOUT_MS = 12_000;

interface SupabaseResult<T> {
  data: T | null;
  error: unknown;
}

/**
 * Ejecuta una consulta de Supabase con tiempo de espera y traducción de errores.
 * Lanza AppError si hay error o si la respuesta llega vacía cuando se exige un dato (RNF-05).
 */
export async function run<T>(
  query: (signal: AbortSignal) => PromiseLike<SupabaseResult<T>>,
  opts: { requireData?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? REQUEST_TIMEOUT_MS);
  try {
    const { data, error } = await query(controller.signal);
    if (error) throw toAppError(error);
    if (data === null || data === undefined) {
      if (opts.requireData) throw new AppError('unknown', 'El servidor no confirmó la operación. No se puede asegurar que los datos se guardaron.');
      return data as T;
    }
    return data;
  } catch (err) {
    throw toAppError(err);
  } finally {
    clearTimeout(timer);
  }
}

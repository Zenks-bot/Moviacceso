export type AppErrorKind =
  | 'not_configured'
  | 'network'
  | 'timeout'
  | 'permission'
  | 'validation'
  | 'rate_limit'
  | 'duplicate'
  | 'not_found'
  | 'auth'
  | 'auth_disabled'
  | 'unknown';

/** Error con un mensaje apto para mostrar al usuario (sin detalles técnicos). */
export class AppError extends Error {
  readonly kind: AppErrorKind;
  constructor(kind: AppErrorKind, userMessage: string) {
    super(userMessage);
    this.name = 'AppError';
    this.kind = kind;
  }
}

export const DEFAULT_MESSAGES: Record<AppErrorKind, string> = {
  not_configured:
    'El servicio de base de datos no está configurado. No se puede guardar ni consultar información persistente. (Configure VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.)',
  network: 'No pudimos conectarnos con el servidor. Revise su conexión a internet e intente nuevamente.',
  timeout: 'El servidor tardó demasiado en responder. Intente nuevamente en unos momentos.',
  permission: 'No tiene permisos para realizar esta acción.',
  validation: 'Algunos datos no son válidos. Revíselos e intente nuevamente.',
  rate_limit: 'Ha alcanzado el límite de envíos permitido. Intente más tarde.',
  duplicate: 'Este reporte ya fue registrado recientemente.',
  not_found: 'No se encontró la información solicitada.',
  auth: 'No se pudo iniciar sesión. Verifique sus credenciales.',
  auth_disabled:
    'No se pudo crear una sesión anónima para enviar el reporte. El administrador del sistema debe habilitar el inicio de sesión anónimo en Supabase.',
  unknown: 'Ocurrió un error inesperado. Intente nuevamente.',
};

/** Mensajes del servidor que son seguros para mostrar (los escribimos nosotros en las funciones SQL). */
const SAFE_SERVER_CODES = new Set(['22023', 'P0429', 'P0409', 'P0002', '28000', '42501']);

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  status?: unknown;
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const e = (typeof err === 'object' && err !== null ? err : {}) as ErrorLike;
  const code = typeof e.code === 'string' ? e.code : '';
  const message = typeof e.message === 'string' ? e.message : '';
  const name = typeof e.name === 'string' ? e.name : '';

  if (name === 'AbortError' || /aborted/i.test(message)) return new AppError('timeout', DEFAULT_MESSAGES.timeout);
  if (name === 'TypeError' && /fetch|network|load failed/i.test(message)) return new AppError('network', DEFAULT_MESSAGES.network);
  if (/Failed to fetch|NetworkError|ERR_NETWORK|fetch failed/i.test(message)) return new AppError('network', DEFAULT_MESSAGES.network);

  const serverText = SAFE_SERVER_CODES.has(code) && message ? message : '';
  switch (code) {
    case '42501':
    case 'PGRST301':
      return new AppError('permission', serverText || DEFAULT_MESSAGES.permission);
    case '22023':
    case '23514':
      return new AppError('validation', serverText || DEFAULT_MESSAGES.validation);
    case 'P0429':
      return new AppError('rate_limit', serverText || DEFAULT_MESSAGES.rate_limit);
    case 'P0409':
      return new AppError('duplicate', serverText || DEFAULT_MESSAGES.duplicate);
    case 'P0002':
    case 'PGRST116':
      return new AppError('not_found', serverText || DEFAULT_MESSAGES.not_found);
    case '28000':
      return new AppError('auth', serverText || DEFAULT_MESSAGES.auth);
    case 'anonymous_provider_disabled':
      return new AppError('auth_disabled', DEFAULT_MESSAGES.auth_disabled);
    case 'invalid_credentials':
      return new AppError('auth', 'Correo o contraseña incorrectos.');
    default:
      break;
  }
  if (/anonymous sign-ins are disabled/i.test(message)) return new AppError('auth_disabled', DEFAULT_MESSAGES.auth_disabled);
  if (/invalid login credentials/i.test(message)) return new AppError('auth', 'Correo o contraseña incorrectos.');
  return new AppError('unknown', DEFAULT_MESSAGES.unknown);
}

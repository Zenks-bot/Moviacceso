import { describe, expect, it } from 'vitest';
import { toAppError } from './errors';

describe('toAppError', () => {
  it('traduce errores de red sin exponer detalles técnicos', () => {
    const e = toAppError(new TypeError('Failed to fetch'));
    expect(e.kind).toBe('network');
    expect(e.message).toMatch(/conexión/);
  });
  it('traduce tiempos de espera', () => {
    expect(toAppError(new DOMException('aborted', 'AbortError')).kind).toBe('timeout');
  });
  it('usa mensajes seguros del servidor para errores de validación', () => {
    const e = toAppError({ code: '22023', message: 'La ubicación está fuera del sector piloto.' });
    expect(e.kind).toBe('validation');
    expect(e.message).toBe('La ubicación está fuera del sector piloto.');
  });
  it('no muestra mensajes internos de errores desconocidos', () => {
    const e = toAppError({ code: 'XX000', message: 'relation "secret_table" does not exist' });
    expect(e.kind).toBe('unknown');
    expect(e.message).not.toMatch(/secret_table/);
  });
  it('detecta permisos denegados y límites', () => {
    expect(toAppError({ code: '42501', message: 'Permiso denegado: se requiere rol de administración.' }).kind).toBe('permission');
    expect(toAppError({ code: 'P0429', message: 'Límite' }).kind).toBe('rate_limit');
  });
});

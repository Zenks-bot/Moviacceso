import { describe, expect, it } from 'vitest';
import { PILOT_CENTER } from '../../data/demo-dataset';
import { reportFormSchema } from './schema';

const valid = {
  latitude: PILOT_CENTER.lat, longitude: PILOT_CENTER.lng, graphEdgeId: null, category: 'rampa_obstruida',
  description: 'Rampa bloqueada por un vehículo estacionado.', severity: 4, acceptTerms: true, website: '',
};

describe('reportFormSchema (Prueba 7)', () => {
  it('acepta un reporte válido', () => {
    expect(reportFormSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    ['sin ubicación', { latitude: undefined }, /ubicación/],
    ['fuera del piloto', { latitude: -12.04, longitude: -77.03 }, /sector piloto/],
    ['descripción corta', { description: 'corta' }, /al menos 10/],
    ['sin categoría', { category: undefined }, /tipo de problema/],
    ['sin aceptar condiciones', { acceptTerms: false }, /condiciones/],
    ['con DNI', { description: 'Mi DNI es 12345678 y la rampa está rota' }, /documento/],
    ['con teléfono', { description: 'Llamen al 987 654 321 por la vereda' }, /teléfono/],
  ])('rechaza %s con un mensaje que explica cómo corregir', (_label, patch, msg) => {
    const r = reportFormSchema.safeParse({ ...valid, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message).join(' ')).toMatch(msg);
  });
  it('rechaza el envío si un bot completa el campo trampa', () => {
    expect(reportFormSchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(false);
  });
});

describe('severidad desde radios (valor de texto)', () => {
  it('convierte "4" a número y rechaza la ausencia de selección', () => {
    const ok = reportFormSchema.safeParse({ ...valid, severity: '4' });
    expect(ok.success && ok.data.severity).toBe(4);
    const none = reportFormSchema.safeParse({ ...valid, severity: null });
    expect(none.success).toBe(false);
    if (!none.success) expect(none.error.issues[0]?.message).toMatch(/dificultad/);
  });
});

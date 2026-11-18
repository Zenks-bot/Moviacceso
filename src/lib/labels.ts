import type {
  AccessibilityStatus,
  BarrierType,
  ModerationStatus,
  PlaceCategory,
  RampStatus,
  ReportCategory,
  SourceType,
  SurfaceType,
  VerificationStatus,
} from '../types/domain';
import type { RouteProfile } from '../features/routing/profiles';
import type { RouteVerdict } from '../features/routing/planner';

export const ACCESSIBILITY_LABELS: Record<AccessibilityStatus, string> = {
  accesible_verificado: 'Accesibilidad verificada',
  barrera_verificada: 'Barrera verificada',
  informacion_insuficiente: 'Información insuficiente',
  comunitario_pendiente: 'Información comunitaria pendiente de verificación',
};

export const ACCESSIBILITY_SHORT: Record<AccessibilityStatus, string> = {
  accesible_verificado: 'Verificado',
  barrera_verificada: 'Barrera',
  informacion_insuficiente: 'Sin datos',
  comunitario_pendiente: 'Pendiente',
};

export const SOURCE_LABELS: Record<SourceType, string> = {
  osm: 'OpenStreetMap (ubicación; accesibilidad sin verificar)',
  inspeccion: 'Inspección en campo',
  oficial: 'Fuente oficial',
  comunitario: 'Aporte ciudadano',
  simulado: 'Datos de demostración (simulados)',
};

export const SURFACE_LABELS: Record<SurfaceType, string> = {
  asfalto: 'Asfalto', concreto: 'Concreto', adoquin: 'Adoquín', tierra: 'Tierra', mixta: 'Mixta', desconocida: 'Desconocida',
};

export const BARRIER_LABELS: Record<BarrierType, string> = {
  ninguna: 'Ninguna registrada',
  escalon: 'Escalón o desnivel',
  rampa_obstruida: 'Rampa obstruida',
  vereda_deteriorada: 'Vereda deteriorada',
  cruce_peligroso: 'Cruce problemático',
  obstaculo_temporal: 'Obstáculo temporal',
  desconocida: 'Desconocida',
};

export const RAMP_LABELS: Record<RampStatus, string> = {
  presente: 'Rampa presente', ausente: 'Sin rampa', obstruida: 'Rampa obstruida', desconocida: 'Sin información sobre rampas',
};

export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  espacio_publico: 'Espacio público', salud: 'Salud', educacion: 'Educación', comercio: 'Comercio',
  paradero: 'Punto de parada', servicio_publico: 'Servicio público', otro: 'Otro',
};

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  rampa_obstruida: 'Rampa obstruida',
  vereda_deteriorada: 'Vereda deteriorada',
  desnivel_escalon: 'Desnivel o escalón',
  cruce_problematico: 'Cruce peatonal problemático',
  acceso_paradero: 'Acceso al paradero con barreras',
  otro: 'Otro',
};

export const MODERATION_LABELS: Record<ModerationStatus, string> = {
  pendiente: 'Pendiente de moderación', aprobado: 'Aprobado y publicado', rechazado: 'Rechazado', resuelto: 'Resuelto',
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  sin_verificar: 'Sin verificación técnica', verificado_en_campo: 'Verificado en campo', no_confirmado: 'No confirmado en campo',
};

export const PROFILE_LABELS: Record<RouteProfile, { title: string; description: string }> = {
  general: { title: 'Trayecto general', description: 'El camino más corto del grafo. Puede incluir barreras; se señalan en el detalle.' },
  movilidad_reducida: {
    title: 'Adaptado a movilidad reducida',
    description: 'Excluye barreras verificadas y penaliza tramos sin información o pendientes de verificación.',
  },
  estricto: { title: 'Accesibilidad verificada estricta', description: 'Solo usa tramos con accesibilidad verificada. Si falta evidencia, no propone ruta.' },
};

export const VERDICT_LABELS: Record<RouteVerdict, { title: string; description: string }> = {
  verificada: { title: 'Accesibilidad verificada', description: 'Todos los tramos tienen accesibilidad verificada con datos no simulados.' },
  demostrativa: {
    title: 'Ruta demostrativa (no auditada)',
    description: 'Cumple los criterios solo con datos de demostración. No es evidencia real de accesibilidad.',
  },
  con_barreras: { title: 'Incluye barreras', description: 'Al menos un tramo tiene una barrera registrada. No es adecuada para movilidad reducida.' },
  sin_confirmar: {
    title: 'Accesibilidad no confirmada',
    description: 'Incluye tramos con información insuficiente o pendiente de verificación.',
  },
};

export const SEVERITY_LABELS: Record<number, string> = {
  1: '1 — Leve', 2: '2 — Moderada', 3: '3 — Considerable', 4: '4 — Grave', 5: '5 — Impide el paso',
};

export function formatDate(iso: string | null): string {
  if (!iso) return 'Sin fecha de verificación';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Fecha no válida';
  return d.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Código de seguimiento legible derivado del UUID del reporte. */
export const trackingCode = (id: string): string => id.slice(0, 8).toUpperCase();

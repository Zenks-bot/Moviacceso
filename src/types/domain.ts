/**
 * Tipos de dominio de MoviAcceso.
 * Los valores de los enumerados coinciden exactamente con los tipos ENUM de PostgreSQL
 * definidos en supabase/migrations/0001_schema.sql.
 */

export const ACCESSIBILITY_STATUSES = [
  'accesible_verificado',
  'barrera_verificada',
  'informacion_insuficiente',
  'comunitario_pendiente',
] as const;
export type AccessibilityStatus = (typeof ACCESSIBILITY_STATUSES)[number];

export const SOURCE_TYPES = ['osm', 'inspeccion', 'oficial', 'comunitario', 'simulado'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SURFACE_TYPES = ['asfalto', 'concreto', 'adoquin', 'tierra', 'mixta', 'desconocida'] as const;
export type SurfaceType = (typeof SURFACE_TYPES)[number];

export const BARRIER_TYPES = [
  'ninguna',
  'escalon',
  'rampa_obstruida',
  'vereda_deteriorada',
  'cruce_peligroso',
  'obstaculo_temporal',
  'desconocida',
] as const;
export type BarrierType = (typeof BARRIER_TYPES)[number];

export const RAMP_STATUSES = ['presente', 'ausente', 'obstruida', 'desconocida'] as const;
export type RampStatus = (typeof RAMP_STATUSES)[number];

export const PLACE_CATEGORIES = [
  'espacio_publico',
  'salud',
  'educacion',
  'comercio',
  'paradero',
  'servicio_publico',
  'otro',
] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const REPORT_CATEGORIES = [
  'rampa_obstruida',
  'vereda_deteriorada',
  'desnivel_escalon',
  'cruce_problematico',
  'acceso_paradero',
  'otro',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const MODERATION_STATUSES = ['pendiente', 'aprobado', 'rechazado', 'resuelto'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const VERIFICATION_STATUSES = ['sin_verificar', 'verificado_en_campo', 'no_confirmado'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export type Severity = 1 | 2 | 3 | 4 | 5;

export interface LatLng {
  lat: number;
  lng: number;
}

/** GeoJSON LineString: coordenadas en orden [longitud, latitud]. */
export interface LineStringGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
}

export interface GraphEdge {
  id: string;
  name: string;
  sourceNodeId: string;
  targetNodeId: string;
  geometry: LineStringGeometry;
  lengthM: number;
  accessibilityStatus: AccessibilityStatus;
  surfaceType: SurfaceType;
  barrierType: BarrierType;
  rampStatus: RampStatus;
  sourceType: SourceType;
  sourceUrl: string | null;
  verifiedAt: string | null;
  notes: string | null;
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  nodeId: string | null;
  description: string;
  accessibilityStatus: AccessibilityStatus;
  rampStatus: RampStatus;
  sourceType: SourceType;
  sourceUrl: string | null;
  verifiedAt: string | null;
}

export interface MobilityDataset {
  /** Identifica si el conjunto completo proviene de la base de datos o del paquete local de demostración. */
  origin: 'supabase' | 'local-demo';
  nodes: GraphNode[];
  edges: GraphEdge[];
  places: Place[];
}

export interface PublicReport {
  id: string;
  graphEdgeId: string | null;
  lat: number;
  lng: number;
  category: ReportCategory;
  description: string;
  severity: Severity;
  moderationStatus: ModerationStatus;
  verificationStatus: VerificationStatus;
  isDemo: boolean;
  createdAt: string;
}

export interface AdminReport extends PublicReport {
  rejectionReason: string | null;
  zoneName: string | null;
  updatedAt: string;
}

export interface ReportStatusHistoryEntry {
  id: number;
  reportId: string;
  fromModeration: ModerationStatus | null;
  toModeration: ModerationStatus;
  fromVerification: VerificationStatus | null;
  toVerification: VerificationStatus;
  reason: string | null;
  changedAt: string;
}

export const isSimulated = (source: SourceType): boolean => source === 'simulado';

/** Zona del piloto usada para estadísticas y para validar la ubicación de los reportes. */
export interface PilotZone { id: string; name: string; minLat: number; maxLat: number; minLng: number; maxLng: number }

/** Conjunto del piloto generado por scripts/build-pilot.ts a partir de OpenStreetMap. */
export interface PilotDataset {
  generatedFrom: string;
  center: LatLng;
  zones: PilotZone[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  places: Place[];
  /** Par de lugares donde la ruta general cruza una barrera y la adaptada la evita (para la demostración). */
  scenario: { originId: string; destinationId: string } | null;
  /** Tramos con evidencia oficial (no simulada). */
  officialEdgeIds: string[];
}

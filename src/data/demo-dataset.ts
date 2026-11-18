/**
 * CONJUNTO DE DATOS DE DEMOSTRACIÓN — MoviAcceso
 *
 * IMPORTANTE (transparencia):
 * - Todo lo que hay aquí es SIMULADO (source_type = 'simulado'). No describe el estado real
 *   de ninguna vereda, rampa, cruce o paradero de Huánuco.
 * - La geometría es una CUADRÍCULA ESQUEMÁTICA de ~110 m por cuadra alrededor de una coordenada
 *   de referencia aproximada de la Plaza de Armas de Huánuco. No fue contrastada con OpenStreetMap
 *   desde el entorno de desarrollo (sin acceso de red a OSM), por lo que los tramos pueden no
 *   coincidir exactamente con las calles reales del mapa base.
 * - Los destinos son genéricos y explícitamente ficticios. No se inventan nombres de empresas de
 *   transporte, paraderos oficiales ni recorridos autorizados.
 * - Para reemplazar estos datos por geometría real, ver scripts/osm-to-dataset.ts y docs/research.md.
 *
 * Este archivo es la ÚNICA fuente: scripts/generate-seed.ts produce supabase/seed.sql a partir de él.
 */
import { lineStringLengthM } from '../features/routing/geo';
import type {
  AccessibilityStatus,
  BarrierType,
  GraphEdge,
  GraphNode,
  MobilityDataset,
  Place,
  PlaceCategory,
  RampStatus,
  SurfaceType,
} from '../types/domain';

/** Coordenada de referencia aproximada (no verificada en campo) del centro de la Plaza de Armas de Huánuco. */
export const PILOT_CENTER = { lat: -9.92975, lng: -76.23985 } as const;
export const PILOT_ZOOM = 17;

const ROW_OFFSETS = [0.0015, 0.0005, -0.0005, -0.0015]; // norte → sur (grados de latitud)
const COL_OFFSETS = [-0.00153, -0.00051, 0.00051, 0.00153]; // oeste → este (grados de longitud)

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

function gridNodes(): GraphNode[] {
  const nodes: GraphNode[] = [];
  ROW_OFFSETS.forEach((dLat, r) => {
    COL_OFFSETS.forEach((dLng, c) => {
      nodes.push({ id: `n-r${r}c${c}`, lat: round6(PILOT_CENTER.lat + dLat), lng: round6(PILOT_CENTER.lng + dLng) });
    });
  });
  // Dos nodos aislados (sin conexión con la cuadrícula) para probar la ausencia de trayecto.
  nodes.push({ id: 'n-iso1', lat: round6(PILOT_CENTER.lat - 0.0024), lng: round6(PILOT_CENTER.lng + 0.0024) });
  nodes.push({ id: 'n-iso2', lat: round6(PILOT_CENTER.lat - 0.0031), lng: round6(PILOT_CENTER.lng + 0.0031) });
  return nodes;
}

interface EdgeSpec {
  id: string;
  name: string;
  from: string;
  to: string;
  status: AccessibilityStatus;
  surface?: SurfaceType;
  barrier?: BarrierType;
  ramp?: RampStatus;
  notes?: string;
}

const DEMO_VERIFIED_AT = '2026-11-01T00:00:00Z';

const EDGE_SPECS: EdgeSpec[] = [
  // Filas (tramos oeste–este)
  { id: 'e-h-r0c0', name: 'Tramo demo F0-1', from: 'n-r0c0', to: 'n-r0c1', status: 'accesible_verificado', surface: 'concreto', ramp: 'presente' },
  { id: 'e-h-r0c1', name: 'Tramo demo F0-2', from: 'n-r0c1', to: 'n-r0c2', status: 'informacion_insuficiente' },
  { id: 'e-h-r0c2', name: 'Tramo demo F0-3', from: 'n-r0c2', to: 'n-r0c3', status: 'accesible_verificado', surface: 'concreto', ramp: 'presente' },
  { id: 'e-h-r1c0', name: 'Tramo demo F1-1', from: 'n-r1c0', to: 'n-r1c1', status: 'comunitario_pendiente', barrier: 'vereda_deteriorada', notes: 'Reporte comunitario simulado de vereda deteriorada, sin verificación técnica.' },
  { id: 'e-h-r1c1', name: 'Tramo demo F1-2 (borde norte de la plaza)', from: 'n-r1c1', to: 'n-r1c2', status: 'accesible_verificado', surface: 'adoquin', ramp: 'presente' },
  { id: 'e-h-r1c2', name: 'Tramo demo F1-3', from: 'n-r1c2', to: 'n-r1c3', status: 'accesible_verificado', surface: 'concreto', ramp: 'presente' },
  { id: 'e-h-r2c0', name: 'Tramo demo F2-1', from: 'n-r2c0', to: 'n-r2c1', status: 'informacion_insuficiente' },
  { id: 'e-h-r2c1', name: 'Tramo demo F2-2 (borde sur de la plaza)', from: 'n-r2c1', to: 'n-r2c2', status: 'accesible_verificado', surface: 'adoquin', ramp: 'presente' },
  { id: 'e-h-r2c2', name: 'Tramo demo F2-3', from: 'n-r2c2', to: 'n-r2c3', status: 'barrera_verificada', surface: 'concreto', barrier: 'rampa_obstruida', ramp: 'obstruida', notes: 'Barrera simulada: rampa obstruida en la esquina este.' },
  { id: 'e-h-r3c0', name: 'Tramo demo F3-1', from: 'n-r3c0', to: 'n-r3c1', status: 'accesible_verificado', surface: 'asfalto', ramp: 'presente' },
  { id: 'e-h-r3c1', name: 'Tramo demo F3-2', from: 'n-r3c1', to: 'n-r3c2', status: 'informacion_insuficiente' },
  { id: 'e-h-r3c2', name: 'Tramo demo F3-3', from: 'n-r3c2', to: 'n-r3c3', status: 'comunitario_pendiente', barrier: 'escalon', notes: 'Reporte comunitario simulado de un escalón sin rampa, pendiente de verificación.' },
  // Columnas (tramos norte–sur)
  { id: 'e-v-r0c0', name: 'Tramo demo C0-1', from: 'n-r0c0', to: 'n-r1c0', status: 'accesible_verificado', surface: 'concreto', ramp: 'presente' },
  { id: 'e-v-r1c0', name: 'Tramo demo C0-2', from: 'n-r1c0', to: 'n-r2c0', status: 'informacion_insuficiente' },
  { id: 'e-v-r2c0', name: 'Tramo demo C0-3', from: 'n-r2c0', to: 'n-r3c0', status: 'accesible_verificado', surface: 'concreto', ramp: 'presente' },
  { id: 'e-v-r0c1', name: 'Tramo demo C1-1', from: 'n-r0c1', to: 'n-r1c1', status: 'accesible_verificado', surface: 'concreto', ramp: 'presente' },
  { id: 'e-v-r1c1', name: 'Tramo demo C1-2 (borde oeste de la plaza)', from: 'n-r1c1', to: 'n-r2c1', status: 'accesible_verificado', surface: 'adoquin', ramp: 'presente' },
  { id: 'e-v-r2c1', name: 'Tramo demo C1-3', from: 'n-r2c1', to: 'n-r3c1', status: 'comunitario_pendiente', barrier: 'obstaculo_temporal', notes: 'Reporte comunitario simulado de obstáculo temporal en la vereda.' },
  { id: 'e-v-r0c2', name: 'Tramo demo C2-1', from: 'n-r0c2', to: 'n-r1c2', status: 'informacion_insuficiente' },
  { id: 'e-v-r1c2', name: 'Tramo demo C2-2 (borde este de la plaza)', from: 'n-r1c2', to: 'n-r2c2', status: 'accesible_verificado', surface: 'adoquin', ramp: 'presente' },
  { id: 'e-v-r2c2', name: 'Tramo demo C2-3', from: 'n-r2c2', to: 'n-r3c2', status: 'informacion_insuficiente' },
  { id: 'e-v-r0c3', name: 'Tramo demo C3-1', from: 'n-r0c3', to: 'n-r1c3', status: 'accesible_verificado', surface: 'concreto', ramp: 'presente' },
  { id: 'e-v-r1c3', name: 'Tramo demo C3-2', from: 'n-r1c3', to: 'n-r2c3', status: 'accesible_verificado', surface: 'concreto', ramp: 'presente' },
  { id: 'e-v-r2c3', name: 'Tramo demo C3-3', from: 'n-r2c3', to: 'n-r3c3', status: 'accesible_verificado', surface: 'concreto', ramp: 'presente' },
  // Diagonal por el interior de la plaza: más corta, pero con barrera simulada.
  { id: 'e-d-plaza', name: 'Tramo demo diagonal (interior de la plaza)', from: 'n-r1c1', to: 'n-r2c2', status: 'barrera_verificada', surface: 'adoquin', barrier: 'escalon', ramp: 'ausente', notes: 'Barrera simulada: escalones sin rampa en el recorrido diagonal.' },
  // Componente aislado: no conecta con la cuadrícula.
  { id: 'e-iso', name: 'Tramo demo aislado', from: 'n-iso1', to: 'n-iso2', status: 'informacion_insuficiente' },
];

function buildEdges(nodes: GraphNode[]): GraphEdge[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return EDGE_SPECS.map((spec) => {
    const a = byId.get(spec.from);
    const b = byId.get(spec.to);
    if (!a || !b) throw new Error(`Segmento ${spec.id} referencia un nodo inexistente`);
    const geometry = {
      type: 'LineString' as const,
      coordinates: [
        [a.lng, a.lat],
        [b.lng, b.lat],
      ] as [number, number][],
    };
    const verified = spec.status === 'accesible_verificado' || spec.status === 'barrera_verificada';
    return {
      id: spec.id,
      name: spec.name,
      sourceNodeId: spec.from,
      targetNodeId: spec.to,
      geometry,
      lengthM: Math.round(lineStringLengthM(geometry) * 10) / 10,
      accessibilityStatus: spec.status,
      surfaceType: spec.surface ?? 'desconocida',
      barrierType: spec.barrier ?? (spec.status === 'accesible_verificado' ? 'ninguna' : 'desconocida'),
      rampStatus: spec.ramp ?? 'desconocida',
      sourceType: 'simulado',
      sourceUrl: null,
      verifiedAt: verified ? DEMO_VERIFIED_AT : null,
      notes: spec.notes ?? null,
    };
  });
}

interface PlaceSpec {
  id: string;
  name: string;
  category: PlaceCategory;
  nodeId: string;
  description: string;
  status?: AccessibilityStatus;
  ramp?: RampStatus;
  /** Si se indica, la posición del marcador difiere de la del nodo de conexión. */
  position?: { lat: number; lng: number };
}

const PLACE_SPECS: PlaceSpec[] = [
  {
    id: 'p-plaza',
    name: 'Plaza de Armas de Huánuco (referencia)',
    category: 'espacio_publico',
    nodeId: 'n-r1c1',
    position: PILOT_CENTER,
    description:
      'Punto de referencia del sector piloto. Ubicación aproximada; el acceso al grafo se modela en la esquina noroeste de la plaza. Las condiciones de accesibilidad mostradas son simuladas.',
    status: 'informacion_insuficiente',
  },
  { id: 'p-salud', name: 'Destino demo A — centro de salud (ficticio)', category: 'salud', nodeId: 'n-r3c3', description: 'Destino ficticio para la demostración. No representa un establecimiento real.', status: 'accesible_verificado', ramp: 'presente' },
  { id: 'p-educacion', name: 'Destino demo B — institución educativa (ficticia)', category: 'educacion', nodeId: 'n-r0c3', description: 'Destino ficticio para la demostración.', status: 'informacion_insuficiente' },
  { id: 'p-mercado', name: 'Destino demo C — mercado (ficticio)', category: 'comercio', nodeId: 'n-r3c0', description: 'Destino ficticio para la demostración.', status: 'comunitario_pendiente', ramp: 'desconocida' },
  { id: 'p-paradero-1', name: 'Paradero demo 1 (no oficial)', category: 'paradero', nodeId: 'n-r0c0', description: 'Punto de parada ilustrativo. NO es un paradero oficial ni corresponde a ninguna ruta de transporte autorizada.', status: 'accesible_verificado', ramp: 'presente' },
  { id: 'p-paradero-2', name: 'Paradero demo 2 (no oficial)', category: 'paradero', nodeId: 'n-r2c3', description: 'Punto de parada ilustrativo. NO es un paradero oficial ni corresponde a ninguna ruta de transporte autorizada.', status: 'barrera_verificada', ramp: 'obstruida' },
  { id: 'p-biblioteca', name: 'Destino demo D — biblioteca (ficticia)', category: 'servicio_publico', nodeId: 'n-r0c1', description: 'Destino ficticio para la demostración.', status: 'accesible_verificado', ramp: 'presente' },
  { id: 'p-aislado', name: 'Destino demo E — sin conexión registrada', category: 'otro', nodeId: 'n-iso2', description: 'Destino ficticio deliberadamente desconectado del resto del grafo, para demostrar que el sistema no inventa conexiones.', status: 'informacion_insuficiente' },
];

function buildPlaces(nodes: GraphNode[]): Place[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return PLACE_SPECS.map((spec) => {
    const node = byId.get(spec.nodeId);
    if (!node) throw new Error(`Lugar ${spec.id} referencia un nodo inexistente`);
    const pos = spec.position ?? { lat: node.lat, lng: node.lng };
    const status = spec.status ?? 'informacion_insuficiente';
    return {
      id: spec.id,
      name: spec.name,
      category: spec.category,
      lat: pos.lat,
      lng: pos.lng,
      nodeId: spec.nodeId,
      description: spec.description,
      accessibilityStatus: status,
      rampStatus: spec.ramp ?? 'desconocida',
      sourceType: 'simulado',
      sourceUrl: null,
      verifiedAt: status === 'accesible_verificado' || status === 'barrera_verificada' ? DEMO_VERIFIED_AT : null,
    };
  });
}

export function buildDemoDataset(): MobilityDataset {
  const nodes = gridNodes();
  return { origin: 'local-demo', nodes, edges: buildEdges(nodes), places: buildPlaces(nodes) };
}

/** Zonas del piloto (cuadrantes alrededor de la plaza), usadas para estadísticas. */
export const PILOT_ZONES = [
  { id: 'z-no', name: 'Sector piloto noroeste', minLat: round6(PILOT_CENTER.lat), maxLat: round6(PILOT_CENTER.lat + 0.004), minLng: round6(PILOT_CENTER.lng - 0.004), maxLng: round6(PILOT_CENTER.lng) },
  { id: 'z-ne', name: 'Sector piloto noreste', minLat: round6(PILOT_CENTER.lat), maxLat: round6(PILOT_CENTER.lat + 0.004), minLng: round6(PILOT_CENTER.lng), maxLng: round6(PILOT_CENTER.lng + 0.004) },
  { id: 'z-so', name: 'Sector piloto suroeste', minLat: round6(PILOT_CENTER.lat - 0.004), maxLat: round6(PILOT_CENTER.lat), minLng: round6(PILOT_CENTER.lng - 0.004), maxLng: round6(PILOT_CENTER.lng) },
  { id: 'z-se', name: 'Sector piloto sureste', minLat: round6(PILOT_CENTER.lat - 0.004), maxLat: round6(PILOT_CENTER.lat), minLng: round6(PILOT_CENTER.lng), maxLng: round6(PILOT_CENTER.lng + 0.004) },
] as const;

/** Límites del piloto: los reportes fuera de esta caja se rechazan (cliente y servidor). */
export const PILOT_BOUNDS = {
  minLat: round6(PILOT_CENTER.lat - 0.004),
  maxLat: round6(PILOT_CENTER.lat + 0.004),
  minLng: round6(PILOT_CENTER.lng - 0.004),
  maxLng: round6(PILOT_CENTER.lng + 0.004),
} as const;

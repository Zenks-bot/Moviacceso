/**
 * CONJUNTO DEL PILOTO — MoviAcceso
 *
 * Generado por scripts/build-pilot.ts (npm run pilot:build) a partir de OpenStreetMap:
 * - Calles, intersecciones y destinos: REALES (© colaboradores de OpenStreetMap, ODbL).
 * - Estados de accesibilidad de los tramos: SIMULADOS (source_type = 'simulado') para la demostración,
 *   salvo el tramo del Jr. San Martín documentado por la Contraloría (source_type = 'oficial', 2023).
 * - La accesibilidad de los lugares no está verificada ("información insuficiente").
 *
 * Es la fuente única: scripts/generate-seed.ts produce supabase/seed.sql a partir de pilot-dataset.json.
 */
import meta from './pilot-meta.json';
import type { MobilityDataset, PilotDataset } from '../types/domain';

type PilotMeta = Omit<PilotDataset, 'nodes' | 'edges' | 'places'>;
const DATA = meta as unknown as PilotMeta;

export const PILOT_CENTER = DATA.center;
export const PILOT_ZOOM = 16;
export const PILOT_ZONES = DATA.zones;
export const DEMO_SCENARIO = DATA.scenario;
export const OFFICIAL_EDGE_IDS = DATA.officialEdgeIds;

/** Límites del piloto (unión de las zonas): los reportes fuera de esta caja se rechazan en cliente y servidor. */
export const PILOT_BOUNDS = {
  minLat: Math.min(...DATA.zones.map((z) => z.minLat)),
  maxLat: Math.max(...DATA.zones.map((z) => z.maxLat)),
  minLng: Math.min(...DATA.zones.map((z) => z.minLng)),
  maxLng: Math.max(...DATA.zones.map((z) => z.maxLng)),
} as const;

export function toMobilityDataset(full: PilotDataset): MobilityDataset {
  return { origin: 'local-demo', nodes: full.nodes, edges: full.edges, places: full.places };
}

/** Carga bajo demanda la geometría del piloto (~400 KB): solo se usa si no hay base de datos configurada. */
export async function buildDemoDataset(): Promise<MobilityDataset> {
  const full = (await import('./pilot-dataset.json')).default as unknown as PilotDataset;
  return toMobilityDataset(full);
}

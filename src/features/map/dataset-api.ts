import { buildDemoDataset } from '../../data/demo-dataset';
import { getSupabase, isSupabaseConfigured, run } from '../../lib/supabase';
import type {
  AccessibilityStatus,
  BarrierType,
  GraphEdge,
  GraphNode,
  LineStringGeometry,
  MobilityDataset,
  Place,
  PlaceCategory,
  RampStatus,
  SourceType,
  SurfaceType,
} from '../../types/domain';

interface NodeRow { id: string; latitude: number; longitude: number }
interface EdgeRow {
  id: string; name: string; source_node_id: string; target_node_id: string; geometry: LineStringGeometry;
  length_m: number | string; accessibility_status: AccessibilityStatus; surface_type: SurfaceType;
  barrier_type: BarrierType; ramp_status: RampStatus; source_type: SourceType; source_url: string | null;
  verified_at: string | null; notes: string | null;
}
interface PlaceRow {
  id: string; name: string; category: PlaceCategory; latitude: number; longitude: number; node_id: string | null;
  description: string; accessibility_status: AccessibilityStatus; ramp_status: RampStatus; source_type: SourceType;
  source_url: string | null; verified_at: string | null;
}

export const mapNode = (r: NodeRow): GraphNode => ({ id: r.id, lat: r.latitude, lng: r.longitude });
export const mapEdge = (r: EdgeRow): GraphEdge => ({
  id: r.id, name: r.name, sourceNodeId: r.source_node_id, targetNodeId: r.target_node_id, geometry: r.geometry,
  lengthM: Number(r.length_m), accessibilityStatus: r.accessibility_status, surfaceType: r.surface_type,
  barrierType: r.barrier_type, rampStatus: r.ramp_status, sourceType: r.source_type, sourceUrl: r.source_url,
  verifiedAt: r.verified_at, notes: r.notes,
});
export const mapPlace = (r: PlaceRow): Place => ({
  id: r.id, name: r.name, category: r.category, lat: r.latitude, lng: r.longitude, nodeId: r.node_id,
  description: r.description, accessibilityStatus: r.accessibility_status, rampStatus: r.ramp_status,
  sourceType: r.source_type, sourceUrl: r.source_url, verifiedAt: r.verified_at,
});

/**
 * Carga el grafo y los lugares desde Supabase. Si Supabase no está configurado, usa el paquete
 * local de demostración (solo lectura) y lo identifica con origin = 'local-demo'.
 */
export async function loadMobilityDataset(): Promise<MobilityDataset> {
  if (!isSupabaseConfigured) return buildDemoDataset();
  const sb = getSupabase();
  const [nodes, edges, places] = await Promise.all([
    run<NodeRow[]>((s) => sb.from('graph_nodes').select('id, latitude, longitude').abortSignal(s)),
    run<EdgeRow[]>((s) =>
      sb.from('graph_edges')
        .select('id, name, source_node_id, target_node_id, geometry, length_m, accessibility_status, surface_type, barrier_type, ramp_status, source_type, source_url, verified_at, notes')
        .order('id')
        .abortSignal(s),
    ),
    run<PlaceRow[]>((s) =>
      sb.from('places')
        .select('id, name, category, latitude, longitude, node_id, description, accessibility_status, ramp_status, source_type, source_url, verified_at')
        .order('name')
        .abortSignal(s),
    ),
  ]);
  return { origin: 'supabase', nodes: (nodes ?? []).map(mapNode), edges: (edges ?? []).map(mapEdge), places: (places ?? []).map(mapPlace) };
}

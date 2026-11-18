/**
 * Conversión de datos de OpenStreetMap (respuesta JSON de Overpass) a nodos y segmentos de MoviAcceso.
 * Regla: la geometría de OSM NO implica accesibilidad comprobada. Todo segmento importado queda con
 * accessibility_status = 'informacion_insuficiente' y source_type = 'osm'.
 */
import { lineStringLengthM } from '../src/features/routing/geo';
import type { BarrierType, GraphEdge, GraphNode, SurfaceType } from '../src/types/domain';

interface OsmNode { type: 'node'; id: number; lat: number; lon: number }
interface OsmWay { type: 'way'; id: number; nodes: number[]; tags?: Record<string, string> }
export interface OverpassResponse { elements: (OsmNode | OsmWay | { type: string })[] }

const SURFACES: Record<string, SurfaceType> = {
  asphalt: 'asfalto', concrete: 'concreto', 'concrete:plates': 'concreto', paving_stones: 'adoquin', sett: 'adoquin',
  cobblestone: 'adoquin', dirt: 'tierra', ground: 'tierra', earth: 'tierra', unpaved: 'tierra', gravel: 'tierra',
};

export function overpassToGraph(data: OverpassResponse): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const osmNodes = new Map<number, OsmNode>();
  const ways: OsmWay[] = [];
  for (const el of data.elements) {
    if (el.type === 'node') osmNodes.set((el as OsmNode).id, el as OsmNode);
    else if (el.type === 'way' && Array.isArray((el as OsmWay).nodes)) ways.push(el as OsmWay);
  }
  // Un nodo es vértice del grafo si es extremo de una vía o lo comparten varias vías (intersección).
  const usage = new Map<number, number>();
  for (const w of ways) for (const n of new Set(w.nodes)) usage.set(n, (usage.get(n) ?? 0) + 1);
  const isVertex = (w: OsmWay, i: number): boolean => i === 0 || i === w.nodes.length - 1 || (usage.get(w.nodes[i]!) ?? 0) > 1;

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  for (const w of ways) {
    let start = 0;
    let part = 0;
    for (let i = 1; i < w.nodes.length; i++) {
      if (!isVertex(w, i)) continue;
      const ids = w.nodes.slice(start, i + 1);
      const coords = ids.map((id) => osmNodes.get(id)).filter((n): n is OsmNode => !!n);
      if (coords.length === ids.length && ids[0] !== ids[ids.length - 1]) {
        const a = coords[0]!;
        const b = coords[coords.length - 1]!;
        for (const n of [a, b]) nodes.set(`osm-n${n.id}`, { id: `osm-n${n.id}`, lat: n.lat, lng: n.lon });
        const geometry = { type: 'LineString' as const, coordinates: coords.map((n) => [n.lon, n.lat] as [number, number]) };
        const tags = w.tags ?? {};
        const steps = tags.highway === 'steps';
        const barrier: BarrierType = steps ? 'escalon' : 'desconocida';
        edges.push({
          id: `osm-w${w.id}-${part++}`,
          name: (tags.name ? `${tags.name}` : `Vía OSM ${w.id}`).slice(0, 200),
          sourceNodeId: `osm-n${a.id}`,
          targetNodeId: `osm-n${b.id}`,
          geometry,
          lengthM: Math.round(lineStringLengthM(geometry) * 10) / 10,
          accessibilityStatus: 'informacion_insuficiente',
          surfaceType: SURFACES[tags.surface ?? ''] ?? 'desconocida',
          barrierType: barrier,
          rampStatus: 'desconocida',
          sourceType: 'osm',
          sourceUrl: `https://www.openstreetmap.org/way/${w.id}`,
          verifiedAt: null,
          notes: steps ? 'OSM indica escaleras (highway=steps). Pendiente de verificación en campo.' : 'Geometría de OpenStreetMap; accesibilidad sin verificar.',
        });
      }
      start = i;
    }
  }
  return { nodes: [...nodes.values()], edges: edges.filter((e) => e.lengthM > 0) };
}

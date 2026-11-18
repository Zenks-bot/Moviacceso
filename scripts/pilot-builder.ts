/**
 * Construye el conjunto de datos del piloto a partir de una respuesta de Overpass (OpenStreetMap).
 *
 * Transparencia:
 * - GEOMETRÍA (calles, intersecciones) y DESTINOS: reales, de OpenStreetMap (© colaboradores de OSM, ODbL).
 * - ESTADOS DE ACCESIBILIDAD de los tramos: SIMULADOS (source_type = 'simulado'), asignados de forma
 *   determinista para poder demostrar el motor de rutas. No describen el estado real de las veredas.
 * - Excepción: el tramo del Jr. San Martín documentado por la Contraloría (2023) se marca con fuente
 *   'oficial', su enlace y fecha. Refleja el hallazgo de esa fecha, no necesariamente el estado actual.
 * - Los lugares conservan su nombre de OSM; su accesibilidad queda como "información insuficiente".
 */
import { buildGraph } from '../src/features/routing/graph';
import { haversineM } from '../src/features/routing/geo';
import { RoutePlanner } from '../src/features/routing/planner';
import type { AccessibilityStatus, BarrierType, GraphEdge, GraphNode, PilotDataset, PilotZone, Place, PlaceCategory, RampStatus } from '../src/types/domain';
import { overpassToGraph, type OverpassResponse } from './osm-graph';

export type { PilotDataset, PilotZone };

export const CONTRALORIA_URL =
  'https://www.gob.pe/institucion/contraloria/noticias/753890-contraloria-advierte-deficiencias-en-construccion-de-pistas-y-veredas-en-calles-de-huanuco';
const CONTRALORIA_DATE = '2023-05-08T00:00:00Z';
const DEMO_VERIFIED_AT = '2026-11-01T00:00:00Z';

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/** Hash entero estable (FNV-1a) para asignar estados simulados de forma reproducible. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

const BARRIERS: BarrierType[] = ['rampa_obstruida', 'escalon', 'vereda_deteriorada', 'cruce_peligroso'];
const PENDING: BarrierType[] = ['vereda_deteriorada', 'obstaculo_temporal', 'escalon'];

function simulateStatus(edge: GraphEdge, isSteps: boolean): GraphEdge {
  const base = { ...edge, sourceType: 'simulado' as const };
  const osmNote: string | null = null; // la interfaz ya advierte que el estado es simulado y enlaza la geometría de OSM
  if (isSteps) {
    return { ...base, accessibilityStatus: 'barrera_verificada', barrierType: 'escalon', rampStatus: 'ausente', verifiedAt: DEMO_VERIFIED_AT, notes: 'OSM registra escaleras en este tramo (dato cartográfico real); la condición de barrera es una simulación para la demostración.' };
  }
  const r = hash(edge.id) % 100;
  let status: AccessibilityStatus;
  let barrier: BarrierType;
  let ramp: RampStatus;
  if (r < 7) { status = 'barrera_verificada'; barrier = BARRIERS[hash(edge.id + 'b') % BARRIERS.length]!; ramp = barrier === 'rampa_obstruida' ? 'obstruida' : 'desconocida'; }
  else if (r < 19) { status = 'comunitario_pendiente'; barrier = PENDING[hash(edge.id + 'p') % PENDING.length]!; ramp = 'desconocida'; }
  else if (r < 45) { status = 'informacion_insuficiente'; barrier = 'desconocida'; ramp = 'desconocida'; }
  else { status = 'accesible_verificado'; barrier = 'ninguna'; ramp = 'presente'; }
  const verified = status === 'accesible_verificado' || status === 'barrera_verificada';
  return { ...base, accessibilityStatus: status, barrierType: barrier, rampStatus: ramp, verifiedAt: verified ? DEMO_VERIFIED_AT : null, notes: osmNote };
}

/** Conserva la componente conexa más grande (evita islas inalcanzables). */
function largestComponent(nodes: GraphNode[], edges: GraphEdge[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const g = buildGraph(nodes, edges);
  const seen = new Set<string>();
  let best: Set<string> = new Set();
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    const comp = new Set<string>([n.id]);
    const stack = [n.id];
    seen.add(n.id);
    while (stack.length) {
      const cur = stack.pop()!;
      for (const { neighborId } of g.adjacency.get(cur) ?? []) {
        if (!seen.has(neighborId)) { seen.add(neighborId); comp.add(neighborId); stack.push(neighborId); }
      }
    }
    if (comp.size > best.size) best = comp;
  }
  return { nodes: nodes.filter((n) => best.has(n.id)), edges: edges.filter((e) => best.has(e.sourceNodeId) && best.has(e.targetNodeId)) };
}

interface OsmTagged { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string>; nodes?: number[] }

function poiCategory(t: Record<string, string>): PlaceCategory | null {
  const a = t.amenity ?? '';
  if (/^(hospital|clinic)$/.test(a)) return 'salud';
  if (/^(school|college|university)$/.test(a)) return 'educacion';
  if (a === 'marketplace' || t.shop === 'supermarket') return 'comercio';
  if (/^(library|townhall|police)$/.test(a)) return 'servicio_publico';
  if (t.amenity === 'bus_station' || t.highway === 'bus_stop' || /^(platform|stop_position)$/.test(t.public_transport ?? '')) return 'paradero';
  if (/^(park|square)$/.test(t.leisure ?? '') || t.place === 'square') return 'espacio_publico';
  return null;
}

const CATEGORY_QUOTA: Record<PlaceCategory, number> = { espacio_publico: 2, salud: 4, educacion: 3, comercio: 3, servicio_publico: 3, paradero: 3, otro: 0 };

/**
 * Busca el tramo del Jr. San Martín documentado por la Contraloría: entre su cruce con el Jr. Pedro Barroso
 * y el punto del Jr. San Martín más cercano a la Av. Alameda de la República (en OSM no se cruzan exactamente).
 * La ubicación resultante es APROXIMADA y así se declara en las notas del tramo.
 */
function findContraloriaEdges(edges: GraphEdge[], nodes: GraphNode[]): string[] {
  const base = (e: GraphEdge) => (e.name.split(',')[0] ?? '').replace(/\s*\(\d+\)$/, '');
  const byName = (re: RegExp) => edges.filter((e) => re.test(base(e)));
  const sanMartin = byName(/san mart[ií]n/i);
  const alameda = byName(/alameda de la rep/i);
  const nodesOf = (list: GraphEdge[]) => new Set(list.flatMap((e) => [e.sourceNodeId, e.targetNodeId]));
  const sm = nodesOf(sanMartin);
  const start = [...nodesOf(byName(/pedro barroso/i))].filter((n) => sm.has(n));
  if (!start.length || !alameda.length) return [];
  void nodes;
  const startSet = new Set(start);
  const alamedaPts = alameda.flatMap((e) => e.geometry.coordinates);
  // Tramo del Jr. San Martín que toca el cruce con Pedro Barroso y cuya geometría pasa más cerca de la Alameda.
  let best: string[] = [];
  let bestD = Infinity;
  for (const e of sanMartin) {
    if (!startSet.has(e.sourceNodeId) && !startSet.has(e.targetNodeId)) continue;
    let d = Infinity;
    for (const [x, y] of e.geometry.coordinates) for (const [ax, ay] of alamedaPts) d = Math.min(d, haversineM(y, x, ay, ax));
    if (d < bestD) { bestD = d; best = [e.id]; }
  }
  if (bestD > 150) return [];
  return best;
}

export function buildPilotDataset(data: OverpassResponse, opts: { center: { lat: number; lng: number }; source: string }): PilotDataset {
  const elements = data.elements as OsmTagged[];
  const highwayWays = elements.filter((e) => e.type === 'way' && Array.isArray(e.nodes) && e.tags?.highway);
  const stepsWays = new Set(highwayWays.filter((w) => w.tags?.highway === 'steps').map((w) => w.id));
  const raw = overpassToGraph({ elements: elements.filter((e) => e.type === 'node' || (e.type === 'way' && Array.isArray(e.nodes) && e.tags?.highway)) as OverpassResponse['elements'] });
  const comp = largestComponent(raw.nodes, raw.edges);

  const nodes = comp.nodes.map((n) => ({ id: n.id, lat: round6(n.lat), lng: round6(n.lng) }));
  let edges = comp.edges.map((e) => {
    const wayId = Number(/osm-w(\d+)-/.exec(e.id)?.[1]);
    const geometry = { type: 'LineString' as const, coordinates: e.geometry.coordinates.map(([x, y]) => [round6(x), round6(y)] as [number, number]) };
    return simulateStatus({ ...e, geometry }, stepsWays.has(wayId));
  });

  // Nombres legibles: «Calle, entre Transversal A y Transversal B» usando las calles reales que se cruzan.
  const namesAt = new Map<string, Set<string>>();
  for (const e of edges) for (const n of [e.sourceNodeId, e.targetNodeId]) {
    if (!namesAt.has(n)) namesAt.set(n, new Set());
    if (!/^Vía OSM/.test(e.name)) namesAt.get(n)!.add(e.name);
  }
  const counter = new Map<string, number>();
  edges = edges.map((e) => {
    const cross = (n: string) => [...(namesAt.get(n) ?? [])].find((x) => x !== e.name);
    const a = cross(e.sourceNodeId);
    const b = cross(e.targetNodeId);
    let name = e.name;
    if (a && b && a !== b) name = `${e.name}, entre ${a} y ${b}`;
    else if (a || b) name = `${e.name}, junto a ${a ?? b}`;
    const k = (counter.get(name) ?? 0) + 1;
    counter.set(name, k);
    return { ...e, name: (k > 1 ? `${name} (${k})` : name).slice(0, 200) };
  });

  const officialEdgeIds = findContraloriaEdges(edges, nodes);
  const official = new Set(officialEdgeIds);
  edges = edges.map((e) =>
    official.has(e.id)
      ? {
          ...e,
          accessibilityStatus: 'barrera_verificada',
          barrierType: 'escalon',
          rampStatus: 'obstruida',
          sourceType: 'oficial',
          sourceUrl: CONTRALORIA_URL,
          verifiedAt: CONTRALORIA_DATE,
          notes:
            'Contraloría General de la República (8 de mayo de 2023): en las cuadras 16 y 17 del Jr. San Martín se hallaron desniveles de 45 a 60 cm entre veredas y pavimento, y rampas para personas con discapacidad que no cumplen la normativa (desnivel mayor de 4 cm). Ubicación APROXIMADA: tramo del Jr. San Martín que parte de su cruce con el Jr. Pedro Barroso y pasa a menos de 100 m de la Av. Alameda de la República, según la geometría de OpenStreetMap. Hallazgo de 2023 durante una obra paralizada: verifique el estado actual.',
        }
      : e,
  );

  // Destinos reales (OSM), conectados al nodo más cercano del grafo.
  const used: Record<string, number> = {};
  const places: Place[] = [];
  const pois = elements
    .filter((e) => e.tags?.name || e.tags?.highway === 'bus_stop')
    .map((e) => ({ e, cat: e.tags ? poiCategory(e.tags) : null, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon }))
    .filter((p): p is { e: OsmTagged; cat: PlaceCategory; lat: number; lng: number } => !!p.cat && typeof p.lat === 'number' && typeof p.lng === 'number')
    .sort((x, y) => {
      const px = /plaza de armas/i.test(x.e.tags?.name ?? '') ? -1 : 0;
      const py = /plaza de armas/i.test(y.e.tags?.name ?? '') ? -1 : 0;
      return px - py || haversineM(x.lat, x.lng, opts.center.lat, opts.center.lng) - haversineM(y.lat, y.lng, opts.center.lat, opts.center.lng);
    });
  const seenNames = new Set<string>();
  for (const p of pois) {
    if ((used[p.cat] ?? 0) >= CATEGORY_QUOTA[p.cat]) continue;
    const name = p.e.tags?.name ?? 'Punto de parada sin nombre';
    if (seenNames.has(name.toLowerCase())) continue;
    let nearest: GraphNode | null = null;
    let d = Infinity;
    for (const n of nodes) {
      const dd = haversineM(p.lat, p.lng, n.lat, n.lng);
      if (dd < d) { d = dd; nearest = n; }
    }
    if (!nearest || d > 90) continue;
    seenNames.add(name.toLowerCase());
    used[p.cat] = (used[p.cat] ?? 0) + 1;
    const osmType = p.e.type === 'node' ? 'node' : p.e.type === 'way' ? 'way' : 'relation';
    places.push({
      id: `p-osm-${osmType[0]}${p.e.id}`,
      name: p.cat === 'paradero' ? (p.e.tags?.amenity === 'bus_station' ? `${name} (terminal de buses según OSM)` : `${name} (parada mapeada en OSM, no verificada como oficial)`) : name,
      category: p.cat,
      lat: round6(p.lat),
      lng: round6(p.lng),
      nodeId: nearest.id,
      description: `Lugar real según OpenStreetMap (${osmType}/${p.e.id}). Ubicación de OSM; su accesibilidad no ha sido verificada.`,
      accessibilityStatus: 'informacion_insuficiente',
      rampStatus: 'desconocida',
      sourceType: 'osm',
      sourceUrl: `https://www.openstreetmap.org/${osmType}/${p.e.id}`,
      verifiedAt: null,
    });
  }

  // Zonas: cuadrantes alrededor del centro, que cubren todo el grafo (con margen).
  const lats = nodes.map((n) => n.lat);
  const lngs = nodes.map((n) => n.lng);
  const m = 0.0008;
  const minLat = round6(Math.min(...lats) - m), maxLat = round6(Math.max(...lats) + m);
  const minLng = round6(Math.min(...lngs) - m), maxLng = round6(Math.max(...lngs) + m);
  const cLat = round6(opts.center.lat), cLng = round6(opts.center.lng);
  const zones: PilotZone[] = [
    { id: 'z-no', name: 'Sector piloto noroeste', minLat: cLat, maxLat, minLng, maxLng: cLng },
    { id: 'z-ne', name: 'Sector piloto noreste', minLat: cLat, maxLat, minLng: cLng, maxLng },
    { id: 'z-so', name: 'Sector piloto suroeste', minLat, maxLat: cLat, minLng, maxLng: cLng },
    { id: 'z-se', name: 'Sector piloto sureste', minLat, maxLat: cLat, minLng: cLng, maxLng },
  ];

  // Escenario de demostración: la ruta general cruza una barrera y la adaptada la evita.
  const planner = new RoutePlanner({ nodes, edges, places });
  let scenario: PilotDataset['scenario'] = null;
  let bestScore = -Infinity;
  const plaza = places.find((p) => /plaza de armas/i.test(p.name));
  const origins = plaza ? [plaza, ...places.filter((p) => p !== plaza)] : places;
  for (const o of origins) for (const d of places) {
    if (o.id === d.id || o.nodeId === d.nodeId) continue;
    const g = planner.plan(o.id, d.id, { profile: 'general', includeDemoData: true });
    const r = planner.plan(o.id, d.id, { profile: 'movilidad_reducida', includeDemoData: true });
    if (g.kind !== 'found' || r.kind !== 'found' || g.verdict !== 'con_barreras') continue;
    if (r.segments.some((s) => s.effectiveStatus === 'barrera_verificada')) continue;
    if (g.totalLengthM < 250 || g.totalLengthM > 1200) continue;
    const score = (o === plaza ? 1000 : 0) + (d.category === 'salud' ? 300 : 0) - Math.abs(g.totalLengthM - 500) / 10;
    if (score > bestScore) { bestScore = score; scenario = { originId: o.id, destinationId: d.id }; }
  }

  return { generatedFrom: opts.source, center: { lat: cLat, lng: cLng }, zones, nodes, edges, places, scenario, officialEdgeIds };
}

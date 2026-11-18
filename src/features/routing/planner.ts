import type { AccessibilityStatus, GraphEdge, MobilityDataset, Place } from '../../types/domain';
import { isSimulated } from '../../types/domain';
import { dijkstra, type PathStep } from './dijkstra';
import { buildGraph, type MobilityGraph } from './graph';
import { edgeCost, effectiveStatus, type RouteOptions } from './profiles';

/**
 * Veredicto del trayecto según la evidencia disponible:
 * - verificada: todos los segmentos tienen accesibilidad verificada con datos reales (no simulados).
 * - demostrativa: cumple los criterios solo gracias a datos de demostración; NO es evidencia real.
 * - con_barreras: incluye al menos un segmento con barrera (verificada o, en modo demo, simulada).
 * - sin_confirmar: incluye segmentos con información insuficiente o pendiente de verificación.
 */
export type RouteVerdict = 'verificada' | 'demostrativa' | 'con_barreras' | 'sin_confirmar';

export interface RouteSegment {
  index: number;
  edge: GraphEdge;
  fromNodeId: string;
  toNodeId: string;
  /** Coordenadas [lat, lng] orientadas en el sentido del recorrido. */
  path: [number, number][];
  effectiveStatus: AccessibilityStatus;
  simulated: boolean;
}

export interface EvidenceBreakdown {
  verifiedRealM: number;
  verifiedDemoM: number;
  unconfirmedM: number;
  barrierM: number;
}

export type RouteResult =
  | { kind: 'invalid'; reason: 'same_place' | 'unknown_place' | 'place_without_node' }
  | { kind: 'not_found'; options: RouteOptions }
  | {
      kind: 'found';
      options: RouteOptions;
      origin: Place;
      destination: Place;
      segments: RouteSegment[];
      totalLengthM: number;
      verdict: RouteVerdict;
      evidence: EvidenceBreakdown;
      /** Porcentaje (0-100) de la longitud con accesibilidad verificada por datos reales. */
      verifiedSharePct: number;
    };

export const NO_VERIFIED_ROUTE_MESSAGE =
  'No encontramos un trayecto con accesibilidad verificada entre estos puntos. Esto no significa necesariamente que no exista, sino que faltan datos suficientes.';

export const ROUTE_DISCLAIMER =
  'Información referencial. Las condiciones físicas pueden cambiar. Verifique las condiciones del entorno antes de desplazarse.';

function orientPath(edge: GraphEdge, fromNodeId: string): [number, number][] {
  const latLngs = edge.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  return edge.sourceNodeId === fromNodeId ? latLngs : latLngs.reverse();
}

export function classifyRoute(segments: RouteSegment[]): { verdict: RouteVerdict; evidence: EvidenceBreakdown } {
  const evidence: EvidenceBreakdown = { verifiedRealM: 0, verifiedDemoM: 0, unconfirmedM: 0, barrierM: 0 };
  for (const s of segments) {
    const len = s.edge.lengthM;
    if (s.effectiveStatus === 'barrera_verificada') evidence.barrierM += len;
    else if (s.effectiveStatus === 'accesible_verificado') {
      if (s.simulated) evidence.verifiedDemoM += len;
      else evidence.verifiedRealM += len;
    } else evidence.unconfirmedM += len;
  }
  let verdict: RouteVerdict;
  if (evidence.barrierM > 0) verdict = 'con_barreras';
  else if (evidence.unconfirmedM > 0) verdict = 'sin_confirmar';
  else if (evidence.verifiedDemoM > 0) verdict = 'demostrativa';
  else verdict = 'verificada';
  return { verdict, evidence };
}

export class RoutePlanner {
  private readonly graph: MobilityGraph;
  private readonly places: Map<string, Place>;

  constructor(dataset: Pick<MobilityDataset, 'nodes' | 'edges' | 'places'>) {
    this.graph = buildGraph(dataset.nodes, dataset.edges);
    this.places = new Map(dataset.places.map((p) => [p.id, p]));
  }

  plan(originPlaceId: string, destinationPlaceId: string, options: RouteOptions): RouteResult {
    if (originPlaceId === destinationPlaceId) return { kind: 'invalid', reason: 'same_place' };
    const origin = this.places.get(originPlaceId);
    const destination = this.places.get(destinationPlaceId);
    if (!origin || !destination) return { kind: 'invalid', reason: 'unknown_place' };
    if (!origin.nodeId || !destination.nodeId) return { kind: 'invalid', reason: 'place_without_node' };
    if (origin.nodeId === destination.nodeId) return { kind: 'invalid', reason: 'same_place' };

    const steps: PathStep[] | null = dijkstra(this.graph, origin.nodeId, destination.nodeId, (edge) =>
      edgeCost(edge, options),
    );
    if (!steps || steps.length === 0) return { kind: 'not_found', options };

    const segments: RouteSegment[] = steps.map((step, index) => ({
      index,
      edge: step.edge,
      fromNodeId: step.fromNodeId,
      toNodeId: step.toNodeId,
      path: orientPath(step.edge, step.fromNodeId),
      effectiveStatus: effectiveStatus(step.edge, options.includeDemoData),
      simulated: isSimulated(step.edge.sourceType),
    }));

    // Distancia total = suma de las longitudes de los segmentos reales del grafo.
    const totalLengthM = segments.reduce((sum, s) => sum + s.edge.lengthM, 0);
    const { verdict, evidence } = classifyRoute(segments);

    // Salvaguarda: el perfil estricto solo puede devolver rutas verificadas o demostrativas.
    if (options.profile === 'estricto' && verdict !== 'verificada' && verdict !== 'demostrativa') {
      return { kind: 'not_found', options };
    }

    return {
      kind: 'found',
      options,
      origin,
      destination,
      segments,
      totalLengthM,
      verdict,
      evidence,
      verifiedSharePct: totalLengthM > 0 ? (evidence.verifiedRealM / totalLengthM) * 100 : 0,
    };
  }
}

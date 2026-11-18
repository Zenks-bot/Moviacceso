import type { GraphEdge, GraphNode } from '../../types/domain';

export interface Adjacency {
  edge: GraphEdge;
  neighborId: string;
}

export interface MobilityGraph {
  nodes: Map<string, GraphNode>;
  adjacency: Map<string, Adjacency[]>;
}

/**
 * Construye un grafo no dirigido. Los segmentos que referencian nodos inexistentes
 * se descartan: nunca se inventan conexiones.
 */
export function buildGraph(nodes: GraphNode[], edges: GraphEdge[]): MobilityGraph {
  const nodeMap = new Map<string, GraphNode>();
  for (const node of nodes) nodeMap.set(node.id, node);

  const adjacency = new Map<string, Adjacency[]>();
  for (const node of nodes) adjacency.set(node.id, []);

  for (const edge of edges) {
    if (!nodeMap.has(edge.sourceNodeId) || !nodeMap.has(edge.targetNodeId)) continue;
    if (edge.sourceNodeId === edge.targetNodeId) continue;
    adjacency.get(edge.sourceNodeId)?.push({ edge, neighborId: edge.targetNodeId });
    adjacency.get(edge.targetNodeId)?.push({ edge, neighborId: edge.sourceNodeId });
  }
  return { nodes: nodeMap, adjacency };
}

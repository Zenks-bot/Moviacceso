import type { GraphEdge } from '../../types/domain';
import type { MobilityGraph } from './graph';

export interface PathStep {
  edge: GraphEdge;
  fromNodeId: string;
  toNodeId: string;
}

export type CostFn = (edge: GraphEdge) => number | null;

/** Cola de prioridad mínima (montículo binario). */
class MinHeap {
  private items: { id: string; cost: number }[] = [];
  get size(): number {
    return this.items.length;
  }
  push(id: string, cost: number): void {
    this.items.push({ id, cost });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const p = this.items[parent];
      const c = this.items[i];
      if (!p || !c || p.cost <= c.cost) break;
      this.items[parent] = c;
      this.items[i] = p;
      i = parent;
    }
  }
  pop(): { id: string; cost: number } | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let smallest = i;
        const s = (): { id: string; cost: number } => this.items[smallest]!;
        if (l < this.items.length && this.items[l]!.cost < s().cost) smallest = l;
        if (r < this.items.length && this.items[r]!.cost < s().cost) smallest = r;
        if (smallest === i) break;
        const tmp = this.items[i]!;
        this.items[i] = this.items[smallest]!;
        this.items[smallest] = tmp;
        i = smallest;
      }
    }
    return top;
  }
}

/**
 * Algoritmo de Dijkstra sobre el grafo registrado.
 * Devuelve la secuencia de segmentos de menor costo o null si no existe camino
 * con los segmentos permitidos (costFn devuelve null para excluir un segmento).
 */
export function dijkstra(graph: MobilityGraph, startId: string, goalId: string, costFn: CostFn): PathStep[] | null {
  if (!graph.nodes.has(startId) || !graph.nodes.has(goalId)) return null;
  if (startId === goalId) return [];

  const dist = new Map<string, number>([[startId, 0]]);
  const prev = new Map<string, PathStep>();
  const visited = new Set<string>();
  const heap = new MinHeap();
  heap.push(startId, 0);

  while (heap.size > 0) {
    const current = heap.pop();
    if (!current) break;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    if (current.id === goalId) break;

    for (const { edge, neighborId } of graph.adjacency.get(current.id) ?? []) {
      if (visited.has(neighborId)) continue;
      const cost = costFn(edge);
      if (cost === null || !Number.isFinite(cost) || cost < 0) continue;
      const candidate = current.cost + cost;
      if (candidate < (dist.get(neighborId) ?? Infinity)) {
        dist.set(neighborId, candidate);
        prev.set(neighborId, { edge, fromNodeId: current.id, toNodeId: neighborId });
        heap.push(neighborId, candidate);
      }
    }
  }

  if (!prev.has(goalId)) return null;
  const steps: PathStep[] = [];
  let cursor = goalId;
  while (cursor !== startId) {
    const step = prev.get(cursor);
    if (!step) return null;
    steps.unshift(step);
    cursor = step.fromNodeId;
  }
  return steps;
}

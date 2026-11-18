import { describe, expect, it } from 'vitest';
import { RoutePlanner } from '../src/features/routing/planner';
import { overpassToGraph } from './osm-graph';

const fixture = {
  elements: [
    { type: 'node', id: 1, lat: -9.929, lon: -76.241 },
    { type: 'node', id: 2, lat: -9.929, lon: -76.240 },
    { type: 'node', id: 3, lat: -9.929, lon: -76.239 },
    { type: 'node', id: 4, lat: -9.930, lon: -76.240 },
    { type: 'way', id: 10, nodes: [1, 2, 3], tags: { highway: 'footway', surface: 'paving_stones', name: 'Vía de prueba' } },
    { type: 'way', id: 11, nodes: [2, 4], tags: { highway: 'steps' } },
  ],
};

describe('overpassToGraph', () => {
  const g = overpassToGraph(fixture);
  it('divide las vías en las intersecciones', () => {
    expect(g.edges.map((e) => e.id).sort()).toEqual(['osm-w10-0', 'osm-w10-1', 'osm-w11-0']);
    expect(g.nodes).toHaveLength(4);
  });
  it('nunca marca como accesible verificado un dato de OSM', () => {
    expect(g.edges.every((e) => e.accessibilityStatus === 'informacion_insuficiente' && e.sourceType === 'osm')).toBe(true);
    expect(g.edges.find((e) => e.id === 'osm-w11-0')?.barrierType).toBe('escalon');
    expect(g.edges.find((e) => e.id === 'osm-w10-0')?.surfaceType).toBe('adoquin');
  });
  it('produce un grafo utilizable por el motor de rutas', () => {
    const place = (id: string, nodeId: string) => ({ id, name: id, category: 'otro' as const, lat: 0, lng: 0, nodeId, description: '', accessibilityStatus: 'informacion_insuficiente' as const, rampStatus: 'desconocida' as const, sourceType: 'inspeccion' as const, sourceUrl: null, verifiedAt: null });
    const p = new RoutePlanner({ ...g, places: [place('a', 'osm-n1'), place('b', 'osm-n4')] });
    const r = p.plan('a', 'b', { profile: 'general', includeDemoData: false });
    expect(r.kind === 'found' && r.verdict).toBe('sin_confirmar');
    expect(p.plan('a', 'b', { profile: 'estricto', includeDemoData: false }).kind).toBe('not_found');
  });
});

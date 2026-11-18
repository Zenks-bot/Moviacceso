import { describe, expect, it } from 'vitest';
import full from '../../data/pilot-dataset.json';
import { DEMO_SCENARIO, OFFICIAL_EDGE_IDS, toMobilityDataset } from '../../data/demo-dataset';
import type { PilotDataset } from '../../types/domain';
import type { GraphEdge, GraphNode, Place } from '../../types/domain';
import { buildGraph } from './graph';
import { dijkstra } from './dijkstra';
import { haversineM, lineStringLengthM } from './geo';
import { RoutePlanner } from './planner';
import { effectiveStatus } from './profiles';

/** Grafo pequeño con datos "reales" (no simulados) para probar reglas de evidencia. */
function fixture(): { nodes: GraphNode[]; edges: GraphEdge[]; places: Place[] } {
  const nodes: GraphNode[] = [
    { id: 'a', lat: 0, lng: 0 },
    { id: 'b', lat: 0, lng: 0.001 },
    { id: 'c', lat: 0, lng: 0.002 },
    { id: 'd', lat: 0.001, lng: 0.001 },
    { id: 'x', lat: 1, lng: 1 }, // aislado
  ];
  const edge = (id: string, s: string, t: string, status: GraphEdge['accessibilityStatus'], source: GraphEdge['sourceType'] = 'inspeccion'): GraphEdge => {
    const ns = nodes.find((n) => n.id === s)!;
    const nt = nodes.find((n) => n.id === t)!;
    const geometry = { type: 'LineString' as const, coordinates: [[ns.lng, ns.lat], [nt.lng, nt.lat]] as [number, number][] };
    return {
      id, name: id, sourceNodeId: s, targetNodeId: t, geometry, lengthM: lineStringLengthM(geometry),
      accessibilityStatus: status, surfaceType: 'concreto', barrierType: 'ninguna', rampStatus: 'presente',
      sourceType: source, sourceUrl: null, verifiedAt: '2026-10-01T00:00:00Z', notes: null,
    };
  };
  const edges = [
    edge('ab', 'a', 'b', 'accesible_verificado'),
    edge('bc', 'b', 'c', 'barrera_verificada'), // directo pero con barrera
    edge('bd', 'b', 'd', 'accesible_verificado'),
    edge('dc', 'd', 'c', 'accesible_verificado'),
  ];
  const place = (id: string, nodeId: string): Place => ({
    id, name: id, category: 'otro', lat: 0, lng: 0, nodeId, description: '', accessibilityStatus: 'informacion_insuficiente',
    rampStatus: 'desconocida', sourceType: 'inspeccion', sourceUrl: null, verifiedAt: null,
  });
  return { nodes, edges, places: [place('PA', 'a'), place('PC', 'c'), place('PX', 'x'), place('PB', 'b')] };
}

describe('geometría', () => {
  it('calcula distancias haversine razonables (~111 m por milésima de grado en el ecuador)', () => {
    expect(haversineM(0, 0, 0, 0.001)).toBeCloseTo(111.2, 0);
  });
  it('mide la longitud de la LineString completa, no la línea recta', () => {
    const recta = { type: 'LineString' as const, coordinates: [[0, 0], [0.002, 0]] as [number, number][] };
    const quebrada = { type: 'LineString' as const, coordinates: [[0, 0], [0.001, 0.001], [0.002, 0]] as [number, number][] };
    expect(lineStringLengthM(quebrada)).toBeGreaterThan(lineStringLengthM(recta));
  });
});

describe('Dijkstra', () => {
  it('devuelve null si no hay camino (no inventa conexiones)', () => {
    const { nodes, edges } = fixture();
    expect(dijkstra(buildGraph(nodes, edges), 'a', 'x', (e) => e.lengthM)).toBeNull();
  });
  it('descarta segmentos que referencian nodos inexistentes', () => {
    const { nodes, edges } = fixture();
    const roto = { ...edges[0]!, id: 'roto', sourceNodeId: 'a', targetNodeId: 'fantasma' };
    const g = buildGraph(nodes, [...edges, roto]);
    expect(g.adjacency.get('a')?.map((x) => x.edge.id)).toEqual(['ab']);
  });
});

describe('RoutePlanner — reglas de evidencia', () => {
  it('Prueba 2: encuentra el trayecto entre dos puntos conectados y suma la longitud de los segmentos', () => {
    const p = new RoutePlanner(fixture());
    const r = p.plan('PA', 'PC', { profile: 'general', includeDemoData: false });
    expect(r.kind).toBe('found');
    if (r.kind !== 'found') return;
    expect(r.segments.map((s) => s.edge.id)).toEqual(['ab', 'bc']);
    expect(r.totalLengthM).toBeCloseTo(r.segments.reduce((s, x) => s + x.edge.lengthM, 0));
    expect(r.verdict).toBe('con_barreras');
  });

  it('Prueba 3: informa que no hay trayecto con un destino desconectado', () => {
    const r = new RoutePlanner(fixture()).plan('PA', 'PX', { profile: 'general', includeDemoData: true });
    expect(r.kind).toBe('not_found');
  });

  it('Prueba 4: excluye barreras verificadas en el perfil estricto', () => {
    const r = new RoutePlanner(fixture()).plan('PA', 'PC', { profile: 'estricto', includeDemoData: false });
    expect(r.kind).toBe('found');
    if (r.kind !== 'found') return;
    expect(r.segments.map((s) => s.edge.id)).toEqual(['ab', 'bd', 'dc']);
    expect(r.segments.some((s) => s.effectiveStatus === 'barrera_verificada')).toBe(false);
    expect(r.verdict).toBe('verificada');
    expect(r.verifiedSharePct).toBeCloseTo(100);
  });

  it('Prueba 4b: también excluye barreras verificadas en el perfil de movilidad reducida', () => {
    const r = new RoutePlanner(fixture()).plan('PA', 'PC', { profile: 'movilidad_reducida', includeDemoData: false });
    expect(r.kind === 'found' && r.segments.every((s) => s.edge.id !== 'bc')).toBe(true);
  });

  it('Prueba 5: un segmento con información insuficiente no se presenta como accesible confirmado', () => {
    const f = fixture();
    f.edges = f.edges.map((e) => (e.id === 'dc' ? { ...e, accessibilityStatus: 'informacion_insuficiente' as const } : e));
    const p = new RoutePlanner(f);
    expect(p.plan('PA', 'PC', { profile: 'estricto', includeDemoData: false }).kind).toBe('not_found');
    const reducida = p.plan('PA', 'PC', { profile: 'movilidad_reducida', includeDemoData: false });
    expect(reducida.kind).toBe('found');
    if (reducida.kind === 'found') expect(reducida.verdict).toBe('sin_confirmar');
  });

  it('los datos simulados no son evidencia real', () => {
    const f = fixture();
    f.edges = f.edges.map((e) => ({ ...e, sourceType: 'simulado' as const }));
    expect(effectiveStatus(f.edges[0]!, false)).toBe('informacion_insuficiente');
    const p = new RoutePlanner(f);
    expect(p.plan('PA', 'PC', { profile: 'estricto', includeDemoData: false }).kind).toBe('not_found');
    const demo = p.plan('PA', 'PC', { profile: 'estricto', includeDemoData: true });
    expect(demo.kind).toBe('found');
    if (demo.kind === 'found') {
      expect(demo.verdict).toBe('demostrativa');
      expect(demo.verifiedSharePct).toBe(0);
    }
  });

  it('rechaza origen y destino iguales', () => {
    expect(new RoutePlanner(fixture()).plan('PA', 'PA', { profile: 'general', includeDemoData: true })).toEqual({ kind: 'invalid', reason: 'same_place' });
  });

  it('orienta la geometría en el sentido del recorrido', () => {
    const r = new RoutePlanner(fixture()).plan('PC', 'PA', { profile: 'general', includeDemoData: false });
    if (r.kind !== 'found') throw new Error('esperaba ruta');
    expect(r.segments[0]!.path[0]).toEqual([0, 0.002]);
  });
});

describe('Conjunto del piloto (geometría OSM, estados simulados)', () => {
  const ds = toMobilityDataset(full as unknown as PilotDataset);
  const p = new RoutePlanner(ds);
  const official = new Set(OFFICIAL_EDGE_IDS);

  it('los estados de los tramos son simulados salvo los tramos con fuente oficial', () => {
    expect(ds.edges.length).toBeGreaterThan(50);
    for (const e of ds.edges) expect(e.sourceType).toBe(official.has(e.id) ? 'oficial' : 'simulado');
  });

  it('los lugares provienen de OSM y su accesibilidad no se declara verificada', () => {
    expect(ds.places.length).toBeGreaterThan(3);
    for (const x of ds.places) {
      expect(x.sourceType).toBe('osm');
      expect(x.accessibilityStatus).toBe('informacion_insuficiente');
      expect(x.sourceUrl).toMatch(/^https:\/\/www\.openstreetmap\.org\//);
    }
  });

  it('todos los segmentos referencian nodos existentes y tienen longitud positiva', () => {
    const ids = new Set(ds.nodes.map((n) => n.id));
    for (const e of ds.edges) {
      expect(ids.has(e.sourceNodeId) && ids.has(e.targetNodeId)).toBe(true);
      expect(e.lengthM).toBeGreaterThan(0);
    }
  });

  it('existe un escenario donde la ruta general cruza una barrera y la adaptada la evita', () => {
    expect(DEMO_SCENARIO).not.toBeNull();
    const { originId, destinationId } = DEMO_SCENARIO!;
    const general = p.plan(originId, destinationId, { profile: 'general', includeDemoData: true });
    const adaptada = p.plan(originId, destinationId, { profile: 'movilidad_reducida', includeDemoData: true });
    if (general.kind !== 'found' || adaptada.kind !== 'found') throw new Error('esperaba rutas');
    expect(general.verdict).toBe('con_barreras');
    expect(adaptada.segments.some((x) => x.effectiveStatus === 'barrera_verificada')).toBe(false);
    expect(adaptada.totalLengthM).toBeGreaterThanOrEqual(general.totalLengthM);
  });

  it('sin datos de demostración no hay ninguna ruta verificada (no existe evidencia real de accesibilidad)', () => {
    const { originId, destinationId } = DEMO_SCENARIO!;
    expect(p.plan(originId, destinationId, { profile: 'estricto', includeDemoData: false }).kind).toBe('not_found');
  });

  it('los tramos oficiales (Contraloría) siguen siendo barrera aunque se desactiven los datos demo', () => {
    for (const id of OFFICIAL_EDGE_IDS) {
      const e = ds.edges.find((x) => x.id === id)!;
      expect(e.accessibilityStatus).toBe('barrera_verificada');
      expect(e.verifiedAt).toBeTruthy();
      expect(e.sourceUrl).toMatch(/contraloria/);
    }
  });
});

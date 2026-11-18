/**
 * Importa geometría real de OpenStreetMap para el sector piloto.
 *
 * 1. Descargue datos con Overpass (respetando su política de uso), por ejemplo:
 *    curl -s https://overpass-api.de/api/interpreter --data-urlencode 'data=[out:json][timeout:60];
 *      way["highway"~"^(footway|pedestrian|path|steps|living_street|residential|tertiary|secondary|primary|unclassified|service)$"]
 *      (-9.9338,-76.2439,-9.9257,-76.2358);(._;>;);out body;' > osm-huanuco.json
 * 2. npm run osm:import -- osm-huanuco.json
 * 3. Revise supabase/osm-import.sql y ejecútelo en el editor SQL de Supabase.
 *
 * Los segmentos importados quedan como "información insuficiente": OSM no certifica accesibilidad.
 * Los lugares (places) deben agregarse manualmente con coordenadas comprobadas y asociarse a un nodo.
 * Datos © colaboradores de OpenStreetMap, licencia ODbL.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { overpassToGraph, type OverpassResponse } from './osm-graph';

const input = process.argv[2];
if (!input) {
  console.error('Uso: npm run osm:import -- <archivo-overpass.json>');
  process.exit(1);
}
const data = JSON.parse(readFileSync(input, 'utf8')) as OverpassResponse;
const { nodes, edges } = overpassToGraph(data);
const q = (v: string | null): string => (v === null ? 'null' : `'${v.replace(/'/g, "''")}'`);
const sql = [
  '-- Importación de OpenStreetMap (© colaboradores de OpenStreetMap, ODbL). Generado por scripts/osm-to-dataset.ts',
  'begin;',
  'insert into public.graph_nodes (id, latitude, longitude) values',
  nodes.map((n) => `  (${q(n.id)}, ${n.lat}, ${n.lng})`).join(',\n') + '\non conflict (id) do update set latitude = excluded.latitude, longitude = excluded.longitude;',
  'insert into public.graph_edges (id, name, source_node_id, target_node_id, geometry, length_m, accessibility_status, surface_type, barrier_type, ramp_status, source_type, source_url, verified_at, notes) values',
  edges.map((e) => `  (${q(e.id)}, ${q(e.name)}, ${q(e.sourceNodeId)}, ${q(e.targetNodeId)}, ${q(JSON.stringify(e.geometry))}::jsonb, ${e.lengthM}, ${q(e.accessibilityStatus)}, ${q(e.surfaceType)}, ${q(e.barrierType)}, ${q(e.rampStatus)}, ${q(e.sourceType)}, ${q(e.sourceUrl)}, null, ${q(e.notes)})`).join(',\n') +
    '\non conflict (id) do nothing;',
  'commit;',
  '',
].join('\n');
const out = resolve(import.meta.dirname, '../supabase/osm-import.sql');
writeFileSync(out, sql, 'utf8');
console.log(`Generado ${out}: ${nodes.length} nodos, ${edges.length} segmentos (todos con accesibilidad sin verificar).`);

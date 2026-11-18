/**
 * Genera supabase/seed.sql a partir de src/data/demo-dataset.ts (fuente única de los datos de demostración).
 * Uso: npm run seed:generate
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDemoDataset, PILOT_ZONES } from '../src/data/demo-dataset';

const q = (v: string | null): string => (v === null ? 'null' : `'${v.replace(/'/g, "''")}'`);
const n = (v: number): string => (Number.isFinite(v) ? String(v) : 'null');

const ds = buildDemoDataset();
const lines: string[] = [
  '-- =============================================================================',
  '-- MoviAcceso — DATOS DE DEMOSTRACIÓN (generado por scripts/generate-seed.ts; no editar a mano)',
  '-- Todo el grafo y los lugares tienen source_type = \'simulado\'. Los reportes tienen is_demo = true.',
  '-- La geometría es una cuadrícula esquemática; NO describe el estado real de la infraestructura.',
  '-- =============================================================================',
  'begin;',
  '',
  'insert into public.pilot_zones (id, name, min_lat, max_lat, min_lng, max_lng) values',
  PILOT_ZONES.map((z) => `  (${q(z.id)}, ${q(z.name)}, ${n(z.minLat)}, ${n(z.maxLat)}, ${n(z.minLng)}, ${n(z.maxLng)})`).join(',\n') +
    '\non conflict (id) do nothing;',
  '',
  'insert into public.graph_nodes (id, latitude, longitude) values',
  ds.nodes.map((x) => `  (${q(x.id)}, ${n(x.lat)}, ${n(x.lng)})`).join(',\n') + '\non conflict (id) do nothing;',
  '',
  'insert into public.graph_edges (id, name, source_node_id, target_node_id, geometry, length_m, accessibility_status, surface_type, barrier_type, ramp_status, source_type, source_url, verified_at, notes) values',
  ds.edges
    .map(
      (e) =>
        `  (${q(e.id)}, ${q(e.name)}, ${q(e.sourceNodeId)}, ${q(e.targetNodeId)}, ${q(JSON.stringify(e.geometry))}::jsonb, ${n(e.lengthM)}, ${q(e.accessibilityStatus)}, ${q(e.surfaceType)}, ${q(e.barrierType)}, ${q(e.rampStatus)}, ${q(e.sourceType)}, ${q(e.sourceUrl)}, ${q(e.verifiedAt)}, ${q(e.notes)})`,
    )
    .join(',\n') + '\non conflict (id) do nothing;',
  '',
  'insert into public.places (id, name, category, latitude, longitude, node_id, description, accessibility_status, ramp_status, source_type, source_url, verified_at) values',
  ds.places
    .map(
      (p) =>
        `  (${q(p.id)}, ${q(p.name)}, ${q(p.category)}, ${n(p.lat)}, ${n(p.lng)}, ${q(p.nodeId)}, ${q(p.description)}, ${q(p.accessibilityStatus)}, ${q(p.rampStatus)}, ${q(p.sourceType)}, ${q(p.sourceUrl)}, ${q(p.verifiedAt)})`,
    )
    .join(',\n') + '\non conflict (id) do nothing;',
  '',
  '-- Reportes de demostración (is_demo = true): ilustran el panel; no son reportes de ciudadanos reales.',
];

const edgeMid = (id: string): [number, number] => {
  const e = ds.edges.find((x) => x.id === id);
  if (!e) throw new Error(id);
  const [a, b] = [e.geometry.coordinates[0]!, e.geometry.coordinates[e.geometry.coordinates.length - 1]!];
  return [Math.round(((a[1] + b[1]) / 2) * 1e6) / 1e6, Math.round(((a[0] + b[0]) / 2) * 1e6) / 1e6];
};
const demoReports: { edge: string; cat: string; desc: string; sev: number; mod: string; ver: string; days: number; reason?: string }[] = [
  { edge: 'e-h-r1c0', cat: 'vereda_deteriorada', desc: '[DEMO] Vereda con losetas levantadas a mitad de cuadra.', sev: 3, mod: 'aprobado', ver: 'sin_verificar', days: 40 },
  { edge: 'e-h-r3c2', cat: 'desnivel_escalon', desc: '[DEMO] Escalón de aproximadamente 20 cm sin rampa en la esquina.', sev: 4, mod: 'aprobado', ver: 'sin_verificar', days: 26 },
  { edge: 'e-v-r2c1', cat: 'otro', desc: '[DEMO] Materiales de construcción ocupan la vereda.', sev: 3, mod: 'resuelto', ver: 'verificado_en_campo', days: 19 },
  { edge: 'e-h-r2c2', cat: 'rampa_obstruida', desc: '[DEMO] Vehículo estacionado frente a la rampa de la esquina.', sev: 5, mod: 'aprobado', ver: 'verificado_en_campo', days: 12 },
  { edge: 'e-v-r1c3', cat: 'acceso_paradero', desc: '[DEMO] Poste ubicado en el acceso al punto de parada demostrativo.', sev: 2, mod: 'pendiente', ver: 'sin_verificar', days: 5 },
  { edge: 'e-h-r0c1', cat: 'cruce_problematico', desc: '[DEMO] Cruce sin marcas visibles y con tiempo de semáforo corto.', sev: 3, mod: 'rechazado', ver: 'sin_verificar', days: 3, reason: 'Duplicado de otro reporte de demostración.' },
];
lines.push(
  'insert into public.reports (graph_edge_id, latitude, longitude, category, description, severity, moderation_status, verification_status, rejection_reason, is_demo, created_at) values',
  demoReports
    .map((r) => {
      const [lat, lng] = edgeMid(r.edge);
      return `  (${q(r.edge)}, ${lat}, ${lng}, ${q(r.cat)}, ${q(r.desc)}, ${r.sev}, ${q(r.mod)}, ${q(r.ver)}, ${q(r.reason ?? null)}, true, now() - interval '${r.days} days')`;
    })
    .join(',\n') + ';',
  '',
  'commit;',
  '',
);

const out = resolve(import.meta.dirname, '../supabase/seed.sql');
writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`seed.sql generado: ${ds.nodes.length} nodos, ${ds.edges.length} segmentos, ${ds.places.length} lugares, ${demoReports.length} reportes demo.`);

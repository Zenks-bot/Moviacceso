/**
 * Genera src/data/pilot-dataset.json a partir de datos de OpenStreetMap.
 *
 *   npm run pilot:build -- --download      # descarga de la API de OSM y guarda data/osm/osm-api-centro.json
 *   npm run pilot:build                    # reutiliza el archivo descargado
 *
 * Datos © colaboradores de OpenStreetMap (ODbL). Respete la política de uso de la API de OSM (descargas puntuales y pequeñas).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildPilotDataset } from './pilot-builder';
import type { OverpassResponse } from './osm-graph';

const ROOT = resolve(import.meta.dirname, '..');
const RAW = resolve(ROOT, 'data/osm/osm-api-centro.json');
const OUT = resolve(ROOT, 'src/data/pilot-dataset.json');
const META = resolve(ROOT, 'src/data/pilot-meta.json');

// Centro aproximado de la Plaza de Armas de Huánuco (se recalcula con la geometría de OSM si está disponible).
const FALLBACK_CENTER = { lat: -9.92975, lng: -76.23985 };
// Caja del piloto: centro histórico alrededor de la Plaza de Armas (unos 1,3 km × 1,3 km).
const BBOX = { s: -9.9355, w: -76.2455, n: -9.924, e: -76.234 };
// Una sola petición a la API oficial de OSM (formato JSON), dentro de su política de uso para áreas pequeñas.
const URL = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${BBOX.w},${BBOX.s},${BBOX.e},${BBOX.n}`;

interface RawEl { type: string; id: number; lat?: number; lon?: number; nodes?: number[]; tags?: Record<string, string>; center?: { lat: number; lon: number } }

/** Añade un centro (promedio de sus nodos) a las vías con etiquetas, como hace Overpass con «out center». */
function addCenters(elements: RawEl[]): void {
  const coords = new Map<number, [number, number]>();
  for (const e of elements) if (e.type === 'node' && e.lat !== undefined && e.lon !== undefined) coords.set(e.id, [e.lat, e.lon]);
  for (const e of elements) {
    if (e.type !== 'way' || !e.nodes || !e.tags || e.center) continue;
    const pts = e.nodes.map((n) => coords.get(n)).filter((x): x is [number, number] => !!x);
    if (pts.length) e.center = { lat: pts.reduce((s, p) => s + p[0], 0) / pts.length, lon: pts.reduce((s, p) => s + p[1], 0) / pts.length };
  }
}

const WALKABLE = /^(footway|pedestrian|path|steps|living_street|residential|tertiary|tertiary_link|secondary|secondary_link|primary|primary_link|trunk|trunk_link|unclassified|service|corridor)$/;

async function main(): Promise<void> {
  if (process.argv.includes('--download') || !existsSync(RAW)) {
    console.log('Descargando datos de la API de OpenStreetMap…');
    const res = await fetch(URL, { headers: { 'User-Agent': 'MoviAcceso-prototipo-academico/0.1' } });
    if (!res.ok) throw new Error(`La API de OSM respondió ${res.status}`);
    mkdirSync(dirname(RAW), { recursive: true });
    writeFileSync(RAW, await res.text(), 'utf8');
  }
  const data = JSON.parse(readFileSync(RAW, 'utf8')) as { elements: RawEl[] };
  addCenters(data.elements);
  // Solo vías transitables a pie; el resto de vías (edificios, límites) se conservan solo como posibles destinos.
  data.elements = data.elements.filter((e) => e.type !== 'way' || !e.tags?.highway || WALKABLE.test(e.tags.highway));
  const plaza = data.elements.find((e) => /plaza de armas/i.test(e.tags?.name ?? '') && e.center);
  const center = plaza?.center ? { lat: plaza.center.lat, lng: plaza.center.lon } : FALLBACK_CENTER;
  const ds = buildPilotDataset(data as OverpassResponse, { center, source: `OpenStreetMap, API 0.6 (${URL}), descargado el 18/11/2026` });
  writeFileSync(OUT, JSON.stringify(ds), 'utf8');
  const { nodes: _n, edges: _e, places: _p, ...meta } = ds;
  void _n; void _e; void _p;
  writeFileSync(META, JSON.stringify(meta, null, 2), 'utf8');
  console.log(`Centro: ${center.lat}, ${center.lng}${plaza ? ' (Plaza de Armas según OSM)' : ' (aproximado)'}`);
  console.log(`Nodos ${ds.nodes.length} · tramos ${ds.edges.length} · lugares ${ds.places.length} · tramos oficiales (Contraloría) ${ds.officialEdgeIds.length}`);
  console.log('Lugares:', ds.places.map((p) => `${p.name} [${p.category}]`).join(' | '));
  console.log('Escenario demo:', ds.scenario ?? 'NO ENCONTRADO');
}
main().catch((e) => { console.error(e); process.exit(1); });

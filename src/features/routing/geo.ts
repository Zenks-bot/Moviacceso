import type { LineStringGeometry } from '../../types/domain';

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Distancia geodésica (haversine) entre dos puntos, en metros. */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Longitud de una LineString sumando sus tramos (no la distancia en línea recta entre extremos). */
export function lineStringLengthM(geometry: LineStringGeometry): number {
  let total = 0;
  for (let i = 1; i < geometry.coordinates.length; i++) {
    const prev = geometry.coordinates[i - 1];
    const curr = geometry.coordinates[i];
    if (!prev || !curr) continue;
    total += haversineM(prev[1], prev[0], curr[1], curr[0]);
  }
  return total;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString('es-PE', { maximumFractionDigits: 2 })} km`;
}

/** Distancia aproximada (m) de un punto a un segmento, con proyección equirectangular local (válida a escala urbana). */
function pointToSegmentM(lat: number, lng: number, a: [number, number], b: [number, number]): number {
  const kx = 111_320 * Math.cos(toRad(lat));
  const ky = 110_540;
  const ax = (a[0] - lng) * kx, ay = (a[1] - lat) * ky;
  const bx = (b[0] - lng) * kx, by = (b[1] - lat) * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** Segmento más cercano a un punto dentro de maxDistanceM, o null si ninguno está suficientemente cerca. */
export function nearestEdge<T extends { geometry: LineStringGeometry }>(lat: number, lng: number, edges: T[], maxDistanceM = 30): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const edge of edges) {
    const c = edge.geometry.coordinates;
    for (let i = 1; i < c.length; i++) {
      const d = pointToSegmentM(lat, lng, c[i - 1]!, c[i]!);
      if (d < bestD) { bestD = d; best = edge; }
    }
  }
  return bestD <= maxDistanceM ? best : null;
}

/** Punto medio (por longitud) de una LineString, como [lat, lng]. */
export function lineMidpoint(geometry: LineStringGeometry): { lat: number; lng: number } {
  const total = lineStringLengthM(geometry);
  let acc = 0;
  const c = geometry.coordinates;
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1]!, b = c[i]!;
    const seg = haversineM(a[1], a[0], b[1], b[0]);
    if (acc + seg >= total / 2) {
      const t = seg === 0 ? 0 : (total / 2 - acc) / seg;
      return { lat: a[1] + (b[1] - a[1]) * t, lng: a[0] + (b[0] - a[0]) * t };
    }
    acc += seg;
  }
  const first = c[0]!;
  return { lat: first[1], lng: first[0] };
}

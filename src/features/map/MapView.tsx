import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Alert } from '../../components/Alert';
import { STATUS_STYLE } from '../../components/StatusBadge';
import { PILOT_CENTER, PILOT_ZOOM } from '../../data/demo-dataset';
import { ACCESSIBILITY_LABELS, PLACE_CATEGORY_LABELS, REPORT_CATEGORY_LABELS } from '../../lib/labels';
import type { AccessibilityStatus, LatLng, MobilityDataset, PlaceCategory, PublicReport } from '../../types/domain';
import type { RouteSegment } from '../routing/planner';

export type MapSelection = { kind: 'place'; id: string } | { kind: 'edge'; id: string };

const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  import.meta.env.VITE_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>';

const CATEGORY_SYMBOL: Record<PlaceCategory, string> = {
  espacio_publico: '★', salud: 'S', educacion: 'E', comercio: 'C', paradero: 'P', servicio_publico: 'B', otro: '•',
};

function placeIcon(category: PlaceCategory, status: AccessibilityStatus, selected: boolean): L.DivIcon {
  const color = STATUS_STYLE[status].color;
  const ring = selected ? 'outline:4px solid #d4a017;' : '';
  return L.divIcon({
    className: 'ma-marker',
    html: `<span style="background:${color};${ring}">${CATEGORY_SYMBOL[category]}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const reportIcon = L.divIcon({
  className: 'ma-marker',
  html: '<span style="background:#8a5a00;border-radius:6px;width:24px;height:24px">!</span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const endpointIcon = (letter: string): L.DivIcon =>
  L.divIcon({ className: 'ma-marker', html: `<span style="background:#111;color:#d4a017">${letter}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });

const pickIcon = L.divIcon({
  className: 'ma-marker',
  html: '<span style="background:#5b3fa8">✚</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Encuadre inicial: todos los destinos visibles, con margen para que ningún marcador quede bajo los controles. */
function InitialFit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [48, 48], animate: false });
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

function FocusController({ target }: { target: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target || target.length === 0) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (target.length === 1) map.setView(target[0]!, Math.max(map.getZoom(), 17), { animate: !reduce });
    else map.fitBounds(L.latLngBounds(target), { padding: [40, 40], animate: !reduce });
  }, [map, target]);
  return null;
}

export interface MapViewProps {
  dataset: MobilityDataset;
  label: string;
  route?: RouteSegment[] | null;
  reports?: PublicReport[];
  selected?: MapSelection | null;
  onSelect?: (sel: MapSelection) => void;
  pickedPoint?: LatLng | null;
  onPick?: (p: LatLng) => void;
  visibleStatuses?: ReadonlySet<AccessibilityStatus>;
  className?: string;
}

export function MapView({ dataset, label, route, reports = [], selected, onSelect, pickedPoint, onPick, visibleStatuses, className = 'h-[420px]' }: MapViewProps) {
  const [tileErrors, setTileErrors] = useState(0);
  const [tileLoaded, setTileLoaded] = useState(false);

  const focusTarget = useMemo<[number, number][] | null>(() => {
    if (route && route.length > 0) return route.flatMap((s) => s.path);
    if (!selected) return null;
    if (selected.kind === 'place') {
      const p = dataset.places.find((x) => x.id === selected.id);
      return p ? [[p.lat, p.lng]] : null;
    }
    const e = dataset.edges.find((x) => x.id === selected.id);
    return e ? e.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) : null;
  }, [route, selected, dataset]);

  const tilesUnavailable = tileErrors >= 4 && !tileLoaded;

  return (
    <section aria-label={label} className="space-y-2">
      {tilesUnavailable ? (
        <Alert variant="warning" title="El mapa base no está disponible temporalmente" live>
          <p>No se pudieron cargar las teselas cartográficas. Puede seguir usando las listas textuales de lugares, tramos y trayectos.</p>
        </Alert>
      ) : null}
      <p className="text-sm text-slate">
        El mapa es un apoyo visual: toda la información y las acciones están disponibles también en las listas de esta página.
        {onPick ? ' Haga clic o toque el mapa para marcar la ubicación.' : ''}
      </p>
      <div className={`overflow-hidden rounded-xl border-2 border-ink ${className}`}>
        <MapContainer center={[PILOT_CENTER.lat, PILOT_CENTER.lng]} zoom={PILOT_ZOOM} minZoom={14} maxZoom={19} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer
            url={TILE_URL}
            attribution={TILE_ATTRIBUTION}
            maxZoom={19}
            eventHandlers={{ tileerror: () => setTileErrors((n) => n + 1), tileload: () => setTileLoaded(true) }}
          />
          {dataset.edges
            .filter((e) => !visibleStatuses || visibleStatuses.has(e.accessibilityStatus))
            .map((edge) => {
              const s = STATUS_STYLE[edge.accessibilityStatus];
              const isSel = selected?.kind === 'edge' && selected.id === edge.id;
              return (
                <Polyline
                  key={edge.id}
                  positions={edge.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])}
                  pathOptions={{ color: s.color, weight: isSel ? s.weight + 4 : s.weight, dashArray: s.dash, opacity: route ? 0.45 : 0.95, lineCap: 'round' }}
                  eventHandlers={onSelect ? { click: () => onSelect({ kind: 'edge', id: edge.id }) } : {}}
                >
                  <Tooltip sticky>
                    {edge.name} — {s.symbol} {ACCESSIBILITY_LABELS[edge.accessibilityStatus]}
                    {edge.sourceType === 'simulado' ? ' (demo)' : ''}
                  </Tooltip>
                </Polyline>
              );
            })}

          {route?.map((seg) => (
            <Polyline key={`casing-${seg.index}`} positions={seg.path} pathOptions={{ color: '#111111', weight: 12, opacity: 0.9, lineCap: 'round' }} />
          ))}
          {route?.map((seg) => (
            <Polyline
              key={`route-${seg.index}`}
              positions={seg.path}
              pathOptions={{ color: seg.effectiveStatus === 'barrera_verificada' ? '#ff6b5e' : '#d4a017', weight: 6, opacity: 1, lineCap: 'round', dashArray: STATUS_STYLE[seg.effectiveStatus].dash }}
            >
              <Tooltip sticky>Tramo {seg.index + 1}: {seg.edge.name} — {ACCESSIBILITY_LABELS[seg.effectiveStatus]}</Tooltip>
            </Polyline>
          ))}
          {route && route.length > 0 ? (
            <>
              <Marker position={route[0]!.path[0]!} icon={endpointIcon('A')} title="Origen del trayecto" />
              <Marker position={route[route.length - 1]!.path[route[route.length - 1]!.path.length - 1]!} icon={endpointIcon('B')} title="Destino del trayecto" />
            </>
          ) : null}

          {dataset.places.map((place) => (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={placeIcon(place.category, place.accessibilityStatus, selected?.kind === 'place' && selected.id === place.id)}
              title={`${place.name} — ${PLACE_CATEGORY_LABELS[place.category]} — ${ACCESSIBILITY_LABELS[place.accessibilityStatus]}`}
              eventHandlers={onSelect ? { click: () => onSelect({ kind: 'place', id: place.id }) } : {}}
            />
          ))}

          {reports.map((r) => (
            <Marker key={r.id} position={[r.lat, r.lng]} icon={reportIcon} title={`Reporte ciudadano: ${REPORT_CATEGORY_LABELS[r.category]}`}>
              <Popup>
                <strong>Reporte ciudadano{r.isDemo ? ' (demostración)' : ''}</strong>
                <br />
                {REPORT_CATEGORY_LABELS[r.category]}
                <br />
                Aprobado para publicación; no implica verificación técnica.
              </Popup>
            </Marker>
          ))}

          {pickedPoint ? <Marker position={[pickedPoint.lat, pickedPoint.lng]} icon={pickIcon} title="Ubicación seleccionada para el reporte" /> : null}
          {onPick ? <ClickHandler onPick={onPick} /> : null}
          <InitialFit points={(dataset.places.length > 1 ? dataset.places : dataset.nodes).map((n) => [n.lat, n.lng] as [number, number])} />
          <FocusController target={focusTarget} />
        </MapContainer>
      </div>
    </section>
  );
}

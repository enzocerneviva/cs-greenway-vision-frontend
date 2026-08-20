import { useEffect, useMemo } from "react";
import { MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { Inspection, Priority, Road, Segment } from "../../api/types";
import { PRIORITY_COLORS } from "../../lib/priorityColors";

const DEFAULT_CENTER: LatLngExpression = [-22.9068, -43.3];

interface GeoSegment {
  segment: Segment;
  road: Road | undefined;
  priority: Priority | null;
  positions: [LatLngExpression, LatLngExpression];
}

export function SegmentsMap({
  segments,
  roads,
  latestBySegment,
}: {
  segments: Segment[];
  roads: Road[];
  latestBySegment: Map<number, Inspection>;
}) {
  const geoSegments = useMemo<GeoSegment[]>(() => {
    return segments
      .filter(
        (s) =>
          s.lat_start != null &&
          s.lng_start != null &&
          s.lat_end != null &&
          s.lng_end != null
      )
      .map((segment) => ({
        segment,
        road: roads.find((r) => r.id === segment.road_id),
        priority: latestBySegment.get(segment.id)?.priority ?? null,
        positions: [
          [segment.lat_start as number, segment.lng_start as number],
          [segment.lat_end as number, segment.lng_end as number],
        ],
      }));
  }, [segments, roads, latestBySegment]);

  if (geoSegments.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
        Nenhum trecho com coordenadas cadastradas ainda.
      </div>
    );
  }

  return (
    <div className="h-80 rounded-lg overflow-hidden border border-slate-200">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoSegments.map(({ segment, road, priority, positions }) => (
          <Polyline
            key={segment.id}
            positions={positions}
            pathOptions={{
              color: PRIORITY_COLORS[priority ?? "NONE"],
              weight: 6,
              opacity: 0.85,
            }}
          >
            <Tooltip sticky>
              <strong>{road?.name ?? `Rodovia #${segment.road_id}`}</strong>
              <br />
              km {segment.km_start} – {segment.km_end} · {segment.direction}
              <br />
              criticidade: {priority ?? "sem inspeção"}
            </Tooltip>
          </Polyline>
        ))}
        <FitBounds positions={geoSegments.flatMap((g) => g.positions)} />
      </MapContainer>
    </div>
  );
}

function FitBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap();
  const boundsKey = JSON.stringify(positions);

  useEffect(() => {
    if (positions.length === 0) return;
    const bounds = positions as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [32, 32] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey]);

  return null;
}

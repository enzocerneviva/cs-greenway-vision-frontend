import { useEffect, useMemo } from "react";
import { MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { Inspection, Priority, Road, Segment } from "../../api/types";
import { PRIORITY_COLORS } from "../../lib/priorityColors";
import { buildHighwayBlocks } from "../../lib/highwayBlocks";
import { createRoadKmMapper } from "../../lib/roadGeometry";

const DEFAULT_CENTER: LatLngExpression = [-22.9068, -43.3];

interface ColoredLine {
  key: string;
  positions: LatLngExpression[];
  priority: Priority | null;
  tooltip: string;
}

export function SegmentsMap({
  segments,
  roads,
  inspectionsBySegment,
}: {
  segments: Segment[];
  roads: Road[];
  inspectionsBySegment: Map<number, Inspection[]>;
}) {
  const lines = useMemo<ColoredLine[]>(() => {
    const result: ColoredLine[] = [];

    for (const road of roads) {
      const roadSegments = segments.filter((s) => s.road_id === road.id);
      if (roadSegments.length === 0) continue;

      if (road.geometry && road.geometry.length >= 2) {
        // traçado real do OSM: cada bloco de 500m vira um trechinho colorido
        // do traçado, na posição km proporcional ao longo dele.
        const roadMinKm = Math.min(...roadSegments.map((s) => s.km_start));
        const roadMaxKm = Math.max(...roadSegments.map((s) => s.km_end));
        const mapper = createRoadKmMapper(road.geometry, roadMinKm, roadMaxKm);
        const blocks = buildHighwayBlocks(roadSegments, inspectionsBySegment);

        for (const block of blocks) {
          if (block.segmentId === null) continue;
          result.push({
            key: `${road.id}-${block.index}`,
            positions: mapper.sliceByKm(block.kmStart, block.kmEnd),
            priority: block.priority,
            tooltip: `${road.name} · km ${block.kmStart.toFixed(1)}–${block.kmEnd.toFixed(1)} · ${
              block.priority ?? "sem inspeção"
            }`,
          });
        }
        continue;
      }

      // sem traçado real ainda: cai pra linha reta manual (lat/lng do Segment)
      for (const segment of roadSegments) {
        if (
          segment.lat_start == null ||
          segment.lng_start == null ||
          segment.lat_end == null ||
          segment.lng_end == null
        ) {
          continue;
        }
        const inspections = inspectionsBySegment.get(segment.id) ?? [];
        const latest = inspections.reduce<Inspection | null>(
          (best, insp) => (!best || insp.created_at > best.created_at ? insp : best),
          null
        );
        result.push({
          key: `${road.id}-seg-${segment.id}`,
          positions: [
            [segment.lat_start, segment.lng_start],
            [segment.lat_end, segment.lng_end],
          ],
          priority: latest?.priority ?? null,
          tooltip: `${road.name} · km ${segment.km_start}–${segment.km_end} · ${
            latest?.priority ?? "sem inspeção"
          }`,
        });
      }
    }

    return result;
  }, [segments, roads, inspectionsBySegment]);

  if (lines.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
        Nenhum trecho com localização disponível ainda.
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
        {lines.map((line) => (
          <Polyline
            key={line.key}
            positions={line.positions}
            pathOptions={{
              color: PRIORITY_COLORS[line.priority ?? "NONE"],
              weight: 5,
              opacity: 0.85,
            }}
          >
            <Tooltip sticky>{line.tooltip}</Tooltip>
          </Polyline>
        ))}
        <FitBounds positions={lines.flatMap((l) => l.positions)} />
      </MapContainer>
    </div>
  );
}

function FitBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap();
  const boundsKey = positions.length;

  useEffect(() => {
    if (positions.length === 0) return;
    const bounds = positions as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [32, 32] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey]);

  return null;
}

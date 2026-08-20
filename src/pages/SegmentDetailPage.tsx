import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useAsync } from "../hooks/useAsync";
import { listRoads, listSegments } from "../api/roads";
import { listInspections } from "../api/inspections";
import { PriorityBadge } from "../components/shared/PriorityBadge";
import { FrameCard } from "../components/shared/FrameCard";
import { SegmentsMap } from "../components/highways/SegmentsMap";
import { buildHighwayBlocks } from "../lib/highwayBlocks";
import type { Inspection } from "../api/types";

export function SegmentDetailPage() {
  const { roadId, kmStart } = useParams<{ roadId: string; kmStart: string }>();

  const { data: roads, loading: loadingRoads } = useAsync(listRoads, []);
  const { data: segments, loading: loadingSegments } = useAsync(listSegments, []);
  const { data: inspections, loading: loadingInspections } = useAsync(listInspections, []);

  const road = roads?.find((r) => String(r.id) === roadId);

  const roadSegments = useMemo(
    () => (segments ?? []).filter((s) => String(s.road_id) === roadId),
    [segments, roadId]
  );

  const inspectionsBySegment = useMemo(() => {
    const map = new Map<number, Inspection[]>();
    for (const inspection of inspections ?? []) {
      const list = map.get(inspection.segment_id) ?? [];
      list.push(inspection);
      map.set(inspection.segment_id, list);
    }
    return map;
  }, [inspections]);

  const blocks = useMemo(
    () => buildHighwayBlocks(roadSegments, inspectionsBySegment),
    [roadSegments, inspectionsBySegment]
  );

  const block = blocks.find((b) => b.kmStart.toFixed(1) === kmStart);

  const loading = loadingRoads || loadingSegments || loadingInspections;

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando...</p>;
  }

  if (!road || !block) {
    return (
      <div>
        <Link to="/highways" className="text-sm text-emerald-700 underline">
          ← Voltar pra Rodovias
        </Link>
        <p className="text-sm text-slate-500 mt-4">Trecho não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/highways" className="text-sm text-emerald-700 underline">
          ← Voltar pra Rodovias
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {road.name}
              {road.concessionaire ? ` · ${road.concessionaire}` : ""}
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 mt-1">
              km {block.kmStart.toFixed(1)} – {block.kmEnd.toFixed(1)}
            </h1>
          </div>
          <PriorityBadge priority={block.priority} />
        </div>

        <p className="text-sm text-slate-500 mt-2">
          {block.inspection && block.frames.length > 0
            ? `última inspeção: ${new Date(block.inspection.created_at).toLocaleString("pt-BR")}`
            : "Sem inspeção cobrindo esse trecho ainda."}
        </p>

        {block.frames.length > 0 && (
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Frames analisados</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {block.frames.map((frame) => (
                <FrameCard key={frame.frame_index} frame={frame} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Mapa de {road.name}
        </h2>
        <SegmentsMap
          segments={roadSegments}
          roads={road ? [road] : []}
          inspectionsBySegment={inspectionsBySegment}
        />
      </div>
    </div>
  );
}
